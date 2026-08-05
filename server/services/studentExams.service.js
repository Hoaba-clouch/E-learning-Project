import {
  createExamAttempt,
  createQuizAttempt,
  deleteAttemptAnswers,
  deleteQuizAttemptAnswers,
  getAttemptAnswers,
  getAttemptRowsByStudentAndExamIds,
  getBatchRowsByCourseIds,
  getClassQuizOverviewRows,
  getConnection,
  getEnrollmentRowsByStudentAndCourseIds,
  getExamOverviewRows,
  getQuestionRowsByExamId,
  getQuestionRowsByQuizId,
  getQuizAttemptAnswers,
  getQuizAttemptRowsByStudentAndQuizIds,
  insertAttemptAnswer,
  insertQuizAttemptAnswer,
  updateAttemptSubmission,
  updateQuizAttemptSubmission,
} from "./studentExams.repository.js";

const CLASS_QUIZ_EXAM_ID_OFFSET = 1000000000;

function toClassQuizExamId(quizId) {
  return CLASS_QUIZ_EXAM_ID_OFFSET + Number(quizId);
}

function toSourceId(exam) {
  return exam.source === "CLASS_QUIZ" ? exam.sourceId : exam.id;
}

function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function buildDefaultBatch(examRow) {
  return {
    id: 0,
    code: null,
    name: "Chưa có đợt mở lớp",
    startDate: examRow.open_at ?? examRow.created_at,
    endDate: examRow.close_at ?? examRow.created_at,
    status: "DRAFT",
    learningMode: "ONLINE",
    onlinePlatform: "OTHER",
  };
}

function buildBatchMaps(batchRows) {
  const defaultBatchByCourseId = new Map();

  batchRows.forEach((row) => {
    if (!defaultBatchByCourseId.has(row.course_id)) {
      defaultBatchByCourseId.set(row.course_id, {
        id: row.batch_id,
        code: row.batch_code,
        name: row.batch_name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        learningMode: row.learning_mode,
        onlinePlatform: row.online_platform,
      });
    }
  });

  return defaultBatchByCourseId;
}

function buildEnrollmentMap(enrollmentRows) {
  const enrollmentByCourseId = new Map();

  enrollmentRows.forEach((row) => {
    if (!enrollmentByCourseId.has(row.course_id)) {
      enrollmentByCourseId.set(row.course_id, {
        id: row.enrollment_id,
        status: row.enrollment_status,
        progressPercent: toNumber(row.progress_percent),
        batch: {
          id: row.batch_id,
          code: row.batch_code,
          name: row.batch_name,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.batch_status,
          learningMode: row.learning_mode,
          onlinePlatform: row.online_platform,
        },
      });
    }
  });

  return enrollmentByCourseId;
}

function mapAttemptRow(row, passScore) {
  const score = row.score === null ? null : toNumber(row.score);

  return {
    id: row.attempt_id,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    score,
    status: row.status,
    feedback: row.feedback ?? null,
    gradedAt: row.graded_at ?? null,
    gradedBy: row.graded_by ?? null,
    answerCount: toNumber(row.answer_count),
    isPassed: score === null ? false : score >= toNumber(passScore),
  };
}

function buildAttemptMap(attemptRows, passScoreByExamId) {
  const attemptsByExamId = new Map();

  attemptRows.forEach((row) => {
    const items = attemptsByExamId.get(row.exam_id) ?? [];
    items.push(mapAttemptRow(row, passScoreByExamId.get(row.exam_id) ?? 0));
    attemptsByExamId.set(row.exam_id, items);
  });

  return attemptsByExamId;
}

function buildQuizAttemptMap(attemptRows, passScoreByExamId) {
  const attemptsByExamId = new Map();

  attemptRows.forEach((row) => {
    const examId = toClassQuizExamId(row.quiz_id);
    const items = attemptsByExamId.get(examId) ?? [];
    items.push(mapAttemptRow(row, passScoreByExamId.get(examId) ?? 0));
    attemptsByExamId.set(examId, items);
  });

  return attemptsByExamId;
}

