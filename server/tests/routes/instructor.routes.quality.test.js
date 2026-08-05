import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const serviceNames = [
    "loginInstructor",
    "registerInstructor",
    "getInstructorDashboardData",
    "createInstructorCourse",
    "createInstructorLesson",
    "createInstructorQuiz",
    "bulkImportInstructorLessons",
    "createInstructorBatch",
    "createInstructorQuestion",
    "createInstructorSession",
    "createInstructorModule",
    "deleteInstructorCourse",
    "deleteInstructorBatch",
    "deleteInstructorSession",
    "deleteInstructorLesson",
    "deleteInstructorModule",
    "deleteInstructorQuiz",
    "deleteInstructorQuestion",
    "getInstructorCourseDetail",
    "getInstructorCoursesPageData",
    "getInstructorSessionAttendance",
    "generateInstructorRecurringSessions",
    "gradeInstructorQuizAttempt",
    "respondInstructorCourseReview",
    "reorderInstructorLessons",
    "reorderInstructorModules",
    "updateInstructorCourse",
    "updateInstructorCourseWorkflowStatus",
    "updateInstructorSessionAttendance",
    "updateInstructorBatch",
    "updateInstructorSession",
    "updateInstructorModule",
    "updateInstructorLesson",
    "updateInstructorQuiz",
    "updateInstructorQuestion",
    "createInstructorAssignment",
    "createInstructorDiscussionComment",
    "createInstructorStudentIntervention",
    "deleteInstructorAssignment",
    "gradeInstructorAssignmentSubmission",
    "getInstructorAnalyticsData",
    "getInstructorInteractionData",
    "getInstructorProfileData",
    "getInstructorQuizzesData",
    "getInstructorStudentsData",
    "markInstructorNotificationRead",
    "updateInstructorProfile",
    "updateInstructorAssignment",
  ];

  return Object.fromEntries(serviceNames.map((name) => [name, vi.fn()]));
});

vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: (req, res, next) => {
    const token = req.headers.authorization;

    if (token !== "Bearer valid-token" && token !== "Bearer student-token") {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    req.auth = {
      user: {
        id: token === "Bearer valid-token" ? 7 : 8,
        role: token === "Bearer valid-token" ? "TEACHER" : "STUDENT",
      },
    };
    next();
  },
  requireRole: (role) => (req, res, next) => {
    if (req.auth?.user?.role !== role) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }
    next();
  },
}));

vi.mock("../../services/instructorAuth.service.js", () => ({
  loginInstructor: mocks.loginInstructor,
  registerInstructor: mocks.registerInstructor,
}));

vi.mock("../../services/instructorDashboard.service.js", () => ({
  getInstructorDashboardData: mocks.getInstructorDashboardData,
}));

vi.mock("../../services/instructorCourses.service.js", () => ({
  createInstructorCourse: mocks.createInstructorCourse,
  createInstructorLesson: mocks.createInstructorLesson,
  createInstructorQuiz: mocks.createInstructorQuiz,
  bulkImportInstructorLessons: mocks.bulkImportInstructorLessons,
  createInstructorBatch: mocks.createInstructorBatch,
  createInstructorQuestion: mocks.createInstructorQuestion,
  createInstructorSession: mocks.createInstructorSession,
  createInstructorModule: mocks.createInstructorModule,
  deleteInstructorCourse: mocks.deleteInstructorCourse,
  deleteInstructorBatch: mocks.deleteInstructorBatch,
  deleteInstructorSession: mocks.deleteInstructorSession,
  deleteInstructorLesson: mocks.deleteInstructorLesson,
  deleteInstructorModule: mocks.deleteInstructorModule,
  deleteInstructorQuiz: mocks.deleteInstructorQuiz,
  deleteInstructorQuestion: mocks.deleteInstructorQuestion,
  getInstructorCourseDetail: mocks.getInstructorCourseDetail,
  getInstructorCoursesPageData: mocks.getInstructorCoursesPageData,
  getInstructorSessionAttendance: mocks.getInstructorSessionAttendance,
  generateInstructorRecurringSessions: mocks.generateInstructorRecurringSessions,
  gradeInstructorQuizAttempt: mocks.gradeInstructorQuizAttempt,
  respondInstructorCourseReview: mocks.respondInstructorCourseReview,
  reorderInstructorLessons: mocks.reorderInstructorLessons,
  reorderInstructorModules: mocks.reorderInstructorModules,
  updateInstructorCourse: mocks.updateInstructorCourse,
  updateInstructorCourseWorkflowStatus: mocks.updateInstructorCourseWorkflowStatus,
  updateInstructorSessionAttendance: mocks.updateInstructorSessionAttendance,
  updateInstructorBatch: mocks.updateInstructorBatch,
  updateInstructorSession: mocks.updateInstructorSession,
  updateInstructorModule: mocks.updateInstructorModule,
  updateInstructorLesson: mocks.updateInstructorLesson,
  updateInstructorQuiz: mocks.updateInstructorQuiz,
  updateInstructorQuestion: mocks.updateInstructorQuestion,
}));

