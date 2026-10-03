import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  FlaskConical,
  Layers3,
  Link2,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Radio,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { api, credentials, roomId } from "./api";
import type { Fix, Message, Room } from "./types";
import "./styles.css";

const tunables: Record<string, string> = {
  balance_assist_scale: "Balance assistance",
  boot_traction_enabled: "Boot traction",
  fixed_line_enabled: "Fixed-line connection",
};
const fmt = (value: number | undefined, digits = 2) =>
  Number(value || 0).toFixed(digits);
const short = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}

function Entry({ onEnter }: { onEnter: () => void }) {
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("traction");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = roomId();
  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(id ? `/rooms/${id}/join` : "/rooms", {
        name,
        scenario,
      });
      const next = id || result.room;
      sessionStorage.setItem("room-token:" + next, result.token);
      history.replaceState(null, "", "?room=" + next);
      onEnter();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="entry">
      <div className="entry-brand">
        <ScanLine size={24} /> ROBOT / INCIDENT ROOM
      </div>
      <div className="entry-grid">
        <section>
          <Badge tone="lime">A shared investigation workspace</Badge>
          <h1>
            Find the failure.
            <br />
            <span>Prove the fix.</span>
          </h1>
          <p>
            Bring the team to the same moment. Inspect robot telemetry,
            challenge a diagnosis, and review the evidence before rerunning.
          </p>
          <div className="entry-points">
            <span>
              <Users /> One room, shared context
            </span>
            <span>
              <ShieldCheck /> Reviewed before execution
            </span>
            <span>
              <Activity /> Measured recovery
            </span>
          </div>
        </section>
        <form onSubmit={enter} className="entry-card">
          <div className="eyebrow">
            {id ? "YOU’RE INVITED" : "START AN INVESTIGATION"}
          </div>
          <h2>{id ? "Join the incident room" : "Open a room"}</h2>
          <p>Use your name so teammates can follow your contributions.</p>
          <label>
            Your name
            <input
              autoFocus
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abhijit"
            />
          </label>
          {!id && (
            <label>
              Recorded incident
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="traction">
                  G1 · Lost traction on the ascent
                </option>
                <option value="assist">G1 · Balance loss on the incline</option>
                <option value="line">G1 · Fixed-line connection failure</option>
              </select>
            </label>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? <Loader2 className="spin" /> : id ? <Users /> : <Plus />}
            {id ? "Join room" : "Create incident room"}
          </button>
          <small>
            Invite links grant room access. Use only with your team. Names
            identify browser sessions, not verified accounts.
          </small>
        </form>
      </div>
      <footer>
        UNITREE G1 <span> / </span> MUJOCO SIMULATION <span> / </span> BUILT TO
        INVESTIGATE TOGETHER
      </footer>
    </main>
  );
}

