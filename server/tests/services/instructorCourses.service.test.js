import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbQuery,
  mockDbGetConnection,
  mockCreateNotification,
} = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
  mockDbGetConnection: vi.fn(),
  mockCreateNotification: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  default: {
    query: mockDbQuery,
    getConnection: mockDbGetConnection,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: mockCreateNotification,
}));

import {
  createInstructorCourse,
  createInstructorModule,
  createInstructorQuiz,
  updateInstructorCourseWorkflowStatus,
} from "../../services/instructorCourses.service.js";

describe("instructorCourses.service", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockDbGetConnection.mockReset();
    mockCreateNotification.mockReset();
  });

  it("should create a course draft with the default category when category is missing", async () => {
    // Test nghiệp vụ: khi giảng viên tạo khóa học mới mà chưa chọn danh mục,
    // service phải tự động chọn một danh mục hợp lệ và tạo khóa học ở trạng thái bản nháp.
    mockDbQuery
      .mockResolvedValueOnce([[{ id: 12 }]])
      .mockResolvedValueOnce([{ insertId: 77 }])
      .mockResolvedValueOnce([[{ id: 77, title: "React cho người mới", description: "Khóa học nền tảng", thumbnail: null, level: "BEGINNER", status: "DRAFT", categoryId: 12, category: "Phát triển" }]]);

    const result = await createInstructorCourse(4, {
      title: "React cho người mới",
      description: "Khóa học nền tảng",
      price: 0,
      categoryId: 0,
      level: "BEGINNER",
      thumbnailUrl: "",
    });

    expect(result.title).toBe("React cho người mới");
    expect(result.workflowStatus).toBe("DRAFT");
    expect(result.categoryId).toBe(12);
  });

  it("should create a module with the next order number for a valid course", async () => {
    // Test nghiệp vụ: khi giảng viên thêm một module mới vào khóa học,
    // service phải kiểm tra quyền sở hữu khóa học rồi gán thứ tự module tiếp theo.
    mockDbQuery
      .mockResolvedValueOnce([[{ id: 77 }]])
      .mockResolvedValueOnce([[{ max_order: 2 }]])
      .mockResolvedValueOnce([{ insertId: 101 }]);

    const result = await createInstructorModule(4, 77, {
      title: "Module 1",
      description: "Nội dung đầu tiên",
    });

    expect(result.courseId).toBe(77);
    expect(result.title).toBe("Module 1");
    expect(result.order).toBe(3);
  });

  it("should create a quiz for a single batch and return the quiz payload", async () => {
    // Test nghiệp vụ: khi giảng viên tạo quiz cho một lớp cụ thể,
    // service phải validate dữ liệu đầu vào và trả về quiz đã tạo đúng cho batch đó.
    mockDbQuery
      .mockResolvedValueOnce([[{ id: 77 }]])
      .mockResolvedValueOnce([[{ id: 33 }]])
      .mockResolvedValueOnce([{ insertId: 900 }])
      .mockResolvedValueOnce([[{ id: 900, batchId: 33, batchCode: "B1", lessonId: null, lessonTitle: null, title: "Quiz 1", description: null, durationMinutes: 20, maxScore: 10, passScore: 5, attemptLimit: 1, createdAt: "2026-01-01", questions: 0, attempts: 0 }]]);

    const result = await createInstructorQuiz(4, 77, {
      batchScope: "SINGLE",
      batchId: 33,
      title: "Quiz 1",
      durationMinutes: 20,
      maxScore: 10,
      passScore: 5,
      attemptLimit: 1,
    });

    expect(result.title).toBe("Quiz 1");
    expect(result.batchId).toBe(33);
    expect(result.maxScore).toBe("10");
  });

  it("should submit a draft course to review and return the next workflow status", async () => {
    // Test nghiệp vụ: khi giảng viên gửi khóa học từ bản nháp lên duyệt,
    // service phải đổi trạng thái sang PENDING và trả về payload workflow mới.
    mockDbQuery.mockResolvedValueOnce([[{ id: 77, status: "DRAFT" }]]);

    const result = await updateInstructorCourseWorkflowStatus(4, 77, "submit");

    expect(result.workflowStatus).toBe("PENDING");
    expect(result.status).toBe("Chờ duyệt");
  });
});
