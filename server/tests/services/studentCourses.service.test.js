import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
    execute: vi.fn(),
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: createNotificationMock,
}));

import {
  createStudentCourseReview,
  getStudentCourseReviewEligibility,
} from "../../services/studentCourses.service.js";

describe("studentCourses.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
  });

  it("should return null when the course does not exist", async () => {
    // Test nghiệp vụ: nếu khóa học không tồn tại,
    // service phải trả về null thay vì báo rằng người dùng đủ điều kiện đánh giá.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await getStudentCourseReviewEligibility(7, 999);

    expect(result).toBeNull();
  });

  it("should block review when the student has not completed payment", async () => {
    // Test nghiệp vụ: nếu học viên chưa thanh toán thành công cho khóa học,
    // service phải từ chối đánh giá và trả lý do rõ ràng.
    queryMock
      .mockResolvedValueOnce([[{ course_id: 10, teacher_id: 7 }]])
      .mockResolvedValueOnce([[{ enrollment_id: 1, progress_percent: 50, status: "ACTIVE", has_successful_payment: 0 }]])
      .mockResolvedValueOnce([[]]);

    const result = await getStudentCourseReviewEligibility(7, 10);

    expect(result?.eligible).toBe(false);
    expect(result?.reason).toBe("Bạn cần hoàn tất thanh toán khóa học trước khi đánh giá.");
    expect(result?.progressPercent).toBe(50);
  });

  it("should return 403 when the review is not eligible", async () => {
    // Test nghiệp vụ: nếu học viên không đủ điều kiện đánh giá,
    // service phải dừng ngay trước khi insert review vào database.
    queryMock
      .mockResolvedValueOnce([[{ course_id: 10, teacher_id: 7 }]])
      .mockResolvedValueOnce([[{ enrollment_id: 1, progress_percent: 20, status: "ACTIVE", has_successful_payment: 1 }]])
      .mockResolvedValueOnce([[]]);

    const result = await createStudentCourseReview(7, 10, { rating: 5, teacherRating: 5, comment: "Tốt" });

    expect(result).toEqual({
      status: 403,
      message: "Bạn cần hoàn thành tối thiểu 30% khóa học để đánh giá.",
    });
  });

  it("should create a review and notify the teacher when the student is eligible", async () => {
    // Test nghiệp vụ: khi học viên đủ điều kiện và chưa từng đánh giá,
    // service phải lưu review mới và gửi thông báo cho giảng viên.
    queryMock
      .mockResolvedValueOnce([[{ course_id: 10, teacher_id: 7 }]])
      .mockResolvedValueOnce([[{ enrollment_id: 1, progress_percent: 80, status: "ACTIVE", has_successful_payment: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ teacher_id: 7 }]])
      .mockResolvedValueOnce([{ insertId: 55 }])
      .mockResolvedValueOnce([[{ review_id: 55, course_id: 10, rating: 5, teacher_rating: 5, comment: "Tốt", teacher_comment: null, status: "VISIBLE", created_at: "2026-01-01", updated_at: "2026-01-01" }]]);

    const result = await createStudentCourseReview(7, 10, { rating: 5, teacherRating: 5, comment: "Tốt" });

    expect(result.status).toBe(201);
    expect(result.data).toEqual({
      id: 55,
      courseId: 10,
      rating: 5,
      teacherRating: 5,
      comment: "Tốt",
      teacherComment: null,
      status: "VISIBLE",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    expect(createNotificationMock).toHaveBeenCalled();
  });
});