function getExamAvailability(exam, latestAttempt) {
  const now = Date.now();
  const openAt = exam.openAt ? Date.parse(exam.openAt) : null;
  const closeAt = exam.closeAt ? Date.parse(exam.closeAt) : null;

  if (latestAttempt?.status === "IN_PROGRESS") {
    return {
      state: "IN_PROGRESS",
      reason: "IN_PROGRESS",
      canStart: true,
    };
  }

  if (latestAttempt?.status === "SUBMITTED" || latestAttempt?.status === "GRADED") {
    return {
      state: "COMPLETED",
      reason: "COMPLETED",
      canStart: exam.attempts.remaining > 0,
    };
  }

  if (!exam.enrollment) {
    return {
      state: "LOCKED",
      reason: "NOT_ENROLLED",
      canStart: false,
    };
  }

  if (exam.enrollment.status === "PENDING") {
    return {
      state: "LOCKED",
      reason: "PENDING_ENROLLMENT",
      canStart: false,
    };
  }

  if (!exam.batch || !["OPEN", "STARTED", "FINISHED"].includes(exam.batch.status)) {
    return {
      state: "LOCKED",
      reason: "BATCH_UNAVAILABLE",
      canStart: false,
    };
  }

  if (exam.status !== "PUBLISHED") {
    return {
      state: "LOCKED",
      reason: "NOT_PUBLISHED",
      canStart: false,
    };
  }

  if (openAt && openAt > now) {
    return {
      state: "LOCKED",
      reason: "NOT_OPEN_YET",
      canStart: false,
    };
  }

  if (closeAt && closeAt < now) {
    return {
      state: "LOCKED",
      reason: "CLOSED",
      canStart: false,
    };
  }

  if (exam.attempts.remaining <= 0) {
    return {
      state: "COMPLETED",
      reason: "ATTEMPT_LIMIT_REACHED",
      canStart: false,
    };
  }

  return {
    state: "UPCOMING",
    reason: "READY",
    canStart: true,
  };
}

function mapExamRowToDomain(
  row,
  enrollmentByCourseId,
  defaultBatchByCourseId,
  attemptsByExamId,
) {
  const attempts = attemptsByExamId.get(row.exam_id) ?? [];
  const latestAttempt = attempts[0] ?? null;
  const enrollment = enrollmentByCourseId.get(row.course_id) ?? null;
  const batch = row.source === "CLASS_QUIZ"
    ? {
        id: row.batch_id,
        code: row.batch_code,
        name: row.batch_name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.batch_status,
        learningMode: row.learning_mode,
        onlinePlatform: row.online_platform,
      }
    : enrollment?.batch ?? defaultBatchByCourseId.get(row.course_id) ?? buildDefaultBatch(row);

  const exam = {
    id: row.exam_id,
    source: row.source ?? "COURSE_EXAM",
    sourceId: row.source_id ?? row.exam_id,
    title: row.title,
    description: row.description,
    openAt: row.open_at,
    closeAt: row.close_at,
    durationMinutes: toNumber(row.duration_minutes),
    maxScore: toNumber(row.max_score),
    passScore: toNumber(row.pass_score),
    attemptLimit: toNumber(row.attempt_limit),
    questionCount: toNumber(row.question_count),
    createdAt: row.created_at,
    status: row.status,
    course: {
      id: row.course_id,
      name: row.course_name,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
    },
    category: {
      id: row.category_id,
      name: row.category_name,
    },
    batch,
    teacher: {
      id: row.teacher_id,
      fullName: row.teacher_name,
      email: row.teacher_email,
      avatarUrl: row.teacher_avatar_url,
    },
    lesson: null,
    enrollment: enrollment
      ? {
          id: enrollment.id,
          status: enrollment.status,
          progressPercent: enrollment.progressPercent,
        }
      : null,
    attempts: {
      count: attempts.length,
      remaining: Math.max(toNumber(row.attempt_limit) - attempts.length, 0),
      latest: latestAttempt,
      items: attempts,
    },
  };

  const availability = getExamAvailability(exam, latestAttempt);

  return {
    ...exam,
    state: availability.state,
    availability,
  };
}

