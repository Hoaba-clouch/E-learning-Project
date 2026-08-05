import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: createNotificationMock,
}));

import {
  getAdminCoursesPageData,
  getAdminCourseDetail,
  reviewAdminCourse,
} from "../../services/adminCourses.service.js";

describe("adminCourses.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
  });

  it("should build course page data with summary, categories and formatted course fields", async () => {
    // Test nghiệp vụ: khi admin mở trang khóa học,
    // service phải trả về summary tổng quan và danh sách khóa học được format cho dashboard.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM courses c")) {
        return Promise.resolve([[
          {
            id: 11,
            title: "React căn bản",
            description: "Học React từ đầu",
            price: 250000,
            thumbnail: "http://example.com/react.jpg",
            db_status: "PENDING",
            created_at: "2026-01-01",
            category_name: "Frontend",
            instructor_name: "Nguyễn Văn A",
            instructor_avatar: null,
            enrolled_students: 120,
            review_count: 5,
            avg_rating: 4.8,
            total_revenue: 1500000,
          },
          {
            id: 12,
            title: "Node.js nâng cao",
            description: "Xây dựng API chuyên nghiệp",
            price: 350000,
            thumbnail: "http://example.com/node.jpg",
            db_status: "APPROVED",
            created_at: "2026-02-01",
            category_name: "Backend",
            instructor_name: "Trần Thị B",
            instructor_avatar: "http://example.com/b.jpg",
            enrolled_students: 80,
            review_count: 10,
            avg_rating: 4.5,
            total_revenue: 2800000,
          },
        ]]);
      }

      if (typeof query === "string" && query.includes("COUNT(DISTINCT e.student_id) AS active_students")) {
        return Promise.resolve([[{ active_students: 200 }]]);
      }

      if (typeof query === "string" && query.includes("COALESCE(SUM(amount), 0) AS monthly_revenue")) {
        return Promise.resolve([[{ monthly_revenue: 4200000 }]]);
      }

      return Promise.resolve([[]]);
    });

    const result = await getAdminCoursesPageData();

    expect(result.summary.totalCourses.value).toBe(2);
    expect(result.summary.pendingReview.value).toBe(1);
    expect(result.summary.activeStudents.value).toBe("200");
    expect(result.summary.monthlyRevenue.value).toBe(4200000);
    expect(result.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Frontend" }),
        expect.objectContaining({ label: "Backend" }),
      ]),
    );
    expect(result.courses[0].status).toBe("pending");
    expect(result.courses[1].statusLabel).toBe("Da duyet");
  });

  it("should return course detail for an existing course id", async () => {
    // Test nghiệp vụ: khi admin xem chi tiết khóa học,
    // service phải tìm đúng course từ dữ liệu base và trả về object chi tiết.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM courses c")) {
        return Promise.resolve([[
          {
            id: 12,
            title: "Node.js nâng cao",
            description: "Xây dựng API chuyên nghiệp",
            price: 350000,
            thumbnail: "http://example.com/node.jpg",
            db_status: "APPROVED",
            created_at: "2026-02-01",
            category_name: "Backend",
            instructor_name: "Trần Thị B",
            instructor_avatar: "http://example.com/b.jpg",
            enrolled_students: 80,
            review_count: 10,
            avg_rating: 4.5,
            total_revenue: 2800000,
          },
        ]]);
      }
      return Promise.resolve([[]]);
    });

    const result = await getAdminCourseDetail(12);

    expect(result).toEqual(
      expect.objectContaining({
        id: 12,
        title: "Node.js nâng cao",
        status: "approved",
      }),
    );
  });

  it("should return null when reviewing a non-existing course", async () => {
    // Test nghiệp vụ: nếu admin xét duyệt một khóa học không tồn tại,
    // service phải trả về null và không thực hiện cập nhật.
    queryMock.mockResolvedValue([[]]);

    const result = await reviewAdminCourse(99, "approved");

    expect(result).toBeNull();
  });

  it("should update review status and notify instructor when course is approved", async () => {
    // Test nghiệp vụ: khi admin duyệt khóa học thành công,
    // service phải cập nhật trạng thái DB và gửi notification cho giảng viên.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM courses c")) {
        return Promise.resolve([[
          {
            id: 12,
            title: "Node.js nâng cao",
            description: "Xây dựng API chuyên nghiệp",
            price: 350000,
            thumbnail: "http://example.com/node.jpg",
            db_status: "PENDING",
            created_at: "2026-02-01",
            category_name: "Backend",
            instructor_name: "Trần Thị B",
            instructor_avatar: "http://example.com/b.jpg",
            enrolled_students: 80,
            review_count: 10,
            avg_rating: 4.5,
            total_revenue: 2800000,
          },
        ]]);
      }

      if (typeof query === "string" && query.includes("UPDATE courses SET status")) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }

      if (typeof query === "string" && query.includes("SELECT teacher_id, course_name FROM courses")) {
        return Promise.resolve([[{ teacher_id: 22, course_name: "Node.js nâng cao" }]]);
      }

      return Promise.resolve([[]]);
    });

    const result = await reviewAdminCourse(12, "approved");

    expect(result).toEqual({ id: 12, status: "approved", statusLabel: "Da duyet" });
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 22,
        type: "COURSE_APPROVED",
        referenceType: "COURSE",
        referenceId: 12,
      }),
    );
  });
});
