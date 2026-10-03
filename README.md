# Robot-Simulation-Incident-Room

A shared workspace where robotics engineers investigate simulation failures and validate fixes together.

**[Open the live app](https://robot-simulation-incident-room-ab.style.dev)** · **[Watch the 60-second voiced demo](submission/demo.mp4)** · **[Download MP4](https://github.com/abhijitbetigeri/Robot-Simulation-Incident-Room/raw/refs/heads/main/submission/demo.mp4)**

Failed robot simulations produce telemetry, but a proposed fix still needs evidence and another engineer's review. Robot Incident Room brings that work into one shared investigation: inspect the same moment, pin observations, discuss a diagnosis, propose a configuration change, and review the resulting comparison.

**The proposer cannot approve their own fix.** Changing a proposal clears its approval and validation results, so a new configuration must be reviewed again.

## Try the approval demo

1. Open the [live app](https://robot-simulation-incident-room-ab.style.dev), enter your name, and choose **Create incident room**. Use the default lost-traction incident.
2. Click **Invite teammate** and have another person join that same link with a different name. For a solo rehearsal, use an incognito window as the reviewer.
3. Inspect the timeline and pin an observation. Click **Load recorded diagnosis** to populate a suggested fix and its rationale.
4. In **Proposed fix**, click **Propose for review**. Your own **Approve fix** button is disabled.
5. In the reviewer's window, click **Approve fix**.
6. Return to the proposer and click **Compare recorded result**. Inspect the before/after evidence, then open **Activity** or choose **Export evidence**.

The approval button appears only after a proposal is submitted. On narrow screens, the Proposed fix panel is below the telemetry and analyst sections.

The [60-second recording](submission/demo.mp4) includes captions and synthesized narration. It operates two demo identities automatically; it is a product demonstration, not footage of two human teammates or a Coshell coding-session replay. See [demo notes and reproduction instructions](submission/DEMO.md).

## Current deployment

| Capability | Public cloud demo | Optional configured environment |
|---|---|---|
| Shared telemetry, evidence pins, and discussion | Live, persisted collaboration | Same workflow |
| Proposal and reviewer approval | Enforced by the backend | Same approval checks |
| Analyst diagnosis | Historical report, explicitly labeled | Fresh inference through a configured model provider |
| Simulation comparison | Historical single-seed result, explicitly labeled | Fresh paired baseline/fix runs across three seeds |
| Activity and evidence export | Available | Available |

The public demo runs on a Freestyle VM as a persistent service. It does **not** execute new AI inference or simulation jobs. The recorded comparison demonstrates recovery on one historical seed; it does not establish general reliability.

The live simulation adapter was tested separately on the local simulator. The traction fix succeeded on **2 of 3 seeds**; the third reached the episode limit. The app correctly left aggregate validation unsuccessful. See [the local validation results](docs/VERIFICATION.md).

## Architecture and integrations

| Component | Role |
|---|---|
| React, TypeScript, Vite, Recharts | Investigation interface and telemetry visualization |
| assistant-ui | Shared discussion UI backed by server-owned messages |
| Python standard-library HTTP server + SQLite | Room state, participant credentials, approvals, and activity history |
| Serialized worker queue | One owner for simulation execution across rooms |
| Coshell | Shared coding drive for team sessions and project work |
| Freestyle | Cloud VM and HTTPS endpoint for the deployed app |
| MuJoCo + the original G1 project | Optional simulation environment and trained policy |

Coshell's build-session replay and the app's investigation history are separate artifacts. The application currently synchronizes through its own backend, not through a Coshell API.

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

Open `http://127.0.0.1:8787`. These commands run on the machine where you enter them. To run on a cloud drive, use that drive's terminal; your Mac's localhost URL is not a cloud deployment.

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

Freestyle infrastructure credentials and model-provider credentials serve different purposes:

| Variable | Purpose |
|---|---|
| `FREESTYLE_API_KEY` | Freestyle CLI/SDK access for cloud infrastructure |
| `ROOM_LLM_BASE_URL` | Inference provider's API base URL, normally ending in `/v1` |
| `ROOM_LLM_API_KEY` | That provider's inference credential |
| `ROOM_LLM_MODEL` | Model identifier accepted by that provider |

A Freestyle token does not power the analyst. Configure coding-agent provider access separately in Coshell. Keep all credentials in server-side, git-ignored configuration; never include them in frontend code or recordings.

## Coshell

See [the team setup guide](docs/COSHELL.md) and [the collaboration plan](docs/BUILD-PLAN.md). Open the project on the team's cloud drive, invite teammates, and preserve the actual shared-session replay for submission.

## Deployment operations

The current public release uses:

- Service: `robot-incident-room-demo`
- App directory: `/home/ubuntu/robot-room-demo`
- Persistent data: `/home/ubuntu/robot-room-data`
- Internal port: `8790`, served publicly over HTTPS by Freestyle

In the Freestyle VM's terminal:

```sh
sudo systemctl status robot-incident-room-demo
sudo journalctl -u robot-incident-room-demo -n 50 --no-pager
```

The service is enabled at boot and restarts on failure. Its release directory is separate from a development checkout: editing another checkout does not automatically update the deployed release. The local development default remains port `8787`.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Verified during delivery:

- Production TypeScript/Vite build passed.
- Ten backend tests passed, covering access boundaries, concurrent edits, approval enforcement, input validation, persistence, and interrupted jobs.
- Two Chromium tests passed, covering the two-participant workflow and mobile layout.
- The public HTTPS site passed a separate two-participant approval and recorded-comparison browser check without JavaScript page errors.
- The optional local simulation worker completed a real three-seed validation job; see the **2/3** outcome above.

The automated browser tests use isolated state and recorded mode. Live model-provider connectivity remains unverified.

## Provenance and hackathon eligibility

The `fixtures/` directory contains selected historical telemetry and analyst output from [robot-incident-analyst](https://github.com/abhijitbetigeri/robot-incident-analyst), a prior hackathon project. Each fixture identifies its source artifact. The new app and collaboration workflow are separate work, but that does **not** establish hackathon eligibility. The optional live worker also depends on that previous simulator and policy.

Coshell's published rules prohibit prebuilt projects and require work in the team drive during the event. Obtain an organizer ruling before submitting this derivative concept or reusing its data/model. The app's activity export is **not** the Coshell build-session replay; capture the actual session replay separately. Never represent local development history as work performed inside Coshell.

## Prototype boundaries

This is a single-host team prototype. The public demo is reachable without an organization login. Invite URLs are bearer invitations; anyone with one can join. Participant names are self-asserted and approval separation is between browser identities, not verified employees. Use sample data in the public demo.

State refreshes approximately every 1.2 seconds. SQLite persists under `.data/` by default, or the directory set by `ROOM_DATA_DIR`. Multi-tenant production use would need verified identity, organization authorization, rate limits, and a distributed worker queue. No robot hardware commands are issued.
