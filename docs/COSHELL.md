# Run the team workspace in Coshell

Official reference: https://coshell.ai/docs

## Browser setup

1. Sign in at https://coshell.ai and create or choose your organization.
2. Choose **New drive**. Pick your own machine or the offered provider (the hackathon lists Freestyle).
3. Follow the commands shown by Coshell to bring the drive online.
4. Open the project folder and start a shared session.
5. Invite teammates to the organization and have them join that same drive/session.
6. Configure your provider or sponsor credits through Coshell's model/provider controls. Keep keys out of the repository. Exact credit redemption steps depend on the credit issuer; use the event's instructions.

## CLI setup

On this laptop the CLI was installed to `~/.coshell/bin/coshell` without changing shell startup files.

```sh
export PATH="$HOME/.coshell/bin:$PATH"
coshell login --web
coshell host doctor
coshell host init --name robot-simulation-incident-room
coshell drives
coshell attach robot-simulation-incident-room
```

`host init` asks where the drive should run. Choose the isolation mode appropriate for the team. Do not expose unrelated personal folders or credentials to teammates. When using a cloud/container drive, clone the repositories and install the simulation dependencies there; laptop-local paths do not transfer.

Inside the drive:

```sh
git clone https://github.com/abhijitbetigeri/Robot-Simulation-Incident-Room.git
cd Robot-Simulation-Incident-Room
npm ci
npm run build
ROOM_HOST=0.0.0.0 npm start
```

Use the drive's browser preview for port **8787**, restricted to the team. The project repository is private, so the drive needs authorized GitHub access. Keep the process running for collaborators to use the same SQLite-backed room.

## Team session prompt

> Open README.md and docs/BUILD-PLAN.md. This is Robot-Simulation-Incident-Room. Use the existing shared drive and preserve authorship of each teammate's prompts. Keep recorded evidence labeled. Never bypass a teammate's approval, fabricate successful tests, or include credentials in commits. Run the relevant checks before changing the shared preview. Document which work was performed in this Coshell session and preserve the session replay separately from the application's investigation export.

## Credit scope

Coshell hosts the collaborative coding session and model selection. The app's optional runtime model uses a separately configured, documented OpenAI-compatible inference endpoint. Do not infer an endpoint or reuse a Coshell access token as an inference key.

## Submission artifacts

- Deployed, reachable app URL.
- Repository access for judges.
- Actual Coshell session replay with named team contributions.
- Three-minute demo.
- Disclosure and organizer ruling for historical fixtures and the optional original simulation dependency.
