# Verification — October 3, 2026

## Application checks

- Production TypeScript/Vite build passed.
- Ten backend tests passed: room access, concurrent comments, shared evidence, approval separation, stale revisions, validation gating, input restrictions, recorded-mode honesty, persistence, and restart recovery.
- Two Chromium browser tests passed: the complete two-participant workflow and a 390-pixel-wide mobile layout. The workflow test also checks synchronized playhead movement, proposal draft preservation during polling, and reload persistence.
- Browser workflow reported no JavaScript page errors.

## Real simulation check

The optional worker was exercised with the existing local `robot-incident-analyst` environment. A complete API job used two distinct participants to propose and approve `boot_traction_enabled = true`, then compared fresh baseline and fixed rollouts. Disturbance strength stayed at 700 N.

| Seed | Baseline | With fix | Baseline ascent | Fixed ascent |
|---|---|---|---|---|
| 4100 | Failure | Success | -0.007 m | 1.530 m |
| 4101 | Episode limit | Success | -0.009 m | 1.504 m |
| 4102 | Failure | Episode limit | -0.004 m | 2.938 m |

The aggregate validation correctly **did not pass**: only two of three fixed runs satisfied the simulator's success flag. Reaching a larger ascent did not override the underlying success criterion. The API job completed in approximately 103 seconds on this laptop; runtime will vary by host.

## Not yet verified

- Live analyst inference using the user's selected provider credits.
- Multi-user access through the final Coshell shared preview.
- A public/production deployment.
- Organizer approval for reuse of historical fixtures or the original simulator/model.

The app's recorded diagnosis and single-seed fallback are explicitly labeled. Local verification does not constitute a Coshell build-session replay.