function ChatMessage() {
  return (
    <MessagePrimitive.Root className="chat-message">
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  );
}
function Discussion({
  room,
  act,
}: {
  room: Room;
  act: (action: string, data?: unknown) => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  const convertMessage = useCallback(
    (m: Message): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      createdAt: new Date(m.at * 1000),
      content: [{ type: "text", text: `${m.author}\n${m.content}` }],
    }),
    [],
  );
  const onNew = async (m: AppendMessage) => {
    const content = m.content
      .filter((x) => x.type === "text")
      .map((x) => x.text)
      .join("\n");
    setSending(true);
    try {
      await act("message", { text: content });
    } finally {
      setSending(false);
    }
  };
  const runtime = useExternalStoreRuntime({
    messages: room.messages,
    convertMessage,
    onNew,
    isRunning: sending,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="discussion">
        <ThreadPrimitive.Viewport className="chat-scroll">
          {!room.messages.length && (
            <div className="empty-chat">
              <MessageSquare />
              <strong>Bring another perspective.</strong>
              <p>
                Share an observation or challenge a hypothesis. Everyone in the
                room sees this thread.
              </p>
            </div>
          )}
          <ThreadPrimitive.Messages
            components={{
              UserMessage: ChatMessage,
              AssistantMessage: ChatMessage,
            }}
          />
        </ThreadPrimitive.Viewport>
        <ComposerPrimitive.Root className="composer">
          <ComposerPrimitive.Input
            aria-label="Team message"
            placeholder="Share an observation…"
            maxLength={4000}
          />
          <ComposerPrimitive.Send
            aria-label="Send message"
            className="icon-button"
          >
            <Send size={17} />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
        <div className="chat-foot">Shared team thread · assistant-ui</div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function App() {
  const [joined, setJoined] = useState(!!credentials(roomId()));
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [config, setConfig] = useState({
    simulation: "recorded",
    analyst: "recorded",
  });
  const [tab, setTab] = useState("investigate");
  const [sideTab, setSideTab] = useState("discussion");
  const [playing, setPlaying] = useState(false);
  const [draftStep, setDraftStep] = useState<number | null>(null);
  const [annotation, setAnnotation] = useState("");
  const [reason, setReason] = useState("");
  const [fix, setFix] = useState<Fix>({
    tunable: "boot_traction_enabled",
    value: true,
  });
  const [pending, setPending] = useState(false);
  const refresh = useCallback(async () => {
    const value = await api(`/rooms/${roomId()}`);
    setRoom((old) => (!old || value.revision >= old.revision ? value : old));
  }, []);
  useEffect(() => {
    api("/config")
      .then(setConfig)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!joined) return;
    let active = true;
    const poll = async () => {
      try {
        const value = await api(`/rooms/${roomId()}`);
        if (active) {
          setRoom((old) =>
            !old || value.revision >= old.revision ? value : old,
          );
          setConnectionError("");
        }
      } catch (e) {
        if (active) setConnectionError((e as Error).message);
      }
    };
    void poll();
    const timer = setInterval(poll, 1200);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [joined]);
  const act = useCallback(
    async (action: string, data: unknown = {}) => {
      setError("");
      setPending(true);
      try {
        await api(`/rooms/${roomId()}/${action}`, data);
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );
  const doAct = (action: string, data: unknown = {}) => {
    void act(action, data).catch(() => {});
  };
  useEffect(() => {
    if (!playing || !room) return;
    const timer = setTimeout(() => {
      const next = room.cursor + 10;
      if (next > room.incident.before.steps) {
        setPlaying(false);
        return;
      }
      void act("cursor", { step: next }).catch(() => setPlaying(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [playing, room?.cursor, act]);
  useEffect(() => {
    if (room?.diagnosis) {
      setFix(room.diagnosis.fix);
      setReason(room.diagnosis.root_cause);
    }
  }, [
    room?.diagnosis?.root_cause,
    room?.diagnosis?.fix.tunable,
    room?.diagnosis?.fix.value,
  ]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  if (!joined) return <Entry onEnter={() => setJoined(true)} />;
  if (!room)
    return (
      <div className="loading">
        <ScanLine />
        <h2>Connecting to the room</h2>
        {error || connectionError ? (
          <>
            <p role="alert">{error || connectionError}</p>
            <button
              onClick={() => {
                sessionStorage.removeItem("room-token:" + roomId());
                setJoined(false);
              }}
            >
              Rejoin room
            </button>
          </>
        ) : (
          <Loader2 className="spin" />
        )}
      </div>
    );
  const incident = room.incident;
  const sample = incident.telemetry.reduce(
    (a, b) =>
      Math.abs(b.step - room.cursor) < Math.abs(a.step - room.cursor) ? b : a,
    incident.telemetry[0],
  );
  const busy = !!room.job && ["queued", "running"].includes(room.job.status);
  const proposal = room.proposal;
  const validation = room.validation;
  const online = room.participants.filter((p) => p.online);
  const isOwn = proposal?.author.id === room.me.id;
  async function invite() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice(
        "Invite link copied. Open it in a second browser to join as a teammate.",
      );
    } catch {
      setNotice("Copy this page’s URL to invite a teammate.");
    }
  }
  async function download() {
    try {
      const data = await api(`/rooms/${room!.id}/export`);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-room-${room!.scenario}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <aside className="rail">
        <a className="brand-mark" href="/" aria-label="New investigation">
          <ScanLine />
        </a>
        <button className="rail-item active" title="Investigation">
          <Layers3 size={21} />
        </button>
        <button
          className="rail-item"
          title="Team discussion"
          onClick={() => setSideTab("discussion")}
        >
          <Users size={21} />
        </button>
        <button
          className="rail-item"
          title="Activity history"
          onClick={() => setSideTab("activity")}
        >
          <Clock3 size={21} />
        </button>
        <div className="rail-bottom">
          <a
            className="rail-item"
            href="https://coshell.ai/docs"
            target="_blank"
            rel="noreferrer"
            title="Coshell guide"
          >
            <CircleHelp size={21} />
          </a>
          <span className="avatar me">{short(room.me.name)}</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            ROBOT LAB <ChevronRight size={14} />
            <span>Incident room</span>
          </div>
          <div className="top-actions">
            <span className="live-label">
              <Radio size={14} /> Shared workspace
            </span>
            <div className="avatars">
              {online.slice(0, 4).map((p) => (
                <span key={p.id} title={p.name} className="avatar">
                  {short(p.name)}
                </span>
              ))}
            </div>
            <button onClick={invite}>
              <Link2 size={15} /> Invite teammate
            </button>
          </div>
        </header>
        <section className="room-heading">
          <div>
            <div className="eyebrow">
              INCIDENT {room.id.slice(0, 6).toUpperCase()} <span> / </span>{" "}
              UNITREE G1
            </div>
            <h1>{room.title}</h1>
            <div className="heading-meta">
              <Badge tone={validation?.passed ? "green" : "orange"}>
                {validation?.passed ? "Fix reviewed" : "Investigating"}
              </Badge>
              <span>35° slope</span>
              <span>Seed {incident.config.seed}</span>
              <span>MuJoCo · PPO policy</span>
            </div>
          </div>
          <button className="subtle" onClick={download}>
            <Download size={16} /> Export evidence
          </button>
        </section>
        <nav className="tabs" aria-label="Investigation views">
          <button
            className={tab === "investigate" ? "selected" : ""}
            onClick={() => setTab("investigate")}
          >
            <ScanLine size={16} /> Investigation
          </button>
          <button
            className={tab === "validation" ? "selected" : ""}
            onClick={() => setTab("validation")}
          >
            <FlaskConical size={16} /> Validation{" "}
            {validation && (
              <span className="count">{validation.seeds.length}</span>
            )}
          </button>
          <div className="runtime-label">
            {config.simulation === "live" ? (
              <>
                <span className="status-dot" /> Live simulation worker
              </>
            ) : (
              <>
                <Clock3 size={13} /> Recorded simulation mode
              </>
            )}
          </div>
        </nav>
        {connectionError && (
          <div role="alert" className="alert error">
            Connection interrupted: {connectionError} Retrying…
          </div>
        )}
        {error && (
          <div role="alert" className="alert error">
            {error}
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="alert success">
            {notice}
          </div>
        )}
        <div className="work-grid">
          <main className="main-panel">
            {tab === "investigate" ? (
              <>
                <div className="section-title">
                  <h2>Failure replay</h2>
                  <span>
                    <Clock3 size={13} /> Historical telemetry · shared playhead
                  </span>
                </div>
                <section className="replay-panel">
                  <div className="replay-top">
                    <div>
                      <span className="mono">RUN {incident.config.seed}</span>
                      <Badge tone="orange">Failed episode</Badge>
                    </div>
                    <span className="mono">
                      STEP {String(room.cursor).padStart(4, "0")} /{" "}
                      {incident.before.steps}
                    </span>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart
                        data={incident.telemetry}
                        margin={{ top: 25, right: 24, left: 0, bottom: 0 }}
                        onClick={(state: any) => {
                          if (state?.activeLabel)
                            doAct("cursor", {
                              step: Number(state.activeLabel),
                            });
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="ascentFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#a9ed88"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#a9ed88"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="#2b3340"
                          vertical={false}
                          strokeDasharray="3 5"
                        />
                        <XAxis
                          dataKey="step"
                          type="number"
                          domain={[1, incident.before.steps]}
                          tick={{ fill: "#8d99aa", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#8d99aa", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1b2330",
                            border: "1px solid #3b4656",
                            borderRadius: 8,
                            color: "#fff",
                          }}
                        />
                        <Area
                          name="Ascent (m)"
                          type="monotone"
                          dataKey="ascent"
                          stroke="#a9ed88"
                          fill="url(#ascentFill)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                        <Area
                          name="Pelvis height (m)"
                          type="monotone"
                          dataKey="pelvis_normal_height"
                          stroke="#7b9fff"
                          fill="transparent"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                        <ReferenceLine
                          x={room.cursor}
                          stroke="#e5edf6"
                          strokeDasharray="4 4"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="legend">
                    <span>
                      <i className="lime-line" />
                      Ascent
                    </span>
                    <span>
                      <i className="blue-line" />
                      Pelvis height
                    </span>
                    <span>Click the timeline to inspect a step</span>
                  </div>
                  <div className="transport">
                    <button
                      className="play-button"
                      aria-label={playing ? "Pause replay" : "Play replay"}
                      onClick={() => {
                        if (playing) {
                          setPlaying(false);
                        } else if (room.cursor >= incident.before.steps) {
                          void act("cursor", { step: 1 })
                            .then(() => setPlaying(true))
                            .catch(() => {});
                        } else {
                          setPlaying(true);
                        }
                      }}
                    >
                      {playing ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <input
                      type="range"
                      aria-label="Simulation step"
                      min={1}
                      max={incident.before.steps}
                      value={draftStep ?? room.cursor}
                      onChange={(e) => setDraftStep(Number(e.target.value))}
                      onPointerUp={(e) => {
                        doAct("cursor", {
                          step: Number(e.currentTarget.value),
                        });
                        setDraftStep(null);
                      }}
                      onKeyUp={(e) => {
                        doAct("cursor", {
                          step: Number(e.currentTarget.value),
                        });
                        setDraftStep(null);
                      }}
                    />
                    <span>
                      {room.cursor_actor
                        ? `${room.cursor_actor} is guiding`
                        : "Shared with everyone"}
                    </span>
                  </div>
                </section>
                <div className="metric-grid">
                  {[
                    ["Ascent", fmt(sample.ascent), "m"],
                    ["Upright score", fmt(sample.upright_score), " / 1"],
                    ["Pelvis height", fmt(sample.pelvis_normal_height), "m"],
                    ["Uphill speed", fmt(sample.uphill_speed), "m/s"],
                  ].map(([label, value, unit]) => (
                    <div className="metric" key={label}>
                      <span>{label}</span>
                      <strong>
                        {value}
                        <small>{unit}</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <section className="evidence-section">
                  <div className="section-title">
                    <h2>
                      Pinned evidence{" "}
                      <span className="count">{room.annotations.length}</span>
                    </h2>
                    <span>Step {room.cursor}</span>
                  </div>
                  <form
                    className="pin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act("annotate", {
                        text: annotation,
                        step: room.cursor,
                      })
                        .then(() => setAnnotation(""))
                        .catch(() => {});
                    }}
                  >
                    <input
                      aria-label="Evidence note"
                      placeholder={`What do you observe at step ${room.cursor}?`}
                      value={annotation}
                      onChange={(e) => setAnnotation(e.target.value)}
                      required
                      maxLength={1000}
                    />
                    <button disabled={pending}>
                      <Plus size={16} /> Pin
                    </button>
                  </form>
                  {room.annotations.length ? (
                    <div className="evidence-list">
                      {room.annotations.map((a) => (
                        <button
                          className="evidence-note"
                          key={a.id}
                          onClick={() => doAct("cursor", { step: a.step })}
                        >
                          <span className="mono">{a.step}</span>
                          <div>
                            {a.text}
                            <small>{a.author}</small>
                          </div>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-inline">
                      Pin a metric or moment for the team to investigate.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="validation-panel">
                <div className="section-title">
                  <h2>Validation results</h2>
                  <FlaskConical size={18} />
                </div>
                {validation ? (
                  <>
                    <div
                      className={
                        "validation-summary " +
                        (validation.passed ? "passed" : "failed")
                      }
                    >
                      <ShieldCheck />
                      <div>
                        <h3>
                          {validation.passed
                            ? "Recovery demonstrated"
                            : "Fix needs more work"}
                        </h3>
                        <p>
                          {validation.mode === "live"
                            ? "Fresh simulation runs"
                            : "Historical result · no fresh execution"}
                        </p>
                      </div>
                      <strong>
                        {validation.seeds.filter((s) => s.after.success).length}
                        /{validation.seeds.length}
                      </strong>
                    </div>
                    <p className="validation-note">{validation.note}</p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Seed</th>
                            <th>Baseline</th>
                            <th>With fix</th>
                            <th>Ascent change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validation.seeds.map((p) => (
                            <tr key={p.seed}>
                              <td className="mono">{p.seed}</td>
                              <td>
                                <Badge
                                  tone={p.before.success ? "green" : "orange"}
                                >
                                  {p.before.success
                                    ? "Success"
                                    : p.before.failure
                                      ? "Failed"
                                      : "Timed out"}
                                </Badge>
                              </td>
                              <td>
                                <Badge
                                  tone={p.after.success ? "green" : "orange"}
                                >
                                  {p.after.success
                                    ? "Success"
                                    : p.after.failure
                                      ? "Failed"
                                      : "Timed out"}
                                </Badge>
                              </td>
                              <td>
                                {fmt(p.before.ascent_m)} →{" "}
                                {fmt(p.after.ascent_m)} m
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="review-receipt">
                      <CheckCheck />
                      <div>
                        Proposed by <strong>{proposal?.author.name}</strong>
                        <br />
                        Reviewed by{" "}
                        <strong>{proposal?.approved_by?.name}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-validation">
                    <FlaskConical size={38} />
                    <h3>Evidence before confidence.</h3>
                    <p>
                      Propose a fix, have a teammate approve it, then run
                      validation.{" "}
                      {config.simulation === "live"
                        ? "The worker compares baseline and fix across three seeds."
                        : "Recorded mode shows the existing single-seed comparison."}
                    </p>
                    <button onClick={() => setTab("investigate")}>
                      Return to investigation
                    </button>
                  </div>
                )}
              </section>
            )}
            <section className="analyst-panel">
              <div className="section-title">
                <h2>
                  <Sparkles size={17} /> Incident analyst
                </h2>
                <Badge>
                  {config.analyst === "live"
                    ? "Connected model"
                    : "Recorded diagnosis"}
                </Badge>
              </div>
              {room.diagnosis ? (
                <>
                  <p className="diagnosis">{room.diagnosis.root_cause}</p>
                  <div className="diagnosis-evidence">
                    {room.diagnosis.evidence.map((e, i) => (
                      <div key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <p>{e}</p>
                      </div>
                    ))}
                  </div>
                  <small className="source-note">
                    {room.diagnosis.mode === "recorded"
                      ? "Historical model report from the source project; not a new AI response."
                      : `Model: ${room.diagnosis.source}. Hypothesis pending simulation validation.`}
                  </small>
                </>
              ) : (
                <p className="muted">
                  {config.analyst === "live"
                    ? "Ask the analyst to review telemetry, pinned evidence, and the team’s discussion."
                    : "Load the original analyst’s evidence-backed diagnosis for this recorded incident."}
                </p>
              )}
              <button
                className="analyst-button"
                disabled={busy || pending}
                onClick={() => doAct("diagnose")}
              >
                {busy && room.job?.kind === "diagnose" ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}{" "}
                {room.diagnosis
                  ? "Review diagnosis again"
                  : config.analyst === "live"
                    ? "Analyze incident"
                    : "Load recorded diagnosis"}
              </button>
            </section>
          </main>
          <aside className="collaboration-panel">
            <section className="fix-panel">
              <div className="section-title">
                <h2>
                  <ShieldCheck size={17} /> Proposed fix
                </h2>
                {proposal && (
                  <Badge tone={proposal.approved_by ? "green" : "orange"}>
                    {proposal.status}
                  </Badge>
                )}
              </div>
              {proposal ? (
                <>
                  <div className="fix-diff">
                    <span>{tunables[proposal.fix.tunable]}</span>
                    <code>
                      <del>{String(incident.config[proposal.fix.tunable])}</del>
                      <ChevronRight size={14} />
                      <strong>{String(proposal.fix.value)}</strong>
                    </code>
                  </div>
                  <p className="fix-reason">{proposal.reason}</p>
                  <div className="proposal-author">
                    <span className="avatar small">
                      {short(proposal.author.name)}
                    </span>
                    Proposed by {proposal.author.name}
                  </div>
                  {proposal.status === "proposed" && (
                    <>
                      <button
                        className="primary wide"
                        disabled={isOwn || pending}
                        onClick={() =>
                          doAct("approve", { proposal_id: proposal.id })
                        }
                      >
                        <Check size={16} /> Approve fix
                      </button>
                      <small>
                        {isOwn
                          ? "Invite a teammate to independently review your proposal."
                          : "Review the evidence before approving this configuration change."}
                      </small>
                    </>
                  )}
                  {proposal.status === "approved" && (
                    <>
                      <div className="approved-by">
                        <CheckCheck size={15} /> Reviewed by{" "}
                        {proposal.approved_by?.name}
                      </div>
                      <button
                        className="primary wide"
                        disabled={busy || pending}
                        onClick={() => {
                          doAct("validate", { proposal_id: proposal.id });
                          setTab("validation");
                        }}
                      >
                        <Play size={16} />
                        {config.simulation === "live"
                          ? "Validate across 3 seeds"
                          : "Compare recorded result"}
                      </button>
                    </>
                  )}
                  {proposal.status === "validating" && (
                    <div className="job-status">
                      <Loader2 className="spin" size={17} /> Simulation queued
                      or running…
                    </div>
                  )}
                  {["validated", "rejected"].includes(proposal.status) && (
                    <button
                      className="wide"
                      onClick={() => setTab("validation")}
                    >
                      <FlaskConical size={16} /> View validation evidence
                    </button>
                  )}
                  <details className="revision-form">
                    <summary>Revise proposal</summary>
                    <FixForm
                      fix={fix}
                      setFix={setFix}
                      reason={reason}
                      setReason={setReason}
                      disabled={busy || pending}
                      onSubmit={() => doAct("propose", { fix, reason })}
                    />
                  </details>
                </>
              ) : (
                <>
                  <p className="muted">
                    Turn a hypothesis into a specific configuration change.
                  </p>
                  <FixForm
                    fix={fix}
                    setFix={setFix}
                    reason={reason}
                    setReason={setReason}
                    disabled={busy || pending}
                    onSubmit={() => doAct("propose", { fix, reason })}
                  />
                </>
              )}
              {room.job?.error && (
                <p role="alert" className="error">
                  {room.job.error}
                </p>
              )}
            </section>
            <section className="team-panel">
              <div className="side-tabs">
                <button
                  className={sideTab === "discussion" ? "selected" : ""}
                  onClick={() => setSideTab("discussion")}
                >
                  Discussion{" "}
                  <span className="count">{room.messages.length}</span>
                </button>
                <button
                  className={sideTab === "activity" ? "selected" : ""}
                  onClick={() => setSideTab("activity")}
                >
                  Activity
                </button>
              </div>
              {sideTab === "discussion" ? (
                <Discussion room={room} act={act} />
              ) : (
                <div className="activity-list">
                  {[...room.events].reverse().map((e) => (
                    <div key={e.id}>
                      <span className="activity-line" />
                      <p>
                        <strong>{e.actor}</strong> {e.action}
                        <small>
                          {new Date(e.at * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
        <footer className="workspace-footer">
          <span>
            <Users size={13} />
            {online.length} online · saved to this workspace
          </span>
          <span>Simulation evidence · no robot hardware commands</span>
        </footer>
      </div>
    </div>
  );
}

function FixForm({
  fix,
  setFix,
  reason,
  setReason,
  disabled,
  onSubmit,
}: {
  fix: Fix;
  setFix: (v: Fix) => void;
  reason: string;
  setReason: (v: string) => void;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="fix-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Setting
        <select
          value={fix.tunable}
          onChange={(e) =>
            setFix({
              tunable: e.target.value,
              value: e.target.value === "balance_assist_scale" ? 1 : true,
            })
          }
        >
          {Object.entries(tunables).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Proposed value
        {fix.tunable === "balance_assist_scale" ? (
          <input
            type="number"
            required
            min={0}
            max={1}
            step={0.05}
            value={Number(fix.value)}
            onChange={(e) => setFix({ ...fix, value: Number(e.target.value) })}
          />
        ) : (
          <select
            value={String(fix.value)}
            onChange={(e) =>
              setFix({ ...fix, value: e.target.value === "true" })
            }
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        )}
      </label>
      <label>
        Reason
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What evidence supports this change?"
          rows={3}
        />
      </label>
      <button className="primary wide" disabled={disabled}>
        <ShieldCheck size={16} /> Propose for review
      </button>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
