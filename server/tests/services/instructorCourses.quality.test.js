import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbQuery,
  mockDbGetConnection,
  mockCreateNotification,
  mockConnection,
} = vi.hoisted(() => {
  const connection = {
    beginTransaction: vi.fn(),
    query: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };

  return {
    mockDbQuery: vi.fn(),
    mockDbGetConnection: vi.fn(),
    mockCreateNotification: vi.fn(),
    mockConnection: connection,
  };
});

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
  bulkImportInstructorLessons,
  createInstructorBatch,
  createInstructorLesson,
  createInstructorQuestion,
  createInstructorQuiz,
  createInstructorSession,
  deleteInstructorCourse,
  deleteInstructorLesson,
  deleteInstructorModule,
  generateInstructorRecurringSessions,
  getInstructorSessionAttendance,
  gradeInstructorQuizAttempt,
  reorderInstructorLessons,
  reorderInstructorModules,
  respondInstructorCourseReview,
  updateInstructorCourse,
  updateInstructorBatch,
  updateInstructorCourseWorkflowStatus,
  updateInstructorLesson,
  updateInstructorModule,
  updateInstructorSessionAttendance,
} from "../../services/instructorCourses.service.js";

const courseRow = {
  id: 77,
  title: "React thực chiến",
  description: "Xây dựng ứng dụng React",
  thumbnail: null,
  level: "INTERMEDIATE",
  status: "DRAFT",
  categoryId: 3,
  category: "Lập trình Web",
};

const batchRow = {
  id: 33,
  code: "REACT-01",
  name: "React tối 2-4-6",
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  enrollment_start_date: "2026-07-01",
  enrollment_deadline: "2026-07-31",
  min_students: 1,
  max_students: 50,
  enrolled_students: 4,
  tuition_fee: 799000,
  learning_mode: "ONLINE",
  online_platform: "ZOOM",
  default_meeting_url: "https://zoom.example/room",
  classroom_name: null,
  classroom_address: null,
  status: "OPEN",
  note: null,
};

function resetConnection() {
  mockConnection.beginTransaction.mockReset().mockResolvedValue(undefined);
  mockConnection.query.mockReset().mockResolvedValue([{ affectedRows: 1 }]);
  mockConnection.commit.mockReset().mockResolvedValue(undefined);
  mockConnection.rollback.mockReset().mockResolvedValue(undefined);
  mockConnection.release.mockReset();
  mockDbGetConnection.mockReset().mockResolvedValue(mockConnection);
}

