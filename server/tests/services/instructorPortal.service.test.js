import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

import {
  getInstructorProfileData,
  updateInstructorProfile,
  createInstructorAssignment,
  gradeInstructorAssignmentSubmission,
  markInstructorNotificationRead,
  createInstructorDiscussionComment,
  getInstructorAnalyticsData,
} from "../../services/instructorPortal.service.js";

describe("instructorPortal.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("should return null when the teacher profile is missing", async () => {
    // Test nghiệp vụ: nếu giảng viên không tồn tại,
    // service profile phải trả về null để frontend hiển thị trạng thái không tìm thấy.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await getInstructorProfileData(999);

    expect(result).toBeNull();
  });

  it("should return formatted instructor profile data when teacher exists", async () => {
    // Test nghiệp vụ: service profile phải ánh xạ đúng dữ liệu người dùng thành object frontend.
    queryMock.mockResolvedValueOnce([[{
      id: 4,
      name: "Nguyen Van A",
      email: "a@example.com",
      phone: null,
      avatar: "http://example.com/avatar.jpg",
      status: "ACTIVE",
      bio: null,
      specialization: "React",
      experienceYears: 5,
      qualification: "Thạc sĩ",
      workplace: "FPT",
    }]]);

    const result = await getInstructorProfileData("4");

    expect(result).toEqual({
      id: 4,
      name: "Nguyen Van A",
      email: "a@example.com",
      phone: "",
      avatar: "http://example.com/avatar.jpg",
      status: "ACTIVE",
      role: "React",
      bio: "",
      specialization: "React",
      experienceYears: 5,
      qualification: "Thạc sĩ",
      workplace: "FPT",
    });
  });

  it("should update instructor profile and persist values with existing teacher profile row", async () => {
    // Test nghiệp vụ: khi cập nhật thông tin giảng viên,
    // service phải validate payload, cập nhật user và profile rồi trả về profile mới.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("SELECT user_id")) {
        return Promise.resolve([[{ user_id: 4 }]]);
      }
      if (typeof query === "string" && query.includes("SELECT teacher_id")) {
        return Promise.resolve([[{ teacher_id: 4 }]]);
      }
      if (typeof query === "string" && query.includes("FROM users u")) {
        return Promise.resolve([[{
          id: 4,
          name: "Nguyen Van A Updated",
          email: "a@example.com",
          phone: "+84900000000",
          avatar: "https://example.com/new-avatar.jpg",
          status: "ACTIVE",
          bio: "Giảng viên React",
          specialization: "React",
          experienceYears: 6,
          qualification: "Thạc sĩ",
          workplace: "FPT",
        }]]);
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    const result = await updateInstructorProfile(4, {
      name: "Nguyen Van A Updated",
      phone: "+84900000000",
      avatar: "https://example.com/new-avatar.jpg",
      bio: "Giảng viên React",
      specialization: "React",
      qualification: "Thạc sĩ",
      workplace: "FPT",
      experienceYears: 6,
    });

    expect(result).toEqual({
      id: 4,
      name: "Nguyen Van A Updated",
      email: "a@example.com",
      phone: "+84900000000",
      avatar: "https://example.com/new-avatar.jpg",
      status: "ACTIVE",
      role: "React",
      bio: "Giảng viên React",
      specialization: "React",
      experienceYears: 6,
      qualification: "Thạc sĩ",
      workplace: "FPT",
    });
  });

  it("should create an assignment for a batch when parameters are valid", async () => {
    // Test nghiệp vụ: khi giảng viên tạo bài tập mới,
    // service phải kiểm tra batch và lesson, rồi chèn assignment và trả về thông tin mới.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM course_batches")) {
        return Promise.resolve([[{ id: 21, courseId: 99 }]]);
      }
      if (typeof query === "string" && query.includes("FROM lessons l")) {
        return Promise.resolve([[{ id: 51 }]]);
      }
      if (typeof query === "string" && query.includes("INSERT INTO assignments")) {
        return Promise.resolve([{ insertId: 123 }]);
      }
      return Promise.resolve([[]]);
    });

    const result = await createInstructorAssignment(4, {
      batchScope: "single",
      batchId: 21,
      lessonId: 51,
      title: "Bài tập 1",
      description: "Làm bài tập React",
      dueDate: "2026-08-10T09:00",
      maxScore: 10,
    });

    expect(result).toEqual({
      id: 123,
      batchId: 21,
      lessonId: 51,
      title: "Bài tập 1",
      description: "Làm bài tập React",
      dueDate: "2026-08-10 09:00",
      dueDateInput: expect.stringContaining("2026-08-10T09:00"),
      maxScore: "10",
      createdCount: 1,
    });
  });

  it("should grade an assignment submission when score is within max score", async () => {
    // Test nghiệp vụ: khi giảng viên chấm bài,
    // service phải xác nhận submission thuộc về bài tập của giảng viên và cập nhật điểm.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM assignment_submissions s")) {
        return Promise.resolve([[{ maxScore: 10 }]]);
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    const result = await gradeInstructorAssignmentSubmission(4, 12, 101, {
      score: 9,
      feedback: "Làm tốt",
    });

    expect(result).toEqual({
      id: 101,
      assignmentId: 12,
      score: "9",
      feedback: "Làm tốt",
    });
  });

  it("should mark a notification as read when it belongs to the instructor", async () => {
    // Test nghiệp vụ: khi giảng viên đánh dấu thông báo đã đọc,
    // service phải cập nhật trường is_read và trả về trạng thái mới.
    queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await markInstructorNotificationRead(4, 77);

    expect(result).toEqual({ id: 77, isRead: true });
  });

  it("should add an instructor comment to a discussion and resolve the discussion", async () => {
    // Test nghiệp vụ: khi giảng viên trả lời thảo luận,
    // service phải thêm comment với flag instructor answer và cập nhật trạng thái thảo luận.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM discussions d")) {
        return Promise.resolve([[{ id: 55 }]]);
      }
      if (typeof query === "string" && query.includes("INSERT INTO discussion_comments")) {
        return Promise.resolve([{ insertId: 202 }]);
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    const result = await createInstructorDiscussionComment(4, 55, {
      content: "Đã trả lời câu hỏi của bạn",
    });

    expect(result).toEqual({
      id: 202,
      discussionId: 55,
      authorId: 4,
      content: "Đã trả lời câu hỏi của bạn",
    });
  });

  it("should build instructor analytics data when teacher exists", async () => {
    // Test nghiệp vụ: dashboard analytics giảng viên phải trả về thống kê điểm trung bình và tỉ lệ hoàn thành.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("FROM users u")) {
        return Promise.resolve([[{
          name: "Nguyen Van A",
          avatar: "http://example.com/avatar.jpg",
          role: "React",
        }]]);
      }
      if (typeof query === "string" && query.includes("FROM courses c")) {
        return Promise.resolve([[
          { title: "React căn bản", completion: 80, quiz_average: 7.5, attendance: 90 },
          { title: "Node API", completion: 55, quiz_average: 6.0, attendance: 85 },
        ]]);
      }
      return Promise.resolve([[]]);
    });

    const result = await getInstructorAnalyticsData(4);

    expect(result).toEqual(
      expect.objectContaining({
        teacherId: 4,
        profile: expect.objectContaining({ name: "Nguyen Van A" }),
      }),
    );
    expect(result.analyticsStats[1].value).toBe("68%");
    expect(result.analyticsStats[2].value).toBe("6.8");
    expect(result.analyticsStats[3].value).toBe("1");
    expect(result.courseInsights).toHaveLength(2);
    expect(result.analyticsRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Rà soát Node API" }),
      ]),
    );
  });
});
