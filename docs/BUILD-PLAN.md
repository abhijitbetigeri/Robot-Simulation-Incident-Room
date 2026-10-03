# Team build and demo plan

## Product

An engineer flags a failing simulation moment. A teammate adds context. The analyst offers an evidence-backed diagnosis. A specific configuration change is proposed, reviewed by another participant, and tested against the same baseline seeds.

## Delivered slice

- Shared room, telemetry playhead, annotations, and persistent team discussion.
- assistant-ui ExternalStoreRuntime backed by server-owned messages.
- Proposal revisions and independent participant approval.
- Serialized optional MuJoCo worker and honest recorded-result fallback.
- Three-seed comparison, audit history, and evidence export.

## Division of team work

1. Investigation owner: select the incident, inspect telemetry, and pin evidence.
2. Reviewer: challenge the diagnosis, review the proposal, and check baseline/fix comparability.
3. Demo owner, if available: exercise the two-browser flow and prepare the submission artifacts.

Everyone contributes named prompts and reviews someone else's work in the actual Coshell session. The existing local implementation is not a substitute for that replay.

## Three-minute demo

- 0:00–0:25: Explain why failed robot simulations are expensive to investigate.
- 0:25–1:00: Two browser sessions open the same room. One engineer moves the playhead; the other pins evidence.
- 1:00–1:35: Show the diagnosis and propose a configuration fix. State whether the report is recorded or live.
- 1:35–2:20: The second participant approves. Run validation or inspect already completed fresh results, accurately labeled.
- 2:20–2:50: Compare matched baseline/fix seeds and export the evidence.
- 2:50–3:00: State the customer: robotics teams investigating large numbers of failed simulation episodes.

## Scope deliberately deferred

Billing, policy training, robot hardware control, verified enterprise identity, automated GitHub publication, and a hosted production deployment. Add them only after the core team workflow is reliable.