async function getStudentExamCollection(studentId) {
  const [courseExamRows, classQuizRows] = await Promise.all([
    getExamOverviewRows(),
    getClassQuizOverviewRows(studentId),
  ]);

  const normalizedCourseExamRows = courseExamRows.map((row) => ({
    ...row,
    source: "COURSE_EXAM",
    source_id: row.exam_id,
  }));
  const normalizedClassQuizRows = classQuizRows.map((row) => ({
    ...row,
    exam_id: toClassQuizExamId(row.quiz_id),
    source: "CLASS_QUIZ",
    source_id: row.quiz_id,
    open_at: null,
    close_at: null,
    status: "PUBLISHED",
  }));
  const examRows = [...normalizedCourseExamRows, ...normalizedClassQuizRows].sort((left, right) => {
    const leftTime = Date.parse(left.open_at ?? left.created_at ?? 0);
    const rightTime = Date.parse(right.open_at ?? right.created_at ?? 0);

    return rightTime - leftTime;
  });

  if (!examRows.length) {
    return {
      exams: [],
      examById: new Map(),
    };
  }

  const courseIds = [...new Set(examRows.map((row) => row.course_id))];
  const courseExamIds = normalizedCourseExamRows.map((row) => row.exam_id);
  const classQuizIds = normalizedClassQuizRows.map((row) => row.source_id);
  const passScoreByExamId = new Map(
    examRows.map((row) => [row.exam_id, toNumber(row.pass_score)]),
  );

  const [batchRows, enrollmentRows, attemptRows, quizAttemptRows] = await Promise.all([
    getBatchRowsByCourseIds(courseIds),
    getEnrollmentRowsByStudentAndCourseIds(studentId, courseIds),
    getAttemptRowsByStudentAndExamIds(studentId, courseExamIds),
    getQuizAttemptRowsByStudentAndQuizIds(studentId, classQuizIds),
  ]);

  const defaultBatchByCourseId = buildBatchMaps(batchRows);
  const enrollmentByCourseId = buildEnrollmentMap(enrollmentRows);
  const attemptsByExamId = buildAttemptMap(attemptRows, passScoreByExamId);
  const quizAttemptsByExamId = buildQuizAttemptMap(quizAttemptRows, passScoreByExamId);

  quizAttemptsByExamId.forEach((attempts, examId) => {
    attemptsByExamId.set(examId, attempts);
  });

  const exams = examRows.map((row) =>
    mapExamRowToDomain(
      row,
      enrollmentByCourseId,
      defaultBatchByCourseId,
      attemptsByExamId,
    ),
  );

  return {
    exams,
    examById: new Map(exams.map((exam) => [exam.id, exam])),
  };
}

function getAvailabilityMessage(reason) {
  switch (reason) {
    case "NOT_ENROLLED":
      return "Bạn cần ghi danh khóa học trước khi làm bài kiểm tra này.";
    case "PENDING_ENROLLMENT":
      return "Khóa học của bạn đang chờ xác nhận ghi danh.";
    case "BATCH_UNAVAILABLE":
      return "Đợt mở lớp hiện tại chưa sẵn sàng để làm bài kiểm tra.";
    case "NOT_PUBLISHED":
      return "Bài kiểm tra này chưa được phát hành.";
    case "NOT_OPEN_YET":
      return "Bài kiểm tra chưa đến thời gian mở.";
    case "CLOSED":
      return "Bài kiểm tra đã hết thời gian làm bài.";
    case "ATTEMPT_LIMIT_REACHED":
      return "Bạn đã dùng hết số lượt làm bài cho bài kiểm tra này.";
    default:
      return "Bạn chưa thể truy cập bài kiểm tra này.";
  }
}

