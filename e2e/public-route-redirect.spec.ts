import { test, expect } from "../playwright-fixture";

test.setTimeout(60000);

test("authenticated user is redirected from /, /login and /signup to /dashboard", async ({ page }) => {
  // Step 1 — Log in
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.getByLabel("Email").fill("gilbertogiombelli@gmail.com");
  await page.getByLabel("Password").fill("test1234");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 20000 });
  console.log("✅ Logged in. Current URL:", page.url());

  // Step 2 — Navigate to /  → should redirect to /dashboard
  await page.goto("/");
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  console.log("✅ / redirected to:", page.url());
  expect(page.url()).toContain("/dashboard");

  // Step 3 — Navigate to /login → should redirect to /dashboard
  await page.goto("/login");
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  console.log("✅ /login redirected to:", page.url());
  expect(page.url()).toContain("/dashboard");

  // Step 4 — Navigate to /signup → should redirect to /dashboard
  await page.goto("/signup");
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  console.log("✅ /signup redirected to:", page.url());
  expect(page.url()).toContain("/dashboard");
});