vi.mock("../../services/instructorPortal.service.js", () => ({
  createInstructorAssignment: mocks.createInstructorAssignment,
  createInstructorDiscussionComment: mocks.createInstructorDiscussionComment,
  createInstructorStudentIntervention: mocks.createInstructorStudentIntervention,
  deleteInstructorAssignment: mocks.deleteInstructorAssignment,
  gradeInstructorAssignmentSubmission: mocks.gradeInstructorAssignmentSubmission,
  getInstructorAnalyticsData: mocks.getInstructorAnalyticsData,
  getInstructorInteractionData: mocks.getInstructorInteractionData,
  getInstructorProfileData: mocks.getInstructorProfileData,
  getInstructorQuizzesData: mocks.getInstructorQuizzesData,
  getInstructorStudentsData: mocks.getInstructorStudentsData,
  markInstructorNotificationRead: mocks.markInstructorNotificationRead,
  updateInstructorProfile: mocks.updateInstructorProfile,
  updateInstructorAssignment: mocks.updateInstructorAssignment,
}));

import instructorRoutes from "../../routes/instructor.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/instructor", instructorRoutes);
  return app;
}

async function callRoute(app, testCase, token = "valid-token") {
  let call = request(app)[testCase.method](testCase.path).set("Authorization", `Bearer ${token}`);
  if (testCase.body !== undefined) {
    call = call.send(testCase.body);
  }
  return call;
}