function buildQuestionList(questionRows, answerRows = []) {
  const answersByQuestionId = new Map(
    answerRows.map((row) => [
      row.question_id,
      {
        optionId: row.option_id === null ? null : Number(row.option_id),
        essayAnswer: row.essay_answer ?? "",
      },
    ]),
  );
  const questionMap = new Map();

  questionRows.forEach((row) => {
    if (!questionMap.has(row.question_id)) {
      const savedAnswer = answersByQuestionId.get(row.question_id);
      questionMap.set(row.question_id, {
        id: row.question_id,
        examId: row.exam_id,
        type: row.question_type === "ESSAY" ? "ESSAY" : "SINGLE_CHOICE",
        orderNo: toNumber(row.order_no),
        text: row.question_text,
        score: toNumber(row.score),
        options: [],
        answer: {
          optionId: savedAnswer?.optionId ?? null,
          essayAnswer: savedAnswer?.essayAnswer ?? "",
        },
      });
    }

    if (row.option_id !== null) {
      questionMap.get(row.question_id).options.push({
        id: row.option_id,
        text: row.option_text,
        orderNo: toNumber(row.option_order_no),
        isCorrect: Boolean(row.is_correct),
      });
    }
  });

  return [...questionMap.values()].sort((left, right) => left.orderNo - right.orderNo);
}

async function getQuestionRowsForExam(exam) {
  if (exam.source !== "CLASS_QUIZ") {
    return getQuestionRowsByExamId(exam.id);
  }

  const rows = await getQuestionRowsByQuizId(toSourceId(exam));
  return rows.map((row) => ({
    ...row,
    exam_id: exam.id,
  }));
}

async function getAttemptAnswersForExam(exam, attemptId) {
  return exam.source === "CLASS_QUIZ"
    ? getQuizAttemptAnswers(attemptId)
    : getAttemptAnswers(attemptId);
}

async function createAttemptForExam(connection, exam, studentId) {
  return exam.source === "CLASS_QUIZ"
    ? createQuizAttempt(connection, toSourceId(exam), studentId)
    : createExamAttempt(connection, exam.id, studentId);
}

function calculateRemainingSeconds(startedAt, durationMinutes) {
  if (!startedAt) {
    return durationMinutes * 60;
  }

  const elapsedSeconds = Math.floor((Date.now() - Date.parse(startedAt)) / 1000);
  return Math.max(durationMinutes * 60 - elapsedSeconds, 0);
}

function buildWorkspacePayload(exam, attempt, questions) {
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((question) =>
    question.type === "ESSAY"
      ? question.answer.essayAnswer.trim().length > 0
      : question.answer.optionId !== null,
  ).length;

  return {
    exam: {
      id: exam.id,
      source: exam.source,
      sourceId: exam.sourceId,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      maxScore: exam.maxScore,
      passScore: exam.passScore,
      questionCount: exam.questionCount,
      openAt: exam.openAt,
      closeAt: exam.closeAt,
      course: exam.course,
      batch: exam.batch,
      teacher: exam.teacher,
      attempts: exam.attempts,
    },
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      score: attempt.score,
      feedback: attempt.feedback,
      gradedAt: attempt.gradedAt,
      isPassed: attempt.isPassed,
    },
    progress: {
      answeredCount,
      totalQuestions,
      completionPercent:
        totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      remainingSeconds: calculateRemainingSeconds(
        attempt.startedAt,
        exam.durationMinutes,
      ),
    },
    questions,
  };
}

function normalizeAnswers(answers, questionMap) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((answer) => {
      const questionId = Number(answer?.questionId);
      const question = questionMap.get(questionId);

      if (!question) {
        return null;
      }

      if (question.type === "ESSAY") {
        const essayAnswer = typeof answer?.essayAnswer === "string" ? answer.essayAnswer.trim() : "";

        if (!essayAnswer) {
          return null;
        }

        return {
          questionId,
          optionId: null,
          essayAnswer,
        };
      }

      const optionId = Number(answer?.optionId);
      const optionExists = question.options.some((option) => option.id === optionId);

      if (!optionExists) {
        return null;
      }

      return {
        questionId,
        optionId,
        essayAnswer: null,
      };
    })
    .filter(Boolean);
}

