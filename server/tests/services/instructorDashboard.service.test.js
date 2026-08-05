import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

import { getInstructorDashboardData } from "../../services/instructorDashboard.service.js";

describe("instructorDashboard.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("should return null when teacher profile is missing", async () => {
    // Test nghiệp vụ: nếu giảng viên không tồn tại,
    // dashboard service phải trả về null để frontend xử lý trạng thái không tìm thấy.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await getInstructorDashboardData(999);

    expect(result).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("should build instructor dashboard data with normalized teacher id and formatted metrics", async () => {
    // Test nghiệp vụ: dashboard của giảng viên phải tổng hợp profile,
    // summary, lịch dạy, biểu đồ tương tác, hiệu suất khóa học và cảnh báo học viên.
    queryMock
      .mockResolvedValueOnce([[{
        id: 4,
        name: "Nguyễn Văn A",
        avatar: "http://example.com/avatar.jpg",
        specialization: "React",
        workplace: "FPT Education",
      }]])
      .mockResolvedValueOnce([[{
        teaching_courses: 3,
        total_students: 120,
        average_completion: 82.4,
        pending_grading: 7,
      }]])
      .mockResolvedValueOnce([[{
        time: "09:00",
        title: "Lớp React",
        batch: "BATCH-01",
        platform: "GOOGLE_MEET",
        status: "LIVE",
      }]])
      .mockResolvedValueOnce([[{
        month_key: "2026-03",
        active_students: 60,
      },
      {
        month_key: "2026-04",
        active_students: 80,
      },
      {
        month_key: "2026-05",
        active_students: 100,
      }]])
      .mockResolvedValueOnce([[{
        id: 101,
        title: "React nâng cao",
        category: "Frontend",
        status: "APPROVED",
        students: 45,
        completion: 78.2,
        rating: 4.7,
        revenue: 1500000,
      },
      {
        id: 102,
        title: "Node API",
        category: null,
        status: "PENDING",
        students: 30,
        completion: 68.9,
        rating: 4.2,
        revenue: 900000,
      }]])
      .mockResolvedValueOnce([[{
        id: 201,
        name: "Lê Thị C",
        course: "React nâng cao",
        progress: 45,
      },
      {
        id: 202,
        name: "Trần Văn D",
        course: "Node API",
        progress: 88,
      }]]);

    const result = await getInstructorDashboardData("0");

    expect(result).not.toBeNull();
    expect(result.teacherId).toBe(4);
    expect(result.profile.name).toBe("Nguyễn Văn A");
    expect(result.profile.role).toBe("React");
    expect(result.dashboardStats[0].label).toBe("Khóa học đang dạy");
    expect(result.dashboardStats[2].value).toBe("82%");
    expect(result.teachingSchedule[0].mode).toBe("Google Meet");
    expect(result.teachingSchedule[0].status).toBe("Đang diễn ra");
    expect(result.analyticsBars).toHaveLength(3);
    expect(result.analyticsBars[0].label).toBe("T3");
    expect(result.coursePerformance[0].status).toBe("Đã duyệt");
    expect(result.coursePerformance[1].category).toBe("Chưa phân loại");
    expect(result.studentSignals[0].note).toContain("Tiến độ dưới 50%");
    expect(new Date(result.generatedAt).toString()).not.toBe("Invalid Date");
  });
});
