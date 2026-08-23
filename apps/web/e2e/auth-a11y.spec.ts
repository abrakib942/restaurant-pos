import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/login";

test.describe("auth lockout", () => {
  test("locks after repeated bad PINs", async ({ page }) => {
    const probeUser = `probe-${Date.now()}`;
    await page.goto("/login");

    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Username").fill(probeUser);
      await page.getByLabel("PIN").fill("0000");
      await page.getByRole("button", { name: "Enter" }).click();
      await expect(
        page.locator("form").getByRole("alert"),
      ).toContainText(/Invalid username or PIN/i);
    }

    await page.getByLabel("Username").fill(probeUser);
    await page.getByLabel("PIN").fill("0000");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(
      page.locator("form").getByRole("alert"),
    ).toContainText(/Too many failed sign-in attempts/i);
  });

  test("valid login still works", async ({ page }) => {
    await loginAs(page, "admin", "1111");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("accessibility", () => {
  test("login page has labeled fields and skip link on staff home", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("PIN")).toBeVisible();

    await loginAs(page, "maya", "2222");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.click();
    await expect(page.locator("#main-content")).toBeVisible();
  });
});