describe("instructorCourses.service quality coverage", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockCreateNotification.mockReset().mockResolvedValue({ id: 1 });
    resetConnection();
  });

  describe("course ownership and workflow", () => {
    it("updates only a course owned by the instructor", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[courseRow]]);

      const result = await updateInstructorCourse(4, 77, {
        title: "React thực chiến",
        description: "Xây dựng ứng dụng React",
        price: 799000,
        categoryId: 3,
        level: "INTERMEDIATE",
        thumbnailUrl: "",
      });

      expect(result).toEqual(expect.objectContaining({
        id: 77,
        title: "React thực chiến",
        level: "Trung cấp",
        workflowStatus: "DRAFT",
      }));
      expect(mockDbQuery.mock.calls[1][1].slice(-2)).toEqual([77, 4]);
    });

    it("rejects updating a course owned by another instructor", async () => {
      mockDbQuery.mockResolvedValueOnce([[]]);

      await expect(updateInstructorCourse(4, 99, {
        title: "Khóa không thuộc quyền",
        description: "Không được phép sửa",
        categoryId: 3,
      })).rejects.toThrow("Course not found for this instructor.");
    });

    it("cancels a pending review back to draft", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77, status: "PENDING" }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await updateInstructorCourseWorkflowStatus(4, 77, "cancel");

      expect(result.workflowStatus).toBe("DRAFT");
      expect(result.status).toBe("Bản nháp");
      expect(mockDbQuery.mock.calls[1][1]).toEqual(["DRAFT", 77, 4]);
    });

    it("rejects submitting an already approved course", async () => {
      mockDbQuery.mockResolvedValueOnce([[{ id: 77, status: "APPROVED" }]]);

      await expect(
        updateInstructorCourseWorkflowStatus(4, 77, "submit"),
      ).rejects.toThrow("Only draft or rejected courses can be submitted for review.");
    });

    it("rejects an unknown workflow action", async () => {
      mockDbQuery.mockResolvedValueOnce([[{ id: 77, status: "DRAFT" }]]);

      await expect(
        updateInstructorCourseWorkflowStatus(4, 77, "approve"),
      ).rejects.toThrow("Invalid workflow action.");
    });

    it("soft deletes an owned course by hiding it", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await expect(deleteInstructorCourse(4, 77)).resolves.toEqual({ id: 77 });
      expect(String(mockDbQuery.mock.calls[1][0])).toContain("status = 'HIDDEN'");
      expect(mockDbQuery.mock.calls[1][1]).toEqual([77, 4]);
    });
  });

  describe("module and lesson management", () => {
    it("updates a module in an owned course", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11, order_no: 2 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await updateInstructorModule(4, 77, 11, {
        title: "Hooks nâng cao",
        description: "useMemo và useCallback",
      });

      expect(result).toEqual({
        id: 11,
        courseId: 77,
        title: "Hooks nâng cao",
        description: "useMemo và useCallback",
        order: 2,
      });
    });

    it("reorders all modules in one transaction", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11 }, { id: 12 }, { id: 13 }]]);

      const result = await reorderInstructorModules(4, 77, [13, 11, 12]);

      expect(result.moduleIds).toEqual([13, 11, 12]);
      expect(mockConnection.beginTransaction).toHaveBeenCalledOnce();
      expect(mockConnection.query).toHaveBeenCalledTimes(6);
      expect(mockConnection.commit).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });

    it("rejects a module order that omits a module", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11 }, { id: 12 }]]);

      await expect(reorderInstructorModules(4, 77, [11])).rejects.toThrow(
        "Invalid module order.",
      );
      expect(mockDbGetConnection).not.toHaveBeenCalled();
    });

    it("rejects deleting a module that does not belong to the course", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[]]);

      await expect(deleteInstructorModule(4, 77, 999)).rejects.toThrow(
        "Module not found for this course.",
      );
    });

    it("creates a lesson at the next position", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11 }]])
        .mockResolvedValueOnce([[{ max_order: 3 }]])
        .mockResolvedValueOnce([{ insertId: 501 }]);

      const result = await createInstructorLesson(4, 77, {
        moduleId: 11,
        title: "React Hooks",
        type: "VIDEO",
        content: "Giới thiệu Hooks",
        videoUrl: "https://video.example/hooks",
        durationMinutes: 25,
        isPreview: true,
      });

      expect(result).toEqual(expect.objectContaining({
        id: 501,
        moduleId: 11,
        order: 4,
        durationMinutes: 25,
        isPreview: true,
      }));
    });

    it("moves a lesson to another module and assigns a new order", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 501, current_module_id: 11, order_no: 2 }]])
        .mockResolvedValueOnce([[{ id: 12 }]])
        .mockResolvedValueOnce([[{ max_order: 4 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[
          { id: 501, moduleId: 12, title: "State Management", type: "READING", duration_minutes: 15, is_preview: 0, order_no: 2 },
        ]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await updateInstructorLesson(4, 77, 501, {
        moduleId: 12,
        title: "State Management",
        type: "READING",
        content: "Context API",
        durationMinutes: 15,
      });

      expect(result.moduleId).toBe(12);
      expect(result.order).toBe(5);
      expect(mockDbQuery.mock.calls.at(-1)[1]).toEqual([5, 501]);
    });

    it("rejects reordering lessons with an id outside the module", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11 }]])
        .mockResolvedValueOnce([[{ id: 501 }, { id: 502 }]]);

      await expect(
        reorderInstructorLessons(4, 77, 11, [501, 999]),
      ).rejects.toThrow("Invalid lesson order.");
    });

    it("deletes a lesson only when it belongs to the owned course", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 501 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await expect(deleteInstructorLesson(4, 77, 501)).resolves.toEqual({
        id: 501,
        courseId: 77,
      });
    });

    it("bulk imports lessons with consecutive order numbers", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 11 }]])
        .mockResolvedValueOnce([[{ max_order: 2 }]])
        .mockResolvedValueOnce([{ insertId: 503 }])
        .mockResolvedValueOnce([{ insertId: 504 }]);

      const result = await bulkImportInstructorLessons(4, 77, 11, [
        { title: "JSX", durationMinutes: 10 },
        { title: "Props", type: "READING", durationMinutes: 15 },
      ]);

      expect(result.importedCount).toBe(2);
      expect(result.lessons.map((lesson) => lesson.order)).toEqual([3, 4]);
      expect(result.lessons.map((lesson) => lesson.id)).toEqual([503, 504]);
    });
  });

  describe("quiz, grading and review", () => {
    it("creates the same quiz for every batch in an owned course", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 33, batchCode: "A" }, { id: 34, batchCode: "B" }]])
        .mockResolvedValueOnce([{ insertId: 901 }])
        .mockResolvedValueOnce([{ insertId: 902 }]);

      const result = await createInstructorQuiz(4, 77, {
        batchScope: "ALL",
        title: "Quiz tổng hợp",
        durationMinutes: 30,
        maxScore: 10,
        passScore: 5,
        attemptLimit: 2,
      });

      expect(result).toEqual({
        createdCount: 2,
        quizIds: [901, 902],
        batchIds: [33, 34],
      });
    });

    it.each([
      [{ batchScope: "SINGLE", title: "Quiz", maxScore: 10, passScore: 5, attemptLimit: 1 }, "Batch is required."],
      [{ batchScope: "SINGLE", batchId: 33, title: "", maxScore: 10, passScore: 5, attemptLimit: 1 }, "Quiz title is required."],
      [{ batchScope: "SINGLE", batchId: 33, title: "Quiz", durationMinutes: 0, maxScore: 10, passScore: 5, attemptLimit: 1 }, "Duration must be greater than zero."],
      [{ batchScope: "SINGLE", batchId: 33, title: "Quiz", maxScore: 10, passScore: 11, attemptLimit: 1 }, "Pass score must be between zero and max score."],
      [{ batchScope: "SINGLE", batchId: 33, title: "Quiz", maxScore: 10, passScore: 5, attemptLimit: 0 }, "Attempt limit must be greater than zero."],
    ])("validates quiz payload %#", async (payload, message) => {
      await expect(createInstructorQuiz(4, 77, payload)).rejects.toThrow(message);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it("creates a single-choice question and its answer options transactionally", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[
          { id: 9, batchId: 33, batchCode: "A", lessonId: null, lessonTitle: null, title: "Quiz", description: null, durationMinutes: 20, maxScore: 10, passScore: 5, attemptLimit: 1, createdAt: "2026-08-01", questions: 0, attempts: 0 },
        ]])
        .mockResolvedValueOnce([[
          { id: 500, quizId: 9, text: "React là gì?", type: "SINGLE_CHOICE", score: 2 },
        ]])
        .mockResolvedValueOnce([[
          { id: 1, text: "Thư viện UI", isCorrect: 1 },
          { id: 2, text: "Cơ sở dữ liệu", isCorrect: 0 },
        ]]);
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 500 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await createInstructorQuestion(4, 77, 9, {
        text: "React là gì?",
        type: "SINGLE_CHOICE",
        score: 2,
        options: [
          { text: "Thư viện UI", isCorrect: true },
          { text: "Cơ sở dữ liệu", isCorrect: false },
        ],
      });

      expect(result.id).toBe(500);
      expect(result.options).toHaveLength(2);
      expect(result.options[0].isCorrect).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });

    it("requires exactly one correct option for a single-choice question", async () => {
      await expect(createInstructorQuestion(4, 77, 9, {
        text: "Chọn đáp án",
        type: "SINGLE_CHOICE",
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: true },
        ],
      })).rejects.toThrow("Single choice question must have exactly one correct option.");
    });

    it("grades an owned quiz attempt when score is within the maximum", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 700, maxScore: 10 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await expect(gradeInstructorQuizAttempt(4, 77, 9, 700, { score: 8.5 })).resolves.toEqual({
        id: 700,
        quizId: 9,
        score: "8.5",
        status: "GRADED",
      });
    });

    it("rejects a quiz score above max score", async () => {
      mockDbQuery.mockResolvedValueOnce([[{ id: 700, maxScore: 10 }]]);

      await expect(
        gradeInstructorQuizAttempt(4, 77, 9, 700, { score: 10.5 }),
      ).rejects.toThrow("Score cannot be greater than max score.");
    });

    it("responds to a review owned by the instructor and notifies the student", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 88, student_id: 21 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await respondInstructorCourseReview(4, 77, 88, {
        teacherComment: "Cảm ơn phản hồi của bạn.",
      });

      expect(result).toEqual({ id: 88, teacherComment: "Cảm ơn phản hồi của bạn." });
      expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 21,
        referenceId: 88,
        targetUrl: "/student?view=courseDetail&courseId=77&reviewId=88",
      }));
    });
  });

  describe("batch, schedule and attendance", () => {
    it.each([
      [{ batchName: "Lớp", startDate: "2026-08-10", endDate: "2026-08-01" }, "End date must be later than start date."],
      [{ batchName: "Lớp", startDate: "2026-08-10", endDate: "2026-08-31", enrollmentStartDate: "2026-08-20", enrollmentDeadline: "2026-08-19" }, "Enrollment start date must be on or before enrollment deadline."],
      [{ batchName: "Lớp", startDate: "2026-08-10", endDate: "2026-08-31", enrollmentStartDate: "2026-08-01", enrollmentDeadline: "2026-08-11" }, "Enrollment deadline must be on or before the class start date."],
      [{ batchName: "Lớp", startDate: "2026-08-10", endDate: "2026-08-31", enrollmentStartDate: "2026-08-11" }, "Enrollment must start before the class starts."],
      [{ batchName: "Lớp", startDate: "2026-08-01", endDate: "2026-08-31", minStudents: 0 }, "Min students must be greater than zero."],
      [{ batchName: "Lớp", startDate: "2026-08-01", endDate: "2026-08-31", minStudents: 20, maxStudents: 10 }, "Max students must be greater than or equal to min students."],
      [{ batchName: "Lớp", startDate: "2026-08-01", endDate: "2026-08-31", tuitionFee: -1 }, "Tuition fee must be zero or greater."],
    ])("validates batch boundaries %#", async (payload, message) => {
      await expect(createInstructorBatch(4, 77, payload)).rejects.toThrow(message);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it("rejects an invalid registration window when updating a batch", async () => {
      await expect(updateInstructorBatch(4, 77, 33, {
        batchName: "Lớp React",
        startDate: "2026-08-10",
        endDate: "2026-08-31",
        enrollmentStartDate: "2026-08-11",
        enrollmentDeadline: "2026-08-12",
      })).rejects.toThrow("Enrollment must start before the class starts.");
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it("creates a valid batch for an owned course", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([{ insertId: 33 }])
        .mockResolvedValueOnce([[batchRow]]);

      const result = await createInstructorBatch(4, 77, {
        batchCode: "REACT-01",
        batchName: "React tối 2-4-6",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        enrollmentStartDate: "2026-07-01",
        enrollmentDeadline: "2026-07-31",
        minStudents: 1,
        maxStudents: 50,
        tuitionFee: 799000,
        learningMode: "ONLINE",
        onlinePlatform: "ZOOM",
        status: "OPEN",
      });

      expect(result).toEqual(expect.objectContaining({
        id: 33,
        code: "REACT-01",
        students: "4 / 50",
        mode: "Trực tuyến",
        status: "Đang mở",
      }));
    });

    it("creates a session when it is inside the batch and does not overlap", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 33, start_date: "2026-08-01", end_date: "2026-08-31" }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 601 }])
        .mockResolvedValueOnce([[
          { id: 601, batchId: 33, title: "Buổi 1", description: "JSX", start_time: "2026-08-03T19:00:00", end_time: "2026-08-03T21:00:00", meetingUrl: "https://zoom.example/1", meetingPassword: null, platform: "ZOOM", status: "SCHEDULED", recordingUrl: null, note: null },
        ]]);

      const result = await createInstructorSession(4, 77, 33, {
        title: "Buổi 1",
        description: "JSX",
        startTime: "2026-08-03T19:00:00",
        endTime: "2026-08-03T21:00:00",
        meetingUrl: "https://zoom.example/1",
        platform: "ZOOM",
      });

      expect(result).toEqual(expect.objectContaining({
        id: 601,
        batchId: 33,
        title: "Buổi 1",
        status: "SCHEDULED",
      }));
    });

    it("rejects a session outside the batch date range", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 33, start_date: "2026-08-01", end_date: "2026-08-31" }]]);

      await expect(createInstructorSession(4, 77, 33, {
        title: "Buổi ngoài lịch",
        startTime: "2026-09-01T19:00:00",
        endTime: "2026-09-01T21:00:00",
      })).rejects.toThrow("Buổi học phải nằm trong thời gian của lớp");
    });

    it("rejects a session overlapping another session", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[{ id: 33, start_date: "2026-08-01", end_date: "2026-08-31" }]])
        .mockResolvedValueOnce([[{ id: 600, title: "Buổi đã có" }]]);

      await expect(createInstructorSession(4, 77, 33, {
        title: "Buổi trùng",
        startTime: "2026-08-03T20:00:00",
        endTime: "2026-08-03T22:00:00",
      })).rejects.toThrow("Session time overlaps with another session in this batch.");
    });

    it("generates recurring sessions and skips an existing interval", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 77 }]])
        .mockResolvedValueOnce([[
          { id: 33, code: "REACT-01", start_date: "2026-08-03", end_date: "2026-08-09", online_platform: "ZOOM", default_meeting_url: "https://zoom.example/default" },
        ]])
        .mockResolvedValueOnce([[
          { start_time: "2026-08-03T19:00:00", end_time: "2026-08-03T21:00:00" },
        ]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[
          { id: 602, batchId: 33, title: "Buổi React 1", description: null, start_time: "2026-08-05T19:00:00", end_time: "2026-08-05T21:00:00", meetingUrl: "https://zoom.example/default", meetingPassword: null, platform: "ZOOM", status: "SCHEDULED", recordingUrl: null, note: null },
        ]]);

      const result = await generateInstructorRecurringSessions(4, 77, 33, {
        weekdays: [1, 3],
        startTime: "19:00",
        endTime: "21:00",
        titlePrefix: "Buổi React",
      });

      expect(result.generatedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.sessions).toHaveLength(1);
    });

    it("maps attendance states and calculates the summary", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[
          { id: 601, batchId: 33, title: "Buổi 1", start_time: "2026-08-03T19:00:00", end_time: "2026-08-03T21:00:00", batchCode: "REACT-01", courseTitle: "React" },
        ]])
        .mockResolvedValueOnce([[
          { studentId: 1, studentName: "An", email: "an@example.com", progress: 50, status: "PRESENT", durationMinutes: 120, note: null },
          { studentId: 2, studentName: "Bình", email: "binh@example.com", progress: 20, status: "LATE", durationMinutes: 90, note: "Trễ 15 phút" },
          { studentId: 3, studentName: "Chi", email: "chi@example.com", progress: 0, status: "UNKNOWN", durationMinutes: 0, note: null },
        ]]);

      const result = await getInstructorSessionAttendance(4, 77, 33, 601);

      expect(result.summary).toEqual({ total: 3, present: 1, late: 1, excused: 0, absent: 1 });
      expect(result.students[2].status).toBe("ABSENT");
      expect(result.students[0].statusLabel).toBe("Có mặt");
    });

    it("rejects attendance for a student outside the batch", async () => {
      mockDbQuery
        .mockResolvedValueOnce([[{ id: 601 }]])
        .mockResolvedValueOnce([[{ studentId: 1 }]]);

      await expect(updateInstructorSessionAttendance(4, 77, 33, 601, {
        attendances: [{ studentId: 999, status: "PRESENT" }],
      })).rejects.toThrow("Invalid student id.");
    });
  });
});
