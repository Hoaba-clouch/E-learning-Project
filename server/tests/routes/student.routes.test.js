import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSessionUser,
  mockGetStudentCart,
  mockAddStudentCartItem,
  mockRemoveStudentCartItem,
  mockCreateStudentVnpayPayment,
  mockHandleStudentVnpayIpn,
  mockVerifyStudentVnpayReturn,
  mockGetStudentCourseCategories,
  mockCreateStudentCourseReview,
  mockGetStudentCourseReviewEligibility,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockGetStudentCart: vi.fn(),
  mockAddStudentCartItem: vi.fn(),
  mockRemoveStudentCartItem: vi.fn(),
  mockCreateStudentVnpayPayment: vi.fn(),
  mockHandleStudentVnpayIpn: vi.fn(),
  mockVerifyStudentVnpayReturn: vi.fn(),
  mockGetStudentCourseCategories: vi.fn(),
  mockCreateStudentCourseReview: vi.fn(),
  mockGetStudentCourseReviewEligibility: vi.fn(),
}));

vi.mock("../../services/auth.service.js", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock("../../services/studentCart.service.js", () => ({
  getStudentCart: mockGetStudentCart,
  addStudentCartItem: mockAddStudentCartItem,
  removeStudentCartItem: mockRemoveStudentCartItem,
}));

vi.mock("../../services/studentPayments.service.js", () => ({
  createStudentVnpayPayment: mockCreateStudentVnpayPayment,
  handleStudentVnpayIpn: mockHandleStudentVnpayIpn,
  verifyStudentVnpayReturn: mockVerifyStudentVnpayReturn,
}));

vi.mock("../../services/studentCourses.service.js", () => ({
  getStudentCourseCategories: mockGetStudentCourseCategories,
  createStudentCourseReview: mockCreateStudentCourseReview,
  getStudentCourseReviewEligibility: mockGetStudentCourseReviewEligibility,
}));

import studentRoutes from "../../routes/student.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/student", studentRoutes);
  return app;
}

