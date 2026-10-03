"""Single-host API + static serving. Run on the team's Coshell drive."""
import json
import mimetypes
import os
import pathlib
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from .store import ROOT, Store, Problem


def load_env():
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_env()
from .jobs import Jobs, live_available


def handler_for(store, jobs):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Invite URLs and session credentials must not enter access logs.

        def send_json(self, status, payload):
            encoded = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def body(self):
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 32000:
                    raise Problem("Request body must be 1–32000 bytes.", 413)
                value = json.loads(self.rfile.read(size))
                if not isinstance(value, dict):
                    raise Problem("Expected a JSON object.")
                return value
            except (ValueError, UnicodeDecodeError):
                raise Problem("Invalid JSON body.")

        def token(self):
            return self.headers.get("Authorization", "").removeprefix("Bearer ")

        def dispatch(self):
            path = urlparse(self.path).path
            if self.command == "GET" and path == "/api/config":
                self.send_json(200, {"simulation": "live" if live_available() else "recorded",
                                     "analyst": "live" if all(os.environ.get(k) for k in ("ROOM_LLM_BASE_URL", "ROOM_LLM_API_KEY", "ROOM_LLM_MODEL")) else "recorded"})
                return
            if self.command == "POST":
                if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise Problem("Use application/json.", 415)
                origin = self.headers.get("Origin")
                allowed = {self.headers.get("Host"), "localhost:5173", "127.0.0.1:5173"}
                if origin and urlparse(origin).netloc not in allowed:
                    raise Problem("Cross-origin writes are not allowed.", 403)
                data = self.body()
                if path == "/api/rooms":
                    self.send_json(201, store.create(data.get("name"), data.get("scenario", "traction")))
                    return
                match = re.fullmatch(r"/api/rooms/([A-Za-z0-9_-]+)/([a-z]+)", path)
                if not match:
                    raise Problem("Endpoint not found.", 404)
                room_id, action = match.groups()
                if action == "join":
                    self.send_json(200, store.join(room_id, data.get("name")))
                elif action in ("diagnose", "validate"):
                    room = store.queue_job(room_id, self.token(), action, data)
                    jobs.submit(room)
                    self.send_json(202, {"job": room["job"]})
                else:
                    self.send_json(200, store.mutate(room_id, self.token(), action, data))
                return
            match = re.fullmatch(r"/api/rooms/([A-Za-z0-9_-]+)(/export)?", path)
            if self.command == "GET" and match:
                room = store.read(match[1], self.token())
                if match[2]:
                    room.pop("me", None)
                    room["export_note"] = "Application investigation history; not a Coshell build-session replay."
                self.send_json(200, room)
                return
            if path.startswith("/api/"):
                raise Problem("Endpoint not found.", 404)
            if self.command != "GET":
                raise Problem("Method not allowed.", 405)
            root = (ROOT / "dist").resolve()
            file = (root / path.lstrip("/")).resolve()
            if not file.is_relative_to(root):
                raise Problem("Not found.", 404)
            if not file.is_file():
                file = root / "index.html"
            if not file.exists():
                raise Problem("Frontend not built. Use npm run dev or npm run build.", 404)
            content = file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(file)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(content)

        def safe_dispatch(self):
            try:
                self.dispatch()
            except Problem as exc:
                self.send_json(exc.status, {"error": str(exc)})
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception:
                self.send_json(500, {"error": "An unexpected server error occurred."})

        do_GET = safe_dispatch
        do_POST = safe_dispatch

    return Handler


def main():
    data = pathlib.Path(os.environ.get("ROOM_DATA_DIR", str(ROOT / ".data")))
    data.mkdir(parents=True, exist_ok=True)
    store = Store(str(data / "rooms.sqlite3"))
    store.recover_jobs()
    jobs = Jobs(store)
    address = (os.environ.get("ROOM_HOST", "127.0.0.1"), int(os.environ.get("ROOM_PORT", 8787)))
    server = ThreadingHTTPServer(address, handler_for(store, jobs))
    print(f"Robot Incident Room API: http://{address[0]}:{address[1]}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        jobs.pool.shutdown(wait=False, cancel_futures=True)


if __name__ == "__main__":
    main()