async function saveAnswersSnapshot(connection, attemptId, answers, source = "COURSE_EXAM") {
  if (source === "CLASS_QUIZ") {
    await deleteQuizAttemptAnswers(connection, attemptId);

    for (const answer of answers) {
      await insertQuizAttemptAnswer(connection, attemptId, answer);
    }

    return;
  }

  await deleteAttemptAnswers(connection, attemptId);

  for (const answer of answers) {
    await insertAttemptAnswer(connection, attemptId, answer);
  }
}

async function updateAttemptSubmissionForExam(connection, exam, attemptId, payload) {
  if (exam.source === "CLASS_QUIZ") {
    await updateQuizAttemptSubmission(connection, attemptId, payload);
    return;
  }

  await updateAttemptSubmission(connection, attemptId, payload);
}

function gradeAttempt(questions, normalizedAnswers) {
  const answersByQuestionId = new Map(
    normalizedAnswers.map((answer) => [answer.questionId, answer]),
  );
  let objectiveScore = 0;
  let hasEssay = false;

  const reviewedQuestions = questions.map((question) => {
    const savedAnswer = answersByQuestionId.get(question.id) ?? {
      optionId: null,
      essayAnswer: "",
    };

    if (question.type === "ESSAY") {
      hasEssay = true;

      return {
        ...question,
        answer: savedAnswer,
        review: {
          status: "PENDING",
          earnedScore: null,
        },
      };
    }

    const correctOption = question.options.find((option) => option.isCorrect) ?? null;
    const isCorrect = correctOption ? correctOption.id === savedAnswer.optionId : false;

    if (isCorrect) {
      objectiveScore += question.score;
    }

    return {
      ...question,
      answer: savedAnswer,
      review: {
        status: isCorrect ? "CORRECT" : "INCORRECT",
        earnedScore: isCorrect ? question.score : 0,
        correctOptionId: correctOption?.id ?? null,
      },
    };
  });

  return {
    reviewedQuestions,
    score: Number(objectiveScore.toFixed(2)),
    hasEssay,
  };
}

async function finalizeExpiredAttempt(studentId, examId, attemptId) {
  const review = await submitStudentExam(studentId, examId, attemptId, []);

  return review;
}

export async function getStudentExams(studentId) {
  const { exams } = await getStudentExamCollection(studentId);

  if (!exams.length) {
    return {
      summary: {
        total: 0,
        upcoming: 0,
        incomplete: 0,
        completed: 0,
        averageScore: 0,
      },
      exams: [],
      recentResults: [],
    };
  }

  const completedExams = exams
    .filter((exam) => exam.state === "COMPLETED" && exam.attempts.latest)
    .sort((left, right) => {
      const leftTime = Date.parse(
        left.attempts.latest?.submittedAt ?? left.attempts.latest?.startedAt ?? left.createdAt,
      );
      const rightTime = Date.parse(
        right.attempts.latest?.submittedAt ?? right.attempts.latest?.startedAt ?? right.createdAt,
      );

      return rightTime - leftTime;
    });

  const recentResults = completedExams.slice(0, 6).map((exam) => ({
    examId: exam.id,
    attemptId: exam.attempts.latest?.id ?? null,
    title: exam.title,
    courseName: exam.course.name,
    batchName: exam.batch.name,
    submittedAt:
      exam.attempts.latest?.submittedAt ?? exam.attempts.latest?.startedAt ?? null,
    score: exam.attempts.latest?.score,
    maxScore: exam.maxScore,
    passScore: exam.passScore,
    status: exam.attempts.latest?.isPassed ? "PASSED" : "FAILED",
  }));

  const gradedScores = recentResults
    .map((item) => item.score)
    .filter((score) => typeof score === "number");

  return {
    summary: {
      total: exams.length,
      upcoming: exams.filter(
        (exam) => exam.state === "UPCOMING" || exam.state === "LOCKED",
      ).length,
      incomplete: exams.filter((exam) => exam.state === "IN_PROGRESS").length,
      completed: completedExams.length,
      averageScore: gradedScores.length
        ? Number(
            (
              gradedScores.reduce((total, score) => total + Number(score), 0) /
              gradedScores.length
            ).toFixed(1),
          )
        : 0,
    },
    exams,
    recentResults,
  };
}