describe("student routes", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGetStudentCart.mockReset();
    mockAddStudentCartItem.mockReset();
    mockRemoveStudentCartItem.mockReset();
    mockCreateStudentVnpayPayment.mockReset();
    mockHandleStudentVnpayIpn.mockReset();
    mockVerifyStudentVnpayReturn.mockReset();
    mockGetStudentCourseCategories.mockReset();
    mockCreateStudentCourseReview.mockReset();
    mockGetStudentCourseReviewEligibility.mockReset();
  });

  it("should return course categories successfully without authentication", async () => {
    // Test nghiệp vụ: khi client truy vấn danh mục khóa học công khai,
    // route phải trả về dữ liệu danh mục và success=true.
    const app = createApp();
    const categories = [
      { id: 1, name: "Lập trình" },
      { id: 2, name: "Thiết kế" },
    ]; 

    mockGetStudentCourseCategories.mockResolvedValue(categories);

    const response = await request(app).get("/student/course-categories");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(categories);
    expect(mockGetStudentCourseCategories).toHaveBeenCalledTimes(1);
  });

  it("should reject adding cart item when batchId is invalid", async () => {
    // Test nghiệp vụ: khi batchId không phải số nguyên hợp lệ,
    // route phải trả về lỗi 400 và không gọi service thêm vào giỏ.
    const app = createApp();
    mockGetSessionUser.mockReturnValue({ id: 12, role: "STUDENT" });

    const response = await request(app)
      .post("/student/cart/items")
      .set("Authorization", "Bearer valid-token")
      .send({ batchId: "not-a-number" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid batch id.");
    expect(mockAddStudentCartItem).not.toHaveBeenCalled();
  });

  it("should create a cart item when batchId is valid and the service succeeds", async () => {
    // Test nghiệp vụ: khi học viên gửi batchId hợp lệ và service thêm thành công,
    // route phải trả về 201 cùng giỏ hàng cập nhật.
    const app = createApp();
    mockGetSessionUser.mockReturnValue({ id: 15, role: "STUDENT" });
    mockAddStudentCartItem.mockResolvedValue({ ok: true, cart: { id: 5, batchId: 101 } });

    const response = await request(app)
      .post("/student/cart/items")
      .set("Authorization", "Bearer valid-token")
      .send({ batchId: 101 });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Course added to cart.");
    expect(response.body.data).toEqual({ id: 5, batchId: 101 });
    expect(mockAddStudentCartItem).toHaveBeenCalledWith(15, 101);
  });

  it("should return 404 when deleting a non-existing cart item", async () => {
    // Test nghiệp vụ: khi học viên cố xóa mục giỏ hàng không tồn tại,
    // route phải trả về 404 và thông báo tương ứng.
    const app = createApp();
    mockGetSessionUser.mockReturnValue({ id: 22, role: "STUDENT" });
    mockRemoveStudentCartItem.mockResolvedValue(false);

    const response = await request(app)
      .delete("/student/cart/items/999")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Cart item not found.");
    expect(mockRemoveStudentCartItem).toHaveBeenCalledWith(22, 999);
  });

  it("should create a VNPAY payment successfully for authenticated student", async () => {
    // Test nghiệp vụ: khi học viên đã đăng nhập tạo thanh toán VNPAY,
    // route phải trả về 201 cùng dữ liệu thanh toán.
    const app = createApp();
    mockGetSessionUser.mockReturnValue({ id: 18, role: "STUDENT" });
    mockCreateStudentVnpayPayment.mockResolvedValue({ ok: true, data: { url: "https://vnpay.example.com" } });

    const response = await request(app)
      .post("/student/payments/vnpay/create")
      .set("Authorization", "Bearer valid-token")
      .send({ amount: 100000 });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ url: "https://vnpay.example.com" });
    expect(mockCreateStudentVnpayPayment).toHaveBeenCalled();
  });

  it("should accept a VNPAY IPN without a user access token", async () => {
    const app = createApp();
    mockHandleStudentVnpayIpn.mockResolvedValue({
      RspCode: "00",
      Message: "Confirm Success",
    });

    const response = await request(app)
      .get("/student/payments/vnpay/ipn")
      .query({
        vnp_TxnRef: "CART11U7T123",
        vnp_SecureHash: "signed-hash",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      RspCode: "00",
      Message: "Confirm Success",
    });
    expect(mockGetSessionUser).not.toHaveBeenCalled();
    expect(mockHandleStudentVnpayIpn).toHaveBeenCalledWith(
      expect.objectContaining({
        vnp_TxnRef: "CART11U7T123",
        vnp_SecureHash: "signed-hash",
      }),
    );
  });

  it("should return 403 when an unpaid student attempts to review a course", async () => {
    const app = createApp();
    mockGetSessionUser.mockReturnValue({ id: 18, role: "STUDENT" });
    mockCreateStudentCourseReview.mockResolvedValue({
      status: 403,
      message: "Bạn cần hoàn tất thanh toán khóa học trước khi đánh giá.",
    });

    const response = await request(app)
      .post("/student/courses/10/reviews")
      .set("Authorization", "Bearer valid-token")
      .send({
        rating: 5,
        teacherRating: 5,
        comment: "Khóa học tốt",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Bạn cần hoàn tất thanh toán khóa học trước khi đánh giá.",
    });
    expect(mockCreateStudentCourseReview).toHaveBeenCalledWith(18, "10", {
      rating: 5,
      teacherRating: 5,
      comment: "Khóa học tốt",
    });
  });

  it("should reject access to protected student endpoints when the token is invalid", async () => {
    // Test nghiệp vụ: khi token không hợp lệ hoặc hết hạn,
    // middleware phải trả về 401 và không cho phép truy cập endpoint.
    const app = createApp();
    mockGetSessionUser.mockReturnValue(null);

    const response = await request(app)
      .get("/student/cart")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  });
});
