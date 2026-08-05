import { Router } from "express";
import {
  attachAuthIfPresent,
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";
import {
  addStudentCartItem,
  getStudentCart,
  removeStudentCartItem,
} from "../services/studentCart.service.js";
import {
  getStudentCourseCategories,
  getStudentCourseDetail,
  getPublicInstructorDetail,
  getStudentCourses,
  getStudentEnrolledCourses,
  completeStudentLesson,
  createStudentCourseReview,
  getStudentCourseReviewEligibility,
  updateStudentCourseReview,
} from "../services/studentCourses.service.js";
import {
  getStudentExamReview,
  getStudentExams,
  getStudentExamWorkspace,
  saveStudentExamDraft,
  startStudentExam,
  submitStudentExam,
} from "../services/studentExams.service.js";
import {
  assignmentUploadMiddleware,
  saveStudentAssignmentSubmission,
} from "../services/studentAssignments.service.js";
import {
  createStudentVnpayPayment,
  verifyStudentVnpayReturn,
} from "../services/studentPayments.service.js";
import {
  getStudentAccountCertificates,
  getStudentAccountOverview,
  getStudentAccountPaymentHistory,
  getStudentAccountProfile,
  studentAvatarUploadMiddleware,
  updateStudentAccountProfile,
} from "../services/studentAccount.service.js";
import {
  createStudentDiscussion,
  createStudentDiscussionComment,
  getStudentInteractionData,
  reportInteractionContent,
  toggleDiscussionReaction,
  updateOwnDiscussion,
} from "../services/studentInteractions.service.js";
import {
  createNotification,
  createNotificationForAssignmentTeacher,
  createNotificationForExamTeacher,
  createNotificationsForRole,
} from "../services/notification.service.js";

const router = Router();

function handleRouteError(res, error, message) {
  console.error(message, error);

  res.status(500).json({
    success: false,
    message,
  });
}

router.get("/course-categories", async (req, res) => {
  try {
    const data = await getStudentCourseCategories();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load course categories.");
  }
});

router.get("/cart", requireAuth, async (req, res) => {
  try {
    const data = await getStudentCart(req.auth.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load cart.");
  }
});

router.post("/cart/items", requireAuth, async (req, res) => {
  try {
    const batchId = Number(req.body?.batchId);

    if (!Number.isInteger(batchId) || batchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch id.",
      });
    }

    const result = await addStudentCartItem(req.auth.user.id, batchId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Course added to cart.",
      data: result.cart,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to add cart item.");
  }
});

router.delete("/cart/items/:id", requireAuth, async (req, res) => {
  try {
    const cartItemId = Number(req.params.id);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item id.",
      });
    }

    const deleted = await removeStudentCartItem(req.auth.user.id, cartItemId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    res.json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to remove cart item.");
  }
});

router.post("/payments/vnpay/create", requireAuth, async (req, res) => {
  try {
    const result = await createStudentVnpayPayment(req.auth.user.id, req);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to create VNPAY payment.");
  }
});

router.get("/payments/vnpay/return", requireAuth, async (req, res) => {
  try {
    const result = await verifyStudentVnpayReturn(req.auth.user.id, req.query);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to verify VNPAY payment.");
  }
});

router.get("/courses", async (req, res) => {
  try {
    const data = await getStudentCourses({
      categoryId: req.query.categoryId,
      level: req.query.level,
      search: req.query.search,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load courses.");
  }
});

router.get("/my-courses", requireAuth, async (req, res) => {
  try {
    const data = await getStudentEnrolledCourses(req.auth.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load enrolled courses.");
  }
});

router.put("/lessons/:id/progress", requireAuth, async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid lesson id." });
    }

    const data = await completeStudentLesson(req.auth.user.id, lessonId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Bài học không thuộc khóa học đã ghi danh.",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to update lesson progress.");
  }
});

