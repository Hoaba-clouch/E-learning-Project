import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.LEARNX_BASE_URL ?? "http://127.0.0.1:5173";
const STUDENT_ACCOUNT = process.env.LEARNX_STUDENT_ACCOUNT;
const STUDENT_PASSWORD = process.env.LEARNX_STUDENT_PASSWORD;
const AUTO_COMPLETE = process.env.VNPAY_AUTOCOMPLETE === "1";
const evidenceDir = path.resolve("docs/test-evidence/2026-08-05");

if (!STUDENT_ACCOUNT || !STUDENT_PASSWORD) {
  throw new Error("Thiếu LEARNX_STUDENT_ACCOUNT hoặc LEARNX_STUDENT_PASSWORD.");
}

await fs.mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ locale: "vi-VN", viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

try {
  await page.goto(`${BASE_URL}/student/login`);
  await page.locator('input[name="account"]').fill(STUDENT_ACCOUNT);
  await page.locator('input[name="password"]').fill(STUDENT_PASSWORD);
  await page.locator('input[name="remember"]').check();
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/student(?:\?|$)/);

  await page.goto(`${BASE_URL}/student?view=cart`);
  await page.locator(".sp-cart-item").first().waitFor();
  await page.screenshot({ path: path.join(evidenceDir, "07-gio-hang-truoc-vnpay.png"), fullPage: true });

  await page.locator("main.sp-cart-page > aside .sp-checkout").click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận thanh toán" });
  await dialog.waitFor();
  await page.screenshot({ path: path.join(evidenceDir, "08-xac-nhan-thanh-toan-vnpay.png"), fullPage: true });

  await Promise.all([
    page.waitForURL(/sandbox\.vnpayment\.vn/i, { timeout: 30_000 }),
    dialog.getByRole("button", { name: "Thanh toán qua VNPAY", exact: true }).click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: path.join(evidenceDir, "09-cong-vnpay-sandbox.png"), fullPage: true });

  const pageSummary = {
    title: await page.title(),
    url: page.url(),
    body: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim(),
    headings: await page.locator("h1,h2,h3").allTextContents(),
    buttons: await page.getByRole("button").allTextContents(),
    links: await page.getByRole("link").allTextContents(),
    inputs: await page.locator("input").evaluateAll((inputs) =>
      inputs.map((input) => ({
        id: input.id,
        name: input.getAttribute("name"),
        placeholder: input.getAttribute("placeholder"),
        type: input.getAttribute("type"),
      })),
    ),
  };

  console.log(JSON.stringify(pageSummary, null, 2));

  if (!AUTO_COMPLETE) {
    console.log("Đã dừng ở cổng VNPAY để kiểm tra cấu trúc trang trước khi nhập thẻ test.");
  }
} finally {
  await browser.close();
}
