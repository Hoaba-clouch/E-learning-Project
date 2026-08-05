import { describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

import { getAdminDashboardData } from "../../services/adminDashboard.service.js";

describe("adminDashboard.service", () => {
  it("should build dashboard data with metrics, trends, top courses, and recent activity", async () => {
    // Test nghiệp vụ: khi admin xem dashboard,
    // service phải tổng hợp các số liệu tổng quan, xu hướng so với kỳ trước,
    // top khóa học và hoạt động gần nhất.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("SELECT") && query.includes("COUNT(*) FROM users") && query.includes("COUNT(*) FROM users WHERE role = 'STUDENT'")) {
        return Promise.resolve([[{
          total_users: 100,
          total_students: 80,
          unresolved_alerts: 2,
          total_revenue: 12000000,
          active_courses: 25,
          completion_rate: 72.4,
        }]]);
      }

      if (typeof query === "string" && query.includes("created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)")) {
        return Promise.resolve([[{
          total_users: 90,
          total_students: 70,
          total_revenue: 10000000,
          active_courses: 20,
          completion_rate: 68.2,
        }]]);
      }

      if (typeof query === "string" && query.includes("WITH RECURSIVE months")) {
        return Promise.resolve([[
          { month_key: "2026-03", revenue: 1500000 },
          { month_key: "2026-04", revenue: 1800000 },
          { month_key: "2026-05", revenue: 2000000 },
        ]]);
      }

      if (typeof query === "string" && query.includes("GROUP BY role")) {
        return Promise.resolve([[
          { role: "STUDENT", total: 80 },
          { role: "TEACHER", total: 15 },
          { role: "ADMIN", total: 5 },
        ]]);
      }

      if (typeof query === "string" && query.includes("c.course_id AS id") && query.includes("LEFT JOIN users u ON u.user_id = c.teacher_id")) {
        return Promise.resolve([[
          {
            id: 11,
            title: "React căn bản",
            thumbnail: "http://example.com/react.jpg",
            instructor_name: "Nguyễn Văn A",
            students: 120,
            revenue: 4500000,
            rating: 4.9,
          },
          {
            id: 12,
            title: "Node.js nâng cao",
            thumbnail: "http://example.com/node.jpg",
            instructor_name: "Trần Thị B",
            students: 80,
            revenue: 3200000,
            rating: 4.6,
          },
        ]]);
      }

      if (typeof query === "string" && query.includes("FROM payments o")) {
        return Promise.resolve([[
          {
            id: "payment-1",
            type: "order_paid",
            title: "Payment #1 was marked as SUCCESS",
            description: "Student ID 101 paid 1,500,000 VND",
            created_at: "2026-05-01T10:00:00Z",
          },
        ]]);
      }

      return Promise.resolve([[]]);
    });

    const result = await getAdminDashboardData();

    expect(result.summary.totalUsers.value).toBe(100);
    expect(result.summary.totalUsers.trend.value).toBe("+11.1%");
    expect(result.summary.totalStudents.value).toBe(80);
    expect(result.summary.totalRevenue.value).toBe(12000000);
    expect(result.summary.activeCourses.value).toBe(25);
    expect(result.summary.completionRate.value).toBe(72.4);
    expect(result.summary.unresolvedAlerts.value).toBe(2);
    expect(result.revenueTrajectory).toHaveLength(3);
    expect(result.userGrowth).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "STUDENT", percentage: 80 }),
      ]),
    );
    expect(result.topCourses[0].badge).toBe("Top Earner");
    expect(result.recentActivity[0].id).toBe("payment-1");
    expect(new Date(result.generatedAt).toString()).not.toBe("Invalid Date");
  });
});