const successCases = [
  { name: "loads dashboard", method: "get", path: "/instructor/dashboard", service: "getInstructorDashboardData", args: ["7"] },
  { name: "loads profile", method: "get", path: "/instructor/profile", service: "getInstructorProfileData", args: ["7"] },
  { name: "updates profile", method: "put", path: "/instructor/profile", service: "updateInstructorProfile", body: { fullName: "Teacher A" }, args: ["7", { fullName: "Teacher A" }] },
  { name: "loads courses and ignores a spoofed teacherId", method: "get", path: "/instructor/courses?teacherId=999", service: "getInstructorCoursesPageData", args: ["7"] },
  { name: "creates a course", method: "post", path: "/instructor/courses", service: "createInstructorCourse", body: { title: "Node.js" }, args: ["7", { title: "Node.js" }], status: 201 },
  { name: "updates a course", method: "put", path: "/instructor/courses/11", service: "updateInstructorCourse", body: { title: "Node.js 2" }, args: ["7", "11", { title: "Node.js 2" }] },
  { name: "deletes a course", method: "delete", path: "/instructor/courses/11", service: "deleteInstructorCourse", args: ["7", "11"] },
  { name: "updates course workflow", method: "patch", path: "/instructor/courses/11/workflow", service: "updateInstructorCourseWorkflowStatus", body: { action: "SUBMIT" }, args: ["7", "11", "SUBMIT"] },
  { name: "loads a course detail", method: "get", path: "/instructor/courses/11", service: "getInstructorCourseDetail", args: ["7", "11"] },
  { name: "creates a module", method: "post", path: "/instructor/courses/11/modules", service: "createInstructorModule", body: { title: "Module 1" }, args: ["7", "11", { title: "Module 1" }], status: 201 },
  { name: "updates a module", method: "put", path: "/instructor/courses/11/modules/21", service: "updateInstructorModule", body: { title: "Module A" }, args: ["7", "11", "21", { title: "Module A" }] },
  { name: "reorders modules", method: "patch", path: "/instructor/courses/11/modules/order", service: "reorderInstructorModules", body: { moduleIds: [22, 21] }, args: ["7", "11", [22, 21]] },
  { name: "deletes a module", method: "delete", path: "/instructor/courses/11/modules/21", service: "deleteInstructorModule", args: ["7", "11", "21"] },
  { name: "creates a batch", method: "post", path: "/instructor/courses/11/batches", service: "createInstructorBatch", body: { name: "K1" }, args: ["7", "11", { name: "K1" }], status: 201 },
  { name: "updates a batch", method: "put", path: "/instructor/courses/11/batches/31", service: "updateInstructorBatch", body: { name: "K2" }, args: ["7", "11", "31", { name: "K2" }] },
  { name: "deletes a batch", method: "delete", path: "/instructor/courses/11/batches/31", service: "deleteInstructorBatch", args: ["7", "11", "31"] },
  { name: "generates recurring sessions", method: "post", path: "/instructor/courses/11/batches/31/sessions/generate", service: "generateInstructorRecurringSessions", body: { weekdays: [2, 4] }, args: ["7", "11", "31", { weekdays: [2, 4] }], status: 201 },
  { name: "creates a session with the correct batch", method: "post", path: "/instructor/courses/11/batches/31/sessions", service: "createInstructorSession", body: { title: "Buổi 1" }, args: ["7", "11", "31", { title: "Buổi 1" }], status: 201 },
  { name: "updates a session", method: "put", path: "/instructor/courses/11/batches/31/sessions/41", service: "updateInstructorSession", body: { title: "Buổi 2" }, args: ["7", "11", "31", "41", { title: "Buổi 2" }] },
  { name: "loads session attendance", method: "get", path: "/instructor/courses/11/batches/31/sessions/41/attendance", service: "getInstructorSessionAttendance", args: ["7", "11", "31", "41"] },
  { name: "updates session attendance", method: "put", path: "/instructor/courses/11/batches/31/sessions/41/attendance", service: "updateInstructorSessionAttendance", body: { records: [{ studentId: 5, status: "PRESENT" }] }, args: ["7", "11", "31", "41", { records: [{ studentId: 5, status: "PRESENT" }] }] },
  { name: "deletes a session", method: "delete", path: "/instructor/courses/11/batches/31/sessions/41", service: "deleteInstructorSession", args: ["7", "11", "31", "41"] },
  { name: "creates a lesson", method: "post", path: "/instructor/courses/11/lessons", service: "createInstructorLesson", body: { title: "Bài 1" }, args: ["7", "11", { title: "Bài 1" }], status: 201 },
  { name: "updates a lesson", method: "put", path: "/instructor/courses/11/lessons/51", service: "updateInstructorLesson", body: { title: "Bài 2" }, args: ["7", "11", "51", { title: "Bài 2" }] },
  { name: "reorders lessons", method: "patch", path: "/instructor/courses/11/modules/21/lessons/order", service: "reorderInstructorLessons", body: { lessonIds: [52, 51] }, args: ["7", "11", "21", [52, 51]] },
  { name: "imports lessons", method: "post", path: "/instructor/courses/11/lessons/import", service: "bulkImportInstructorLessons", body: { moduleId: 21, lessons: [{ title: "Bài nhập" }] }, args: ["7", "11", 21, [{ title: "Bài nhập" }]], status: 201 },
  { name: "deletes a lesson", method: "delete", path: "/instructor/courses/11/lessons/51", service: "deleteInstructorLesson", args: ["7", "11", "51"] },
  { name: "creates a quiz", method: "post", path: "/instructor/courses/11/quizzes", service: "createInstructorQuiz", body: { title: "Quiz 1" }, args: ["7", "11", { title: "Quiz 1" }], status: 201 },
  { name: "updates a quiz", method: "put", path: "/instructor/courses/11/quizzes/61", service: "updateInstructorQuiz", body: { title: "Quiz 2" }, args: ["7", "11", "61", { title: "Quiz 2" }] },
  { name: "deletes a quiz", method: "delete", path: "/instructor/courses/11/quizzes/61", service: "deleteInstructorQuiz", args: ["7", "11", "61"] },
  { name: "creates a question", method: "post", path: "/instructor/courses/11/quizzes/61/questions", service: "createInstructorQuestion", body: { questionText: "2 + 2?" }, args: ["7", "11", "61", { questionText: "2 + 2?" }], status: 201 },
  { name: "updates a question", method: "put", path: "/instructor/courses/11/quizzes/61/questions/71", service: "updateInstructorQuestion", body: { questionText: "3 + 3?" }, args: ["7", "11", "61", "71", { questionText: "3 + 3?" }] },
  { name: "deletes a question", method: "delete", path: "/instructor/courses/11/quizzes/61/questions/71", service: "deleteInstructorQuestion", args: ["7", "11", "61", "71"] },
  { name: "grades a quiz attempt", method: "patch", path: "/instructor/courses/11/quizzes/61/attempts/81/grade", service: "gradeInstructorQuizAttempt", body: { score: 8 }, args: ["7", "11", "61", "81", { score: 8 }] },
  { name: "responds to a review", method: "patch", path: "/instructor/courses/11/reviews/91/respond", service: "respondInstructorCourseReview", body: { response: "Cảm ơn" }, args: ["7", "11", "91", { response: "Cảm ơn" }] },
  { name: "loads students", method: "get", path: "/instructor/students", service: "getInstructorStudentsData", args: ["7"] },
  { name: "creates a student intervention", method: "post", path: "/instructor/students/101/interventions", service: "createInstructorStudentIntervention", body: { note: "Cần hỗ trợ" }, args: ["7", "101", { note: "Cần hỗ trợ" }], status: 201 },
  { name: "loads quizzes overview", method: "get", path: "/instructor/quizzes", service: "getInstructorQuizzesData", args: ["7"] },
  { name: "creates an assignment", method: "post", path: "/instructor/assignments", service: "createInstructorAssignment", body: { title: "Bài tập 1" }, args: ["7", { title: "Bài tập 1" }], status: 201 },
  { name: "updates an assignment", method: "patch", path: "/instructor/assignments/111", service: "updateInstructorAssignment", body: { title: "Bài tập 2" }, args: ["7", "111", { title: "Bài tập 2" }] },
  { name: "deletes an assignment", method: "delete", path: "/instructor/assignments/111", service: "deleteInstructorAssignment", args: ["7", "111"] },
  { name: "grades an assignment submission", method: "patch", path: "/instructor/assignments/111/submissions/121/grade", service: "gradeInstructorAssignmentSubmission", body: { score: 9 }, args: ["7", "111", "121", { score: 9 }] },
  { name: "loads interaction data", method: "get", path: "/instructor/interaction", service: "getInstructorInteractionData", args: ["7"] },
  { name: "loads analytics data", method: "get", path: "/instructor/analytics", service: "getInstructorAnalyticsData", args: ["7"] },
  { name: "marks a notification as read", method: "patch", path: "/instructor/notifications/131/read", service: "markInstructorNotificationRead", args: ["7", "131"] },
  { name: "creates a discussion comment", method: "post", path: "/instructor/discussions/141/comments", service: "createInstructorDiscussionComment", body: { content: "Phản hồi" }, args: ["7", "141", { content: "Phản hồi" }], status: 201 },
];

