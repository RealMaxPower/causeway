import { expect, test } from "@playwright/test";

/**
 * E2E for /compare.
 *
 * Run with WORLDBANK_OFFLINE=1 to force the fallback path so the test
 * is deterministic and doesn't depend on the public World Bank API
 * being reachable from CI.
 */
test.describe("Country compare", () => {
  test("renders default USA/CHN/DEU comparison", async ({ page }) => {
    await page.goto("/compare");
    const hero = page.getByRole("heading", { level: 1 });
    await expect(hero).toContainText("United States");
    await expect(hero).toContainText("China");
    await expect(hero).toContainText("Germany");
    // Default indicators all appear as panel headings
    await expect(page.getByRole("heading", { name: /GDP per capita/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Inflation.*annual %/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Current account/i }),
    ).toBeVisible();
  });

  test("clicking a country chip removes it from the comparison", async ({
    page,
  }) => {
    await page.goto("/compare");
    // The chip should be active; clicking it removes the country.
    const chinaChip = page.getByRole("button", { name: /China/, pressed: true });
    await expect(chinaChip).toBeVisible();
    await chinaChip.click();

    // After removal, the URL no longer contains CHN. Account for URLSearchParams
    // encoding (comma → %2C) by checking each token separately.
    await expect(page).toHaveURL(/USA/);
    await expect(page).toHaveURL(/DEU/);
    await expect(page).not.toHaveURL(/CHN/);
    // And the H1 should not mention China.
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/China/i);
  });

  test("clicking an inactive indicator chip adds it", async ({ page }) => {
    await page.goto("/compare");
    const govDebt = page.getByRole("button", { name: /Gov debt/ });
    await expect(govDebt).toHaveAttribute("aria-pressed", "false");
    await govDebt.click();

    await expect(page).toHaveURL(/i=.*GC\.DOD\.TOTL\.GD\.ZS/);
    await expect(
      page.getByRole("heading", { name: /Central gov debt/i }),
    ).toBeVisible();
  });

  test("snapshot badge appears when offline", async ({ page }) => {
    // Only assert this when the env var is on; the test runner is invoked
    // with WORLDBANK_OFFLINE=1 from package.json scripts in CI.
    test.skip(
      process.env.WORLDBANK_OFFLINE !== "1",
      "Skipped unless WORLDBANK_OFFLINE=1",
    );
    await page.goto("/compare");
    await expect(page.getByText(/snapshot/i).first()).toBeVisible();
  });
});