export async function startStudentExam(studentId, examId) {
  const { examById } = await getStudentExamCollection(studentId);
  const exam = examById.get(Number(examId));

  if (!exam) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy bài kiểm tra.",
    };
  }

  const latestAttempt = exam.attempts.latest;

  if (latestAttempt?.status === "IN_PROGRESS") {
    const remainingSeconds = calculateRemainingSeconds(
      latestAttempt.startedAt,
      exam.durationMinutes,
    );

    if (remainingSeconds <= 0) {
      await finalizeExpiredAttempt(studentId, exam.id, latestAttempt.id);
      return {
        ok: false,
        status: 409,
        message: "Bài kiểm tra trước đó đã hết giờ và được nộp tự động. Hãy mở phần review để xem kết quả.",
      };
    }

    return getStudentExamWorkspace(studentId, exam.id, latestAttempt.id);
  }

  if (!exam.availability.canStart) {
    return {
      ok: false,
      status: 403,
      message: getAvailabilityMessage(exam.availability.reason),
    };
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    const attemptId = await createAttemptForExam(connection, exam, studentId);
    await connection.commit();

    return getStudentExamWorkspace(studentId, exam.id, attemptId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getStudentExamWorkspace(studentId, examId, attemptId) {
  const { examById } = await getStudentExamCollection(studentId);
  const exam = examById.get(Number(examId));

  if (!exam) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy bài kiểm tra.",
    };
  }

  const attempt = exam.attempts.items.find((item) => item.id === Number(attemptId));

  if (!attempt) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy lượt làm bài.",
    };
  }

  if (attempt.status !== "IN_PROGRESS") {
    return {
      ok: false,
      status: 409,
      message: "Lượt làm bài này đã được nộp. Hãy mở trang review để xem kết quả.",
    };
  }

  const questionRows = await getQuestionRowsForExam(exam);
  const answerRows = await getAttemptAnswersForExam(exam, attempt.id);
  const questions = buildQuestionList(questionRows, answerRows);
  const workspace = buildWorkspacePayload(exam, attempt, questions);

  if (workspace.progress.remainingSeconds <= 0) {
    await finalizeExpiredAttempt(studentId, exam.id, attempt.id);
    return {
      ok: false,
      status: 409,
      message: "Bài kiểm tra đã hết giờ và được nộp tự động.",
    };
  }

  return {
    ok: true,
    data: workspace,
  };
}

export async function saveStudentExamDraft(studentId, examId, attemptId, answers) {
  const workspaceResult = await getStudentExamWorkspace(studentId, examId, attemptId);

  if (!workspaceResult.ok) {
    return workspaceResult;
  }

  const questionMap = new Map(
    workspaceResult.data.questions.map((question) => [question.id, question]),
  );
  const normalizedAnswers = normalizeAnswers(answers, questionMap);
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    await saveAnswersSnapshot(connection, Number(attemptId), normalizedAnswers, workspaceResult.data.exam.source);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getStudentExamWorkspace(studentId, examId, attemptId);
}

