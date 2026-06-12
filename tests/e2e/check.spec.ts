import { expect, test } from "@playwright/test";

/**
 * E2E for the inline comprehension-check primitive (<Check>).
 *
 * Lands on the first node that's been backfilled (A1) at layer 3, exercises
 * the correct + incorrect paths, then verifies the same component renders
 * correctly on A3's L3.
 */
test.describe("Comprehension checks", () => {
  test("A1 L3 · picking the correct option reveals the success state", async ({
    page,
  }) => {
    await page.goto("/nodes/A1?l=3");
    const check = page.getByRole("group", {
      name: /Which best describes the historical origin of money/i,
    });
    await expect(check).toBeVisible();

    await check
      .getByRole("radio", {
        name: /Credit and debt accounting came first/i,
      })
      .check();
    await check.getByRole("button", { name: /check answer/i }).click();

    await expect(check.getByText(/^Correct\.$/)).toBeVisible();
    await expect(
      check.getByText(/Temple ledgers in Mesopotamia/i).first(),
    ).toBeVisible();
    await expect(check.getByRole("button", { name: /try again/i })).toBeVisible();
  });

  test("A1 L3 · picking the wrong option shows the per-option explanation + correct answer", async ({
    page,
  }) => {
    await page.goto("/nodes/A1?l=3");
    const check = page.getByRole("group", {
      name: /Which best describes the historical origin of money/i,
    });
    await check
      .getByRole("radio", { name: /Barter economies/i })
      .check();
    await check.getByRole("button", { name: /check answer/i }).click();

    await expect(check.getByText(/^Not quite\.$/)).toBeVisible();
    await expect(
      check.getByText(/No archaeologist has ever found a pure-barter society/i),
    ).toBeVisible();
    // The see-also link should appear when the answer was wrong.
    await expect(
      check.getByRole("link", { name: /Re-read the credit-first story in L2/i }),
    ).toBeVisible();
  });

  test("A1 L3 · 'Try again' resets the check", async ({ page }) => {
    await page.goto("/nodes/A1?l=3");
    const check = page.getByRole("group", {
      name: /Which best describes the historical origin of money/i,
    });
    await check
      .getByRole("radio", { name: /Gold and silver/i })
      .check();
    await check.getByRole("button", { name: /check answer/i }).click();
    await expect(check.getByText(/^Not quite\.$/)).toBeVisible();

    await check.getByRole("button", { name: /try again/i }).click();
    await expect(check.getByText(/^Not quite\.$/)).not.toBeVisible();
    // After reset, the Check-answer button is back and disabled (no selection).
    await expect(check.getByRole("button", { name: /check answer/i })).toBeDisabled();
  });

  test("A3 L3 · the check renders and accepts the correct answer", async ({
    page,
  }) => {
    await page.goto("/nodes/A3?l=3");
    const check = page.getByRole("group", {
      name: /A bank issues a \$200,000 mortgage/i,
    });
    await expect(check).toBeVisible();

    await check
      .getByRole("radio", {
        name: /It rises by \$200,000/i,
      })
      .check();
    await check.getByRole("button", { name: /check answer/i }).click();
    await expect(check.getByText(/^Correct\.$/)).toBeVisible();
  });
});
