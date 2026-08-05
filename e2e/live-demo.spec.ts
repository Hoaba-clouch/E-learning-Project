import { expect, request, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const API_URL = "http://localhost:3000";
const evidenceDir = path.resolve("docs/test-evidence/2026-08-05");

const accounts = {
  student: { account: "hv03@elearning.vn", password: "Password123" },
  teacher: { account: "gv02@elearning.vn", password: "Password123" },
  admin: { account: "admin1@elearning.vn", password: "Password123" },
};

async function saveScreenshot(page: Page, fileName: string) {
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, fileName),
    fullPage: true,
  });
}

async function loginStudentOrAdmin(
  page: Page,
  loginPath: string,
  account: string,
  password: string,
) {
  await page.goto(loginPath);
  await page.locator('input[name="account"]').fill(account);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="remember"]').check();
  await page.locator('button[type="submit"]').click();
}

test.beforeAll(async () => {
  await fs.mkdir(evidenceDir, { recursive: true });
});

test("E2E-01: trang công khai và danh mục tải được", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sp-header")).toBeVisible();
  await expect(page.locator("main, .sp-hero").first()).toBeVisible();
  await saveScreenshot(page, "01-trang-chu-cong-khai.png");

  await page.goto("/courses");
  await expect(page.locator(".sp-catalog-layout")).toBeVisible();
  await expect(page.locator(".sp-state-line.error")).toHaveCount(0);
  await saveScreenshot(page, "02-danh-muc-khoa-hoc-thuc-te.png");
});

test("E2E-02: học viên đăng nhập, reload vẫn giữ phiên và mở giỏ hàng", async ({ page }) => {
  await loginStudentOrAdmin(
    page,
    "/student/login",
    accounts.student.account,
    accounts.student.password,
  );

  await expect(page).toHaveURL(/\/student(?:\?|$)/);
  await expect(page.locator(".sp-header")).toBeVisible();
  await saveScreenshot(page, "03-hoc-vien-dang-nhap-thanh-cong.png");

  await page.reload();
  await expect(page).toHaveURL(/\/student(?:\?|$)/);
  await expect(page.locator(".sp-header")).toBeVisible();

  await page.getByRole("button", { name: "Giỏ hàng", exact: true }).first().click();
  await expect(page).toHaveURL(/view=cart/);
  await expect(page.locator(".sp-cart-page")).toBeVisible();
  await saveScreenshot(page, "04-gio-hang-hoc-vien.png");

  if (process.env.EXPECT_ACTIVE_DEMO_ENROLLMENT === "1") {
    await page.getByRole("button", { name: /Khóa học của (tôi|bạn)/ }).click();
    const activeCourse = page.locator(".sp-my-course-card").filter({ hasText: "ACTIVE" }).first();
    await expect(activeCourse).toBeVisible();
    await saveScreenshot(page, "10-ghi-danh-active-sau-thanh-toan.png");
  }
});

test("E2E-03: học viên chưa ghi danh bị chặn đánh giá và thanh toán giỏ rỗng", async () => {
  const api = await request.newContext({ baseURL: API_URL });
  const loginResponse = await api.post("/api/auth/login", {
    data: {
      ...accounts.student,
      remember: true,
    },
  });

  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = await loginResponse.json();
  const headers = { Authorization: `Bearer ${loginBody.data.token}` };

  const [catalogResponse, myCoursesResponse] = await Promise.all([
    api.get("/api/student/courses", { headers }),
    api.get("/api/student/my-courses", { headers }),
  ]);
  expect(catalogResponse.ok()).toBeTruthy();
  expect(myCoursesResponse.ok()).toBeTruthy();
  const catalogBody = await catalogResponse.json();
  const myCoursesBody = await myCoursesResponse.json();
  const enrolledCourseIds = new Set(
    myCoursesBody.data.map((item: { course: { id: number } }) => item.course.id),
  );
  const unpaidCourse = catalogBody.data.find(
    (course: { id: number }) => !enrolledCourseIds.has(course.id),
  );
  expect(unpaidCourse).toBeTruthy();

  const reviewResponse = await api.post(`/api/student/courses/${unpaidCourse.id}/reviews`, {
    headers,
    data: {
      rating: 5,
      teacherRating: 5,
      comment: "Kiểm thử quyền đánh giá khi chưa ghi danh.",
    },
  });
  expect(reviewResponse.status()).toBe(403);

  const paymentResponse = await api.post("/api/student/payments/vnpay/create", {
    headers,
  });
  expect(paymentResponse.status()).toBe(400);

  await api.dispose();
});

test("E2E-04: giảng viên đăng nhập và tải dashboard", async ({ page }) => {
  await page.goto("/instructor/login");
  await page.locator('input[type="email"]').fill(accounts.teacher.account);
  await page.locator('input[type="password"]').fill(accounts.teacher.password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/instructor$/);
  await expect(page.locator(".instructor-shell, .instructor-dashboard").first()).toBeVisible();
  await saveScreenshot(page, "05-dashboard-giang-vien.png");
});

test("E2E-05: quản trị viên đăng nhập và tải dashboard", async ({ page }) => {
  await loginStudentOrAdmin(
    page,
    "/admin/login",
    accounts.admin.account,
    accounts.admin.password,
  );

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator(".admin-shell")).toBeVisible();
  await saveScreenshot(page, "06-dashboard-quan-tri.png");
});