router.get("/account/overview", requireAuth, async (req, res) => {
  try {
    const data = await getStudentAccountOverview(req.auth.user.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student account.");
  }
});

router.get("/account/profile", requireAuth, async (req, res) => {
  try {
    const data = await getStudentAccountProfile(req.auth.user.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student account profile not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student profile.");
  }
});

router.get("/account/certificates", requireAuth, async (req, res) => {
  try {
    const data = await getStudentAccountCertificates(req.auth.user.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student certificates not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student certificates.");
  }
});

router.get("/account/payments", requireAuth, async (req, res) => {
  try {
    const data = await getStudentAccountPaymentHistory(req.auth.user.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student payment history not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student payment history.");
  }
});

router.put("/account/profile", requireAuth, (req, res) => {
  studentAvatarUploadMiddleware(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message || "Không thể tải ảnh đại diện.",
      });
    }

    try {
      const result = await updateStudentAccountProfile(
        req.auth.user.id,
        req.auth.token,
        {
          ...req.body,
          avatarFile: req.file ?? null,
        },
      );

      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }

      res.json({
        success: true,
        message: "Cập nhật hồ sơ thành công.",
        data: result.data,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to update student profile.");
    }
  });
});

router.get("/exams", requireAuth, async (req, res) => {
  try {
    const data = await getStudentExams(req.auth.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student exams.");
  }
});

router.post("/exams/:id/start", requireAuth, async (req, res) => {
  try {
    const examId = Number(req.params.id);

    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam id.",
      });
    }

    const result = await startStudentExam(req.auth.user.id, examId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to start student exam.");
  }
});

router.get("/exams/:id/attempts/:attemptId", requireAuth, async (req, res) => {
  try {
    const examId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!Number.isInteger(examId) || examId <= 0 || !Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam attempt.",
      });
    }

    const result = await getStudentExamWorkspace(req.auth.user.id, examId, attemptId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load exam workspace.");
  }
});

router.put("/exams/:id/attempts/:attemptId/answers", requireAuth, async (req, res) => {
  try {
    const examId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!Number.isInteger(examId) || examId <= 0 || !Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam attempt.",
      });
    }

    const result = await saveStudentExamDraft(
      req.auth.user.id,
      examId,
      attemptId,
      req.body?.answers ?? [],
    );

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to save exam answers.");
  }
});

router.post("/exams/:id/attempts/:attemptId/submit", requireAuth, async (req, res) => {
  try {
    const examId = Number(req.params.id);
    const attemptId = Number(req.params.attemptId);

    if (!Number.isInteger(examId) || examId <= 0 || !Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam attempt.",
      });
    }

    const result = await submitStudentExam(
      req.auth.user.id,
      examId,
      attemptId,
      req.body?.answers ?? [],
    );

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    await Promise.all([
      createNotification({
        userId: req.auth.user.id,
        type: "EXAM_SUBMITTED",
        title: "Đã nộp bài thi",
        content: `Bài thi #${examId} của bạn đã được ghi nhận.`,
        referenceType: "EXAM",
        referenceId: examId,
        targetUrl: "/student?view=exam",
      }),
      createNotificationsForRole("ADMIN", {
        type: "EXAM_SUBMITTED",
        title: "Học viên vừa nộp bài thi",
        content: `${req.auth.user.fullName} vừa nộp bài thi #${examId}.`,
        referenceType: "EXAM",
        referenceId: examId,
        targetUrl: "/admin",
      }),
      createNotificationForExamTeacher(examId, {
        type: "EXAM_SUBMITTED",
        title: "Có bài thi mới cần xem",
        content: `${req.auth.user.fullName} vừa nộp bài thi #${examId}.`,
        referenceType: "EXAM",
        referenceId: examId,
        targetUrl: "/instructor/quizzes",
        priority: "HIGH",
      }),
    ]).catch((error) => {
      console.error("Failed to create exam submission notifications.", error);
    });

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to submit exam.");
  }
});

router.get("/exams/:id/review", requireAuth, async (req, res) => {
  try {
    const examId = Number(req.params.id);
    const attemptId = req.query.attemptId ? Number(req.query.attemptId) : null;

    if (!Number.isInteger(examId) || examId <= 0 || (attemptId !== null && (!Number.isInteger(attemptId) || attemptId <= 0))) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam review request.",
      });
    }

    const result = await getStudentExamReview(req.auth.user.id, examId, attemptId);

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load exam review.");
  }
});

router.post("/assignments/:id/submission", requireAuth, (req, res) => {
  assignmentUploadMiddleware(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message || "Không thể tải file bài nộp.",
      });
    }

    try {
      const assignmentId = Number(req.params.id);

      if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment id.",
        });
      }

      const result = await saveStudentAssignmentSubmission(
        assignmentId,
        req.auth.user.id,
        {
          ...req.body,
          file: req.file ?? null,
        },
      );

      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          message: result.message,
        });
      }

      await Promise.all([
        createNotification({
          userId: req.auth.user.id,
          type: "ASSIGNMENT_SUBMITTED",
          title: "Đã nộp bài tập",
          content: `Bài nộp cho bài tập #${assignmentId} đã được ghi nhận.`,
          referenceType: "ASSIGNMENT",
          referenceId: assignmentId,
          targetUrl: "/student?view=myCourses",
        }),
        createNotificationsForRole("ADMIN", {
          type: "ASSIGNMENT_SUBMITTED",
          title: "Học viên vừa nộp bài tập",
          content: `${req.auth.user.fullName} vừa nộp bài tập #${assignmentId}.`,
          referenceType: "ASSIGNMENT",
          referenceId: assignmentId,
          targetUrl: "/admin",
        }),
        createNotificationForAssignmentTeacher(assignmentId, {
          type: "ASSIGNMENT_SUBMITTED",
          title: "Có bài tập mới được nộp",
          content: `${req.auth.user.fullName} vừa nộp bài tập #${assignmentId}.`,
          referenceType: "ASSIGNMENT",
          referenceId: assignmentId,
          targetUrl: "/instructor/quizzes",
          priority: "HIGH",
        }),
      ]).catch((error) => {
        console.error("Failed to create assignment submission notifications.", error);
      });

      res.status(201).json({
        success: true,
        data: result.submission,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to save assignment submission.");
    }
  });
});

