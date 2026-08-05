import { beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    getConnection: getConnectionMock,
  },
}));

import {
  addStudentCartItem,
  getStudentCart,
  removeStudentCartItem,
} from "../../services/studentCart.service.js";

describe("studentCart.service", () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
  });

  it("should create an active cart and return an empty summary when the student has no cart yet", async () => {
    // Test nghiệp vụ: khi học viên chưa có giỏ hàng nào,
    // service phải tự tạo cart ACTIVE rồi trả về summary rỗng thay vì báo lỗi.
    const connection = {
      execute: vi.fn()
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 42 }])
        .mockResolvedValueOnce([[]]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const result = await getStudentCart(7);

    expect(result.id).toBe(42);
    expect(result.status).toBe("ACTIVE");
    expect(result.items).toEqual([]);
    expect(result.summary.itemCount).toBe(0);
    expect(result.summary.total).toBe(0);
  });

  it("should reject adding a batch when the batch does not exist", async () => {
    // Test nghiệp vụ: nếu đợt mở lớp không tồn tại,
    // service phải dừng ngay và trả lỗi 404 để tránh tạo cart item sai.
    const connection = {
      execute: vi.fn().mockResolvedValueOnce([[]]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const result = await addStudentCartItem(7, 999);

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "Không tìm thấy đợt mở lớp phù hợp.",
    });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it("should reject a batch that is no longer open for enrollment", async () => {
    // Test nghiệp vụ: nếu đợt mở lớp đã đóng đăng ký hoặc không còn mở,
    // service phải từ chối thêm vào giỏ hàng để tránh lưu item không hợp lệ.
    const connection = {
      execute: vi.fn().mockResolvedValueOnce([
        [{
          batch_id: 8,
          course_id: 3,
          status: "CLOSED",
          enrollment_start_date: null,
          enrollment_deadline: null,
          max_students: 0,
          enrolled_count: 0,
          item_price: 120,
        }],
      ]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const result = await addStudentCartItem(7, 8);

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Đợt mở lớp này chưa thể thêm vào giỏ hàng.",
    });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
  });

  it("should remove the cart item when the student owns it", async () => {
    // Test nghiệp vụ: khi học viên xóa một item khỏi giỏ hàng,
    // service phải chỉ xóa đúng item thuộc cart ACTIVE của chính họ.
    const connection = {
      execute: vi.fn().mockResolvedValueOnce([{ affectedRows: 1 }]),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    getConnectionMock.mockResolvedValue(connection);

    const result = await removeStudentCartItem(7, 15);

    expect(result).toBe(true);
    expect(connection.execute).toHaveBeenCalled();
  });
});
