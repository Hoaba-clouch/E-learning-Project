import db from "../db.js";
import { mapAssignmentSubmission } from "./studentAssignments.service.js";
import { createNotification } from "./notification.service.js";

const SERVER_BASE_URL =
  process.env.PUBLIC_SERVER_URL ??
  `http://localhost:${process.env.PORT || 3000}`;

function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeVideoUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${SERVER_BASE_URL}${url}`;
  }

  return `${SERVER_BASE_URL}/${url}`;
}

function mapCourse(row) {
  return {
    id: row.course_id,
    name: row.course_name,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    level: row.level,
    price: toNumber(row.price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: {
      id: row.category_id,
      name: row.category_name,
      description: row.category_description,
      status: row.category_status,
    },
    teacher: {
      id: row.teacher_id,
      fullName: row.teacher_name,
      email: row.teacher_email,
      avatarUrl: row.teacher_avatar_url,
    },
    stats: {
      averageRating: toNumber(row.average_rating),
      reviewCount: toNumber(row.review_count),
      enrollmentCount: toNumber(row.enrollment_count),
      lessonCount: toNumber(row.lesson_count),
      moduleCount: toNumber(row.module_count),
      totalDurationMinutes: toNumber(row.total_duration_minutes),
    },
  };
}

export async function getStudentCourseCategories() {
  const [rows] = await db.execute(
    `SELECT
       cc.category_id,
       cc.category_name,
       cc.description,
       cc.status,
       COUNT(c.course_id) AS course_count
     FROM course_categories cc
     LEFT JOIN courses c
       ON c.category_id = cc.category_id
      AND c.status = 'APPROVED'
     WHERE cc.status = 'ACTIVE'
     GROUP BY cc.category_id, cc.category_name, cc.description, cc.status
     ORDER BY cc.category_name`,
  );

  return rows.map((row) => ({
    id: row.category_id,
    name: row.category_name,
    description: row.description,
    status: row.status,
    courseCount: toNumber(row.course_count),
  }));
}

export async function getPublicInstructorDetail(teacherId) {
  const [teacherRows] = await db.query(
    `SELECT
       u.user_id,
       u.full_name,
       u.email,
       u.avatar_url,
       tp.bio,
       tp.specialization,
       tp.experience_years,
       tp.qualification,
       tp.workplace
     FROM users u
     LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
     WHERE u.user_id = ?
       AND u.role = 'TEACHER'
       AND u.status = 'ACTIVE'
     LIMIT 1`,
    [teacherId],
  );

  if (!teacherRows[0]) return null;

  const [courseRows] = await db.query(
    `SELECT
       c.course_id,
       c.course_name,
       c.description,
       c.thumbnail_url,
       c.level,
       c.price,
       c.status,
       c.created_at,
       c.updated_at,
       cc.category_id,
       cc.category_name,
       cc.description AS category_description,
       cc.status AS category_status,
       u.user_id AS teacher_id,
       u.full_name AS teacher_name,
       u.email AS teacher_email,
       u.avatar_url AS teacher_avatar_url,
       COALESCE(AVG(cr.rating), 0) AS average_rating,
       COUNT(DISTINCT cr.review_id) AS review_count,
       COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
       COUNT(DISTINCT cm.module_id) AS module_count,
       COUNT(DISTINCT l.lesson_id) AS lesson_count,
       COALESCE(SUM(DISTINCT l.duration_minutes), 0) AS total_duration_minutes
     FROM courses c
     INNER JOIN course_categories cc ON cc.category_id = c.category_id
     INNER JOIN users u ON u.user_id = c.teacher_id
     LEFT JOIN course_reviews cr
       ON cr.course_id = c.course_id
     LEFT JOIN course_batches cb ON cb.course_id = c.course_id
     LEFT JOIN enrollments e ON e.batch_id = cb.batch_id
     LEFT JOIN course_modules cm ON cm.course_id = c.course_id
     LEFT JOIN lessons l ON l.module_id = cm.module_id
     WHERE c.teacher_id = ? AND c.status = 'APPROVED'
     GROUP BY c.course_id, cc.category_id, u.user_id
     ORDER BY c.created_at DESC`,
    [teacherId],
  );

  const [reviewRows] = await db.query(
    `SELECT
       cr.review_id,
       cr.teacher_rating,
       cr.comment,
       cr.created_at,
       c.course_id,
       c.course_name,
       student.user_id AS student_id,
       student.full_name AS student_name,
       student.avatar_url AS student_avatar_url
     FROM course_reviews cr
     INNER JOIN courses c ON c.course_id = cr.course_id
     INNER JOIN users student ON student.user_id = cr.student_id
     WHERE cr.teacher_id = ?
       AND cr.teacher_rating IS NOT NULL
     ORDER BY cr.created_at DESC, cr.review_id DESC
     LIMIT 20`,
    [teacherId],
  );

  const teacher = teacherRows[0];
  const averageTeacherRating =
    reviewRows.length === 0
      ? 0
      : Number(
          (
            reviewRows.reduce(
              (sum, review) => sum + Number(review.teacher_rating),
              0,
            ) / reviewRows.length
          ).toFixed(1),
        );

  return {
    id: Number(teacher.user_id),
    fullName: teacher.full_name,
    email: teacher.email,
    avatarUrl: teacher.avatar_url,
    bio: teacher.bio,
    specialization: teacher.specialization,
    experienceYears: Number(teacher.experience_years ?? 0),
    qualification: teacher.qualification,
    workplace: teacher.workplace,
    stats: {
      courseCount: courseRows.length,
      studentCount: courseRows.reduce(
        (sum, course) => sum + Number(course.enrollment_count ?? 0),
        0,
      ),
      averageRating: averageTeacherRating,
      reviewCount: reviewRows.length,
    },
    courses: courseRows.map(mapCourse),
    reviews: reviewRows.map((review) => ({
      id: Number(review.review_id),
      teacherRating: Number(review.teacher_rating),
      comment: review.comment,
      createdAt: review.created_at,
      course: {
        id: Number(review.course_id),
        name: review.course_name,
      },
      student: {
        id: Number(review.student_id),
        fullName: review.student_name,
        avatarUrl: review.student_avatar_url,
      },
    })),
  };
}

export async function getStudentCourses({ categoryId, search, level } = {}) {
  const params = [];
  const filters = [
    "c.status = 'APPROVED'",
    "cc.status = 'ACTIVE'",
    `EXISTS (
      SELECT 1
      FROM course_batches available_batch
      WHERE available_batch.course_id = c.course_id
        AND available_batch.status IN ('OPEN', 'STARTED')
        AND (
          available_batch.enrollment_start_date IS NULL
          OR available_batch.enrollment_start_date <= CURRENT_DATE()
        )
        AND (
          available_batch.enrollment_deadline IS NULL
          OR available_batch.enrollment_deadline >= CURRENT_DATE()
        )
    )`,
  ];

  if (categoryId) {
    filters.push("c.category_id = ?");
    params.push(categoryId);
  }

  if (level) {
    filters.push("c.level = ?");
    params.push(String(level).toUpperCase());
  }

  if (search) {
    filters.push("(c.course_name LIKE ? OR c.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await db.execute(
    `SELECT
       c.course_id,
       c.course_name,
       c.description,
       c.thumbnail_url,
       c.level,
       c.price,
       c.status,
       c.created_at,
       c.updated_at,
       cc.category_id,
       cc.category_name,
       cc.description AS category_description,
       cc.status AS category_status,
       u.user_id AS teacher_id,
       u.full_name AS teacher_name,
       u.email AS teacher_email,
       u.avatar_url AS teacher_avatar_url,
       COALESCE(AVG(cr.rating), 0) AS average_rating,
       COUNT(DISTINCT cr.review_id) AS review_count,
       COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
       COUNT(DISTINCT cm.module_id) AS module_count,
       COUNT(DISTINCT l.lesson_id) AS lesson_count,
       COALESCE(SUM(DISTINCT l.duration_minutes), 0) AS total_duration_minutes
     FROM courses c
     INNER JOIN course_categories cc ON cc.category_id = c.category_id
     INNER JOIN users u ON u.user_id = c.teacher_id
     LEFT JOIN course_reviews cr
       ON cr.course_id = c.course_id
     LEFT JOIN course_batches cb ON cb.course_id = c.course_id
     LEFT JOIN enrollments e ON e.batch_id = cb.batch_id
     LEFT JOIN course_modules cm ON cm.course_id = c.course_id
     LEFT JOIN lessons l ON l.module_id = cm.module_id
     WHERE ${filters.join(" AND ")}
     GROUP BY
       c.course_id,
       cc.category_id,
       u.user_id
     ORDER BY c.created_at DESC, c.course_id DESC`,
    params,
  );

  return rows.map(mapCourse);
}

export async function getStudentEnrolledCourses(studentId) {
  const [rows] = await db.execute(
    `SELECT
       e.enrollment_id,
       e.enrolled_at,
       e.status AS enrollment_status,
       CASE
         WHEN COUNT(DISTINCT l.lesson_id) = 0 THEN 0
         ELSE ROUND(
           COUNT(DISTINCT CASE
             WHEN lp.is_completed = TRUE THEN l.lesson_id
           END) * 100.0 / COUNT(DISTINCT l.lesson_id),
           2
         )
       END AS calculated_progress_percent,
       cb.batch_id,
       cb.batch_name,
       cb.start_date,
       cb.end_date,
       cb.status AS batch_status,
       c.course_id,
       c.course_name,
       c.description,
       c.thumbnail_url,
       c.level,
       c.price,
       c.status,
       c.created_at,
       c.updated_at,
       cc.category_id,
       cc.category_name,
       cc.description AS category_description,
       cc.status AS category_status,
       u.user_id AS teacher_id,
       u.full_name AS teacher_name,
       u.email AS teacher_email,
       u.avatar_url AS teacher_avatar_url,
       COALESCE(AVG(cr.rating), 0) AS average_rating,
       COUNT(DISTINCT cr.review_id) AS review_count,
       COUNT(DISTINCT e2.enrollment_id) AS enrollment_count,
       COUNT(DISTINCT cm.module_id) AS module_count,
       COUNT(DISTINCT l.lesson_id) AS lesson_count,
       COALESCE(SUM(DISTINCT l.duration_minutes), 0) AS total_duration_minutes
     FROM enrollments e
     INNER JOIN course_batches cb ON cb.batch_id = e.batch_id
     INNER JOIN courses c ON c.course_id = cb.course_id
     INNER JOIN course_categories cc ON cc.category_id = c.category_id
     INNER JOIN users u ON u.user_id = cb.teacher_id
     LEFT JOIN course_reviews cr
       ON cr.course_id = c.course_id
     LEFT JOIN enrollments e2 ON e2.batch_id = cb.batch_id
     LEFT JOIN course_modules cm ON cm.course_id = c.course_id
     LEFT JOIN lessons l ON l.module_id = cm.module_id
     LEFT JOIN lesson_progress lp
       ON lp.lesson_id = l.lesson_id
      AND lp.student_id = e.student_id
     WHERE e.student_id = ?
       AND e.status IN ('PENDING', 'ACTIVE', 'COMPLETED')
       AND c.status = 'APPROVED'
     GROUP BY e.enrollment_id, cb.batch_id, c.course_id, cc.category_id, u.user_id
     ORDER BY e.enrolled_at DESC`,
    [studentId],
  );

  return rows.map((row) => ({
    enrollment: {
      id: row.enrollment_id,
      enrolledAt: row.enrolled_at,
      status: row.enrollment_status,
      progressPercent: toNumber(row.calculated_progress_percent),
    },
    batch: {
      id: row.batch_id,
      name: row.batch_name,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.batch_status,
    },
    course: mapCourse(row),
  }));
}

export async function getStudentCourseDetail(courseId, studentId) {
  const [courseRows] = await db.execute(
    `SELECT
       c.course_id,
       c.course_name,
       c.description,
       c.thumbnail_url,
       c.level,
       c.price,
       c.status,
       c.created_at,
       c.updated_at,
       cc.category_id,
       cc.category_name,
       cc.description AS category_description,
       cc.status AS category_status,
       u.user_id AS teacher_id,
       u.full_name AS teacher_name,
       u.email AS teacher_email,
       u.avatar_url AS teacher_avatar_url,
       COALESCE(AVG(cr.rating), 0) AS average_rating,
       COUNT(DISTINCT cr.review_id) AS review_count,
       COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
       COUNT(DISTINCT cm.module_id) AS module_count,
       COUNT(DISTINCT l.lesson_id) AS lesson_count,
       COALESCE(SUM(DISTINCT l.duration_minutes), 0) AS total_duration_minutes
     FROM courses c
     INNER JOIN course_categories cc ON cc.category_id = c.category_id
     INNER JOIN users u ON u.user_id = c.teacher_id
     LEFT JOIN course_reviews cr
       ON cr.course_id = c.course_id
     LEFT JOIN course_batches cb ON cb.course_id = c.course_id
     LEFT JOIN enrollments e ON e.batch_id = cb.batch_id
     LEFT JOIN course_modules cm ON cm.course_id = c.course_id
     LEFT JOIN lessons l ON l.module_id = cm.module_id
     WHERE c.course_id = ? AND c.status = 'APPROVED'
     GROUP BY
       c.course_id,
       cc.category_id,
       u.user_id
     LIMIT 1`,
    [courseId],
  );

  if (!courseRows.length) {
    return null;
  }

  const course = mapCourse(courseRows[0]);
  let canAccessLearningContent = false;

  if (studentId) {
    const [accessRows] = await db.query(
      `SELECT 1
       FROM enrollments e
       INNER JOIN course_batches b ON b.batch_id = e.batch_id
       WHERE e.student_id = ?
         AND b.course_id = ?
         AND e.status IN ('ACTIVE', 'COMPLETED')
       LIMIT 1`,
      [studentId, courseId],
    );
    canAccessLearningContent = accessRows.length > 0;
  }

  const [batchRows] = await db.execute(
    `SELECT
       batch_id,
       batch_code,
       batch_name,
       start_date,
       end_date,
       enrollment_start_date,
       enrollment_deadline,
       min_students,
       max_students,
       tuition_fee,
       learning_mode,
       online_platform,
       default_meeting_url,
       classroom_name,
       classroom_address,
       timezone,
       status,
       note
     FROM course_batches
     WHERE course_id = ?
       AND status IN ('DRAFT', 'OPEN', 'STARTED', 'FULL', 'FINISHED', 'CANCELLED')
     ORDER BY start_date DESC, batch_id DESC`,
    [courseId],
  );

  const batchIds = batchRows.map((batch) => batch.batch_id);
  const batchStatsById = new Map();
  const sessionsByBatchId = new Map();
  const assignmentsByLessonId = new Map();
  const submissionsByAssignmentId = new Map();
  const quizzesByLessonId = new Map();
  const questionsByQuizId = new Map();

  if (batchIds.length) {
    const batchPlaceholders = batchIds.map(() => "?").join(",");
    const [batchStatsRows] = await db.execute(
      `SELECT
         cb.batch_id,
         COUNT(DISTINCT e.enrollment_id) AS enrollment_count,
         COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN e.enrollment_id END) AS active_enrollment_count,
         COUNT(DISTINCT p.payment_id) AS payment_count,
         COALESCE(SUM(CASE WHEN p.payment_status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS paid_amount
       FROM course_batches cb
       LEFT JOIN enrollments e ON e.batch_id = cb.batch_id
       LEFT JOIN payments p ON p.batch_id = cb.batch_id
       WHERE cb.batch_id IN (${batchPlaceholders})
       GROUP BY cb.batch_id`,
      batchIds,
    );

    batchStatsRows.forEach((row) => {
      batchStatsById.set(row.batch_id, {
        enrollmentCount: toNumber(row.enrollment_count),
        activeEnrollmentCount: toNumber(row.active_enrollment_count),
        paymentCount: toNumber(row.payment_count),
        paidAmount: toNumber(row.paid_amount),
      });
    });

    const [sessionRows] = await db.execute(
      `SELECT
         session_id,
         batch_id,
         session_title,
         session_description,
         start_time,
         end_time,
         meeting_url,
         platform,
         status,
         recording_url,
         note
       FROM class_sessions
       WHERE batch_id IN (${batchPlaceholders})
       ORDER BY start_time`,
      batchIds,
    );

    sessionRows.forEach((session) => {
      const sessions = sessionsByBatchId.get(session.batch_id) ?? [];

      sessions.push({
        id: session.session_id,
        title: session.session_title,
        description: session.session_description,
        startTime: session.start_time,
        endTime: session.end_time,
        meetingUrl: session.meeting_url,
        platform: session.platform,
        status: session.status,
        recordingUrl: session.recording_url,
        note: session.note,
      });
      sessionsByBatchId.set(session.batch_id, sessions);
    });

  }

  const [moduleRows] = await db.execute(
    `SELECT
       module_id,
       module_title,
       description,
       order_no
     FROM course_modules
     WHERE course_id = ?
     ORDER BY order_no`,
    [courseId],
  );

  const moduleIds = moduleRows.map((module) => module.module_id);
  let lessonRows = [];
  let resourceRows = [];

  if (moduleIds.length) {
    const placeholders = moduleIds.map(() => "?").join(",");

    [lessonRows] = await db.execute(
      `SELECT
         lesson_id,
         module_id,
         lesson_title,
         lesson_type,
         content,
         video_url,
         video_web_url,
         duration_minutes,
         is_preview,
         order_no,
         EXISTS(
           SELECT 1
           FROM lesson_progress lp
           WHERE lp.lesson_id = lessons.lesson_id
             AND lp.student_id = ?
             AND lp.is_completed = TRUE
         ) AS is_completed
       FROM lessons
       WHERE module_id IN (${placeholders})
       ORDER BY module_id, order_no`,
      [studentId ?? 0, ...moduleIds],
    );

    const lessonIds = lessonRows.map((lesson) => lesson.lesson_id);

    if (lessonIds.length) {
      const lessonPlaceholders = lessonIds.map(() => "?").join(",");

      [resourceRows] = await db.execute(
        `SELECT
           resource_id,
           lesson_id,
           resource_name,
           resource_type,
           resource_url
         FROM lesson_resources
         WHERE lesson_id IN (${lessonPlaceholders})
         ORDER BY resource_id`,
        lessonIds,
      );

      const [assignmentRows] = await db.execute(
        `SELECT
           assignment_id,
           lesson_id,
           title,
           description,
           due_date,
           max_score
         FROM assignments
         WHERE lesson_id IN (${lessonPlaceholders})
         ORDER BY due_date IS NULL, due_date, assignment_id`,
        lessonIds,
      );

      if (studentId && assignmentRows.length) {
        const assignmentIds = assignmentRows.map((assignment) => assignment.assignment_id);
        const assignmentPlaceholders = assignmentIds.map(() => "?").join(",");
        const [submissionRows] = await db.execute(
          `SELECT
             submission_id,
             assignment_id,
             file_url,
             content,
             submitted_at,
             score,
             feedback,
             graded_at
           FROM assignment_submissions
           WHERE student_id = ?
             AND assignment_id IN (${assignmentPlaceholders})`,
          [studentId, ...assignmentIds],
        );

        submissionRows.forEach((submission) => {
          submissionsByAssignmentId.set(
            submission.assignment_id,
            mapAssignmentSubmission(submission),
          );
        });
      }

      assignmentRows.forEach((assignment) => {
        const assignments = assignmentsByLessonId.get(assignment.lesson_id) ?? [];

        assignments.push({
          id: assignment.assignment_id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.due_date,
          maxScore: toNumber(assignment.max_score),
          submission:
            submissionsByAssignmentId.get(assignment.assignment_id) ?? null,
        });
        assignmentsByLessonId.set(assignment.lesson_id, assignments);
      });

      const [quizRows] = await db.execute(
        `SELECT
           quiz_id,
           lesson_id,
           title,
           description,
           duration_minutes,
           max_score,
           pass_score,
           attempt_limit
         FROM quizzes
         WHERE lesson_id IN (${lessonPlaceholders})
         ORDER BY quiz_id`,
        lessonIds,
      );

      const quizIds = quizRows.map((quiz) => quiz.quiz_id);

      if (quizIds.length) {
        const quizPlaceholders = quizIds.map(() => "?").join(",");
        const [questionRows] = await db.execute(
          `SELECT
             q.question_id,
             q.quiz_id,
             q.question_text,
             q.question_type,
             q.score,
             ao.option_id,
             ao.option_text,
             ao.is_correct
           FROM questions q
           LEFT JOIN answer_options ao ON ao.question_id = q.question_id
           WHERE q.quiz_id IN (${quizPlaceholders})
           ORDER BY q.question_id, ao.option_id`,
          quizIds,
        );

        const questionMap = new Map();

        questionRows.forEach((row) => {
          if (!questionMap.has(row.question_id)) {
            questionMap.set(row.question_id, {
              id: row.question_id,
              quizId: row.quiz_id,
              text: row.question_text,
              type: row.question_type,
              score: toNumber(row.score),
              options: [],
            });
          }

          if (row.option_id) {
            questionMap.get(row.question_id).options.push({
              id: row.option_id,
              text: row.option_text,
              isCorrect: Boolean(row.is_correct),
            });
          }
        });

        questionMap.forEach((question) => {
          const questions = questionsByQuizId.get(question.quizId) ?? [];
          const { quizId, ...questionData } = question;

          questions.push(questionData);
          questionsByQuizId.set(quizId, questions);
        });
      }

      quizRows.forEach((quiz) => {
        const quizzes = quizzesByLessonId.get(quiz.lesson_id) ?? [];

        quizzes.push({
          id: quiz.quiz_id,
          title: quiz.title,
          description: quiz.description,
          durationMinutes: toNumber(quiz.duration_minutes),
          maxScore: toNumber(quiz.max_score),
          passScore: toNumber(quiz.pass_score),
          attemptLimit: toNumber(quiz.attempt_limit),
          questions: questionsByQuizId.get(quiz.quiz_id) ?? [],
        });
        quizzesByLessonId.set(quiz.lesson_id, quizzes);
      });
    }
  }

  const resourcesByLessonId = new Map();

  resourceRows.forEach((resource) => {
    const resources = resourcesByLessonId.get(resource.lesson_id) ?? [];

    resources.push({
      id: resource.resource_id,
      name: resource.resource_name,
      type: resource.resource_type,
      url: resource.resource_url,
    });
    resourcesByLessonId.set(resource.lesson_id, resources);
  });

  const lessonsByModuleId = new Map();

  lessonRows.forEach((lesson) => {
    const lessons = lessonsByModuleId.get(lesson.module_id) ?? [];

    lessons.push({
      id: lesson.lesson_id,
      title: lesson.lesson_title,
      type: lesson.lesson_type,
      content:
        canAccessLearningContent || lesson.is_preview ? lesson.content : null,
      videoUrl:
        canAccessLearningContent || lesson.is_preview
          // The instructor form edits `video_url`; prefer that value so a new
          // YouTube link is immediately visible to enrolled students. The
          // web-video column remains a fallback for legacy lessons that only
          // have a direct video file URL.
          ? normalizeVideoUrl(lesson.video_url || lesson.video_web_url)
          : null,
      durationMinutes: toNumber(lesson.duration_minutes),
      isPreview: Boolean(lesson.is_preview),
      isCompleted: Boolean(lesson.is_completed),
      orderNo: lesson.order_no,
      resources: canAccessLearningContent
        ? resourcesByLessonId.get(lesson.lesson_id) ?? []
        : [],
      assignments: canAccessLearningContent
        ? assignmentsByLessonId.get(lesson.lesson_id) ?? []
        : [],
      quizzes: canAccessLearningContent
        ? quizzesByLessonId.get(lesson.lesson_id) ?? []
        : [],
    });
    lessonsByModuleId.set(lesson.module_id, lessons);
  });

  const [reviewRows] = await db.execute(
    `SELECT
       cr.review_id,
       cr.rating,
       cr.teacher_rating,
       cr.comment,
       cr.teacher_comment,
       cr.created_at,
       u.user_id AS student_id,
       u.full_name AS student_name,
       u.avatar_url AS student_avatar_url
     FROM course_reviews cr
     INNER JOIN users u ON u.user_id = cr.student_id
     WHERE cr.course_id = ?
     ORDER BY
       CASE WHEN cr.student_id = ? THEN 0 ELSE 1 END,
       cr.created_at DESC
     LIMIT 10`,
    [courseId, studentId ?? 0],
  );

  return {
    ...course,
    batches: batchRows.map((batch) => ({
      id: batch.batch_id,
      code: batch.batch_code,
      name: batch.batch_name,
      startDate: batch.start_date,
      endDate: batch.end_date,
      enrollmentStartDate: batch.enrollment_start_date,
      enrollmentDeadline: batch.enrollment_deadline,
      minStudents: toNumber(batch.min_students),
      maxStudents: toNumber(batch.max_students),
      tuitionFee: batch.tuition_fee === null ? null : toNumber(batch.tuition_fee),
      learningMode: batch.learning_mode,
      onlinePlatform: batch.online_platform,
      defaultMeetingUrl: batch.default_meeting_url,
      classroomName: batch.classroom_name,
      classroomAddress: batch.classroom_address,
      timezone: batch.timezone,
      status: batch.status,
      note: batch.note,
      stats: batchStatsById.get(batch.batch_id) ?? {
        enrollmentCount: 0,
        activeEnrollmentCount: 0,
        paymentCount: 0,
        paidAmount: 0,
      },
      sessions: sessionsByBatchId.get(batch.batch_id) ?? [],
    })),
    modules: moduleRows.map((module) => ({
      id: module.module_id,
      title: module.module_title,
      description: module.description,
      orderNo: module.order_no,
      lessons: lessonsByModuleId.get(module.module_id) ?? [],
    })),
    reviews: reviewRows.map((review) => ({
      id: review.review_id,
      rating: review.rating,
      teacherRating: review.teacher_rating,
      comment: review.comment,
      teacherComment: review.teacher_comment,
      createdAt: review.created_at,
      student: {
        id: review.student_id,
        fullName: review.student_name,
        avatarUrl: review.student_avatar_url,
      },
    })),
  };
}

const MIN_REVIEW_PROGRESS = 30;

function mapStudentReview(row) {
  if (!row) return null;

  return {
    id: Number(row.review_id),
    courseId: Number(row.course_id),
    rating: Number(row.rating),
    teacherRating:
      row.teacher_rating === null ? null : Number(row.teacher_rating),
    comment: row.comment,
    teacherComment: row.teacher_comment,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStudentCourseReviewEligibility(studentId, courseId) {
  const [courseRows] = await db.query(
    `SELECT course_id, teacher_id
     FROM courses
     WHERE course_id = ? AND status = 'APPROVED'
     LIMIT 1`,
    [courseId],
  );

  if (!courseRows[0]) return null;

  const [enrollmentRows] = await db.query(
    `SELECT
       e.enrollment_id,
       e.progress_percent,
       e.status,
       EXISTS(
         SELECT 1
         FROM payments p
         WHERE p.student_id = e.student_id
           AND p.batch_id = e.batch_id
           AND p.payment_status = 'SUCCESS'
       ) AS has_successful_payment
     FROM enrollments e
     INNER JOIN course_batches b ON b.batch_id = e.batch_id
     WHERE e.student_id = ?
       AND b.course_id = ?
       AND e.status IN ('ACTIVE', 'COMPLETED')
     ORDER BY
       has_successful_payment DESC,
       e.progress_percent DESC,
       e.enrollment_id DESC
     LIMIT 1`,
    [studentId, courseId],
  );

  const enrollment = enrollmentRows[0] ?? null;
  const progressPercent = Number(enrollment?.progress_percent ?? 0);
  const hasEnrollment = Boolean(enrollment);
  const hasSuccessfulPayment = Boolean(enrollment?.has_successful_payment);
  const eligible =
    hasEnrollment &&
    hasSuccessfulPayment &&
    progressPercent >= MIN_REVIEW_PROGRESS;

  const [reviewRows] = await db.query(
    `SELECT
       review_id,
       course_id,
       rating,
       teacher_rating,
       comment,
       teacher_comment,
       status,
       created_at,
       updated_at
     FROM course_reviews
     WHERE student_id = ? AND course_id = ?
     LIMIT 1`,
    [studentId, courseId],
  );

  let reason = null;
  if (!hasEnrollment) {
    reason = "Bạn chưa tham gia khóa học này.";
  } else if (!hasSuccessfulPayment) {
    reason = "Bạn cần hoàn tất thanh toán khóa học trước khi đánh giá.";
  } else if (progressPercent < MIN_REVIEW_PROGRESS) {
    reason = `Bạn cần hoàn thành tối thiểu ${MIN_REVIEW_PROGRESS}% khóa học để đánh giá.`;
  }

  return {
    eligible,
    reason,
    progressPercent,
    minimumProgress: MIN_REVIEW_PROGRESS,
    hasEnrollment,
    hasSuccessfulPayment,
    existingReview: mapStudentReview(reviewRows[0]),
  };
}

export async function createStudentCourseReview(
  studentId,
  courseId,
  { rating, teacherRating, comment },
) {
  const eligibility = await getStudentCourseReviewEligibility(studentId, courseId);
  if (!eligibility) return { status: 404, message: "Không tìm thấy khóa học." };
  if (!eligibility.eligible) {
    return { status: 403, message: eligibility.reason };
  }
  if (eligibility.existingReview) {
    return {
      status: 409,
      message: "Bạn đã đánh giá khóa học này. Hãy sử dụng chức năng chỉnh sửa.",
    };
  }

  const [courseRows] = await db.query(
    "SELECT teacher_id FROM courses WHERE course_id = ? LIMIT 1",
    [courseId],
  );

  const [result] = await db.query(
    `INSERT INTO course_reviews
      (student_id, course_id, teacher_id, rating, teacher_rating, comment, status)
     VALUES (?, ?, ?, ?, ?, ?, 'VISIBLE')`,
    [
      studentId,
      courseId,
      courseRows[0].teacher_id,
      rating,
      teacherRating,
      comment || null,
    ],
  );

  const [rows] = await db.query(
    `SELECT review_id, course_id, rating, teacher_rating, comment, teacher_comment, status,
            created_at, updated_at
     FROM course_reviews
     WHERE review_id = ?`,
    [result.insertId],
  );

  await createNotification({
    userId: Number(courseRows[0].teacher_id),
    type: "COURSE_REVIEW_CREATED",
    title: "Có đánh giá mới về khóa học",
    content: `Học viên vừa đánh giá ${rating}/5 sao cho khóa học và ${teacherRating}/5 sao cho giảng viên.`,
    referenceType: "COURSE_REVIEW",
    referenceId: Number(result.insertId),
    targetUrl: `/instructor/courses?courseId=${courseId}&reviewId=${result.insertId}`,
    priority: "NORMAL",
  }).catch((error) => {
    console.error("Failed to notify instructor about new review.", error);
  });

  return { status: 201, data: mapStudentReview(rows[0]) };
}

export async function updateStudentCourseReview(
  studentId,
  courseId,
  { rating, teacherRating, comment },
) {
  const eligibility = await getStudentCourseReviewEligibility(studentId, courseId);
  if (!eligibility) return { status: 404, message: "Không tìm thấy khóa học." };
  if (!eligibility.eligible) {
    return { status: 403, message: eligibility.reason };
  }
  if (!eligibility.existingReview) {
    return {
      status: 404,
      message: "Bạn chưa có đánh giá để chỉnh sửa.",
    };
  }

  await db.query(
    `UPDATE course_reviews
     SET rating = ?,
         teacher_rating = ?,
         comment = ?
     WHERE student_id = ? AND course_id = ?`,
    [rating, teacherRating, comment || null, studentId, courseId],
  );

  const [rows] = await db.query(
    `SELECT review_id, course_id, rating, teacher_rating, comment, teacher_comment, status,
            created_at, updated_at
     FROM course_reviews
     WHERE student_id = ? AND course_id = ?
     LIMIT 1`,
    [studentId, courseId],
  );

  const [courseRows] = await db.query(
    "SELECT teacher_id FROM courses WHERE course_id = ? LIMIT 1",
    [courseId],
  );
  if (courseRows[0]) {
    await createNotification({
      userId: Number(courseRows[0].teacher_id),
      type: "COURSE_REVIEW_UPDATED",
      title: "Học viên đã cập nhật đánh giá",
      content: `Đánh giá mới: khóa học ${rating}/5 sao, giảng viên ${teacherRating}/5 sao.`,
      referenceType: "COURSE_REVIEW",
      referenceId: Number(rows[0].review_id),
      targetUrl: `/instructor/courses?courseId=${courseId}&reviewId=${rows[0].review_id}`,
      priority: "NORMAL",
    }).catch((error) => {
      console.error("Failed to notify instructor about updated review.", error);
    });
  }

  return { status: 200, data: mapStudentReview(rows[0]) };
}

export async function completeStudentLesson(studentId, lessonId) {
  const [eligibleRows] = await db.query(
    `SELECT e.enrollment_id, c.course_id
     FROM lessons l
     INNER JOIN course_modules m ON m.module_id = l.module_id
     INNER JOIN courses c ON c.course_id = m.course_id
     INNER JOIN course_batches b ON b.course_id = c.course_id
     INNER JOIN enrollments e
       ON e.batch_id = b.batch_id
      AND e.student_id = ?
      AND e.status IN ('ACTIVE', 'COMPLETED')
     WHERE l.lesson_id = ?
     LIMIT 1`,
    [studentId, lessonId],
  );

  if (!eligibleRows.length) return null;

  await db.query(
    `INSERT INTO lesson_progress
      (student_id, lesson_id, is_completed, completed_at)
     VALUES (?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       is_completed = TRUE,
       completed_at = COALESCE(completed_at, NOW())`,
    [studentId, lessonId],
  );

  const { enrollment_id: enrollmentId, course_id: courseId } = eligibleRows[0];
  const [progressRows] = await db.query(
    `SELECT
       COUNT(DISTINCT l.lesson_id) AS total_lessons,
       COUNT(DISTINCT CASE WHEN lp.is_completed = TRUE THEN l.lesson_id END) AS completed_lessons
     FROM course_modules m
     INNER JOIN lessons l ON l.module_id = m.module_id
     LEFT JOIN lesson_progress lp
       ON lp.lesson_id = l.lesson_id
      AND lp.student_id = ?
     WHERE m.course_id = ?`,
    [studentId, courseId],
  );

  const totalLessons = Number(progressRows[0]?.total_lessons ?? 0);
  const completedLessons = Number(progressRows[0]?.completed_lessons ?? 0);
  const progressPercent =
    totalLessons === 0
      ? 0
      : Number(((completedLessons / totalLessons) * 100).toFixed(2));

  await db.query(
    `UPDATE enrollments
     SET progress_percent = ?,
         status = CASE WHEN ? >= 100 THEN 'COMPLETED' ELSE status END
     WHERE enrollment_id = ?`,
    [progressPercent, progressPercent, enrollmentId],
  );

  return {
    lessonId: Number(lessonId),
    courseId: Number(courseId),
    completedLessons,
    totalLessons,
    progressPercent,
  };
}
