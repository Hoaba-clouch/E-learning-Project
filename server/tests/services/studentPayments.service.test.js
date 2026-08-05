import crypto from "node:crypto";
import querystring from "node:querystring";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    getConnection: getConnectionMock,
  },
}));

import {
  createStudentVnpayPayment,
  verifyStudentVnpayReturn,
} from "../../services/studentPayments.service.js";

describe("studentPayments.service", () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
    process.env.VNPAY_HASH_SECRET = "secret";
    process.env.VNPAY_PAYMENT_URL = "https://pay.example.com";
    process.env.VNPAY_RETURN_URL = "https://app.example.com/return";
    process.env.VNPAY_TMN_CODE = "TMN123";
  });

  it("should create a payment URL when the cart has valid items", async () => {
    // Test nghiệp vụ: khi giỏ hàng có item hợp lệ và config VNPAY đầy đủ,
    // service phải tạo URL thanh toán với thông tin amount, cartId và txnRef.
    const connection = {
      execute: vi.fn()
        .mockResolvedValueOnce([[{ cart_id: 11, cart_item_id: 1, batch_id: 5, price_snapshot: 120000, batch_code: "B1", batch_name: "Lớp 1", course_name: "React" }]])
        .mockResolvedValueOnce([[{ batch_id: 5, course_id: 3, status: "OPEN", enrollment_start_date: null, enrollment_deadline: null, max_students: 10, enrolled_count: 2 }]])
        .mockResolvedValueOnce([[]]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const result = await createStudentVnpayPayment(7, {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    });

    expect(result.ok).toBe(true);
    expect(result.data.amount).toBe(120000);
    expect(result.data.cartId).toBe(11);
    expect(result.data.paymentUrl).toContain("https://pay.example.com?");
    expect(result.data.txnRef).toContain("CART11U7T");
  });

  it("should reject an invalid VNPAY signature", async () => {
    // Test nghiệp vụ: khi chữ ký trả về không khớp với dữ liệu,
    // service phải dừng lại ngay và báo lỗi rõ ràng.
    const result = await verifyStudentVnpayReturn(7, {
      vnp_SecureHash: "bad-signature",
      vnp_TxnRef: "CART11U7T123",
      vnp_ResponseCode: "00",
      vnp_TransactionStatus: "00",
      vnp_Amount: "12000000",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Chữ ký VNPAY không hợp lệ.",
    });
  });

  it("should create payments and enrollments when the return callback is successful", async () => {
    // Test nghiệp vụ: khi callback VNPAY thành công,
    // service phải tạo payment record, enrollment và xóa item khỏi giỏ hàng.
    const connection = {
      execute: vi.fn()
        .mockResolvedValueOnce([[{ cart_id: 11 }]])
        .mockResolvedValueOnce([[{ cart_item_id: 1, batch_id: 5, price_snapshot: 120000 }]])
        .mockResolvedValueOnce([[{ batch_id: 5, course_id: 3, status: "OPEN", enrollment_start_date: null, enrollment_deadline: null, max_students: 10, enrolled_count: 2 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const params = {
      vnp_TxnRef: "CART11U7T123",
      vnp_ResponseCode: "00",
      vnp_TransactionStatus: "00",
      vnp_Amount: "12000000",
    };
    const encodedEntries = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
      .sort((left, right) => encodeURIComponent(left).localeCompare(encodeURIComponent(right)))
      .map((key) => [encodeURIComponent(key), encodeURIComponent(String(params[key])).replace(/%20/g, "+")]);
    const signDataString = encodedEntries
      .map(([encodedKey, encodedValue]) => `${encodedKey}=${encodedValue}`)
      .join("&");
    const hash = crypto
      .createHmac("sha512", "secret")
      .update(Buffer.from(signDataString, "utf-8"))
      .digest("hex");

    const result = await verifyStudentVnpayReturn(7, {
      vnp_SecureHash: hash,
      ...params,
    });

    expect(result.ok).toBe(true);
    expect(result.data.status).toBe("SUCCESS");
    expect(result.data.enrolledCount).toBe(1);
    expect(connection.execute).toHaveBeenCalled();
  });
});
