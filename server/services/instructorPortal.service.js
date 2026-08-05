import db from "../db.js";

const DEFAULT_TEACHER_ID = 4;

function normalizeTeacherId(value) {
  const teacherId = Number(value ?? DEFAULT_TEACHER_ID);
  return Number.isFinite(teacherId) && teacherId > 0 ? teacherId : DEFAULT_TEACHER_ID;
}

function percent(value) {
  return Number(Number(value ?? 0).toFixed(0));
}

function formatMinutes(value) {
  const minutes = Number(value ?? 0);
  return `${minutes} phút`;
}

function relativeTime(value) {
  if (!value) return "Chua cap nhat";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function studentStatus(progress, attendance = 100) {
  if (progress >= 90 && attendance >= 90) return "Xuất sắc";
  if (progress < 50 || attendance < 65) return "Có rủi ro";
  if (progress < 70 || attendance < 80) return "Cần xem xét";
  return "Đúng tiến độ";
}

function statusClass(status) {
  if (status === "Có rủi ro") return "risk";
  if (status === "Cần xem xét") return "review";
  if (status === "Xuất sắc") return "excellent";
  return "track";
}

function formatDateTimeInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (input) => String(input).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function getProfile(teacherId) {
  const [rows] = await db.query(
    `
      SELECT u.full_name AS name, u.avatar_url AS avatar, tp.specialization AS role
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
      WHERE u.user_id = ? AND u.role = 'TEACHER'
      LIMIT 1
    `,
    [teacherId],
  );
  return rows[0] ?? null;
}

export async function getInstructorProfileData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const [rows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.avatar_url AS avatar,
        u.status,
        tp.bio,
        tp.specialization,
        tp.experience_years AS experienceYears,
        tp.qualification,
        tp.workplace
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
      WHERE u.user_id = ? AND u.role = 'TEACHER'
      LIMIT 1
    `,
    [teacherId],
  );

  const profile = rows[0];
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    avatar: profile.avatar,
    status: profile.status,
    role: profile.specialization ?? "Giảng viên",
    bio: profile.bio ?? "",
    specialization: profile.specialization ?? "",
    experienceYears: Number(profile.experienceYears ?? 0),
    qualification: profile.qualification ?? "",
    workplace: profile.workplace ?? "",
  };
}

export async function updateInstructorProfile(rawTeacherId, profileData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const name = String(profileData?.name ?? "").trim();
  const phone = String(profileData?.phone ?? "").trim();
  const avatar = String(profileData?.avatar ?? "").trim();
  const bio = String(profileData?.bio ?? "").trim();
  const specialization = String(profileData?.specialization ?? "").trim();
  const qualification = String(profileData?.qualification ?? "").trim();
  const workplace = String(profileData?.workplace ?? "").trim();
  const experienceYears = Math.max(0, Number(profileData?.experienceYears ?? 0) || 0);

  if (!name) throw new Error("Instructor name is required.");
  if (avatar && !/^https?:\/\//i.test(avatar)) {
    throw new Error("Avatar URL must start with http:// or https://.");
  }

  const [teacherRows] = await db.query(
    `
      SELECT user_id
      FROM users
      WHERE user_id = ? AND role = 'TEACHER'
      LIMIT 1
    `,
    [teacherId],
  );

  if (!teacherRows[0]) return null;

  await db.query(
    `
      UPDATE users
      SET full_name = ?, phone = ?, avatar_url = ?
      WHERE user_id = ? AND role = 'TEACHER'
    `,
    [name, phone || null, avatar || null, teacherId],
  );

  const profilePayload = [
    bio || null,
    specialization || null,
    experienceYears,
    qualification || null,
    workplace || null,
  ];
  const [profileRows] = await db.query(
    `
      SELECT teacher_id
      FROM teacher_profiles
      WHERE teacher_id = ?
      LIMIT 1
    `,
    [teacherId],
  );

  if (profileRows[0]) {
    await db.query(
      `
        UPDATE teacher_profiles
        SET bio = ?,
            specialization = ?,
            experience_years = ?,
            qualification = ?,
            workplace = ?
        WHERE teacher_id = ?
      `,
      [...profilePayload, teacherId],
    );
  } else {
    await db.query(
      `
        INSERT INTO teacher_profiles (
          bio,
          specialization,
          experience_years,
          qualification,
          workplace,
          teacher_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [...profilePayload, teacherId],
    );
  }

  return getInstructorProfileData(teacherId);
}

async function ensureStudentInterventionTable() {
  await db.query(
    `
      CREATE TABLE IF NOT EXISTS instructor_student_interventions (
        intervention_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        teacher_id BIGINT NOT NULL,
        student_id BIGINT NOT NULL,
        batch_id BIGINT NOT NULL,
        note TEXT NOT NULL,
        next_action VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(user_id),
        FOREIGN KEY (student_id) REFERENCES users(user_id),
        FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id) ON DELETE CASCADE
      )
    `,
  );
}

