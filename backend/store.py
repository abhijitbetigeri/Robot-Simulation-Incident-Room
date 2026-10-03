"""Durable room state with serialized mutations and server-issued identities."""
import copy
import hashlib
import json
import pathlib
import secrets
import sqlite3
import threading
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Problem(Exception):
    def __init__(self, message, status=400):
        self.status = status
        super().__init__(message)


def text(value, limit=4000):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise Problem(f"Enter text between 1 and {limit} characters.")
    return value.strip()


def valid_fix(fix):
    if not isinstance(fix, dict):
        raise Problem("A fix must include a tunable and value.")
    name, value = fix.get("tunable"), fix.get("value")
    if name == "balance_assist_scale":
        if type(value) not in (int, float) or not 0 <= value <= 1:
            raise Problem("Balance assist must be a number from 0 to 1.")
    elif name in ("boot_traction_enabled", "fixed_line_enabled"):
        if type(value) is not bool:
            raise Problem("This setting requires true or false.")
    else:
        raise Problem("Choose a supported robot setting. Test difficulty cannot be changed.")
    return {"tunable": name, "value": value}


def event(room, actor, action):
    room["events"].append({"id": uuid.uuid4().hex, "actor": actor, "action": action, "at": time.time()})


class Store:
    def __init__(self, path):
        self.lock = threading.RLock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, body TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS members (token TEXT PRIMARY KEY, room TEXT, id TEXT, name TEXT, seen REAL)")
        self.db.commit()

    def create(self, name, scenario):
        name = text(name, 40)
        if scenario not in ("assist", "traction", "line"):
            raise Problem("Unknown scenario.")
        fixture = json.loads((ROOT / "fixtures" / f"{scenario}.json").read_text())
        room_id = secrets.token_urlsafe(18)
        room = {"id": room_id, "title": fixture["title"], "scenario": scenario,
                "revision": 0, "created": time.time(), "cursor": fixture["before"]["steps"],
                "cursor_actor": None, "incident": fixture, "messages": [], "annotations": [],
                "proposal": None, "diagnosis": None, "validation": None, "job": None, "events": []}
        event(room, name, "opened the investigation")
        with self.lock, self.db:
            self.db.execute("INSERT INTO rooms VALUES (?, ?)", (room_id, json.dumps(room)))
        return {"room": room_id, **self.join(room_id, name)}

    def _room(self, room_id):
        row = self.db.execute("SELECT body FROM rooms WHERE id=?", (room_id,)).fetchone()
        if not row:
            raise Problem("This room was not found. Check the invite link.", 404)
        return json.loads(row[0])

    def join(self, room_id, name):
        name = text(name, 40)
        token, member = secrets.token_urlsafe(32), uuid.uuid4().hex
        with self.lock, self.db:
            room = self._room(room_id)
            if self.db.execute("SELECT 1 FROM members WHERE room=? AND lower(name)=lower(?)", (room_id, name)).fetchone():
                raise Problem("That name is already in this room. Use a distinct name.", 409)
            self.db.execute("INSERT INTO members VALUES (?, ?, ?, ?, ?)",
                            (hashlib.sha256(token.encode()).hexdigest(), room_id, member, name, time.time()))
            event(room, name, "joined the room")
            self._save(room)
        return {"token": token, "member": {"id": member, "name": name}}

    def identity(self, room_id, token):
        row = self.db.execute("SELECT id,name FROM members WHERE token=? AND room=?",
                              (hashlib.sha256(token.encode()).hexdigest(), room_id)).fetchone()
        if not row:
            raise Problem("Join this room to continue.", 401)
        self.db.execute("UPDATE members SET seen=? WHERE id=?", (time.time(), row[0]))
        return {"id": row[0], "name": row[1]}

    def _save(self, room):
        room["revision"] += 1
        self.db.execute("UPDATE rooms SET body=? WHERE id=?", (json.dumps(room), room["id"]))

    def read(self, room_id, token):
        with self.lock, self.db:
            who = self.identity(room_id, token)
            room = self._room(room_id)
            room["participants"] = [{"id": r[0], "name": r[1], "online": time.time()-r[2] < 20}
                                    for r in self.db.execute("SELECT id,name,seen FROM members WHERE room=?", (room_id,))]
            room["me"] = who
            return room

    def mutate(self, room_id, token, action, data):
        with self.lock, self.db:
            who = self.identity(room_id, token)
            room = self._room(room_id)
            if action == "message":
                room["messages"].append({"id": uuid.uuid4().hex, "role": "user", "author": who["name"],
                                         "content": text(data.get("text")), "at": time.time()})
                event(room, who["name"], "added to the discussion")
            elif action == "cursor":
                step = data.get("step")
                if type(step) is not int or not 1 <= step <= room["incident"]["before"]["steps"]:
                    raise Problem("Select a step in this run.")
                room["cursor"], room["cursor_actor"] = step, who["name"]
            elif action == "annotate":
                step = data.get("step", room["cursor"])
                if type(step) is not int or not 1 <= step <= room["incident"]["before"]["steps"]:
                    raise Problem("Select a valid simulation step.")
                room["annotations"].append({"id": uuid.uuid4().hex, "step": step,
                                            "text": text(data.get("text"), 1000), "author": who["name"]})
                event(room, who["name"], f"pinned evidence at step {step}")
            elif action == "propose":
                if room["job"] and room["job"]["status"] in ("queued", "running"):
                    raise Problem("Wait for the current job to finish.", 409)
                room["proposal"] = {"id": uuid.uuid4().hex, "fix": valid_fix(data.get("fix")),
                                    "reason": text(data.get("reason"), 2000), "author": who,
                                    "approved_by": None, "status": "proposed"}
                room["validation"] = None
                event(room, who["name"], "proposed a fix for review")
            elif action == "approve":
                p = room["proposal"]
                if not p or p["id"] != data.get("proposal_id") or p["status"] != "proposed":
                    raise Problem("This proposal has changed. Review the latest version.", 409)
                if p["author"]["id"] == who["id"]:
                    raise Problem("A different teammate must review this fix.", 403)
                p["approved_by"], p["status"] = who, "approved"
                event(room, who["name"], "approved the proposed fix")
            else:
                raise Problem("Unknown room action.")
            self._save(room)
        return {"ok": True}

    def queue_job(self, room_id, token, kind, data):
        with self.lock, self.db:
            who = self.identity(room_id, token)
            room = self._room(room_id)
            if room["job"] and room["job"]["status"] in ("queued", "running"):
                raise Problem("A job is already queued for this room.", 409)
            if kind == "validate":
                p = room["proposal"]
                if not p or p["status"] != "approved" or p["id"] != data.get("proposal_id"):
                    raise Problem("A teammate must approve the current fix first.", 409)
                p["status"] = "validating"
                room["validation"] = None
            job = {"id": uuid.uuid4().hex, "kind": kind, "status": "queued", "actor": who["name"], "error": None}
            room["job"] = job
            event(room, who["name"], f"queued {kind}")
            self._save(room)
            return copy.deepcopy(room)

    def job_update(self, room_id, job_id, status, result=None, error=None):
        with self.lock, self.db:
            room = self._room(room_id)
            if not room["job"] or room["job"]["id"] != job_id:
                return
            job = room["job"]
            job["status"], job["error"] = status, error
            if status == "failed":
                if job["kind"] == "validate":
                    room["proposal"]["status"] = "approved"
                event(room, "System", f"{job['kind']} failed: {error}")
            if status == "complete":
                if job["kind"] == "diagnose":
                    room["diagnosis"] = result
                    room["messages"].append({"id": uuid.uuid4().hex, "role": "assistant", "author": result["source"],
                                             "content": result["root_cause"], "at": time.time()})
                else:
                    room["validation"] = result
                    room["proposal"]["status"] = "validated" if result["passed"] else "rejected"
                event(room, "System", f"completed {job['kind']}")
            self._save(room)

    def recover_jobs(self):
        with self.lock:
            rooms = [json.loads(r[0]) for r in self.db.execute("SELECT body FROM rooms")]
        for room in rooms:
            if room["job"] and room["job"]["status"] in ("queued", "running"):
                self.job_update(room["id"], room["job"]["id"], "failed", error="Server restarted. Please retry.")
