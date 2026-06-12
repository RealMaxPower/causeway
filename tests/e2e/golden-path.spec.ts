import { expect, test } from "@playwright/test";

/**
 * Golden-path E2E for Causeway.
 *
 * Walks the canonical first-time-user route: home → Track A → A3 →
 * Layer 2 → manipulate the bank-sandbox widget → open the tutor.
 *
 * Verifies the spine that every other node depends on. If this passes,
 * the chrome, MDX rendering, widget hydration, layer routing, and
 * tutor UI are all intact.
 */
test.describe("Causeway golden path", () => {
  test("home page renders the eight-track grid", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Causeway/);
    await expect(page.getByRole("heading", { name: /the eight tracks/i })).toBeVisible();
    // All eight track cards present as links
    for (const letter of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      await expect(page.locator(`a[href="/tracks/${letter}"]`).first()).toBeVisible();
    }
  });

  test("Track A page lists A1-A6 nodes", async ({ page }) => {
    await page.goto("/tracks/A");
    await expect(page.getByRole("heading", { name: /money: what it actually is/i })).toBeVisible();
    // Each id also appears in SideNav and the (hidden) MobileNav drawer.
    // Scope to the main content list to assert the page-level rendering.
    const main = page.locator("main");
    for (const id of ["A1", "A2", "A3", "A4", "A5", "A6"]) {
      await expect(main.locator(`a[href="/nodes/${id}"]`)).toBeVisible();
    }
  });

  test("A3 L1 → L2 → L3 layer routing works via the URL", async ({ page }) => {
    // L1 (default): pocket content with the bank-creates-money insight
    await page.goto("/nodes/A3");
    await expect(page.getByRole("heading", { name: /how banks/i })).toBeVisible();
    await expect(page.getByText(/loan and a matching deposit/i)).toBeVisible();

    // L2: bank-sandbox widget renders
    await page.goto("/nodes/A3?l=2");
    await expect(page.getByText(/Bank Balance Sheet · Sandbox/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Issue loan/i })).toBeVisible();

    // L3: history + debate + sources
    await page.goto("/nodes/A3?l=3");
    await expect(page.getByText(/loan-creates-deposit insight/i)).toBeVisible();
    await expect(page.getByText(/Bank of England/i).first()).toBeVisible();
  });

  test("bank-sandbox: issuing a loan changes both sides of the balance sheet", async ({ page }) => {
    await page.goto("/nodes/A3?l=2");
    // The widget defaults to Alice + $500. Clicking the loan button should
    // make a new Loan · Alice row + Deposit · Alice row appear.
    const before = await page.getByText("Loan · Alice").count();
    expect(before).toBe(0);

    await page.getByRole("button", { name: /Issue loan → Alice/ }).click();

    await expect(page.getByText("Loan · Alice")).toBeVisible();
    await expect(page.getByText("Deposit · Alice")).toBeVisible();

    // The event log announces the loan with money-supply commentary
    await expect(page.getByText(/money supply \+\$500/i)).toBeVisible();
  });

  test("tutor FAB opens to a panel scoped to the current node", async ({ page }) => {
    await page.goto("/nodes/A3?l=2");

    const fab = page.getByRole("button", { name: /open tutor/i });
    await expect(fab).toBeVisible();
    await fab.click();

    const dialog = page.getByRole("dialog", { name: /causeway tutor/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Scope · A3 · How banks create money/i)).toBeVisible();
    await expect(dialog.getByPlaceholder(/ask anything about this node/i)).toBeVisible();

    // Close with the × button
    await dialog.getByRole("button", { name: /close tutor/i }).click();
    await expect(dialog).not.toBeVisible();
    await expect(fab).toBeVisible();
  });

  test("/regime page renders with at least three live-or-snapshot axes", async ({ page }) => {
    await page.goto("/regime");
    await expect(page.getByRole("heading", { name: /Reading the regime|regime/i }).first()).toBeVisible();
    // Three named axes should be visible
    await expect(page.getByText(/Inflation/i).first()).toBeVisible();
    await expect(page.getByText(/Money|monetary/i).first()).toBeVisible();
    await expect(page.getByText(/Labor|unemployment/i).first()).toBeVisible();
  });

  test("keyboard layer-switching with 1/2/3 keys", async ({ page }) => {
    await page.goto("/nodes/A3");
    // Wait for the LayerSwitch component (and its keydown listener) to mount.
    await expect(page.getByRole("tab", { name: /Pocket/ })).toBeVisible();
    // Ensure the page has focus before sending keys.
    await page.locator("body").click();

    // Press 2 → URL gains ?l=2 and the widget appears
    await page.keyboard.press("2");
    await expect(page).toHaveURL(/\?l=2/);
    await expect(page.getByText(/Bank Balance Sheet/i)).toBeVisible();

    // Press 3 → L3 content
    await page.keyboard.press("3");
    await expect(page).toHaveURL(/\?l=3/);

    // Press 1 → back to pocket
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\?l=1|\/nodes\/A3(\?|$)/);
  });

  test("skip-link is the first focusable element and lands on main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    // Focus should now be on the <main id="main"> element
    const main = page.locator("main#main");
    await expect(main).toBeFocused();
  });
});