export async function submitStudentExam(studentId, examId, attemptId, answers) {
  const { examById } = await getStudentExamCollection(studentId);
  const exam = examById.get(Number(examId));

  if (!exam) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy bài kiểm tra.",
    };
  }

  const attempt = exam.attempts.items.find((item) => item.id === Number(attemptId));

  if (!attempt) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy lượt làm bài.",
    };
  }

  if (attempt.status !== "IN_PROGRESS") {
    return getStudentExamReview(studentId, examId, attempt.id);
  }

  const questionRows = await getQuestionRowsForExam(exam);
  const existingAnswerRows = await getAttemptAnswersForExam(exam, attempt.id);
  const questions = buildQuestionList(questionRows, existingAnswerRows);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const normalizedAnswers = answers.length
    ? normalizeAnswers(answers, questionMap)
    : normalizeAnswers(
        questions.map((question) => ({
          questionId: question.id,
          optionId: question.answer.optionId,
          essayAnswer: question.answer.essayAnswer,
        })),
        questionMap,
      );

  const { reviewedQuestions, score, hasEssay } = gradeAttempt(
    questions,
    normalizedAnswers,
  );
  const submittedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  const status = hasEssay ? "SUBMITTED" : "GRADED";
  const gradedAt = hasEssay ? null : submittedAt;
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    await saveAnswersSnapshot(connection, attempt.id, normalizedAnswers, exam.source);
    await updateAttemptSubmissionForExam(connection, exam, attempt.id, {
      submittedAt,
      score,
      status,
      feedback: null,
      gradedAt,
      gradedBy: null,
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    ok: true,
    data: {
      attemptId: attempt.id,
      examId: exam.id,
      status,
      score,
      autoGradedScore: score,
      maxScore: exam.maxScore,
      passScore: exam.passScore,
      pendingEssayReview: hasEssay,
      reviewedQuestions: reviewedQuestions.length,
    },
  };
}

export async function getStudentExamReview(studentId, examId, attemptId = null) {
  const { examById } = await getStudentExamCollection(studentId);
  const exam = examById.get(Number(examId));

  if (!exam) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy bài kiểm tra.",
    };
  }

  const attempt = attemptId
    ? exam.attempts.items.find((item) => item.id === Number(attemptId))
    : exam.attempts.items.find(
        (item) => item.status === "SUBMITTED" || item.status === "GRADED",
      );

  if (!attempt) {
    return {
      ok: false,
      status: 404,
      message: "Chưa có kết quả để review cho bài kiểm tra này.",
    };
  }

  const questionRows = await getQuestionRowsForExam(exam);
  const answerRows = await getAttemptAnswersForExam(exam, attempt.id);
  const questions = buildQuestionList(questionRows, answerRows);
  const { reviewedQuestions, score, hasEssay } = gradeAttempt(questions, answerRows.map((row) => ({
    questionId: row.question_id,
    optionId: row.option_id === null ? null : Number(row.option_id),
    essayAnswer: row.essay_answer ?? "",
  })));

  const objectiveScore = Number(score.toFixed(2));
  const totalQuestions = reviewedQuestions.length;
  const correctCount = reviewedQuestions.filter(
    (question) => question.review.status === "CORRECT",
  ).length;
  const essayCount = reviewedQuestions.filter((question) => question.type === "ESSAY").length;

  return {
    ok: true,
    data: {
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        maxScore: exam.maxScore,
        passScore: exam.passScore,
        course: exam.course,
        batch: exam.batch,
        teacher: exam.teacher,
      },
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        score: attempt.score,
        feedback: attempt.feedback,
        gradedAt: attempt.gradedAt,
        isPassed: attempt.isPassed,
      },
      summary: {
        totalQuestions,
        correctCount,
        incorrectCount: reviewedQuestions.filter(
          (question) => question.review.status === "INCORRECT",
        ).length,
        essayCount,
        objectiveScore,
        pendingEssayReview:
          hasEssay && (attempt.status === "SUBMITTED" || attempt.status === "IN_PROGRESS"),
        completionMinutes: attempt.startedAt && attempt.submittedAt
          ? Math.max(
              1,
              Math.round(
                (Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) /
                  60000,
              ),
            )
          : exam.durationMinutes,
      },
      questions: reviewedQuestions,
    },
  };
}
