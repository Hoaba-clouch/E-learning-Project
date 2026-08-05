import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { loginInstructor, registerInstructor } from "../services/instructorAuth.service.js";
import { getInstructorDashboardData } from "../services/instructorDashboard.service.js";
import {
  createInstructorCourse,
  createInstructorLesson,
  createInstructorQuiz,
  bulkImportInstructorLessons,
  createInstructorBatch,
  createInstructorQuestion,
  createInstructorSession,
  createInstructorModule,
  deleteInstructorCourse,
  deleteInstructorBatch,
  deleteInstructorSession,
  deleteInstructorLesson,
  deleteInstructorModule,
  deleteInstructorQuiz,
  deleteInstructorQuestion,
  getInstructorCourseDetail,
  getInstructorCoursesPageData,
  getInstructorSessionAttendance,
  generateInstructorRecurringSessions,
  gradeInstructorQuizAttempt,
  respondInstructorCourseReview,
  reorderInstructorLessons,
  reorderInstructorModules,
  updateInstructorCourse,
  updateInstructorCourseWorkflowStatus,
  updateInstructorSessionAttendance,
  updateInstructorBatch,
  updateInstructorSession,
  updateInstructorModule,
  updateInstructorLesson,
  updateInstructorQuiz,
  updateInstructorQuestion,
} from "../services/instructorCourses.service.js";
import {
  createInstructorAssignment,
  createInstructorDiscussionComment,
  createInstructorStudentIntervention,
  deleteInstructorAssignment,
  gradeInstructorAssignmentSubmission,
  getInstructorAnalyticsData,
  getInstructorInteractionData,
  getInstructorProfileData,
  getInstructorQuizzesData,
  getInstructorStudentsData,
  markInstructorNotificationRead,
  updateInstructorProfile,
  updateInstructorAssignment,
} from "../services/instructorPortal.service.js";

const router = Router();

function handleRouteError(res, error, message) {
  console.error(message, error);

  res.status(500).json({
    success: false,
    message,
  });
}

router.post("/auth/login", async (req, res) => {
  try {
    const data = await loginInstructor(req.body ?? {});
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to login instructor.");
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const data = await registerInstructor(req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to register instructor.");
  }
});

router.use(requireAuth, requireRole("TEACHER"), (req, res, next) => {
  Object.defineProperty(req, "query", {
    configurable: true,
    enumerable: true,
    value: {
      ...req.query,
      teacherId: String(req.auth.user.id),
    },
  });
  next();
});

router.get("/dashboard", async (req, res) => {
  try {
    const data = await getInstructorDashboardData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor dashboard data.");
  }
});

router.get("/profile", async (req, res) => {
  try {
    const data = await getInstructorProfileData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found.",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor profile.");
  }
});

router.put("/profile", async (req, res) => {
  try {
    const data = await updateInstructorProfile(req.query.teacherId, req.body ?? {});

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found.",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Avatar URL"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update instructor profile.");
  }
});

router.get("/courses", async (req, res) => {
  try {
    const data = await getInstructorCoursesPageData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor courses data.");
  }
});

