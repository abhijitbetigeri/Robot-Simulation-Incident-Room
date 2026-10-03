import { chromium, expect } from '@playwright/test';
import { mkdir, copyFile } from 'node:fs/promises';

// Uses a new room containing only public sample telemetry and demo identities.
// Both roles are operated by this script; this is not footage of two people.
const url = process.env.DEMO_URL || 'https://robot-simulation-incident-room-ab.style.dev';
await mkdir('.data/demo-recordings', { recursive: true });
await mkdir('submission', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: '.data/demo-recordings', size: { width: 1440, height: 1000 } },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const failures = [];
page.on('pageerror', e => failures.push(e.message));
const pause = ms => page.waitForTimeout(ms);
async function caption(text) {
  await page.evaluate(text => {
    let banner = document.getElementById('recording-caption');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'recording-caption';
      banner.style.cssText = 'position:fixed;bottom:14px;left:84px;right:22px;z-index:9999;background:#111821f2;color:#fff;border:1px solid #8baa73;border-radius:9px;padding:15px 22px;font:500 19px/1.5 sans-serif;box-shadow:0 5px 24px #0003;pointer-events:none';
      document.body.append(banner);
    }
    banner.textContent = text;
  }, text);
}
try {
  await page.goto(url);
  await caption('Robot Incident Room · A shared workspace for investigating robot failures');
  await pause(3500);
  await page.getByLabel('Your name').fill('Alex · Engineer');
  await page.getByRole('button', { name: 'Create incident room' }).click();
  await expect(page.getByRole('heading', { name: 'Lost traction on the ascent' })).toBeVisible();
  const roomUrl = page.url();
  const roomId = new URL(roomUrl).searchParams.get('room');
  const authorToken = await page.evaluate(id => sessionStorage.getItem('room-token:' + id), roomId);
  await caption('1 / Investigate · Historical MuJoCo telemetry shows the robot losing uphill progress');
  await pause(4000);
  await page.getByLabel('Simulation step').focus();
  await page.getByLabel('Simulation step').press('Home');
  await page.getByRole('button', { name: 'Play replay' }).click();
  await pause(4000);
  await page.getByRole('button', { name: 'Pause replay' }).click();
  await page.getByLabel('Evidence note').fill('Uphill progress is near zero. Check whether boot traction is enabled.');
  await page.getByRole('button', { name: 'Pin', exact: true }).click();
  await caption('2 / Pin evidence · Observations stay tied to a simulation step and their author');
  await pause(3500);
  await page.getByRole('button', { name: 'Load recorded diagnosis' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Load recorded diagnosis' }).click();
  await expect(page.getByLabel('Reason')).not.toHaveValue('');
  await caption('3 / Review diagnosis · This demo loads a recorded AI report, not a new model response');
  await pause(5000);
  await page.getByRole('button', { name: 'Propose for review' }).scrollIntoViewIfNeeded();
  await page.getByLabel('Reason').fill('Restore boot traction. Keep the slope, seed, and disturbance unchanged so the comparison stays fair.');
  await page.getByRole('button', { name: 'Propose for review' }).click();
  await expect(page.getByRole('button', { name: 'Approve fix' })).toBeDisabled();
  await caption('4 / Propose a fix · The proposer cannot approve their own change');
  await pause(5500);

  // Switch browser identity without displaying or exporting any credentials.
  await page.evaluate(id => sessionStorage.removeItem('room-token:' + id), roomId);
  await page.goto(roomUrl);
  await caption('5 / Reviewer role · The recording now switches to a separate participant identity');
  await page.getByLabel('Your name').fill('Morgan · Reviewer');
  await pause(2500);
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByRole('button', { name: 'Approve fix' })).toBeEnabled();
  await page.getByLabel('Team message').fill('Reviewed: enable traction without reducing the test difficulty.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('button', { name: 'Approve fix' }).scrollIntoViewIfNeeded();
  await caption('6 / Approve · Morgan reviews the evidence and approves Alex’s proposal');
  await pause(4000);
  await page.getByRole('button', { name: 'Approve fix' }).click();
  await expect(page.getByText('Reviewed by Morgan · Reviewer')).toBeVisible();
  await pause(4000);

  await page.evaluate(({ id, token }) => sessionStorage.setItem('room-token:' + id, token), { id: roomId, token: authorToken });
  await page.goto(roomUrl);
  await page.getByRole('button', { name: 'Compare recorded result' }).scrollIntoViewIfNeeded();
  await caption('7 / Compare · Back as Alex, inspect the result after independent approval');
  await pause(3000);
  await page.getByRole('button', { name: 'Compare recorded result' }).click();
  await expect(page.getByRole('heading', { name: 'Recovery demonstrated' })).toBeVisible();
  await caption('Historical single-seed comparison · No fresh simulation is executed in this cloud demo');
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(7000);
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await caption('8 / Audit trail · The room records who proposed, who approved, and what was compared');
  await pause(5000);
  await page.getByRole('button', { name: 'Export evidence' }).click();
  await caption('Inspect together. Review independently. Preserve the evidence.');
  await pause(4500);
  if (failures.length) throw new Error(failures.join('\n'));
  const video = page.video();
  await context.close();
  await copyFile(await video.path(), '.data/demo-recordings/approval-demo.webm');
  console.log('Recording complete: .data/demo-recordings/approval-demo.webm');
} finally {
  await browser.close();
}