export async function getInstructorStudentsData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getProfile(teacherId);
  if (!profile) return null;
  await ensureStudentInterventionTable();

  const [rows] = await db.query(
    `
      SELECT
        u.user_id,
        b.batch_id AS batchId,
        u.full_name AS name,
        u.email,
        c.course_name AS course,
        b.batch_code AS batch,
        e.progress_percent AS progress,
        e.enrolled_at,
        COALESCE(AVG(CASE
          WHEN sa.status = 'PRESENT' THEN 100
          WHEN sa.status = 'LATE' THEN 75
          WHEN sa.status = 'EXCUSED' THEN 60
          ELSE 70
        END), 88) AS attendance
      FROM enrollments e
      INNER JOIN users u ON u.user_id = e.student_id
      INNER JOIN course_batches b ON b.batch_id = e.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      LEFT JOIN class_sessions cs ON cs.batch_id = b.batch_id
      LEFT JOIN session_attendance sa ON sa.session_id = cs.session_id AND sa.student_id = u.user_id
      WHERE b.teacher_id = ?
      GROUP BY u.user_id, b.batch_id, u.full_name, u.email, c.course_name, b.batch_code, e.progress_percent, e.enrolled_at
      ORDER BY e.enrolled_at DESC
    `,
    [teacherId],
  );

  const [interventionRows] = await db.query(
    `
      SELECT
        i.intervention_id AS id,
        i.student_id AS studentId,
        i.batch_id AS batchId,
        i.note,
        i.next_action AS nextAction,
        i.created_at AS createdAt
      FROM instructor_student_interventions i
      INNER JOIN (
        SELECT student_id, batch_id, MAX(created_at) AS createdAt
        FROM instructor_student_interventions
        WHERE teacher_id = ?
        GROUP BY student_id, batch_id
      ) latest
        ON latest.student_id = i.student_id
        AND latest.batch_id = i.batch_id
        AND latest.createdAt = i.created_at
      WHERE i.teacher_id = ?
    `,
    [teacherId, teacherId],
  );

  const students = rows.map((row) => {
    const progress = percent(row.progress);
    const attendance = percent(row.attendance);
    const status = studentStatus(progress, attendance);

    return {
      id: row.user_id,
      batchId: row.batchId,
      name: row.name,
      email: row.email,
      course: row.course,
      batch: row.batch,
      progress,
      attendance,
      lastActive: relativeTime(row.enrolled_at),
      status,
      statusClass: statusClass(status),
      latestIntervention:
        interventionRows.find(
          (intervention) =>
            Number(intervention.studentId) === Number(row.user_id) &&
            Number(intervention.batchId) === Number(row.batchId),
        ) ?? null,
    };
  });

  const risky = students.filter((student) => student.status === "Có rủi ro");
  const completed = students.filter((student) => student.progress >= 90);

  return {
    teacherId,
    profile,
    studentManagementStats: [
      { label: "Học viên ghi danh", value: String(students.length), icon: "groups", tone: "blue" },
      { label: "Hoạt động tuần này", value: String(students.length), icon: "bolt", tone: "green" },
      { label: "Có rủi ro", value: String(risky.length), icon: "warning", tone: "amber" },
      { label: "Đã hoàn thành", value: String(completed.length), icon: "workspace_premium", tone: "slate" },
    ],
    cohortFilters: ["Tất cả lớp", ...Array.from(new Set(students.map((student) => student.batch)))],
    instructorStudents: students,
    studentAttentionQueue: students
      .filter((student) => student.status === "Có rủi ro" || student.status === "Cần xem xét")
      .slice(0, 3)
      .map((student) => ({
        studentId: student.id,
        batchId: student.batchId,
        name: student.name,
        reason: `${student.course}: tien do ${student.progress}%, chuyen can ${student.attendance}%.`,
        action: "Gửi ghi chú cố vấn",
        priority: student.status === "Có rủi ro" ? "Cao" : "Trung bình",
      })),
  };
}

