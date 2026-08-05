import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: { query: queryMock },
}));

import {
  createInstructorAssignment,
  createInstructorDiscussionComment,
  createInstructorStudentIntervention,
  deleteInstructorAssignment,
  getInstructorQuizzesData,
  getInstructorStudentsData,
  gradeInstructorAssignmentSubmission,
  markInstructorNotificationRead,
  updateInstructorAssignment,
} from "../../services/instructorPortal.service.js";

describe("instructor portal business rules", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  describe("student monitoring and interventions", () => {
    it("classifies students and attaches only their latest matching intervention", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve([[
            {
              id: 7,
              name: "Giảng viên A",
              email: "teacher@example.com",
              phone: null,
              avatar: null,
              status: "ACTIVE",
              bio: null,
              specialization: "Web",
              experienceYears: 3,
              qualification: null,
              workplace: null,
            },
          ]]);
        }
        if (sql.includes("FROM enrollments e")) {
          return Promise.resolve([[
            {
              user_id: 20,
              batchId: 31,
              name: "Học viên yếu",
              email: "weak@example.com",
              course: "Node.js",
              batch: "NODE-K1",
              progress: 25,
              attendance: 45,
              enrolled_at: new Date(),
            },
            {
              user_id: 21,
              batchId: 31,
              name: "Học viên hoàn thành",
              email: "done@example.com",
              course: "Node.js",
              batch: "NODE-K1",
              progress: 95,
              attendance: 92,
              enrolled_at: new Date(),
            },
          ]]);
        }
        if (sql.includes("FROM instructor_student_interventions i")) {
          return Promise.resolve([[
            { id: 9, studentId: 20, batchId: 31, note: "Cần kèm thêm", nextAction: "Hẹn trao đổi" },
          ]]);
        }
        return Promise.resolve([{ affectedRows: 0 }]);
      });

      const result = await getInstructorStudentsData(7);

      expect(result.instructorStudents).toHaveLength(2);
      expect(result.instructorStudents[0]).toEqual(expect.objectContaining({
        id: 20,
        progress: 25,
        attendance: 45,
        latestIntervention: expect.objectContaining({ id: 9 }),
      }));
      expect(result.instructorStudents[1].latestIntervention).toBeNull();
      expect(result.studentManagementStats[0].value).toBe("2");
      expect(result.studentManagementStats[2].value).toBe("1");
      expect(result.studentManagementStats[3].value).toBe("1");
      expect(result.studentAttentionQueue).toHaveLength(1);
      expect(result.cohortFilters).toContain("NODE-K1");
    });

    it.each([
      [{ batchId: 31, note: "Theo dõi" }, 0, "Invalid student id."],
      [{ batchId: 0, note: "Theo dõi" }, 20, "Invalid batch id."],
      [{ batchId: 31, note: "   " }, 20, "Intervention note is required."],
    ])("rejects invalid intervention input", async (payload, studentId, message) => {
      await expect(createInstructorStudentIntervention(7, studentId, payload)).rejects.toThrow(message);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it("prevents an instructor from intervening with a student outside their batch", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("CREATE TABLE")) return Promise.resolve([{}]);
        if (sql.includes("FROM enrollments e")) return Promise.resolve([[]]);
        return Promise.resolve([{}]);
      });

      await expect(createInstructorStudentIntervention(7, 20, {
        batchId: 31,
        note: "Theo dõi",
      })).rejects.toThrow("Student not found for this instructor.");
    });

    it("creates a trimmed intervention for a student in the instructor batch", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM enrollments e")) return Promise.resolve([[{ studentId: 20 }]]);
        if (sql.includes("INSERT INTO instructor_student_interventions")) {
          return Promise.resolve([{ insertId: 501 }]);
        }
        return Promise.resolve([{}]);
      });

      const result = await createInstructorStudentIntervention(7, 20, {
        batchId: 31,
        note: "  Cần học bù  ",
        nextAction: "  Hẹn thứ sáu  ",
      });

      expect(result).toEqual(expect.objectContaining({
        id: 501,
        studentId: 20,
        batchId: 31,
        note: "Cần học bù",
        nextAction: "Hẹn thứ sáu",
      }));
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO instructor_student_interventions"),
        [7, 20, 31, "Cần học bù", "Hẹn thứ sáu"],
      );
    });
  });

  describe("assignment lifecycle", () => {
    const validAssignment = {
      batchId: 31,
      lessonId: 51,
      title: "Bài tập Node.js",
      description: "Xây API",
      dueDate: "2026-08-20T20:00",
      maxScore: 10,
    };

    it.each([
      [{ ...validAssignment, batchId: 0 }, "Invalid batch id."],
      [{ ...validAssignment, lessonId: 0 }, "Lesson is required."],
      [{ ...validAssignment, title: " " }, "Assignment title is required."],
      [{ ...validAssignment, dueDate: "" }, "Due date is required."],
      [{ ...validAssignment, maxScore: 0 }, "Max score must be greater than 0."],
    ])("rejects invalid assignment data before querying the database", async (payload, message) => {
      await expect(createInstructorAssignment(7, payload)).rejects.toThrow(message);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it("creates one assignment in every batch of the same course when scope is ALL", async () => {
      let nextInsertId = 700;
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM course_batches") && sql.includes("LIMIT 1")) {
          return Promise.resolve([[{ id: 31, courseId: 11 }]]);
        }
        if (sql.includes("FROM lessons l")) return Promise.resolve([[{ id: 51 }]]);
        if (sql.includes("FROM course_batches") && sql.includes("ORDER BY batch_id")) {
          return Promise.resolve([[{ id: 31 }, { id: 32 }]]);
        }
        if (sql.includes("INSERT INTO assignments")) {
          nextInsertId += 1;
          return Promise.resolve([{ insertId: nextInsertId }]);
        }
        return Promise.resolve([[]]);
      });

      const result = await createInstructorAssignment(7, {
        ...validAssignment,
        batchScope: "all",
      });

      expect(result).toEqual(expect.objectContaining({ id: 701, createdCount: 2 }));
      const insertCalls = queryMock.mock.calls.filter(([sql]) => sql.includes("INSERT INTO assignments"));
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0][1][0]).toBe(31);
      expect(insertCalls[1][1][0]).toBe(32);
    });

    it("does not create an assignment when the lesson belongs to another course", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM course_batches")) return Promise.resolve([[{ id: 31, courseId: 11 }]]);
        if (sql.includes("FROM lessons l")) return Promise.resolve([[]]);
        return Promise.resolve([[]]);
      });

      await expect(createInstructorAssignment(7, validAssignment)).rejects.toThrow(
        "Lesson not found for this batch course.",
      );
      expect(queryMock.mock.calls.some(([sql]) => sql.includes("INSERT INTO assignments"))).toBe(false);
    });

    it("updates an owned assignment after checking batch and lesson ownership", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM assignments a")) return Promise.resolve([[{ id: 80 }]]);
        if (sql.includes("FROM course_batches")) return Promise.resolve([[{ id: 31, courseId: 11 }]]);
        if (sql.includes("FROM lessons l")) return Promise.resolve([[{ id: 51 }]]);
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateInstructorAssignment(7, 80, validAssignment);

      expect(result).toEqual(expect.objectContaining({
        id: 80,
        batchId: 31,
        lessonId: 51,
        title: "Bài tập Node.js",
        dueDate: "2026-08-20 20:00",
      }));
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE assignments"),
        [31, 51, "Bài tập Node.js", "Xây API", "2026-08-20 20:00", 10, 80],
      );
    });

    it("prevents updating an assignment owned by another instructor", async () => {
      queryMock.mockResolvedValueOnce([[]]);

      await expect(updateInstructorAssignment(7, 80, validAssignment)).rejects.toThrow(
        "Assignment not found for this instructor.",
      );
    });

    it("deletes only an assignment owned by the instructor", async () => {
      queryMock
        .mockResolvedValueOnce([[{ id: 80 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await expect(deleteInstructorAssignment(7, 80)).resolves.toEqual({ id: 80 });
      expect(queryMock).toHaveBeenLastCalledWith(
        expect.stringContaining("DELETE FROM assignments"),
        [80],
      );
    });

    it("rejects a grade above the assignment maximum and does not update", async () => {
      queryMock.mockResolvedValueOnce([[{ maxScore: 10 }]]);

      await expect(gradeInstructorAssignmentSubmission(7, 80, 90, {
        score: 11,
        feedback: "Quá thang điểm",
      })).rejects.toThrow("Score cannot be greater than max score.");
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      [0, 90, 8, "Invalid assignment id."],
      [80, 0, 8, "Invalid submission id."],
      [80, 90, -1, "Score must be zero or greater."],
    ])("rejects invalid grading identifiers or score", async (assignmentId, submissionId, score, message) => {
      await expect(gradeInstructorAssignmentSubmission(7, assignmentId, submissionId, { score })).rejects.toThrow(message);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe("quiz overview and communication safety", () => {
    it("returns an empty but usable quiz workspace when the instructor has no content", async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes("FROM users u")) {
          return Promise.resolve([[
            {
              id: 7,
              name: "Giảng viên A",
              email: "teacher@example.com",
              phone: null,
              avatar: null,
              status: "ACTIVE",
              bio: null,
              specialization: "Web",
              experienceYears: 3,
              qualification: null,
              workplace: null,
            },
          ]]);
        }
        return Promise.resolve([[]]);
      });

      const result = await getInstructorQuizzesData(7);

      expect(result.quizManagementStats.map((item) => item.value)).toEqual(["0", "0", "0%", "0"]);
      expect(result.instructorQuizzes).toEqual([]);
      expect(result.assignmentItems).toEqual([]);
      expect(result.batchOptions).toEqual([]);
    });

    it("reports a missing notification instead of claiming it was read", async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await expect(markInstructorNotificationRead(7, 404)).rejects.toThrow("Notification not found.");
    });

    it.each([
      [0, { content: "Trả lời" }, "Invalid discussion id."],
      [55, { content: "   " }, "Comment content is required."],
    ])("rejects invalid discussion comments", async (discussionId, payload, message) => {
      await expect(createInstructorDiscussionComment(7, discussionId, payload)).rejects.toThrow(message);
      expect(queryMock).not.toHaveBeenCalled();
    });

    it("prevents replying to a discussion outside the instructor courses", async () => {
      queryMock.mockResolvedValueOnce([[]]);

      await expect(createInstructorDiscussionComment(7, 55, {
        content: "Không có quyền",
      })).rejects.toThrow("Discussion not found.");
      expect(queryMock).toHaveBeenCalledTimes(1);
    });
  });
});
