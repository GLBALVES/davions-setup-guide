/**
 * Regression test: davions.com must be treated as the app's own domain,
 * not as a photographer's custom domain. Previously the hostname was missing
 * from APP_HOSTNAMES, causing the app to render "Store not found".
 */
import { test, expect } from "../playwright-fixture";

test("davions.com hostname is in APP_HOSTNAMES — no Store not found on root", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const bodyText = await page.locator("body").innerText();
  expect(bodyText.toLowerCase()).not.toContain("store not found");
});

test("preview URL root does not render CustomDomainStore", async ({ page }) => {
  test.setTimeout(30000);

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // The custom domain store shows a "Powered by Davions" footer — must NOT appear on main app
  const poweredBy = page.getByText("Powered by Davions");
  await expect(poweredBy).not.toBeVisible();
});
