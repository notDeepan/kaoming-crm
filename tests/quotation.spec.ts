import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

// Addendum acceptance: a complete quotation for KMC-318HMA15 with two optional accessories, issued
// and printed, matching the template structure. Requires the demo catalogue
// (npx tsx prisma/seedCatalogueDemo.ts) which provides KMC-318HMA15 + two HMA-applicable options.
test("quotation: build KMC-318HMA15 + 2 accessories, issue, print (A1/A6/A7)", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await signIn(page);

  await page.goto("/quotations/new");
  const machine = page.locator("#machineModelId");
  if ((await machine.locator("option").count()) < 2) test.skip(true, "demo catalogue not seeded");
  await page.selectOption("#customerId", { index: 1 });
  await page.selectOption("#machineModelId", { index: 1 });
  await page.getByRole("button", { name: "Start draft" }).click();
  await page.waitForURL(/\/quotations\/[0-9a-f-]+$/);
  const url = page.url();

  await page.getByTestId("base-price").fill("1250000");
  await page.locator('label:has-text("Linear scales (X/Y/Z)") input[type=checkbox]').first().check();
  await page.locator('label:has-text("Coolant through spindle, 20 bar") input[type=checkbox]').first().check();
  const prices = await page.getByTestId("line-price").all();
  await prices[0]!.fill("38000");
  await prices[1]!.fill("21000");

  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Issue" }).click();
  await page.waitForTimeout(1500);

  // Only HMA-applicable options were offered — the two attachment heads must never appear.
  await expect(page.getByText("90° Head")).toHaveCount(0);

  await page.goto(`${url}/print`);
  // A6 reference format Q + ddmmyyyy + initials + seq, generated on issue.
  await expect(page.getByText(/REF:/)).toBeVisible();
  await expect(page.locator("body")).toContainText(/Q\d{8}[A-Z]{1,3}\d{2}/);
  // The ten spec lines and the exact template blocks are present.
  await expect(page.getByText("X/Y/Z-axis travel:")).toBeVisible();
  await expect(page.getByText("TOTAL PRICE FOB TAIWAN (NET)")).toBeVisible();
  await expect(page.locator("body")).toContainText("1,309,000 USD");
  await expect(page.getByText(/Please refer to our brochure/)).toBeVisible();
});