export async function createInstructorStudentIntervention(rawTeacherId, rawStudentId, interventionData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const studentId = Number(rawStudentId);
  const batchId = Number(interventionData?.batchId);
  const note = String(interventionData?.note ?? "").trim();
  const nextAction = String(interventionData?.nextAction ?? "").trim();

  if (!Number.isFinite(studentId) || studentId <= 0) throw new Error("Invalid student id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!note) throw new Error("Intervention note is required.");

  await ensureStudentInterventionTable();

  const [accessRows] = await db.query(
    `
      SELECT e.student_id AS studentId
      FROM enrollments e
      INNER JOIN course_batches b ON b.batch_id = e.batch_id
      WHERE e.student_id = ? AND e.batch_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [studentId, batchId, teacherId],
  );

  if (!accessRows[0]) throw new Error("Student not found for this instructor.");

  const [result] = await db.query(
    `
      INSERT INTO instructor_student_interventions (teacher_id, student_id, batch_id, note, next_action)
      VALUES (?, ?, ?, ?, ?)
    `,
    [teacherId, studentId, batchId, note, nextAction || null],
  );

  return {
    id: result.insertId,
    studentId,
    batchId,
    note,
    nextAction,
    createdAt: new Date().toISOString(),
  };
}

export async function getInstructorQuizzesData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getProfile(teacherId);
  if (!profile) return null;

  const [quizRows] = await db.query(
    `
      SELECT
        q.quiz_id,
        q.title,
        q.duration_minutes,
        c.course_name AS course,
        b.batch_code AS batch,
        COUNT(DISTINCT qu.question_id) AS questions,
        COUNT(DISTINCT qa.attempt_id) AS attempts,
        COALESCE(AVG(CASE WHEN qa.score >= q.pass_score THEN 100 ELSE 0 END), 0) AS pass_rate
      FROM quizzes q
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      LEFT JOIN questions qu ON qu.quiz_id = q.quiz_id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.quiz_id AND qa.status IN ('SUBMITTED', 'GRADED')
      WHERE b.teacher_id = ?
      GROUP BY q.quiz_id, q.title, q.duration_minutes, c.course_name, b.batch_code
      ORDER BY q.created_at DESC, q.quiz_id DESC
    `,
    [teacherId],
  );

  const [bankRows] = await db.query(
    `
      SELECT
        COALESCE(cm.module_title, c.course_name) AS topic,
        qn.question_type AS type,
        COUNT(*) AS count
      FROM questions qn
      INNER JOIN quizzes q ON q.quiz_id = qn.quiz_id
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
      LEFT JOIN course_modules cm ON cm.module_id = l.module_id
      WHERE b.teacher_id = ?
      GROUP BY COALESCE(cm.module_title, c.course_name), qn.question_type
      ORDER BY count DESC
      LIMIT 3
    `,
    [teacherId],
  );

  const [gradingRows] = await db.query(
    `
      SELECT u.full_name AS student, q.title AS quiz, qa.submitted_at, qa.score
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON q.quiz_id = qa.quiz_id
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      INNER JOIN users u ON u.user_id = qa.student_id
      WHERE b.teacher_id = ?
        AND qa.status = 'SUBMITTED'
      ORDER BY qa.submitted_at DESC
      LIMIT 3
    `,
    [teacherId],
  );

  const [assignmentRows] = await db.query(
    `
      SELECT
        a.assignment_id AS id,
        a.batch_id AS batchId,
        a.lesson_id AS lessonId,
        a.title,
        a.description,
        a.due_date AS dueDate,
        a.max_score AS maxScore,
        c.course_name AS course,
        b.batch_code AS batch,
        l.lesson_title AS lessonTitle,
        cm.module_title AS moduleTitle,
        COUNT(s.submission_id) AS submissions,
        SUM(CASE WHEN s.submission_id IS NOT NULL AND s.score IS NULL THEN 1 ELSE 0 END) AS pendingSubmissions
      FROM assignments a
      INNER JOIN course_batches b ON b.batch_id = a.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      LEFT JOIN lessons l ON l.lesson_id = a.lesson_id
      LEFT JOIN course_modules cm ON cm.module_id = l.module_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.assignment_id
      WHERE b.teacher_id = ?
      GROUP BY a.assignment_id, a.batch_id, a.lesson_id, a.title, a.description, a.due_date, a.max_score, c.course_name, b.batch_code, l.lesson_title, cm.module_title
      ORDER BY a.due_date DESC, a.assignment_id DESC
    `,
    [teacherId],
  );

  const [batchRows] = await db.query(
    `
      SELECT
        b.batch_id AS id,
        b.batch_code AS batchCode,
        c.course_name AS courseName
      FROM course_batches b
      INNER JOIN courses c ON c.course_id = b.course_id
      WHERE b.teacher_id = ?
      ORDER BY b.batch_code ASC, b.batch_id ASC
    `,
    [teacherId],
  );

  const [lessonOptionRows] = await db.query(
    `
      SELECT
        b.batch_id AS batchId,
        l.lesson_id AS id,
        l.lesson_title AS title,
        cm.module_title AS moduleTitle
      FROM course_batches b
      INNER JOIN course_modules cm ON cm.course_id = b.course_id
      INNER JOIN lessons l ON l.module_id = cm.module_id
      WHERE b.teacher_id = ?
      ORDER BY b.batch_code ASC, cm.order_no ASC, l.order_no ASC, l.lesson_id ASC
    `,
    [teacherId],
  );

  const [submissionRows] = await db.query(
    `
      SELECT
        s.submission_id AS id,
        s.assignment_id AS assignmentId,
        u.full_name AS student,
        s.file_url AS fileUrl,
        s.content,
        s.submitted_at AS submittedAt,
        s.score,
        s.feedback,
        s.graded_at AS gradedAt
      FROM assignment_submissions s
      INNER JOIN assignments a ON a.assignment_id = s.assignment_id
      INNER JOIN course_batches b ON b.batch_id = a.batch_id
      INNER JOIN users u ON u.user_id = s.student_id
      WHERE b.teacher_id = ?
      ORDER BY s.submitted_at DESC, s.submission_id DESC
    `,
    [teacherId],
  );

  const totalQuestions = bankRows.reduce((sum, row) => sum + Number(row.count), 0);
  const passRate =
    quizRows.length === 0
      ? 0
      : percent(quizRows.reduce((sum, row) => sum + Number(row.pass_rate ?? 0), 0) / quizRows.length);

  return {
    teacherId,
    profile,
    quizManagementStats: [
      { label: "Bài đã xuất bản", value: String(quizRows.length), icon: "quiz", tone: "blue" },
      { label: "Ngân hàng câu hỏi", value: String(totalQuestions), icon: "help", tone: "slate" },
      { label: "Tỷ lệ đạt TB", value: `${passRate}%`, icon: "fact_check", tone: "green" },
      {
        label: "Cần chấm",
        value: String(gradingRows.length + submissionRows.filter((row) => row.score == null).length),
        icon: "grading",
        tone: "amber",
      },
    ],
    instructorQuizzes: quizRows.map((row) => ({
      title: row.title,
      course: row.course,
      batch: row.batch,
      questions: Number(row.questions),
      duration: formatMinutes(row.duration_minutes),
      attempts: Number(row.attempts),
      passRate: percent(row.pass_rate),
      status: "Đã xuất bản",
    })),
    quizQuestionBank: bankRows.map((row) => ({
      topic: row.topic,
      type: row.type,
      count: Number(row.count),
      difficulty: Number(row.count) >= 4 ? "Trung cấp" : "Cơ bản",
    })),
    gradingQueue: gradingRows.map((row) => ({
      student: row.student,
      quiz: row.quiz,
      submitted: relativeTime(row.submitted_at),
      score: row.score == null ? "Chờ chấm" : "Cần xem lại",
    })),
    batchOptions: batchRows.map((row) => ({
      id: row.id,
      batchCode: row.batchCode,
      courseName: row.courseName,
    })),
    lessonOptions: lessonOptionRows.map((row) => ({
      id: row.id,
      batchId: row.batchId,
      title: row.title,
      moduleTitle: row.moduleTitle,
    })),
    assignmentItems: assignmentRows.map((assignment) => ({
      id: assignment.id,
      batchId: assignment.batchId,
      lessonId: assignment.lessonId,
      title: assignment.title,
      description: assignment.description ?? "",
      course: assignment.course,
      batch: assignment.batch,
      lessonTitle: assignment.lessonTitle ?? "",
      moduleTitle: assignment.moduleTitle ?? "",
      dueDateInput: assignment.dueDate ? formatDateTimeInput(assignment.dueDate) : "",
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "Chưa có hạn",
      maxScore: assignment.maxScore == null ? "10" : String(Number(assignment.maxScore)),
      submissions: Number(assignment.submissions ?? 0),
      pendingSubmissions: Number(assignment.pendingSubmissions ?? 0),
      submissionItems: submissionRows
        .filter((submission) => submission.assignmentId === assignment.id)
        .map((submission) => ({
          id: submission.id,
          student: submission.student,
          fileUrl: submission.fileUrl ?? "",
          content: submission.content ?? "",
          submitted: relativeTime(submission.submittedAt),
          score: submission.score == null ? "" : String(Number(submission.score)),
          feedback: submission.feedback ?? "",
          gradedAt: submission.gradedAt ? relativeTime(submission.gradedAt) : "",
          status: submission.score == null ? "Chờ chấm" : "Đã chấm",
        })),
    })),
  };
}

export async function createInstructorAssignment(rawTeacherId, assignmentData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const normalizedBatchScope = String(assignmentData?.batchScope ?? "SINGLE").trim().toUpperCase();
  const batchScope = normalizedBatchScope === "ALL" ? "ALL" : "SINGLE";
  const batchId = Number(assignmentData?.batchId);
  const lessonId = Number(assignmentData?.lessonId);
  const title = String(assignmentData?.title ?? "").trim();
  const description = String(assignmentData?.description ?? "").trim();
  const dueDate = String(assignmentData?.dueDate ?? "").trim().replace("T", " ");
  const maxScore = Number(assignmentData?.maxScore ?? 10);

  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(lessonId) || lessonId <= 0) throw new Error("Lesson is required.");
  if (!title) throw new Error("Assignment title is required.");
  if (!dueDate) throw new Error("Due date is required.");
  if (!Number.isFinite(maxScore) || maxScore <= 0) throw new Error("Max score must be greater than 0.");

  const [batchRows] = await db.query(
    `
      SELECT batch_id AS id, course_id AS courseId
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ?
      LIMIT 1
    `,
    [batchId, teacherId],
  );

  if (!batchRows[0]) throw new Error("Batch not found for this instructor.");

  const [lessonRows] = await db.query(
    `
      SELECT l.lesson_id AS id
      FROM lessons l
      INNER JOIN course_modules cm ON cm.module_id = l.module_id
      WHERE l.lesson_id = ? AND cm.course_id = ?
      LIMIT 1
    `,
    [lessonId, batchRows[0].courseId],
  );

  if (!lessonRows[0]) throw new Error("Lesson not found for this batch course.");

  const [targetBatchRows] = await db.query(
    `
      SELECT batch_id AS id
      FROM course_batches
      WHERE teacher_id = ? AND course_id = ?
        ${batchScope === "ALL" ? "" : "AND batch_id = ?"}
      ORDER BY batch_id ASC
    `,
    batchScope === "ALL" ? [teacherId, batchRows[0].courseId] : [teacherId, batchRows[0].courseId, batchId],
  );

  if (targetBatchRows.length === 0) throw new Error("Batch not found for this instructor.");

  const createdAssignmentIds = [];
  for (const targetBatch of targetBatchRows) {
    const [result] = await db.query(
      `
        INSERT INTO assignments (batch_id, lesson_id, title, description, due_date, max_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [targetBatch.id, lessonId, title, description, dueDate, maxScore],
    );
    createdAssignmentIds.push(result.insertId);
  }

  return {
    id: createdAssignmentIds[0],
    batchId,
    lessonId,
    title,
    description,
    dueDate,
    dueDateInput: formatDateTimeInput(dueDate),
    maxScore: String(maxScore),
    createdCount: createdAssignmentIds.length,
  };
}

export async function updateInstructorAssignment(rawTeacherId, rawAssignmentId, assignmentData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const assignmentId = Number(rawAssignmentId);
  const batchId = Number(assignmentData?.batchId);
  const lessonId = Number(assignmentData?.lessonId);
  const title = String(assignmentData?.title ?? "").trim();
  const description = String(assignmentData?.description ?? "").trim();
  const dueDate = String(assignmentData?.dueDate ?? "").trim().replace("T", " ");
  const maxScore = Number(assignmentData?.maxScore ?? 10);

  if (!Number.isFinite(assignmentId) || assignmentId <= 0) throw new Error("Invalid assignment id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(lessonId) || lessonId <= 0) throw new Error("Lesson is required.");
  if (!title) throw new Error("Assignment title is required.");
  if (!dueDate) throw new Error("Due date is required.");
  if (!Number.isFinite(maxScore) || maxScore <= 0) throw new Error("Max score must be greater than 0.");

  const [assignmentRows] = await db.query(
    `
      SELECT a.assignment_id AS id
      FROM assignments a
      INNER JOIN course_batches b ON b.batch_id = a.batch_id
      WHERE a.assignment_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [assignmentId, teacherId],
  );

  if (!assignmentRows[0]) throw new Error("Assignment not found for this instructor.");

  const [batchRows] = await db.query(
    `
      SELECT batch_id AS id, course_id AS courseId
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ?
      LIMIT 1
    `,
    [batchId, teacherId],
  );

  if (!batchRows[0]) throw new Error("Batch not found for this instructor.");

  const [lessonRows] = await db.query(
    `
      SELECT l.lesson_id AS id
      FROM lessons l
      INNER JOIN course_modules cm ON cm.module_id = l.module_id
      WHERE l.lesson_id = ? AND cm.course_id = ?
      LIMIT 1
    `,
    [lessonId, batchRows[0].courseId],
  );

  if (!lessonRows[0]) throw new Error("Lesson not found for this batch course.");

  await db.query(
    `
      UPDATE assignments
      SET batch_id = ?, lesson_id = ?, title = ?, description = ?, due_date = ?, max_score = ?
      WHERE assignment_id = ?
    `,
    [batchId, lessonId, title, description, dueDate, maxScore, assignmentId],
  );

  return {
    id: assignmentId,
    batchId,
    lessonId,
    title,
    description,
    dueDate,
    maxScore: String(maxScore),
  };
}

export async function deleteInstructorAssignment(rawTeacherId, rawAssignmentId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const assignmentId = Number(rawAssignmentId);

  if (!Number.isFinite(assignmentId) || assignmentId <= 0) throw new Error("Invalid assignment id.");

  const [assignmentRows] = await db.query(
    `
      SELECT a.assignment_id AS id
      FROM assignments a
      INNER JOIN course_batches b ON b.batch_id = a.batch_id
      WHERE a.assignment_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [assignmentId, teacherId],
  );

  if (!assignmentRows[0]) throw new Error("Assignment not found for this instructor.");

  await db.query(
    `
      DELETE FROM assignments
      WHERE assignment_id = ?
    `,
    [assignmentId],
  );

  return { id: assignmentId };
}

export async function gradeInstructorAssignmentSubmission(rawTeacherId, rawAssignmentId, rawSubmissionId, gradeData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const assignmentId = Number(rawAssignmentId);
  const submissionId = Number(rawSubmissionId);
  const score = Number(gradeData?.score);
  const feedback = String(gradeData?.feedback ?? "").trim();

  if (!Number.isFinite(assignmentId) || assignmentId <= 0) throw new Error("Invalid assignment id.");
  if (!Number.isFinite(submissionId) || submissionId <= 0) throw new Error("Invalid submission id.");
  if (!Number.isFinite(score) || score < 0) throw new Error("Score must be zero or greater.");

  const [submissionRows] = await db.query(
    `
      SELECT a.max_score AS maxScore
      FROM assignment_submissions s
      INNER JOIN assignments a ON a.assignment_id = s.assignment_id
      INNER JOIN course_batches b ON b.batch_id = a.batch_id
      WHERE s.submission_id = ? AND s.assignment_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [submissionId, assignmentId, teacherId],
  );

  const submission = submissionRows[0];
  if (!submission) throw new Error("Submission not found.");
  if (score > Number(submission.maxScore ?? 0)) throw new Error("Score cannot be greater than max score.");

  await db.query(
    `
      UPDATE assignment_submissions
      SET score = ?, feedback = ?, graded_at = NOW(), graded_by = ?
      WHERE submission_id = ?
    `,
    [score, feedback, teacherId, submissionId],
  );

  return { id: submissionId, assignmentId, score: String(score), feedback };
}

export async function getInstructorInteractionData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getProfile(teacherId);
  if (!profile) return null;

  const [threadRows] = await db.query(
    `
      SELECT
        d.discussion_id,
        d.title,
        d.content,
        d.user_id AS authorId,
        u.full_name AS author,
        c.course_name AS course,
        b.batch_code AS batch,
        d.created_at,
        COALESCE(d.updated_at, d.created_at) AS updated_at,
        COUNT(DISTINCT dc.comment_id) AS replies,
        COUNT(DISTINCT CASE WHEN dc.user_id = ? OR dc.is_instructor_answer = TRUE THEN dc.comment_id END) AS teacherReplies,
        MAX(COALESCE(dc.created_at, d.updated_at, d.created_at)) AS last_activity
      FROM discussions d
      INNER JOIN course_batches b ON b.batch_id = d.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      INNER JOIN users u ON u.user_id = d.user_id
      LEFT JOIN discussion_comments dc
        ON dc.discussion_id = d.discussion_id
       AND dc.status = 'VISIBLE'
      WHERE b.teacher_id = ? AND d.status <> 'HIDDEN'
      GROUP BY d.discussion_id, d.title, d.content, d.user_id, u.full_name, c.course_name, b.batch_code, d.created_at, d.updated_at
      ORDER BY last_activity DESC
    `,
    [teacherId, teacherId],
  );

  const [commentRows] = await db.query(
    `
      SELECT
        dc.comment_id AS id,
        dc.discussion_id AS discussionId,
        dc.user_id AS userId,
        u.full_name AS author,
        dc.content,
        dc.is_instructor_answer,
        dc.created_at
      FROM discussion_comments dc
      INNER JOIN discussions d ON d.discussion_id = dc.discussion_id
      INNER JOIN course_batches b ON b.batch_id = d.batch_id
      INNER JOIN users u ON u.user_id = dc.user_id
      WHERE b.teacher_id = ? AND dc.status = 'VISIBLE'
      ORDER BY dc.created_at ASC, dc.comment_id ASC
    `,
    [teacherId],
  );

  const [messageRows] = await db.query(
    `
      SELECT u.full_name AS student, d.content AS preview, d.created_at
      FROM discussions d
      INNER JOIN users u ON u.user_id = d.user_id
      INNER JOIN course_batches b ON b.batch_id = d.batch_id
      WHERE b.teacher_id = ?
      ORDER BY d.created_at DESC
      LIMIT 3
    `,
    [teacherId],
  );

  const [notificationRows] = await db.query(
    `
      SELECT n.notification_id AS id, n.notification_type AS type,
             n.title, n.content, n.reference_id, n.target_url,
             n.is_read, n.created_at
      FROM notifications n
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 8
    `,
    [teacherId],
  );

  const [targetRows] = await db.query(
    `
      SELECT
        c.course_id AS courseId,
        c.course_name AS courseName,
        b.batch_id AS batchId,
        b.batch_code AS batchCode
      FROM courses c
      LEFT JOIN course_batches b ON b.course_id = c.course_id AND b.teacher_id = c.teacher_id
      WHERE c.teacher_id = ?
      ORDER BY c.course_name ASC, b.batch_code ASC, b.batch_id ASC
    `,
    [teacherId],
  );

  const [pendingCourseRows] = await db.query(
    `
      SELECT course_id AS id, course_name AS title, updated_at
      FROM courses
      WHERE teacher_id = ? AND status = 'PENDING'
      ORDER BY updated_at DESC, course_id DESC
      LIMIT 4
    `,
    [teacherId],
  );

  const [gradingRows] = await db.query(
    `
      SELECT qa.attempt_id AS id, u.full_name AS student, q.title AS quiz, qa.submitted_at
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON q.quiz_id = qa.quiz_id
      INNER JOIN lessons l ON l.lesson_id = q.lesson_id
      INNER JOIN course_modules m ON m.module_id = l.module_id
      INNER JOIN courses c ON c.course_id = m.course_id
      INNER JOIN users u ON u.user_id = qa.student_id
      WHERE c.teacher_id = ? AND qa.status = 'SUBMITTED'
      ORDER BY qa.submitted_at DESC, qa.attempt_id DESC
      LIMIT 4
    `,
    [teacherId],
  );

  const [upcomingSessionRows] = await db.query(
    `
      SELECT cs.session_id AS id, cs.session_title AS title, c.course_name AS course, b.batch_code AS batch, cs.start_time
      FROM class_sessions cs
      INNER JOIN course_batches b ON b.batch_id = cs.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      WHERE cs.teacher_id = ?
        AND cs.status IN ('SCHEDULED', 'LIVE')
        AND cs.start_time >= NOW()
      ORDER BY cs.start_time ASC
      LIMIT 4
    `,
    [teacherId],
  );

  const reminderTasks = [
    ...pendingCourseRows.map((row) => ({
      id: `course-${row.id}`,
      title: row.title,
      detail: "Khóa học đang chờ admin duyệt.",
      category: "Khóa chờ duyệt",
      tone: "amber",
      icon: "pending_actions",
      time: relativeTime(row.updated_at),
    })),
    ...threadRows
      .filter((row) => Number(row.teacherReplies) === 0)
      .slice(0, 4)
      .map((row) => ({
        id: `discussion-${row.discussion_id}`,
        title: row.title,
        detail: `${row.course} · ${row.batch}`,
        category: "Học viên hỏi",
        tone: "blue",
        icon: "forum",
        time: relativeTime(row.last_activity ?? row.updated_at ?? row.created_at),
      })),
    ...gradingRows.map((row) => ({
      id: `grading-${row.id}`,
      title: row.student,
      detail: row.quiz,
      category: "Bài cần chấm",
      tone: "red",
      icon: "grading",
      time: relativeTime(row.submitted_at),
    })),
    ...upcomingSessionRows.map((row) => ({
      id: `session-${row.id}`,
      title: row.title,
      detail: `${row.course} · ${row.batch}`,
      category: "Lịch sắp tới",
      tone: "green",
      icon: "event_upcoming",
      time: relativeTime(row.start_time),
    })),
  ].slice(0, 10);

  const unreadNotifications = notificationRows.filter((row) => !row.is_read).length;
  const targetCourseMap = new Map();
  const targetBatches = [];

  targetRows.forEach((row) => {
    if (!targetCourseMap.has(row.courseId)) {
      targetCourseMap.set(row.courseId, {
        id: row.courseId,
        title: row.courseName,
        batches: [],
      });
    }

    if (row.batchId) {
      const batch = {
        id: row.batchId,
        code: row.batchCode,
        courseId: row.courseId,
        courseTitle: row.courseName,
      };

      targetCourseMap.get(row.courseId).batches.push(batch);
      targetBatches.push(batch);
    }
  });

  return {
    teacherId,
    profile,
    interactionStats: [
      { label: "Chủ đề đang mở", value: String(threadRows.length), icon: "forum", tone: "blue" },
      { label: "Tin chưa đọc", value: String(unreadNotifications), icon: "mark_chat_unread", tone: "amber" },
      { label: "Da tra loi", value: String(threadRows.filter((row) => Number(row.teacherReplies) > 0).length), icon: "task_alt", tone: "green" },
      { label: "Nhắc việc", value: String(reminderTasks.length), icon: "notifications_active", tone: "slate" },
    ],
    discussionThreads: threadRows.map((row) => ({
      id: row.discussion_id,
      title: row.title,
      content: row.content,
      author: row.author,
      course: row.course,
      batch: row.batch,
      replies: Number(row.replies),
      teacherReplies: Number(row.teacherReplies),
      needsReply: Number(row.teacherReplies) === 0,
      lastActivity: relativeTime(row.last_activity ?? row.updated_at ?? row.created_at),
      status: Number(row.teacherReplies) === 0 ? "Can phan hoi" : "Da tra loi",
      comments: commentRows
        .filter((comment) => comment.discussionId === row.discussion_id)
        .map((comment) => ({
          id: comment.id,
          author: comment.author,
          isTeacher: Number(comment.userId) === teacherId || Boolean(comment.is_instructor_answer),
          content: comment.content,
          time: relativeTime(comment.created_at),
        })),
    })),
    directMessages: messageRows.map((row, index) => ({
      student: row.student,
      preview: row.preview,
      time: relativeTime(row.created_at),
      priority: index === 0 ? "Cao" : "Trung bình",
    })),
    announcementDrafts: notificationRows.map((row) => ({
      title: row.title,
      target: "Tất cả lớp",
      state: row.is_read ? "Đã đọc" : "Chưa đọc",
    })),
    announcementTargets: {
      courses: Array.from(targetCourseMap.values()),
      batches: targetBatches,
    },
    notificationItems: notificationRows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      referenceId: row.reference_id === null ? null : Number(row.reference_id),
      targetUrl: row.target_url,
      isRead: Boolean(row.is_read),
      time: relativeTime(row.created_at),
    })),
    reminderTasks,
  };
}

export async function markInstructorNotificationRead(rawTeacherId, rawNotificationId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const notificationId = Number(rawNotificationId);

  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    throw new Error("Invalid notification id.");
  }

  const [result] = await db.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = ? AND user_id = ?
    `,
    [notificationId, teacherId],
  );

  if (result.affectedRows === 0) {
    throw new Error("Notification not found.");
  }

  return { id: notificationId, isRead: true };
}

export async function createInstructorDiscussionComment(rawTeacherId, rawDiscussionId, commentData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const discussionId = Number(rawDiscussionId);
  const content = String(commentData?.content ?? "").trim();

  if (!Number.isFinite(discussionId) || discussionId <= 0) {
    throw new Error("Invalid discussion id.");
  }

  if (!content) {
    throw new Error("Comment content is required.");
  }

  const [discussionRows] = await db.query(
    `
      SELECT d.discussion_id AS id
      FROM discussions d
      INNER JOIN course_batches b ON b.batch_id = d.batch_id
      WHERE d.discussion_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [discussionId, teacherId],
  );

  if (!discussionRows[0]) {
    throw new Error("Discussion not found.");
  }

  const [result] = await db.query(
    `
      INSERT INTO discussion_comments (discussion_id, user_id, content, is_instructor_answer, created_at)
      VALUES (?, ?, ?, TRUE, NOW())
    `,
    [discussionId, teacherId, content],
  );

  await db.query(
    `
      UPDATE discussions
      SET status = 'RESOLVED', updated_at = NOW()
      WHERE discussion_id = ?
    `,
    [discussionId],
  );

  return {
    id: result.insertId,
    discussionId,
    authorId: teacherId,
    content,
  };
}

export async function getInstructorAnalyticsData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getProfile(teacherId);
  if (!profile) return null;

  const [courseRows] = await db.query(
    `
      SELECT
        c.course_name AS title,
        COALESCE(AVG(e.progress_percent), 0) AS completion,
        COALESCE(AVG(qa.score), 0) AS quiz_average,
        COALESCE(AVG(CASE
          WHEN sa.status = 'PRESENT' THEN 100
          WHEN sa.status = 'LATE' THEN 75
          ELSE 82
        END), 82) AS attendance
      FROM courses c
      LEFT JOIN course_batches b ON b.course_id = c.course_id
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id
      LEFT JOIN quizzes q ON q.batch_id = b.batch_id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.quiz_id
      LEFT JOIN class_sessions cs ON cs.batch_id = b.batch_id
      LEFT JOIN session_attendance sa ON sa.session_id = cs.session_id
      WHERE c.teacher_id = ?
      GROUP BY c.course_id, c.course_name
      ORDER BY completion DESC
      LIMIT 3
    `,
    [teacherId],
  );

  const completionAvg =
    courseRows.length === 0
      ? 0
      : percent(courseRows.reduce((sum, row) => sum + Number(row.completion ?? 0), 0) / courseRows.length);
  const quizAvg =
    courseRows.length === 0
      ? 0
      : Number((courseRows.reduce((sum, row) => sum + Number(row.quiz_average ?? 0), 0) / courseRows.length).toFixed(1));
  const riskCount = courseRows.filter((row) => Number(row.completion ?? 0) < 60).length;

  return {
    teacherId,
    profile,
    analyticsStats: [
      { label: "Giờ giảng dạy", value: "146", icon: "schedule", tone: "blue" },
      { label: "Tỷ lệ hoàn thành", value: `${completionAvg}%`, icon: "trending_up", tone: "green" },
      { label: "Điểm kiểm tra TB", value: String(quizAvg), icon: "score", tone: "slate" },
      { label: "Tín hiệu rủi ro", value: String(riskCount), icon: "crisis_alert", tone: "amber" },
    ],
    engagementTrend: [
      { label: "T1", value: 34 },
      { label: "T2", value: 45 },
      { label: "T3", value: 58 },
      { label: "T4", value: 62 },
      { label: "T5", value: 77 },
      { label: "T6", value: Math.max(20, completionAvg) },
    ],
    learnerSegments: [
      { label: "Xuất sắc", value: 22, tone: "blue" },
      { label: "Đúng tiến độ", value: 45, tone: "green" },
      { label: "Cần xem xét", value: 22, tone: "amber" },
      { label: "Có rủi ro", value: 11, tone: "red" },
    ],
    courseInsights: courseRows.map((row) => ({
      title: row.title,
      completion: percent(row.completion),
      quizAverage: Number(Number(row.quiz_average ?? 0).toFixed(1)),
      attendance: percent(row.attendance),
      trend: Number(row.completion ?? 0) >= 70 ? "+8%" : "-3%",
    })),
    analyticsRecommendations: courseRows
      .filter((row) => Number(row.completion ?? 0) < 75)
      .slice(0, 3)
      .map((row) => ({
        title: `Rà soát ${row.title}`,
        detail: "Tiến độ trung bình đang thấp hơn ngưỡng mong đợi, nên thêm buổi ôn tập hoặc bài luyện tập.",
        impact: Number(row.completion ?? 0) < 55 ? "Cao" : "Trung bình",
      })),
  };
}
