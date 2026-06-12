import { expect, test } from "@playwright/test";

/**
 * E2E for the personal macro playbook (/playbook).
 *
 * Exercises the round trip: fill the form, the summary updates;
 * persistence to localStorage; the share-link URL preseeds the
 * form in a fresh context.
 */
test.describe("Playbook generator", () => {
  test("hydrates to empty state on a clean visit", async ({ page }) => {
    await page.goto("/playbook");
    await expect(page.getByRole("heading", { name: /Personal Macro Playbook/i })).toBeVisible();
    await expect(
      page.getByText(/Answer at least one axis above to see your playbook/i),
    ).toBeVisible();
  });

  test("answering an axis updates the summary inline", async ({ page }) => {
    await page.goto("/playbook");
    await page
      .getByRole("radio", { name: /Easing — cuts in the pipeline/i })
      .check();

    const summary = page.locator("section").last();
    await expect(summary.getByText(/Easing — cuts in the pipeline/i)).toBeVisible();
    await expect(summary.getByText(/1 of 8 axes answered/i)).toBeVisible();
  });

  test("answers persist across reload (localStorage)", async ({ page }) => {
    await page.goto("/playbook");
    await page
      .getByRole("radio", { name: /Extend duration .* 5-10y Treasuries/i })
      .check();
    await page
      .getByRole("radio", { name: /Counter-cyclical sector/i })
      .check();

    await page.reload();
    // The summary should still mention both choices after reload.
    await expect(
      page.getByText(/Extend duration · 5-10y Treasuries/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Counter-cyclical sector/i).first(),
    ).toBeVisible();
  });

  test("share link preseeds the form in a fresh browser context", async ({
    browser,
  }) => {
    // First context: fill a couple of axes then read the share URL.
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto("/playbook");
    await page1
      .getByRole("radio", { name: /Tightening — hikes still ahead/i })
      .check();
    await page1
      .getByRole("radio", { name: /Leveraged · margin or BTL property/i })
      .check();

    // Construct the share URL by calling the same encode logic via the page
    // (we don't have access to the helper from the browser context directly).
    // Easiest path: read localStorage and base64url-encode in the test.
    const stateJson = await page1.evaluate(() =>
      localStorage.getItem("causeway.playbook.v1"),
    );
    expect(stateJson).toBeTruthy();
    const b64 = base64urlEncode(stateJson!);

    // Second context (clean localStorage) — open the share URL and assert
    // the form is preseeded.
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(`/playbook?state=${b64}`);
    await expect(
      page2.getByText(/Tightening — hikes still ahead/i).first(),
    ).toBeVisible();
    await expect(
      page2.getByText(/Leveraged · margin or BTL property/i).first(),
    ).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });
});

// Match the base64url encoder in lib/playbook.ts so the e2e doesn't need
// the helper imported.
function base64urlEncode(s: string): string {
  // Node has Buffer; both contexts in Playwright are Node-side test code.
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