router.get("/courses/:id", attachAuthIfPresent, async (req, res) => {
  try {
    const data = await getStudentCourseDetail(
      req.params.id,
      req.auth?.user?.id ?? null,
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load course detail.");
  }
});

router.get("/instructors/:id", async (req, res) => {
  try {
    const data = await getPublicInstructorDetail(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found.",
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load public instructor detail.");
  }
});

router.get("/interactions", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const data = await getStudentInteractionData(req.auth.user.id, {
      courseId: req.query.courseId,
      type: req.query.type,
      mine: req.query.mine === "true",
      unresolved: req.query.unresolved === "true",
      search: String(req.query.search ?? "").trim(),
    });
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student interactions.");
  }
});

router.post("/interactions", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const data = await createStudentDiscussion(req.auth.user.id, req.body ?? {});
    if (!data) return res.status(403).json({ success: false, message: "Bạn không thuộc lớp học này." });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/interactions/:id/comments", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const data = await createStudentDiscussionComment(req.auth.user.id, req.params.id, req.body ?? {});
    if (!data) return res.status(403).json({ success: false, message: "Không thể phản hồi thảo luận này." });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/interactions/:id/reaction", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const data = await toggleDiscussionReaction(req.auth.user.id, req.params.id);
    if (!data) return res.status(403).json({ success: false, message: "Bạn không thuộc lớp học của thảo luận này." });
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to update discussion reaction.");
  }
});

router.patch("/interactions/:id", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const updated = await updateOwnDiscussion(req.auth.user.id, req.params.id, req.body ?? {});
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy thảo luận của bạn." });
    res.json({ success: true, data: { updated: true } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/interactions/reports", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const data = await reportInteractionContent(req.auth.user.id, req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

function validateCourseReviewPayload(body) {
  const rating = Number(body?.rating);
  const teacherRating = Number(body?.teacherRating);
  const comment = String(body?.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Điểm khóa học phải từ 1 đến 5 sao." };
  }
  if (
    !Number.isInteger(teacherRating) ||
    teacherRating < 1 ||
    teacherRating > 5
  ) {
    return { error: "Điểm giảng viên phải từ 1 đến 5 sao." };
  }
  if (comment.length > 2000) {
    return { error: "Nội dung đánh giá không được vượt quá 2000 ký tự." };
  }

  return { rating, teacherRating, comment };
}

router.get(
  "/courses/:id/review-eligibility",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const data = await getStudentCourseReviewEligibility(
        req.auth.user.id,
        req.params.id,
      );
      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }
      res.json({ success: true, data });
    } catch (error) {
      handleRouteError(res, error, "Failed to load review eligibility.");
    }
  },
);

router.post(
  "/courses/:id/reviews",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const payload = validateCourseReviewPayload(req.body);
      if (payload.error) {
        return res.status(400).json({ success: false, message: payload.error });
      }

      const result = await createStudentCourseReview(
        req.auth.user.id,
        req.params.id,
        payload,
      );
      if (!result.data) {
        return res.status(result.status).json({
          success: false,
          message: result.message,
        });
      }
      res.status(result.status).json({ success: true, data: result.data });
    } catch (error) {
      handleRouteError(res, error, "Failed to create course review.");
    }
  },
);

router.put(
  "/courses/:id/reviews/me",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const payload = validateCourseReviewPayload(req.body);
      if (payload.error) {
        return res.status(400).json({ success: false, message: payload.error });
      }

      const result = await updateStudentCourseReview(
        req.auth.user.id,
        req.params.id,
        payload,
      );
      if (!result.data) {
        return res.status(result.status).json({
          success: false,
          message: result.message,
        });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      handleRouteError(res, error, "Failed to update course review.");
    }
  },
);

export default router;
