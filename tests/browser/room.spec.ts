import { test, expect } from "@playwright/test";

test("two engineers share evidence, approve a fix, and inspect an honest recorded result", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const author = await first.newPage();
  const reviewer = await second.newPage();
  const errors: string[] = [];
  author.on("pageerror", (e) => errors.push(e.message));
  reviewer.on("pageerror", (e) => errors.push(e.message));
  await author.goto("/");
  await author.getByLabel("Your name").fill("Engineer");
  await author.getByRole("button", { name: "Create incident room" }).click();
  await expect(
    author.getByRole("heading", { name: "Lost traction on the ascent" }),
  ).toBeVisible();
  await reviewer.goto(author.url());
  await reviewer.getByLabel("Your name").fill("Reviewer");
  await reviewer.getByRole("button", { name: "Join room" }).click();
  await author.getByLabel("Simulation step").focus();
  await author.getByLabel("Simulation step").press("Home");
  await expect(reviewer.getByText("STEP 0001 / 495")).toBeVisible();
  await author
    .getByLabel("Evidence note")
    .fill("Uphill progress is near zero.");
  await author.getByRole("button", { name: "Pin", exact: true }).click();
  await expect(
    reviewer.getByRole("button", { name: /Uphill progress is near zero/ }),
  ).toBeVisible();
  await reviewer.getByLabel("Team message").fill("Check the traction setting.");
  await reviewer.getByRole("button", { name: "Send message" }).click();
  await expect(
    author.getByText("Reviewer\nCheck the traction setting."),
  ).toBeVisible();
  await author.getByRole("button", { name: "Load recorded diagnosis" }).click();
  await expect(author.getByLabel("Reason")).not.toHaveValue("");
  await author
    .getByLabel("Reason")
    .fill(
      "Traction is disabled; restore it while keeping the disturbance unchanged.",
    );
  await expect
    .poll(async () => reviewer.getByText("Shared workspace").isVisible())
    .toBeTruthy();
  await author.waitForTimeout(1500);
  await expect(author.getByLabel("Reason")).toHaveValue(
    "Traction is disabled; restore it while keeping the disturbance unchanged.",
  );
  await author.getByRole("button", { name: "Propose for review" }).click();
  await expect(
    author.getByRole("button", { name: "Approve fix" }),
  ).toBeDisabled();
  await reviewer.getByRole("button", { name: "Approve fix" }).click();
  await author.getByRole("button", { name: "Compare recorded result" }).click();
  await expect(
    author.getByRole("heading", { name: "Recovery demonstrated" }),
  ).toBeVisible();
  await expect(
    author.getByText("Historical result · no fresh execution"),
  ).toBeVisible();
  await expect(author.getByRole("cell", { name: "4100" })).toBeVisible();
  await author.reload();
  await expect(
    author.getByRole("heading", { name: "Lost traction on the ascent" }),
  ).toBeVisible();
  await expect(
    author.getByRole("button", { name: "View validation evidence" }),
  ).toBeVisible();
  await author.screenshot({
    path: "test-results/room-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await first.close();
  await second.close();
});

test("small screens remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Your name").fill("Mobile");
  await page.getByRole("button", { name: "Create incident room" }).click();
  await expect(
    page.getByRole("heading", { name: "Lost traction on the ascent" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/room-mobile.png",
    fullPage: true,
  });
});
