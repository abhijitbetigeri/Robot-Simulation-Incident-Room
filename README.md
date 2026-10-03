# Robot-Simulation-Incident-Room

A shared workspace where robotics engineers investigate simulation failures and validate fixes together.

**[Live demo](https://robot-simulation-incident-room-ab.style.dev)** · **[Watch the fix-approval recording](submission/demo.mp4)** · [Demo notes](submission/DEMO.md)

The first product slice covers one concrete loop: invite a teammate, inspect the same telemetry step, pin evidence, discuss the diagnosis, propose a configuration change, obtain another participant's approval, then compare baseline and fixed runs.

## Start

Requires Node 22+ and Python 3.10+. The API uses the Python standard library and SQLite; there is no separate cloud database to configure.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Create a room and copy its invite link into a second browser or private window. Join with a distinct name. The proposer cannot approve their own fix.

For a single production-style process:

```sh
npm run build
npm start
```

Open `http://127.0.0.1:8787`. Put this process behind an authenticated HTTPS preview on your Coshell drive when sharing remotely. A localhost URL will not work on another person's laptop.

## What works

- Three historical incidents: lost traction, reduced balance assistance, and disconnected fixed line.
- Shared playhead, playback controls, step-linked evidence, and named team messages rendered with assistant-ui.
- Server-issued participant credentials; room-scoped access and persistent SQLite state.
- Fix proposals with independent participant approval, stale proposal rejection, and approval invalidation on revision.
- One server-side job queue that serializes simulation execution across rooms.
- Paired baseline/fix reruns across seeds 4100, 4101, and 4102 when the live worker is configured.
- Explicit recorded-result mode when no simulation environment is available; it never invents additional runs.
- Optional live diagnosis through a server-side OpenAI-compatible endpoint.
- Attributed activity history and downloadable investigation evidence.

## Live MuJoCo worker

This repository does not copy the previous project's simulator, policy checkpoint, environment files, credentials, or Git history. It provides an optional adapter to a separate checkout:

```sh
git clone https://github.com/abhijitbetigeri/robot-incident-analyst.git ../robot-incident-analyst
```

Install that project's simulation dependencies in its own virtual environment using its README. Then copy `.env.example` to `.env` and set absolute paths:

```dotenv
SIM_SOURCE=/absolute/path/to/robot-incident-analyst
SIM_PYTHON=/absolute/path/to/robot-incident-analyst/.venv/bin/python
```

Restart the server. Each approved job creates fresh baseline and fixed environments with identical seeds and disturbance strength. Only allowlisted robot settings can change; reducing test difficulty is not allowed. The worker does not call the old model gateway, create issues, or send messages.

The timeline initially shows the historical incident. The Validation view reports new baseline/fix outcomes when live execution is enabled. A successful test is simulation evidence, not a claim of hardware safety or general robustness.

## Analyst configuration

With no model credentials, **Load recorded diagnosis** shows the original report and labels it as historical. This is not a live AI response.

For live analysis, set `ROOM_LLM_BASE_URL`, `ROOM_LLM_API_KEY`, and `ROOM_LLM_MODEL` in the server-only `.env`. The endpoint must implement `/chat/completions`. The model receives telemetry, pinned evidence, and recent discussion; structured fix values are validated before any proposal can use them. Live model connectivity must be tested with your chosen provider.

Coshell credits are used in the **Coshell coding session**. They are not assumed to be a general-purpose inference API key. Do not paste credentials into chat, the frontend, or Git.

## Coshell

See [the team setup guide](docs/COSHELL.md) and [the collaboration plan](docs/BUILD-PLAN.md).

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests use isolated state and recorded mode. Backend tests cover access boundaries, concurrent edits, approval enforcement, input validation, and interrupted jobs. Live simulation is verified separately with the configured simulator.

## Provenance and hackathon eligibility

The `fixtures/` directory contains selected historical telemetry and analyst output from [robot-incident-analyst](https://github.com/abhijitbetigeri/robot-incident-analyst), a prior hackathon project. Each fixture identifies its source artifact. The new app and collaboration workflow are separate work, but that does **not** establish hackathon eligibility. The optional live worker also depends on that previous simulator and policy.

Coshell's published rules prohibit prebuilt projects and require work in the team drive during the event. Obtain an organizer ruling before submitting this derivative concept or reusing its data/model. The app's activity export is **not** the Coshell build-session replay; capture the actual session replay separately. Never represent local development history as work performed inside Coshell.

## Prototype boundaries

This is a single-host team prototype. Invite URLs are bearer invitations; anyone with one can join. Participant names are self-asserted and approval separation is between browser identities, not verified employees. State refreshes approximately every 1.2 seconds. SQLite persists under `.data/`; use one API process, durable storage, and an access-controlled preview. Multi-tenant production use would need verified identity, organization authorization, rate limits, and a distributed worker queue.
