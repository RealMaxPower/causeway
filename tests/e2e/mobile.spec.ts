import { devices, expect, test } from "@playwright/test";

/**
 * Mobile-viewport smoke tests for node pages.
 *
 * Memory flagged "mobile broken on node pages." These checks lock in:
 *   - node page renders without layout overflow (no horizontal scroll on iPhone 13)
 *   - mobile drawer (hamburger) opens and lists tracks
 *   - the regime composer widget on H1 is interactive at touch-pointer width
 *   - the related-nodes rail (when present) renders without overflow
 */
test.use({ ...devices["iPhone 13"] });

test.describe("Mobile viewport", () => {
  test("node page renders and has no horizontal overflow", async ({ page }) => {
    await page.goto("/nodes/A3");
    await expect(page.getByRole("heading", { name: /How banks create money/i }).first()).toBeVisible();
    // No horizontal scrollbar — body content should fit the viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("mobile drawer opens and shows track list", async ({ page }) => {
    await page.goto("/nodes/A3");
    // The MobileNav hamburger is the first interactive control before the brand.
    const hamburger = page.getByRole("button", { name: /open track map|open menu/i }).first();
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.getByRole("dialog", { name: /track map/i })).toBeVisible();
  });

  test("H1 page loads and renders the regime composer", async ({ page }) => {
    await page.goto("/nodes/H1?l=2");
    // The widget renders the "Try the controls" badge we added.
    await expect(page.getByText(/Try the controls/i).first()).toBeVisible();
    // Slider controls are present and reachable.
    const inflationSlider = page.locator('input[type="range"]').first();
    await expect(inflationSlider).toBeVisible();
  });

  /**
   * Track H is the priority for the mobile audit per docs/ROADMAP.md.
   * Each L2 page renders the node's widget; this sweep verifies that no
   * page introduces horizontal overflow at 390px (iPhone 13).
   */
  const TRACK_H_NODES = ["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9"];
  for (const id of TRACK_H_NODES) {
    test(`/nodes/${id}?l=2 fits the iPhone 13 viewport`, async ({ page }) => {
      await page.goto(`/nodes/${id}?l=2`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("widget number inputs hit the 44px touch-target minimum", async ({ page }) => {
    // H7 hosts the leverage-stress widget which has the most number inputs.
    await page.goto("/nodes/H7?l=2");
    const numberInput = page.locator('input[type="number"]').first();
    await expect(numberInput).toBeVisible();
    const box = await numberInput.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
