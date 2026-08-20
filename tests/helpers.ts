import type { Page } from "@playwright/test";

export async function signIn(page: Page, username = "deepan", password = "admin12345") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/agents");
}
