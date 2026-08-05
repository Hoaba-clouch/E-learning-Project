import { expect, test } from "@playwright/test";

test("VISUAL-01: giao diện đăng nhập học viên không lệch baseline", async ({ page }) => {
  await page.goto("/student/login");

  const loginShell = page.locator(".student-auth-shell");
  await expect(loginShell).toBeVisible();
  await expect(loginShell).toHaveScreenshot("student-login-shell.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.01,
  });
});
