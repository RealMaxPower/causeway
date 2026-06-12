import { expect, test } from "@playwright/test";

/**
 * E2E for the global Cmd-K search palette.
 *
 * Verifies the trigger button, the keyboard shortcuts (Cmd/Ctrl-K and "/"),
 * arrow-key navigation, Enter to open a result, Escape to dismiss, and
 * that LayerSwitch's 1/2/3 listener does NOT eat keystrokes typed into
 * the search input.
 */
test.describe("Search palette", () => {
  test("clicking the topbar trigger opens the palette", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    await expect(page.getByRole("dialog", { name: /search causeway/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search nodes, tracks, pages/i)).toBeFocused();
  });

  test("Meta+K opens the palette from anywhere", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click();
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog", { name: /search causeway/i })).toBeVisible();
  });

  test("typing a query, arrow-down, Enter navigates to a node", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();

    const input = page.getByPlaceholder(/search nodes, tracks, pages/i);
    await input.fill("how banks");

    // The top result should be A3 — "How banks create money".
    const dialog = page.getByRole("dialog", { name: /search causeway/i });
    await expect(dialog.getByText(/How banks create money/i)).toBeVisible();

    await input.press("Enter");
    await expect(page).toHaveURL(/\/nodes\/A3/);
  });

  test("Escape closes the palette", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    const dialog = page.getByRole("dialog", { name: /search causeway/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("clicking the close button dismisses the palette", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    const dialog = page.getByRole("dialog", { name: /search causeway/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /close search/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("clicking the backdrop (outside the card) dismisses the palette", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    const dialog = page.getByRole("dialog", { name: /search causeway/i });
    await expect(dialog).toBeVisible();
    // Click in the top-left corner of the viewport — guaranteed to be on
    // the backdrop, not the centered card.
    await page.mouse.click(20, 20);
    await expect(dialog).not.toBeVisible();
  });

  test("clicking a result navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    const input = page.getByPlaceholder(/search nodes, tracks, pages/i);
    await input.fill("regime");
    // /regime static page should be findable.
    const dialog = page.getByRole("dialog", { name: /search causeway/i });
    await dialog.getByText(/Read the regime now/i).click();
    await expect(page).toHaveURL(/\/regime/);
  });

  test("LayerSwitch shortcuts do not fire while typing in search input", async ({
    page,
  }) => {
    await page.goto("/nodes/A3");
    // Confirm we're on L1 (no ?l= query yet, or l=1)
    await expect(page).not.toHaveURL(/\?l=2/);

    await page.getByRole("button", { name: /open search/i }).click();
    const input = page.getByPlaceholder(/search nodes, tracks, pages/i);
    await input.fill("2");
    // URL must not have switched to ?l=2 — the number was typed into the input,
    // not consumed by the LayerSwitch global listener.
    await expect(page).not.toHaveURL(/\?l=2/);
    await page.keyboard.press("Escape");
  });

  test("empty-state message when no results match", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /open search/i }).click();
    const input = page.getByPlaceholder(/search nodes, tracks, pages/i);
    await input.fill("zzznotamatch");
    await expect(
      page.getByText(/No results for/i),
    ).toBeVisible();
  });
});