describe("instructor route quality coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(createApp()).get("/instructor/courses");

    expect(response.status).toBe(401);
    expect(mocks.getInstructorCoursesPageData).not.toHaveBeenCalled();
  });

  it("rejects an authenticated student from teacher APIs", async () => {
    const response = await request(createApp())
      .get("/instructor/courses")
      .set("Authorization", "Bearer student-token");

    expect(response.status).toBe(403);
    expect(mocks.getInstructorCoursesPageData).not.toHaveBeenCalled();
  });

  for (const testCase of successCases) {
    it(testCase.name, async () => {
      const expectedData = { route: testCase.service };
      mocks[testCase.service].mockResolvedValue(expectedData);

      const response = await callRoute(createApp(), testCase);

      expect(response.status).toBe(testCase.status ?? 200);
      expect(response.body).toEqual({ success: true, data: expectedData });
      expect(mocks[testCase.service]).toHaveBeenCalledTimes(1);
      expect(mocks[testCase.service]).toHaveBeenCalledWith(...testCase.args);
    });
  }

  const notFoundCases = [
    ["dashboard", "/instructor/dashboard", "getInstructorDashboardData"],
    ["profile", "/instructor/profile", "getInstructorProfileData"],
    ["courses", "/instructor/courses", "getInstructorCoursesPageData"],
    ["course detail", "/instructor/courses/11", "getInstructorCourseDetail"],
    ["students", "/instructor/students", "getInstructorStudentsData"],
    ["quizzes", "/instructor/quizzes", "getInstructorQuizzesData"],
    ["interaction", "/instructor/interaction", "getInstructorInteractionData"],
    ["analytics", "/instructor/analytics", "getInstructorAnalyticsData"],
  ];

  for (const [name, path, service] of notFoundCases) {
    it(`returns 404 when ${name} data is missing`, async () => {
      mocks[service].mockResolvedValue(null);

      const response = await callRoute(createApp(), { method: "get", path });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  }

  it("maps a business validation error to 400", async () => {
    mocks.createInstructorSession.mockRejectedValue(new Error("Session overlaps another session."));

    const response = await callRoute(createApp(), {
      method: "post",
      path: "/instructor/courses/11/batches/31/sessions",
      body: { title: "Trùng lịch" },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: "Session overlaps another session." });
  });

  it("hides unexpected internal errors behind a generic 500 message", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getInstructorAnalyticsData.mockRejectedValue({ database: "secret failure" });

    const response = await callRoute(createApp(), {
      method: "get",
      path: "/instructor/analytics",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Failed to load instructor analytics data.",
    });
    expect(JSON.stringify(response.body)).not.toContain("secret failure");
    errorSpy.mockRestore();
  });
});
