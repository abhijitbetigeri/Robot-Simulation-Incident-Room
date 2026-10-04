# Fix approval demo

[Watch or download the demo](demo.mp4)

Live app: https://robot-simulation-incident-room-ab.style.dev

This 60-second screen recording includes captions and a synthesized Samantha voiceover. It shows the deployed application's real workflow:

1. Create an investigation room and inspect historical robot telemetry.
2. Pin evidence to a simulation step.
3. Load the clearly labeled recorded diagnosis.
4. Propose enabling boot traction without changing test difficulty.
5. Show that the proposer cannot approve their own fix.
6. Switch to a separate reviewer identity, add a review comment, and approve.
7. Return to the proposer and inspect the historical before/after comparison.
8. Show the attributed activity trail and export evidence.

## Accurate presentation

The recording is automated and operates the placeholder identities `xvz` and `abc (reviewer)`. It demonstrates two distinct application participants, not footage of two human teammates. It contains only sample telemetry and purpose-created demo comments.

The cloud demo loads a historical AI diagnosis and single-seed simulation result. No new model inference or simulation occurs in this recording. The optional local live worker was separately tested across three seeds; see [verification](../docs/VERIFICATION.md).

This video demonstrates the product. It is not a Coshell coding-session replay and must not be submitted as one.

## Reproduce

```sh
npm ci
npx playwright install chromium
node scripts/record-demo.mjs
```

The script saves a WebM under the ignored `.data/demo-recordings/` directory. Convert it to the committed MP4 with FFmpeg:

```sh
ffmpeg -y -i .data/demo-recordings/approval-demo.webm \
  -t 60 -r 30 -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
  -movflags +faststart -an submission/demo.mp4
```

On macOS, add the synchronized voiceover using the built-in `say` command and FFmpeg (or the `imageio-ffmpeg` Python package):

```sh
python3 scripts/add-demo-voice.py
```

The editable narration and segment timings are in [narration.json](narration.json).