router.post("/courses", async (req, res) => {
  try {
    const courseData = req.body ?? {};
    const newCourse = await createInstructorCourse(req.query.teacherId, courseData);

    res.status(201).json({
      success: true,
      data: newCourse,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("valid course category") ||
        error.message.includes("Thumbnail URL"))
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    handleRouteError(res, error, "Failed to create course.");
  }
});

router.put("/courses/:courseId", async (req, res) => {
  try {
    const courseData = req.body ?? {};
    const data = await updateInstructorCourse(req.query.teacherId, req.params.courseId, courseData);

    res.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("valid course category") ||
        error.message.includes("Thumbnail URL"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update course.");
  }
});

router.delete("/courses/:courseId", async (req, res) => {
  try {
    const data = await deleteInstructorCourse(req.query.teacherId, req.params.courseId);
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete course.");
  }
});

router.patch("/courses/:courseId/workflow", async (req, res) => {
  try {
    const data = await updateInstructorCourseWorkflowStatus(
      req.query.teacherId,
      req.params.courseId,
      req.body?.action,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Invalid") ||
        error.message.includes("Only") ||
        error.message.includes("not found"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update course workflow.");
  }
});

router.get("/courses/:courseId", async (req, res) => {
  try {
    const data = await getInstructorCourseDetail(req.query.teacherId, req.params.courseId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Course not found for this instructor.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor course detail.");
  }
});

router.post("/courses/:courseId/modules", async (req, res) => {
  try {
    const moduleData = req.body ?? {};
    const data = await createInstructorModule(req.query.teacherId, req.params.courseId, moduleData);

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message.includes("required")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create module.");
  }
});

router.put("/courses/:courseId/modules/:moduleId", async (req, res) => {
  try {
    const moduleData = req.body ?? {};
    const data = await updateInstructorModule(
      req.query.teacherId,
      req.params.courseId,
      req.params.moduleId,
      moduleData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message.includes("required")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update module.");
  }
});

router.patch("/courses/:courseId/modules/order", async (req, res) => {
  try {
    const data = await reorderInstructorModules(
      req.query.teacherId,
      req.params.courseId,
      req.body?.moduleIds,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to reorder modules.");
  }
});

router.post("/courses/:courseId/batches", async (req, res) => {
  try {
    const batchData = req.body ?? {};
    const data = await createInstructorBatch(req.query.teacherId, req.params.courseId, batchData);

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create batch.");
  }
});

router.put("/courses/:courseId/batches/:batchId", async (req, res) => {
  try {
    const batchData = req.body ?? {};
    const data = await updateInstructorBatch(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      batchData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update batch.");
  }
});

router.delete("/courses/:courseId/batches/:batchId", async (req, res) => {
  try {
    const data = await deleteInstructorBatch(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete batch.");
  }
});

router.post("/courses/:courseId/batches/:batchId/sessions/generate", async (req, res) => {
  try {
    const data = await generateInstructorRecurringSessions(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      req.body ?? {},
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("later") ||
        error.message.includes("overlaps"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to generate recurring sessions.");
  }
});

router.post("/courses/:courseId/batches/:batchId/sessions", async (req, res) => {
  try {
    const sessionData = req.body ?? {};
    const data = await createInstructorSession(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      sessionData,
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("within the batch date range") ||
        error.message.includes("Thời gian buổi học") ||
        error.message.includes("Lớp học chưa có ngày") ||
        error.message.includes("Buổi học phải nằm") ||
        error.message.includes("overlaps"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create session.");
  }
});

router.put("/courses/:courseId/batches/:batchId/sessions/:sessionId", async (req, res) => {
  try {
    const sessionData = req.body ?? {};
    const data = await updateInstructorSession(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      req.params.sessionId,
      sessionData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("within the batch date range") ||
        error.message.includes("Thời gian buổi học") ||
        error.message.includes("Lớp học chưa có ngày") ||
        error.message.includes("Buổi học phải nằm") ||
        error.message.includes("overlaps"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update session.");
  }
});

router.get("/courses/:courseId/batches/:batchId/sessions/:sessionId/attendance", async (req, res) => {
  try {
    const data = await getInstructorSessionAttendance(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      req.params.sessionId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to load session attendance.");
  }
});

router.put("/courses/:courseId/batches/:batchId/sessions/:sessionId/attendance", async (req, res) => {
  try {
    const data = await updateInstructorSessionAttendance(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      req.params.sessionId,
      req.body ?? {},
    );

    res.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("not found"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update session attendance.");
  }
});

router.delete("/courses/:courseId/batches/:batchId/sessions/:sessionId", async (req, res) => {
  try {
    const data = await deleteInstructorSession(
      req.query.teacherId,
      req.params.courseId,
      req.params.batchId,
      req.params.sessionId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete session.");
  }
});

router.delete("/courses/:courseId/modules/:moduleId", async (req, res) => {
  try {
    const data = await deleteInstructorModule(
      req.query.teacherId,
      req.params.courseId,
      req.params.moduleId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("required"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete module.");
  }
});

router.post("/courses/:courseId/lessons", async (req, res) => {
  try {
    const lessonData = req.body ?? {};
    const data = await createInstructorLesson(req.query.teacherId, req.params.courseId, lessonData);

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create lesson.");
  }
});

router.put("/courses/:courseId/lessons/:lessonId", async (req, res) => {
  try {
    const lessonData = req.body ?? {};
    const data = await updateInstructorLesson(
      req.query.teacherId,
      req.params.courseId,
      req.params.lessonId,
      lessonData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update lesson.");
  }
});

router.patch("/courses/:courseId/modules/:moduleId/lessons/order", async (req, res) => {
  try {
    const data = await reorderInstructorLessons(
      req.query.teacherId,
      req.params.courseId,
      req.params.moduleId,
      req.body?.lessonIds,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to reorder lessons.");
  }
});

router.post("/courses/:courseId/quizzes", async (req, res) => {
  try {
    const quizData = req.body ?? {};
    const data = await createInstructorQuiz(req.query.teacherId, req.params.courseId, quizData);

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create quiz.");
  }
});

router.put("/courses/:courseId/quizzes/:quizId", async (req, res) => {
  try {
    const quizData = req.body ?? {};
    const data = await updateInstructorQuiz(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
      quizData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update quiz.");
  }
});

router.delete("/courses/:courseId/quizzes/:quizId", async (req, res) => {
  try {
    const data = await deleteInstructorQuiz(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete quiz.");
  }
});

router.post("/courses/:courseId/quizzes/:quizId/questions", async (req, res) => {
  try {
    const questionData = req.body ?? {};
    const data = await createInstructorQuestion(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
      questionData,
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create question.");
  }
});

router.put("/courses/:courseId/quizzes/:quizId/questions/:questionId", async (req, res) => {
  try {
    const questionData = req.body ?? {};
    const data = await updateInstructorQuestion(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
      req.params.questionId,
      questionData,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("must"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update question.");
  }
});

router.delete("/courses/:courseId/quizzes/:quizId/questions/:questionId", async (req, res) => {
  try {
    const data = await deleteInstructorQuestion(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
      req.params.questionId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete question.");
  }
});

router.patch("/courses/:courseId/quizzes/:quizId/attempts/:attemptId/grade", async (req, res) => {
  try {
    const data = await gradeInstructorQuizAttempt(
      req.query.teacherId,
      req.params.courseId,
      req.params.quizId,
      req.params.attemptId,
      req.body ?? {},
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("Score"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to grade quiz attempt.");
  }
});

router.patch("/courses/:courseId/reviews/:reviewId/respond", async (req, res) => {
  try {
    const data = await respondInstructorCourseReview(
      req.query.teacherId,
      req.params.courseId,
      req.params.reviewId,
      req.body ?? {},
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("required"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update review response.");
  }
});

router.post("/courses/:courseId/lessons/import", async (req, res) => {
  try {
    const { moduleId, lessons } = req.body ?? {};
    const data = await bulkImportInstructorLessons(
      req.query.teacherId,
      req.params.courseId,
      moduleId,
      lessons,
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("Invalid"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to import lessons.");
  }
});

router.delete("/courses/:courseId/lessons/:lessonId", async (req, res) => {
  try {
    const data = await deleteInstructorLesson(
      req.query.teacherId,
      req.params.courseId,
      req.params.lessonId,
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("required"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete lesson.");
  }
});

router.get("/students", async (req, res) => {
  try {
    const data = await getInstructorStudentsData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Instructor not found." });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor students data.");
  }
});

router.post("/students/:studentId/interventions", async (req, res) => {
  try {
    const data = await createInstructorStudentIntervention(
      req.query.teacherId,
      req.params.studentId,
      req.body ?? {},
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("not found"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create student intervention.");
  }
});

router.get("/quizzes", async (req, res) => {
  try {
    const data = await getInstructorQuizzesData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Instructor not found." });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor quizzes data.");
  }
});

router.post("/assignments", async (req, res) => {
  try {
    const data = await createInstructorAssignment(req.query.teacherId, req.body ?? {});

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("greater") ||
        error.message.includes("not found"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create assignment.");
  }
});

router.patch("/assignments/:assignmentId", async (req, res) => {
  try {
    const data = await updateInstructorAssignment(req.query.teacherId, req.params.assignmentId, req.body ?? {});

    res.json({ success: true, data });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("greater") ||
        error.message.includes("not found"))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to update assignment.");
  }
});

router.delete("/assignments/:assignmentId", async (req, res) => {
  try {
    const data = await deleteInstructorAssignment(req.query.teacherId, req.params.assignmentId);

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to delete assignment.");
  }
});

router.patch("/assignments/:assignmentId/submissions/:submissionId/grade", async (req, res) => {
  try {
    const data = await gradeInstructorAssignmentSubmission(
      req.query.teacherId,
      req.params.assignmentId,
      req.params.submissionId,
      req.body ?? {},
    );

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("Score"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to grade assignment submission.");
  }
});

router.get("/interaction", async (req, res) => {
  try {
    const data = await getInstructorInteractionData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Instructor not found." });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor interaction data.");
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const data = await getInstructorAnalyticsData(req.query.teacherId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Instructor not found." });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load instructor analytics data.");
  }
});

router.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const data = await markInstructorNotificationRead(req.query.teacherId, req.params.notificationId);

    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to mark notification as read.");
  }
});

router.post("/discussions/:discussionId/comments", async (req, res) => {
  try {
    const data = await createInstructorDiscussionComment(
      req.query.teacherId,
      req.params.discussionId,
      req.body ?? {},
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found") || error.message.includes("required"))) {
      return res.status(400).json({ success: false, message: error.message });
    }

    handleRouteError(res, error, "Failed to create discussion comment.");
  }
});

export default router;
