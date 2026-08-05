import db from "../db.js";
import { createNotification } from "./notification.service.js";

const DEFAULT_TEACHER_ID = 4;

function normalizeTeacherId(value) {
  const teacherId = Number(value ?? DEFAULT_TEACHER_ID);
  return Number.isFinite(teacherId) && teacherId > 0 ? teacherId : DEFAULT_TEACHER_ID;
}

function percent(value) {
  return Number(Number(value ?? 0).toFixed(0));
}

function formatDuration(minutes) {
  const total = Number(minutes ?? 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return `${hours} giờ ${mins} phút`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(amount ?? 0));
}

function toCourseLevelLabel(level) {
  if (level === "BEGINNER") return "Cơ bản";
  if (level === "INTERMEDIATE") return "Trung cấp";
  if (level === "ADVANCED") return "Nâng cao";
  return "Cơ bản";
}

function toCourseStatusLabel(status) {
  if (status === "APPROVED") return "Đã xuất bản";
  if (status === "PENDING") return "Chờ duyệt";
  if (status === "REJECTED") return "Bị từ chối";
  if (status === "HIDDEN") return "Đã ẩn";
  return "Bản nháp";
}

function toCourseStatusTone(status) {
  if (status === "APPROVED") return "approved";
  if (status === "PENDING") return "pending";
  if (status === "REJECTED") return "rejected";
  return "draft";
}

function toBatchStatusLabel(status) {
  if (status === "OPEN") return "Đang mở";
  if (status === "FULL") return "Đã đầy";
  if (status === "STARTED") return "Đang học";
  if (status === "FINISHED") return "Đã kết thúc";
  if (status === "CANCELLED") return "Đã hủy";
  return "Bản nháp";
}

function toLearningModeLabel(mode) {
  if (mode === "OFFLINE") return "Trực tiếp";
  if (mode === "HYBRID") return "Kết hợp";
  return "Trực tuyến";
}

function toLearningModeValue(mode) {
  if (mode === "Trực tiếp") return "OFFLINE";
  if (mode === "Kết hợp") return "HYBRID";
  return "ONLINE";
}

function toOnlinePlatformLabel(platform) {
  if (platform === "GOOGLE_MEET") return "Google Meet";
  if (platform === "MICROSOFT_TEAMS") return "Microsoft Teams";
  if (platform === "JITSI") return "Jitsi";
  if (platform === "INTERNAL_ROOM") return "Phòng nội bộ";
  if (platform === "OTHER") return "Khác";
  return "Zoom";
}

function toOnlinePlatformValue(platform) {
  const normalized = String(platform ?? "").toUpperCase();
  if (normalized === "GOOGLE MEET") return "GOOGLE_MEET";
  if (normalized === "MICROSOFT TEAMS") return "MICROSOFT_TEAMS";
  if (normalized === "JITSI") return "JITSI";
  if (normalized === "INTERNAL ROOM") return "INTERNAL_ROOM";
  if (normalized === "OTHER") return "OTHER";
  return "ZOOM";
}

function toSessionStatusLabel(status) {
  if (status === "LIVE") return "Đang học";
  if (status === "COMPLETED") return "Đã xong";
  if (status === "CANCELLED") return "Đã hủy";
  return "Đã lên lịch";
}

function toSessionStatusValue(status) {
  const normalized = String(status ?? "").toUpperCase();
  if (["LIVE", "COMPLETED", "CANCELLED", "SCHEDULED"].includes(normalized)) {
    return normalized;
  }
  return "SCHEDULED";
}

function toSessionPlatformLabel(platform) {
  return toOnlinePlatformLabel(platform);
}

function toSessionPlatformValue(platform) {
  return toOnlinePlatformValue(platform);
}

function formatDateText(value) {
  if (!value) return "Chưa cập nhật";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function normalizeDateOnlyForBatchValidation(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    return null;
  }

  return normalized;
}

function assertBatchDateOrder({ startDate, endDate, enrollmentStartDate, enrollmentDeadline }) {
  const start = normalizeDateOnlyForBatchValidation(startDate);
  const end = normalizeDateOnlyForBatchValidation(endDate);
  const enrollmentStart = normalizeDateOnlyForBatchValidation(enrollmentStartDate);
  const deadline = normalizeDateOnlyForBatchValidation(enrollmentDeadline);

  if (!start || !end) {
    throw new Error("Start date and end date must be valid dates.");
  }

  if (end <= start) {
    throw new Error("End date must be later than start date.");
  }

  if (enrollmentStartDate && !enrollmentStart) {
    throw new Error("Enrollment start date must be a valid date.");
  }

  if (enrollmentDeadline && !deadline) {
    throw new Error("Enrollment deadline must be a valid date.");
  }

  if (enrollmentStart && deadline && enrollmentStart > deadline) {
    throw new Error("Enrollment start date must be on or before enrollment deadline.");
  }

  if (enrollmentStart && enrollmentStart > start) {
    throw new Error("Enrollment must start before the class starts.");
  }

  if (deadline && deadline > start) {
    throw new Error("Enrollment deadline must be on or before the class start date.");
  }
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTimeSql(date) {
  const datePart = formatDateOnly(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}

function combineDateAndTime(date, time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0);
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function hasTimeRangeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function createEndOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function assertSessionWithinBatchRange(startTime, endTime, batchStartDate, batchEndDate) {
  const sessionStart = new Date(startTime);
  const sessionEnd = new Date(endTime);
  const batchStart = parseDateOnly(batchStartDate);
  const batchEnd = parseDateOnly(batchEndDate);

  if (Number.isNaN(sessionStart.getTime()) || Number.isNaN(sessionEnd.getTime())) {
    throw new Error("Thời gian buổi học không hợp lệ.");
  }

  if (!batchStart || !batchEnd) {
    throw new Error("Lớp học chưa có ngày bắt đầu hoặc ngày kết thúc hợp lệ.");
  }

  const allowedStart = combineDateAndTime(batchStart, "00:00");
  const allowedEnd = createEndOfDay(batchEnd);

  if (sessionStart < allowedStart || sessionEnd > allowedEnd) {
    throw new Error(
      `Buổi học phải nằm trong thời gian của lớp (${formatDateOnly(batchStart)} đến ${formatDateOnly(batchEnd)}).`,
    );
  }
}

async function findBatchSessionConflict(batchId, teacherId, startTime, endTime, excludeSessionId = null) {
  const params = [batchId, teacherId, endTime, startTime];
  let query = `
    SELECT
      session_id AS id,
      session_title AS title,
      start_time,
      end_time
    FROM class_sessions
    WHERE batch_id = ?
      AND teacher_id = ?
      AND start_time < ?
      AND end_time > ?
  `;

  if (excludeSessionId != null) {
    query += " AND session_id <> ?";
    params.push(excludeSessionId);
  }

  query += " ORDER BY start_time ASC LIMIT 1";

  const [rows] = await db.query(query, params);
  return rows[0] ?? null;
}

function mapBatchRow(row) {
  const start = row.start_date ? new Date(row.start_date) : null;
  const end = row.end_date ? new Date(row.end_date) : null;
  const enrollmentStart = row.enrollment_start_date ? new Date(row.enrollment_start_date) : null;
  const enrollmentDeadline = row.enrollment_deadline ? new Date(row.enrollment_deadline) : null;
  const batchId = row.id ?? row.batchId ?? row.batch_id ?? null;
  const batchCode = row.code ?? row.batchCode ?? (batchId != null ? `BATCH-${batchId}` : "BATCH");

  return {
    id: batchId,
    code: batchCode,
    name: row.name ?? row.batchName ?? "",
    dates:
      start && end
        ? `${formatDateText(start)} - ${formatDateText(end)}`
        : "Chưa cập nhật",
    students: `${Number(row.enrolled_students ?? 0)} / ${Number(row.max_students ?? 0)}`,
    enrolledStudents: Number(row.enrolled_students ?? 0),
    mode: toLearningModeLabel(row.learning_mode),
    platform: toOnlinePlatformLabel(row.online_platform),
    status: toBatchStatusLabel(row.status),
    statusValue: row.status,
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
    enrollmentStartDate: toDateInputValue(enrollmentStart),
    enrollmentDeadline: toDateInputValue(enrollmentDeadline),
    minStudents: Number(row.min_students ?? 1),
    maxStudents: Number(row.max_students ?? 50),
    tuitionFee: row.tuition_fee != null ? String(Number(row.tuition_fee)) : "",
    learningMode: toLearningModeValue(toLearningModeLabel(row.learning_mode)),
    learningModeValue: row.learning_mode,
    onlinePlatform: toOnlinePlatformValue(row.online_platform),
    defaultMeetingUrl: row.default_meeting_url ?? row.defaultMeetingUrl ?? "",
    classroomName: row.classroom_name ?? row.classroomName ?? "",
    classroomAddress: row.classroom_address ?? row.classroomAddress ?? "",
    note: row.note ?? "",
    sessions: [],
  };
}

function mapSessionRow(row) {
  const startTime = row.start_time ? new Date(row.start_time) : null;
  const endTime = row.end_time ? new Date(row.end_time) : null;

  return {
    id: row.id,
    batchId: row.batchId,
    title: row.title,
    description: row.description ?? "",
    startTime: toDateTimeLocalValue(startTime),
    endTime: toDateTimeLocalValue(endTime),
    startLabel: startTime ? startTime.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "",
    endLabel: endTime ? endTime.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "",
    meetingUrl: row.meetingUrl ?? "",
    meetingPassword: row.meetingPassword ?? "",
    platform: toSessionPlatformValue(row.platform),
    platformLabel: toSessionPlatformLabel(row.platform),
    status: toSessionStatusValue(row.status),
    statusLabel: toSessionStatusLabel(row.status),
    recordingUrl: row.recordingUrl ?? "",
    note: row.note ?? "",
  };
}

function normalizeAttendanceStatus(value) {
  const status = String(value ?? "ABSENT").toUpperCase();
  if (["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(status)) return status;
  return "ABSENT";
}

function toAttendanceStatusLabel(status) {
  if (status === "PRESENT") return "Có mặt";
  if (status === "LATE") return "Đi trễ";
  if (status === "EXCUSED") return "Vắng phép";
  return "Vắng";
}

function mapQuizRow(row) {
  return {
    id: row.id,
    batchId: row.batchId,
    batchCode: row.batchCode ?? "",
    lessonId: row.lessonId ?? null,
    lessonTitle: row.lessonTitle ?? "",
    title: row.title,
    description: row.description ?? "",
    durationMinutes: Number(row.durationMinutes ?? 0),
    duration: formatDuration(row.durationMinutes),
    maxScore: row.maxScore != null ? String(Number(row.maxScore)) : "10",
    passScore: row.passScore != null ? String(Number(row.passScore)) : "5",
    attemptLimit: Number(row.attemptLimit ?? 1),
    questions: Number(row.questions ?? 0),
    attempts: Number(row.attempts ?? 0),
    createdAt: row.createdAt,
    questionItems: [],
  };
}

function mapQuestionRow(row, options = []) {
  return {
    id: row.id,
    quizId: row.quizId,
    text: row.text,
    type: row.type,
    score: row.score != null ? String(Number(row.score)) : "1",
    options,
  };
}

function mapQuizAttemptRow(row, answers = []) {
  const submittedAt = row.submittedAt ? new Date(row.submittedAt) : null;
  const startedAt = row.startedAt ? new Date(row.startedAt) : null;

  return {
    id: row.id,
    quizId: row.quizId,
    studentId: row.studentId,
    studentName: row.studentName ?? "Hoc vien",
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    startedLabel: startedAt ? startedAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "",
    submittedLabel: submittedAt ? submittedAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "Chua nop",
    score: row.score == null ? "" : String(Number(row.score)),
    status: row.status ?? "IN_PROGRESS",
    answers,
  };
}

async function getInstructorProfile(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.avatar_url AS avatar,
        tp.specialization,
        tp.workplace
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
      WHERE u.user_id = ? AND u.role = 'TEACHER'
      LIMIT 1
    `,
    [teacherId],
  );

  return rows[0] ?? null;
}

async function getSummaryStats(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) AS published_courses,
        SUM(CASE WHEN c.status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_lessons,
        COUNT(DISTINCT b.batch_id) AS open_batches,
        SUM(CASE WHEN c.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_courses
      FROM courses c
      LEFT JOIN course_batches b ON b.course_id = c.course_id AND b.teacher_id = c.teacher_id
      WHERE c.teacher_id = ? AND c.status <> 'HIDDEN'
    `,
    [teacherId],
  );

  const stats = rows[0] ?? {};

  return [
    {
      label: "Khóa học đã xuất bản",
      value: String(Number(stats.published_courses ?? 0)),
      icon: "verified",
      tone: "blue",
    },
    {
      label: "Bài học nháp",
      value: String(Number(stats.draft_lessons ?? 0)),
      icon: "edit_note",
      tone: "slate",
    },
    {
      label: "Lớp đang mở",
      value: String(Number(stats.open_batches ?? 0)),
      icon: "event_available",
      tone: "green",
    },
    {
      label: "Chờ duyệt",
      value: String(Number(stats.pending_courses ?? 0)),
      icon: "hourglass_top",
      tone: "amber",
    },
  ];
}

async function getInstructorCourses(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        c.course_id AS id,
        c.course_name AS title,
        c.description,
        c.thumbnail_url AS thumbnail,
        c.level,
        c.status,
        COALESCE(cat.category_name, 'Chưa phân loại') AS category,
        COUNT(DISTINCT b.batch_id) AS batches_count,
        COUNT(DISTINCT m.module_id) AS modules_count,
        COUNT(DISTINCT l.lesson_id) AS lessons_count,
        COUNT(DISTINCT e.student_id) AS students_count,
        COALESCE(AVG(e.progress_percent), 0) AS completion
      FROM courses c
      LEFT JOIN course_categories cat ON cat.category_id = c.category_id
      LEFT JOIN course_batches b ON b.course_id = c.course_id
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
      LEFT JOIN course_modules m ON m.course_id = c.course_id
      LEFT JOIN lessons l ON l.module_id = m.module_id
      WHERE c.teacher_id = ? AND c.status <> 'HIDDEN'
      GROUP BY c.course_id, c.course_name, c.description, c.thumbnail_url, c.level, c.status, cat.category_name
      ORDER BY c.created_at DESC, c.course_id DESC
    `,
    [teacherId],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    level: toCourseLevelLabel(row.level),
    status: toCourseStatusLabel(row.status),
    statusTone: toCourseStatusTone(row.status),
    workflowStatus: row.status,
    students: Number(row.students_count ?? 0),
    modules: Number(row.modules_count ?? 0),
    lessons: Number(row.lessons_count ?? 0),
    completion: Number(Number(row.completion ?? 0).toFixed(0)),
    thumbnail: row.thumbnail,
  }));
}

async function getInstructorBatches(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        b.batch_id AS id,
        b.batch_code AS code,
        c.course_name AS course,
        b.batch_name AS name,
        b.start_date,
        b.end_date,
        b.enrollment_start_date,
        b.enrollment_deadline,
        b.min_students,
        b.learning_mode,
        b.online_platform,
        b.default_meeting_url,
        b.classroom_name,
        b.classroom_address,
        b.tuition_fee,
        b.status,
        b.max_students,
        b.note,
        COUNT(DISTINCT e.student_id) AS enrolled_students
      FROM course_batches b
      INNER JOIN courses c ON c.course_id = b.course_id
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
      WHERE b.teacher_id = ? AND c.status <> 'HIDDEN'
      GROUP BY b.batch_id, b.batch_code, c.course_name, b.batch_name, b.start_date, b.end_date, b.enrollment_start_date, b.enrollment_deadline, b.min_students, b.learning_mode, b.online_platform, b.default_meeting_url, b.classroom_name, b.classroom_address, b.tuition_fee, b.status, b.max_students, b.note
      ORDER BY b.start_date DESC, b.batch_id DESC
    `,
    [teacherId],
  );

  return rows.map((row) => ({
    ...mapBatchRow(row),
    course: row.course,
  }));
}

async function getLessonPlanner(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        m.module_id AS id,
        m.module_title AS title,
        c.course_name AS course,
        COUNT(l.lesson_id) AS lessons_count,
        COALESCE(SUM(l.duration_minutes), 0) AS total_minutes,
        c.status
      FROM course_modules m
      INNER JOIN courses c ON c.course_id = m.course_id
      LEFT JOIN lessons l ON l.module_id = m.module_id
      WHERE c.teacher_id = ? AND c.status <> 'HIDDEN'
      GROUP BY m.module_id, m.module_title, c.course_name, c.status
      ORDER BY m.order_no ASC, m.module_id ASC
      LIMIT 3
    `,
    [teacherId],
  );

  return rows.map((row, index) => ({
    id: row.id,
    module: `Chuong 0${index + 1}`,
    title: row.title,
    lessons: Number(row.lessons_count ?? 0),
    duration: formatDuration(row.total_minutes),
    state: toCourseStatusLabel(row.status),
  }));
}

async function getCourseCategories() {
  const [rows] = await db.query(
    `
      SELECT
        category_id AS id,
        category_name AS label
      FROM course_categories
      WHERE status = 'ACTIVE'
      ORDER BY category_name ASC, category_id ASC
    `,
  );

  return rows.map((category) => ({
    id: category.id,
    key: String(category.id),
    label: category.label,
    active: false,
  }));
}

export async function getInstructorCoursesPageData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getInstructorProfile(teacherId);

  if (!profile) {
    return null;
  }

  const [summary, instructorCourses, courseBatches, lessonPlanner, categories] = await Promise.all([
    getSummaryStats(teacherId),
    getInstructorCourses(teacherId),
    getInstructorBatches(teacherId),
    getLessonPlanner(teacherId),
    getCourseCategories(),
  ]);

  return {
    teacherId,
    profile: {
      name: profile.name,
      role: profile.specialization ?? "Giang vien",
      avatar: profile.avatar,
      workplace: profile.workplace,
    },
    summary,
    categories,
    instructorCourses,
    courseBatches,
    lessonPlanner,
    generatedAt: new Date().toISOString(),
  };
}

export async function getInstructorCourseDetail(rawTeacherId, rawCourseId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    return null;
  }

  const [
    courseResult,
    contentResult,
    learnerResult,
    revenueResult,
    batchesResult,
    sessionsResult,
    modulesResult,
    lessonsResult,
    quizzesResult,
    quizQuestionsResult,
    quizOptionsResult,
    quizAttemptsResult,
    quizAnswersResult,
    reviewsResult,
  ] = await Promise.all([
    db.query(
      `
        SELECT
          c.course_id AS id,
          c.course_name AS title,
          c.description,
          c.thumbnail_url AS thumbnail,
          c.level,
          c.status,
          c.category_id AS categoryId,
          c.price,
          c.created_at,
          c.updated_at,
          COALESCE(cat.category_name, 'Chưa phân loại') AS category
        FROM courses c
        LEFT JOIN course_categories cat ON cat.category_id = c.category_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        LIMIT 1
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          COUNT(DISTINCT m.module_id) AS modules_count,
          COUNT(DISTINCT l.lesson_id) AS lessons_count,
          COALESCE(SUM(l.duration_minutes), 0) AS total_minutes
        FROM courses c
        LEFT JOIN course_modules m ON m.course_id = c.course_id
        LEFT JOIN lessons l ON l.module_id = m.module_id
        WHERE c.teacher_id = ? AND c.course_id = ?
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          COUNT(DISTINCT e.student_id) AS students_count,
          COALESCE(AVG(e.progress_percent), 0) AS completion
        FROM course_batches b
        LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
        WHERE b.teacher_id = ? AND b.course_id = ?
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          (SELECT COUNT(*)
           FROM course_batches b
           WHERE b.teacher_id = ? AND b.course_id = ?) AS batches_count,
          (SELECT COALESCE(SUM(p.amount), 0)
           FROM payments p
           INNER JOIN course_batches b ON b.batch_id = p.batch_id
           WHERE b.teacher_id = ? AND b.course_id = ? AND p.payment_status = 'SUCCESS') AS revenue,
          (SELECT COALESCE(AVG(r.rating), 0)
           FROM course_reviews r
           INNER JOIN courses c ON c.course_id = r.course_id
           WHERE c.teacher_id = ? AND c.course_id = ?) AS rating
      `,
      [teacherId, courseId, teacherId, courseId, teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          b.batch_id AS id,
          b.batch_code AS code,
          b.batch_name AS name,
          b.start_date,
          b.end_date,
          b.enrollment_start_date,
          b.enrollment_deadline,
          b.min_students,
          b.learning_mode,
          b.online_platform,
          b.default_meeting_url,
          b.classroom_name,
          b.classroom_address,
          b.tuition_fee,
          b.status,
          b.max_students,
          b.note,
          COUNT(DISTINCT e.student_id) AS enrolled_students
        FROM course_batches b
        LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
        WHERE b.teacher_id = ? AND b.course_id = ?
        GROUP BY b.batch_id, b.batch_code, b.batch_name, b.start_date, b.end_date, b.enrollment_start_date, b.enrollment_deadline, b.min_students, b.learning_mode, b.online_platform, b.default_meeting_url, b.classroom_name, b.classroom_address, b.tuition_fee, b.status, b.max_students, b.note
        ORDER BY b.start_date DESC, b.batch_id DESC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          s.session_id AS id,
          s.batch_id AS batchId,
          s.session_title AS title,
          s.session_description AS description,
          s.start_time,
          s.end_time,
          s.meeting_url AS meetingUrl,
          s.meeting_password AS meetingPassword,
          s.platform,
          s.status,
          s.recording_url AS recordingUrl,
          s.note
        FROM class_sessions s
        INNER JOIN course_batches b ON b.batch_id = s.batch_id
        WHERE b.teacher_id = ? AND b.course_id = ?
        ORDER BY s.start_time ASC, s.session_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          m.module_id AS id,
          m.module_title AS title,
          m.description,
          m.order_no
        FROM course_modules m
        INNER JOIN courses c ON c.course_id = m.course_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY m.order_no ASC, m.module_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          l.lesson_id AS id,
          l.module_id AS moduleId,
          l.lesson_title AS title,
          l.lesson_type AS type,
          l.content,
          l.video_url AS videoUrl,
          l.duration_minutes,
          l.is_preview,
          l.order_no
        FROM lessons l
        INNER JOIN course_modules m ON m.module_id = l.module_id
        INNER JOIN courses c ON c.course_id = m.course_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY m.order_no ASC, l.order_no ASC, l.lesson_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          q.quiz_id AS id,
          q.batch_id AS batchId,
          b.batch_code AS batchCode,
          q.lesson_id AS lessonId,
          l.lesson_title AS lessonTitle,
          q.title,
          q.description,
          q.duration_minutes AS durationMinutes,
          q.max_score AS maxScore,
          q.pass_score AS passScore,
          q.attempt_limit AS attemptLimit,
          q.created_at AS createdAt,
          COUNT(DISTINCT qu.question_id) AS questions,
          COUNT(DISTINCT qa.attempt_id) AS attempts
        FROM quizzes q
        INNER JOIN course_batches b ON b.batch_id = q.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
        LEFT JOIN questions qu ON qu.quiz_id = q.quiz_id
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.quiz_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        GROUP BY q.quiz_id, q.batch_id, b.batch_code, q.lesson_id, l.lesson_title, q.title, q.description,
                 q.duration_minutes, q.max_score, q.pass_score,
                 q.attempt_limit, q.created_at
        ORDER BY q.created_at DESC, q.quiz_id DESC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          q.question_id AS id,
          q.quiz_id AS quizId,
          q.question_text AS text,
          q.question_type AS type,
          q.score
        FROM questions q
        INNER JOIN quizzes qu ON qu.quiz_id = q.quiz_id
        INNER JOIN course_batches b ON b.batch_id = qu.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY q.question_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          o.option_id AS id,
          o.question_id AS questionId,
          o.option_text AS text,
          o.is_correct AS isCorrect
        FROM answer_options o
        INNER JOIN questions q ON q.question_id = o.question_id
        INNER JOIN quizzes qu ON qu.quiz_id = q.quiz_id
        INNER JOIN course_batches b ON b.batch_id = qu.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY o.option_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          qa.attempt_id AS id,
          qa.quiz_id AS quizId,
          qa.student_id AS studentId,
          u.full_name AS studentName,
          qa.started_at AS startedAt,
          qa.submitted_at AS submittedAt,
          qa.score,
          qa.status
        FROM quiz_attempts qa
        INNER JOIN quizzes q ON q.quiz_id = qa.quiz_id
        INNER JOIN course_batches b ON b.batch_id = q.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        INNER JOIN users u ON u.user_id = qa.student_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY qa.submitted_at DESC, qa.started_at DESC, qa.attempt_id DESC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          a.answer_id AS id,
          a.attempt_id AS attemptId,
          a.question_id AS questionId,
          q.question_text AS questionText,
          q.question_type AS questionType,
          a.option_id AS optionId,
          o.option_text AS optionText,
          o.is_correct AS isCorrect,
          a.essay_answer AS essayAnswer
        FROM quiz_answers a
        INNER JOIN questions q ON q.question_id = a.question_id
        INNER JOIN quizzes qu ON qu.quiz_id = q.quiz_id
        INNER JOIN course_batches b ON b.batch_id = qu.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        LEFT JOIN answer_options o ON o.option_id = a.option_id
        WHERE c.teacher_id = ? AND c.course_id = ?
        ORDER BY a.answer_id ASC
      `,
      [teacherId, courseId],
    ),
    db.query(
      `
        SELECT
          r.review_id AS id,
          u.full_name AS student,
          r.rating,
          r.comment,
          r.teacher_comment AS teacherComment,
          r.created_at
        FROM course_reviews r
        INNER JOIN users u ON u.user_id = r.student_id
        INNER JOIN courses c ON c.course_id = r.course_id
        WHERE c.teacher_id = ? AND c.course_id = ?
          AND r.status = 'VISIBLE'
        ORDER BY r.created_at DESC, r.review_id DESC
        LIMIT 3
      `,
      [teacherId, courseId],
    ),
  ]);

  const [courseRows] = courseResult;
  const [contentRows] = contentResult;
  const [learnerRows] = learnerResult;
  const [revenueRows] = revenueResult;
  const [batches] = batchesResult;
  const [sessions] = sessionsResult;
  const [modules] = modulesResult;
  const [lessons] = lessonsResult;
  const [quizzes] = quizzesResult;
  const [quizQuestions] = quizQuestionsResult;
  const [quizOptions] = quizOptionsResult;
  const [quizAttempts] = quizAttemptsResult;
  const [quizAnswers] = quizAnswersResult;
  const [reviews] = reviewsResult;
  const course = courseRows[0];

  if (!course) {
    return null;
  }

  const contentStats = contentRows[0] ?? {};
  const learnerStats = learnerRows[0] ?? {};
  const revenueStats = revenueRows[0] ?? {};

  const sessionsByBatchId = new Map();
  for (const session of sessions) {
    const batchSessions = sessionsByBatchId.get(session.batchId) ?? [];
    batchSessions.push(mapSessionRow(session));
    sessionsByBatchId.set(session.batchId, batchSessions);
  }

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    category: course.category,
    categoryId: Number(course.categoryId ?? 0),
    level: toCourseLevelLabel(course.level),
    status: toCourseStatusLabel(course.status),
    statusTone: toCourseStatusTone(course.status),
    workflowStatus: course.status,
    price: formatCurrency(course.price),
    createdAt: course.created_at,
    updatedAt: course.updated_at,
    overview: [
      { label: "Học viên", value: String(Number(learnerStats.students_count ?? 0)), icon: "groups" },
      { label: "Chương", value: String(Number(contentStats.modules_count ?? 0)), icon: "view_list" },
      { label: "Bài học", value: String(Number(contentStats.lessons_count ?? 0)), icon: "play_lesson" },
      {
        label: "Hoàn thành TB",
        value: `${Number(Number(learnerStats.completion ?? 0).toFixed(0))}%`,
        icon: "trending_up",
      },
      { label: "Lớp mở", value: String(Number(revenueStats.batches_count ?? 0)), icon: "event" },
      { label: "Doanh thu", value: formatCurrency(revenueStats.revenue), icon: "payments" },
    ],
    rating: Number(Number(revenueStats.rating ?? 0).toFixed(1)),
    duration: formatDuration(contentStats.total_minutes),
    batches: batches.map((batch) => ({
      ...mapBatchRow(batch),
      sessions: sessionsByBatchId.get(batch.id) ?? [],
    })),
    modules: modules.map((module) => ({
      id: module.id,
      order: module.order_no,
      title: module.title,
      description: module.description,
      lessons: lessons
        .filter((lesson) => lesson.moduleId === module.id)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
          durationMinutes: Number(lesson.duration_minutes ?? 0),
          duration: formatDuration(lesson.duration_minutes),
          isPreview: Boolean(lesson.is_preview),
        })),
    })),
    reviews: reviews.map((review) => ({
      id: review.review_id ?? review.id,
      student: review.student,
      rating: Number(review.rating ?? 0),
      comment: review.comment,
      teacherComment: review.teacherComment ?? null,
      createdAt: review.created_at,
    })),
    quizzes: quizzes.map((quiz) => {
      const questionItems = quizQuestions
        .filter((question) => question.quizId === quiz.id)
        .map((question) => {
          const options = quizOptions
            .filter((option) => option.questionId === question.id)
            .map((option) => ({
              id: option.id,
              text: option.text,
              isCorrect: Boolean(option.isCorrect),
            }));

          return mapQuestionRow(question, options);
        });
      const attemptItems = quizAttempts
        .filter((attempt) => attempt.quizId === quiz.id)
        .map((attempt) => {
          const answers = quizAnswers
            .filter((answer) => answer.attemptId === attempt.id)
            .map((answer) => ({
              id: answer.id,
              questionId: answer.questionId,
              questionText: answer.questionText,
              questionType: answer.questionType,
              optionId: answer.optionId,
              optionText: answer.optionText ?? "",
              isCorrect: answer.isCorrect == null ? null : Boolean(answer.isCorrect),
              essayAnswer: answer.essayAnswer ?? "",
            }));

          return mapQuizAttemptRow(attempt, answers);
        });
      return {
        ...mapQuizRow(quiz),
        questionItems,
        attemptItems,
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}

export async function createInstructorCourse(rawTeacherId, courseData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const { title, description, price, categoryId, level, thumbnailUrl } = courseData;

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  if (thumbnailUrl && String(thumbnailUrl).trim().length > 255) {
    throw new Error("Thumbnail URL must be 255 characters or fewer.");
  }

  try {
    let resolvedCategoryId = Number(categoryId);

    if (!Number.isFinite(resolvedCategoryId) || resolvedCategoryId <= 0) {
      const [categories] = await db.query(
        `
          SELECT category_id AS id
          FROM course_categories
          WHERE status = 'ACTIVE'
          ORDER BY category_id ASC
          LIMIT 1
        `,
      );

      resolvedCategoryId = Number(categories[0]?.id);
    }

    if (!Number.isFinite(resolvedCategoryId) || resolvedCategoryId <= 0) {
      throw new Error("A valid course category is required.");
    }

    const [result] = await db.query(
      `
        INSERT INTO courses (
          course_name,
          description,
          price,
          thumbnail_url,
          level,
          category_id,
          teacher_id,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW(), NOW())
      `,
      [
        title,
        description,
        Number(price ?? 0),
        thumbnailUrl ? String(thumbnailUrl).trim() : null,
        level || "BEGINNER",
        resolvedCategoryId,
        teacherId,
      ]
    );

    const courseId = result.insertId;

    // Fetch and return the created course
    const [createdCourse] = await db.query(
      `
        SELECT
          c.course_id AS id,
          c.course_name AS title,
          c.description,
          c.thumbnail_url AS thumbnail,
          c.level,
          c.status,
          c.category_id AS categoryId,
          COALESCE(cat.category_name, 'Chưa phân loại') AS category
        FROM courses c
        LEFT JOIN course_categories cat ON cat.category_id = c.category_id
        WHERE c.course_id = ?
      `,
      [courseId]
    );

    if (!createdCourse[0]) {
      throw new Error("Failed to retrieve created course.");
    }

    return {
      id: createdCourse[0].id,
      title: createdCourse[0].title,
      description: createdCourse[0].description,
      thumbnail: createdCourse[0].thumbnail,
      category: createdCourse[0].category,
      categoryId: Number(createdCourse[0].categoryId ?? 0),
      level: toCourseLevelLabel(createdCourse[0].level),
      status: toCourseStatusLabel(createdCourse[0].status),
      statusTone: toCourseStatusTone(createdCourse[0].status),
      workflowStatus: createdCourse[0].status,
      students: 0,
      modules: 0,
      lessons: 0,
      completion: 0,
    };
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
}

export async function updateInstructorCourse(rawTeacherId, rawCourseId, courseData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const title = String(courseData?.title ?? "").trim();
  const description = String(courseData?.description ?? "").trim();
  const price = Number(courseData?.price ?? 0);
  const level = String(courseData?.level ?? "BEGINNER").toUpperCase();
  const categoryId = Number(courseData?.categoryId);
  const thumbnailUrl = String(courseData?.thumbnailUrl ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  if (thumbnailUrl && thumbnailUrl.length > 255) {
    throw new Error("Thumbnail URL must be 255 characters or fewer.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  let resolvedCategoryId = categoryId;
  if (!Number.isFinite(resolvedCategoryId) || resolvedCategoryId <= 0) {
    const [categories] = await db.query(
      `
        SELECT category_id AS id
        FROM course_categories
        WHERE status = 'ACTIVE'
        ORDER BY category_id ASC
        LIMIT 1
      `,
    );
    resolvedCategoryId = Number(categories[0]?.id);
  }

  if (!Number.isFinite(resolvedCategoryId) || resolvedCategoryId <= 0) {
    throw new Error("A valid course category is required.");
  }

  await db.query(
    `
      UPDATE courses
      SET
        course_name = ?,
        description = ?,
        thumbnail_url = ?,
        price = ?,
        level = ?,
        category_id = ?,
        updated_at = NOW()
      WHERE course_id = ? AND teacher_id = ?
    `,
    [
      title,
      description,
      thumbnailUrl || null,
      Number.isFinite(price) ? price : 0,
      level,
      resolvedCategoryId,
      courseId,
      teacherId,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        c.course_id AS id,
        c.course_name AS title,
        c.description,
        c.thumbnail_url AS thumbnail,
        c.level,
        c.status,
        c.category_id AS categoryId,
        COALESCE(cat.category_name, 'Chưa phân loại') AS category
      FROM courses c
      LEFT JOIN course_categories cat ON cat.category_id = c.category_id
      WHERE c.course_id = ? AND c.teacher_id = ?
      LIMIT 1
    `,
    [courseId, teacherId],
  );

  const courseRow = rows[0];
  if (!courseRow) {
    throw new Error("Failed to retrieve updated course.");
  }

  return {
    id: courseRow.id,
    title: courseRow.title,
    description: courseRow.description,
    thumbnail: courseRow.thumbnail,
    category: courseRow.category,
    categoryId: Number(courseRow.categoryId ?? resolvedCategoryId),
    level: toCourseLevelLabel(courseRow.level),
    status: toCourseStatusLabel(courseRow.status),
    statusTone: toCourseStatusTone(courseRow.status),
    workflowStatus: courseRow.status,
  };
}

export async function updateInstructorCourseWorkflowStatus(rawTeacherId, rawCourseId, action) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const workflowAction = String(action ?? "").trim().toLowerCase();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  const [rows] = await db.query(
    `
      SELECT course_id AS id, status
      FROM courses
      WHERE teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [teacherId, courseId],
  );

  const course = rows[0];
  if (!course || course.status === "HIDDEN") {
    throw new Error("Course not found for this instructor.");
  }

  let nextStatus;
  if (workflowAction === "submit") {
    if (!["DRAFT", "REJECTED"].includes(course.status)) {
      throw new Error("Only draft or rejected courses can be submitted for review.");
    }

    nextStatus = "PENDING";
  } else if (workflowAction === "cancel") {
    if (course.status !== "PENDING") {
      throw new Error("Only pending courses can be cancelled.");
    }

    nextStatus = "DRAFT";
  } else {
    throw new Error("Invalid workflow action.");
  }

  await db.query(
    `
      UPDATE courses
      SET status = ?, updated_at = NOW()
      WHERE course_id = ? AND teacher_id = ?
    `,
    [nextStatus, courseId, teacherId],
  );

  return {
    id: courseId,
    status: toCourseStatusLabel(nextStatus),
    statusTone: toCourseStatusTone(nextStatus),
    workflowStatus: nextStatus,
  };
}

export async function deleteInstructorCourse(rawTeacherId, rawCourseId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  await db.query(
    `
      UPDATE courses
      SET status = 'HIDDEN', updated_at = NOW()
      WHERE course_id = ? AND teacher_id = ?
    `,
    [courseId, teacherId],
  );

  return { id: courseId };
}

async function assertInstructorCourseOwnership(teacherId, courseId) {
  const [rows] = await db.query(
    `
      SELECT course_id AS id
      FROM courses
      WHERE teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [teacherId, courseId],
  );

  return rows[0] ?? null;
}

export async function createInstructorModule(rawTeacherId, rawCourseId, moduleData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const title = String(moduleData?.title ?? "").trim();
  const description = String(moduleData?.description ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!title) {
    throw new Error("Module title is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [orderRows] = await db.query(
    `
      SELECT COALESCE(MAX(order_no), 0) AS max_order
      FROM course_modules
      WHERE course_id = ?
    `,
    [courseId],
  );

  const nextOrder = Number(orderRows[0]?.max_order ?? 0) + 1;

  const [result] = await db.query(
    `
      INSERT INTO course_modules (
        course_id,
        module_title,
        description,
        order_no
      ) VALUES (?, ?, ?, ?)
    `,
    [courseId, title, description || null, nextOrder],
  );

  return {
    id: result.insertId,
    courseId,
    title,
    description: description || null,
    order: nextOrder,
  };
}

export async function updateInstructorModule(rawTeacherId, rawCourseId, rawModuleId, moduleData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const moduleId = Number(rawModuleId);
  const title = String(moduleData?.title ?? "").trim();
  const description = String(moduleData?.description ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Invalid module id.");
  }

  if (!title) {
    throw new Error("Module title is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT m.module_id AS id, m.order_no
      FROM course_modules m
      WHERE m.module_id = ? AND m.course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  const existingModule = moduleRows[0];
  if (!existingModule) {
    throw new Error("Module not found for this course.");
  }

  await db.query(
    `
      UPDATE course_modules
      SET module_title = ?, description = ?
      WHERE module_id = ? AND course_id = ?
    `,
    [title, description || null, moduleId, courseId],
  );

  return {
    id: moduleId,
    courseId,
    title,
    description: description || null,
    order: Number(existingModule.order_no ?? 0),
  };
}

export async function reorderInstructorModules(rawTeacherId, rawCourseId, moduleIds) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const orderedIds = Array.isArray(moduleIds)
    ? moduleIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    : [];

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (orderedIds.length === 0) {
    throw new Error("At least one module id is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT module_id AS id
      FROM course_modules
      WHERE course_id = ?
    `,
    [courseId],
  );

  const validIds = new Set(moduleRows.map((row) => Number(row.id)));
  if (orderedIds.length !== validIds.size || orderedIds.some((id) => !validIds.has(id))) {
    throw new Error("Invalid module order.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const temporaryOffset = 10000;

    await Promise.all(
      orderedIds.map((moduleId, index) =>
        connection.query(
          `
            UPDATE course_modules
            SET order_no = ?
            WHERE module_id = ? AND course_id = ?
          `,
          [temporaryOffset + index + 1, moduleId, courseId],
        ),
      ),
    );

    await Promise.all(
      orderedIds.map((moduleId, index) =>
        connection.query(
          `
            UPDATE course_modules
            SET order_no = ?
            WHERE module_id = ? AND course_id = ?
          `,
          [index + 1, moduleId, courseId],
        ),
      ),
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { courseId, moduleIds: orderedIds };
}

export async function deleteInstructorModule(rawTeacherId, rawCourseId, rawModuleId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const moduleId = Number(rawModuleId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Invalid module id.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT m.module_id AS id
      FROM course_modules m
      WHERE m.module_id = ? AND m.course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  if (!moduleRows[0]) {
    throw new Error("Module not found for this course.");
  }

  await db.query(
    `
      DELETE FROM course_modules
      WHERE module_id = ? AND course_id = ?
    `,
    [moduleId, courseId],
  );

  return { id: moduleId, courseId };
}

export async function createInstructorLesson(rawTeacherId, rawCourseId, lessonData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const moduleId = Number(lessonData?.moduleId);
  const title = String(lessonData?.title ?? "").trim();
  const content = String(lessonData?.content ?? "").trim();
  const videoUrl = String(lessonData?.videoUrl ?? "").trim();
  const durationMinutes = Number(lessonData?.durationMinutes ?? 0);
  const lessonType = String(lessonData?.type ?? "VIDEO").toUpperCase();
  const isPreview = Boolean(lessonData?.isPreview);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Module is required.");
  }

  if (!title) {
    throw new Error("Lesson title is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT module_id AS id
      FROM course_modules
      WHERE module_id = ? AND course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  if (!moduleRows[0]) {
    throw new Error("Module not found for this course.");
  }

  const [orderRows] = await db.query(
    `
      SELECT COALESCE(MAX(order_no), 0) AS max_order
      FROM lessons
      WHERE module_id = ?
    `,
    [moduleId],
  );

  const nextOrder = Number(orderRows[0]?.max_order ?? 0) + 1;

  const [result] = await db.query(
    `
      INSERT INTO lessons (
        module_id,
        lesson_title,
        lesson_type,
        content,
        video_url,
        duration_minutes,
        is_preview,
        order_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      moduleId,
      title,
      lessonType,
      content || null,
      videoUrl || null,
      Number.isFinite(durationMinutes) ? durationMinutes : 0,
      isPreview ? 1 : 0,
      nextOrder,
    ],
  );

  return {
    id: result.insertId,
    courseId,
    moduleId,
    title,
    type: lessonType,
    content: content || null,
    videoUrl: videoUrl || null,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
    isPreview,
    order: nextOrder,
  };
}

export async function updateInstructorLesson(rawTeacherId, rawCourseId, rawLessonId, lessonData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const lessonId = Number(rawLessonId);
  const moduleId = Number(lessonData?.moduleId);
  const title = String(lessonData?.title ?? "").trim();
  const content = String(lessonData?.content ?? "").trim();
  const videoUrl = String(lessonData?.videoUrl ?? "").trim();
  const durationMinutes = Number(lessonData?.durationMinutes ?? 0);
  const lessonType = String(lessonData?.type ?? "VIDEO").toUpperCase();
  const isPreview = Boolean(lessonData?.isPreview);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    throw new Error("Invalid lesson id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Module is required.");
  }

  if (!title) {
    throw new Error("Lesson title is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [lessonRows] = await db.query(
    `
      SELECT l.lesson_id AS id, l.module_id AS current_module_id, l.order_no
      FROM lessons l
      INNER JOIN course_modules m ON m.module_id = l.module_id
      WHERE l.lesson_id = ? AND m.course_id = ?
      LIMIT 1
    `,
    [lessonId, courseId],
  );

  const existingLesson = lessonRows[0];
  if (!existingLesson) {
    throw new Error("Lesson not found for this course.");
  }

  const [targetModuleRows] = await db.query(
    `
      SELECT module_id AS id
      FROM course_modules
      WHERE module_id = ? AND course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  if (!targetModuleRows[0]) {
    throw new Error("Module not found for this course.");
  }

  const nextModuleId = moduleId;
  let nextOrderNo = Number(existingLesson.order_no ?? 1);

  if (nextModuleId !== Number(existingLesson.current_module_id ?? 0)) {
    const [orderRows] = await db.query(
      `
        SELECT COALESCE(MAX(order_no), 0) AS max_order
        FROM lessons
        WHERE module_id = ?
      `,
      [nextModuleId],
    );

    nextOrderNo = Number(orderRows[0]?.max_order ?? 0) + 1;
  }

  await db.query(
    `
      UPDATE lessons
      SET
        module_id = ?,
        lesson_title = ?,
        lesson_type = ?,
        content = ?,
        video_url = ?,
        duration_minutes = ?,
        is_preview = ?
      WHERE lesson_id = ?
    `,
    [
      nextModuleId,
      title,
      lessonType,
      content || null,
      videoUrl || null,
      Number.isFinite(durationMinutes) ? durationMinutes : 0,
      isPreview ? 1 : 0,
      lessonId,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        l.lesson_id AS id,
        l.module_id AS moduleId,
        l.lesson_title AS title,
        l.lesson_type AS type,
        l.duration_minutes,
        l.is_preview,
        l.order_no
      FROM lessons l
      INNER JOIN course_modules m ON m.module_id = l.module_id
      WHERE l.lesson_id = ? AND m.course_id = ?
      LIMIT 1
    `,
    [lessonId, courseId],
  );

  const updatedLesson = rows[0];
  if (!updatedLesson) {
    throw new Error("Lesson not found for this course.");
  }

  if (nextModuleId !== Number(existingLesson.current_module_id ?? 0) && nextOrderNo !== Number(existingLesson.order_no ?? 1)) {
    await db.query(
      `
        UPDATE lessons
        SET order_no = ?
        WHERE lesson_id = ?
      `,
      [nextOrderNo, lessonId],
    );
    updatedLesson.order_no = nextOrderNo;
  }

  return {
    id: updatedLesson.id,
    courseId,
    moduleId: updatedLesson.moduleId,
    title: updatedLesson.title,
    type: updatedLesson.type,
    content: content || null,
    videoUrl: videoUrl || null,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
    isPreview,
    order: Number(updatedLesson.order_no ?? nextOrderNo),
  };
}

export async function reorderInstructorLessons(rawTeacherId, rawCourseId, rawModuleId, lessonIds) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const moduleId = Number(rawModuleId);
  const orderedIds = Array.isArray(lessonIds)
    ? lessonIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    : [];

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Invalid module id.");
  }

  if (orderedIds.length === 0) {
    throw new Error("At least one lesson id is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT module_id AS id
      FROM course_modules
      WHERE module_id = ? AND course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  if (!moduleRows[0]) {
    throw new Error("Module not found for this course.");
  }

  const [lessonRows] = await db.query(
    `
      SELECT lesson_id AS id
      FROM lessons
      WHERE module_id = ?
    `,
    [moduleId],
  );

  const validIds = new Set(lessonRows.map((row) => Number(row.id)));
  if (orderedIds.length !== validIds.size || orderedIds.some((id) => !validIds.has(id))) {
    throw new Error("Invalid lesson order.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const temporaryOffset = 10000;

    await Promise.all(
      orderedIds.map((lessonId, index) =>
        connection.query(
          `
            UPDATE lessons
            SET order_no = ?
            WHERE lesson_id = ? AND module_id = ?
          `,
          [temporaryOffset + index + 1, lessonId, moduleId],
        ),
      ),
    );

    await Promise.all(
      orderedIds.map((lessonId, index) =>
        connection.query(
          `
            UPDATE lessons
            SET order_no = ?
            WHERE lesson_id = ? AND module_id = ?
          `,
          [index + 1, lessonId, moduleId],
        ),
      ),
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { courseId, moduleId, lessonIds: orderedIds };
}

function parseQuizPayload(quizData) {
  const normalizedBatchScope = String(quizData?.batchScope ?? "SINGLE").trim().toUpperCase();
  const batchScope = normalizedBatchScope === "ALL" ? "ALL" : "SINGLE";
  const batchId = quizData?.batchId == null || quizData?.batchId === "" ? null : Number(quizData?.batchId);
  const lessonId = quizData?.lessonId === "" || quizData?.lessonId == null ? null : Number(quizData?.lessonId);
  const title = String(quizData?.title ?? "").trim();
  const description = String(quizData?.description ?? "").trim();
  const durationMinutes = quizData?.durationMinutes === "" || quizData?.durationMinutes == null
    ? null
    : Number(quizData.durationMinutes);
  const maxScore = quizData?.maxScore === "" || quizData?.maxScore == null ? 10 : Number(quizData.maxScore);
  const passScore = quizData?.passScore === "" || quizData?.passScore == null ? 5 : Number(quizData.passScore);
  const attemptLimit = quizData?.attemptLimit === "" || quizData?.attemptLimit == null ? 1 : Number(quizData.attemptLimit);

  return { batchScope, batchId, lessonId, title, description, durationMinutes, maxScore, passScore, attemptLimit };
}

function parseQuestionPayload(questionData) {
  const options = Array.isArray(questionData?.options)
    ? questionData.options
        .map((option) => ({
          text: String(option?.text ?? option?.optionText ?? "").trim(),
          isCorrect: Boolean(option?.isCorrect ?? option?.correct ?? false),
        }))
        .filter((option) => option.text)
    : [];

  return {
    text: String(questionData?.text ?? questionData?.questionText ?? "").trim(),
    type: String(questionData?.type ?? questionData?.questionType ?? "SINGLE_CHOICE").trim().toUpperCase(),
    score: questionData?.score != null ? Number(questionData.score) : 1,
    options,
  };
}

async function assertQuizTarget(teacherId, courseId, batchId, lessonId) {
  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) throw new Error("Course not found for this instructor.");

  if (batchId != null) {
    const [batchRows] = await db.query(
      `
        SELECT
          batch_id AS id,
          start_date,
          end_date
        FROM course_batches
        WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
        LIMIT 1
      `,
      [batchId, teacherId, courseId],
    );

    if (!batchRows[0]) throw new Error("Batch not found for this course.");
  }

  if (lessonId != null) {
    const [lessonRows] = await db.query(
      `
        SELECT l.lesson_id AS id
        FROM lessons l
        INNER JOIN course_modules m ON m.module_id = l.module_id
        WHERE l.lesson_id = ? AND m.course_id = ?
        LIMIT 1
      `,
      [lessonId, courseId],
    );

    if (!lessonRows[0]) throw new Error("Lesson not found for this course.");
  }
}

async function getInstructorCourseBatches(teacherId, courseId) {
  const [rows] = await db.query(
    `
      SELECT
        batch_id AS id,
        batch_code AS batchCode
      FROM course_batches
      WHERE teacher_id = ? AND course_id = ?
      ORDER BY batch_id ASC
    `,
    [teacherId, courseId],
  );

  return rows;
}

async function getInstructorQuizById(teacherId, courseId, quizId) {
  const [rows] = await db.query(
    `
      SELECT
        q.quiz_id AS id,
        q.batch_id AS batchId,
        b.batch_code AS batchCode,
        q.lesson_id AS lessonId,
        l.lesson_title AS lessonTitle,
        q.title,
        q.description,
        q.duration_minutes AS durationMinutes,
        q.max_score AS maxScore,
        q.pass_score AS passScore,
        q.attempt_limit AS attemptLimit,
        q.created_at AS createdAt,
        COUNT(DISTINCT qu.question_id) AS questions,
        COUNT(DISTINCT qa.attempt_id) AS attempts
      FROM quizzes q
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      LEFT JOIN lessons l ON l.lesson_id = q.lesson_id
      LEFT JOIN questions qu ON qu.quiz_id = q.quiz_id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.quiz_id
      WHERE q.quiz_id = ? AND b.teacher_id = ? AND b.course_id = ?
      GROUP BY q.quiz_id, q.batch_id, b.batch_code, q.lesson_id, l.lesson_title, q.title, q.description, q.duration_minutes, q.max_score, q.pass_score, q.attempt_limit, q.created_at
      LIMIT 1
    `,
    [quizId, teacherId, courseId],
  );

  return rows[0] ? mapQuizRow(rows[0]) : null;
}

async function getInstructorQuestionById(teacherId, courseId, questionId) {
  const [rows] = await db.query(
    `
      SELECT
        q.question_id AS id,
        q.quiz_id AS quizId,
        q.question_text AS text,
        q.question_type AS type,
        q.score
      FROM questions q
      INNER JOIN quizzes qu ON qu.quiz_id = q.quiz_id
      INNER JOIN course_batches b ON b.batch_id = qu.batch_id
      WHERE q.question_id = ? AND b.teacher_id = ? AND b.course_id = ?
      LIMIT 1
    `,
    [questionId, teacherId, courseId],
  );

  if (!rows[0]) return null;

  const [optionRows] = await db.query(
    `
      SELECT
        option_id AS id,
        option_text AS text,
        is_correct AS isCorrect
      FROM answer_options
      WHERE question_id = ?
      ORDER BY option_id ASC
    `,
    [questionId],
  );

  return mapQuestionRow(
    rows[0],
    optionRows.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: Boolean(option.isCorrect),
    })),
  );
}

export async function createInstructorQuiz(rawTeacherId, rawCourseId, quizData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const payload = parseQuizPayload(quizData);
  const isAllBatches = payload.batchScope === "ALL";

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!isAllBatches && (!Number.isFinite(payload.batchId) || payload.batchId <= 0)) {
    throw new Error("Batch is required.");
  }
  if (!payload.title) throw new Error("Quiz title is required.");
  if (payload.durationMinutes != null && (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0)) {
    throw new Error("Duration must be greater than zero.");
  }
  if (!Number.isFinite(payload.maxScore) || payload.maxScore <= 0) throw new Error("Max score must be greater than zero.");
  if (!Number.isFinite(payload.passScore) || payload.passScore < 0 || payload.passScore > payload.maxScore) {
    throw new Error("Pass score must be between zero and max score.");
  }
  if (!Number.isFinite(payload.attemptLimit) || payload.attemptLimit <= 0) throw new Error("Attempt limit must be greater than zero.");

  await assertQuizTarget(teacherId, courseId, payload.batchId, payload.lessonId);

  const targetBatches = isAllBatches
    ? await getInstructorCourseBatches(teacherId, courseId)
    : [{ id: payload.batchId }];

  if (targetBatches.length === 0) {
    throw new Error("No classes found for this course.");
  }

  const createdQuizIds = [];
  for (const batch of targetBatches) {
    const [result] = await db.query(
      `
        INSERT INTO quizzes (
          batch_id,
          lesson_id,
          title,
          description,
          duration_minutes,
          max_score,
          pass_score,
          attempt_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        batch.id,
        payload.lessonId,
        payload.title,
        payload.description || null,
        payload.durationMinutes,
        payload.maxScore,
        payload.passScore,
        payload.attemptLimit,
      ],
    );
    createdQuizIds.push(result.insertId);
  }

  if (createdQuizIds.length === 1) {
    return getInstructorQuizById(teacherId, courseId, createdQuizIds[0]);
  }

  return {
    createdCount: createdQuizIds.length,
    quizIds: createdQuizIds,
    batchIds: targetBatches.map((batch) => batch.id),
  };
}

export async function updateInstructorQuiz(rawTeacherId, rawCourseId, rawQuizId, quizData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);
  const payload = parseQuizPayload(quizData);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");
  if (!Number.isFinite(payload.batchId) || payload.batchId <= 0) throw new Error("Batch is required.");
  if (!payload.title) throw new Error("Quiz title is required.");
  if (payload.durationMinutes != null && (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0)) {
    throw new Error("Duration must be greater than zero.");
  }
  if (!Number.isFinite(payload.maxScore) || payload.maxScore <= 0) throw new Error("Max score must be greater than zero.");
  if (!Number.isFinite(payload.passScore) || payload.passScore < 0 || payload.passScore > payload.maxScore) {
    throw new Error("Pass score must be between zero and max score.");
  }
  if (!Number.isFinite(payload.attemptLimit) || payload.attemptLimit <= 0) throw new Error("Attempt limit must be greater than zero.");

  const existingQuiz = await getInstructorQuizById(teacherId, courseId, quizId);
  if (!existingQuiz) throw new Error("Quiz not found for this course.");

  await assertQuizTarget(teacherId, courseId, payload.batchId, payload.lessonId);

  await db.query(
    `
      UPDATE quizzes
      SET
        batch_id = ?,
        lesson_id = ?,
        title = ?,
        description = ?,
        duration_minutes = ?,
        max_score = ?,
        pass_score = ?,
        attempt_limit = ?
      WHERE quiz_id = ?
    `,
    [
      payload.batchId,
      payload.lessonId,
      payload.title,
      payload.description || null,
      payload.durationMinutes,
      payload.maxScore,
      payload.passScore,
      payload.attemptLimit,
      quizId,
    ],
  );

  return getInstructorQuizById(teacherId, courseId, quizId);
}

export async function deleteInstructorQuiz(rawTeacherId, rawCourseId, rawQuizId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");

  const existingQuiz = await getInstructorQuizById(teacherId, courseId, quizId);
  if (!existingQuiz) throw new Error("Quiz not found for this course.");

  await db.query(
    `
      DELETE q
      FROM quizzes q
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      WHERE q.quiz_id = ? AND b.teacher_id = ? AND b.course_id = ?
    `,
    [quizId, teacherId, courseId],
  );

  return { id: quizId, courseId };
}

export async function createInstructorQuestion(rawTeacherId, rawCourseId, rawQuizId, questionData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);
  const payload = parseQuestionPayload(questionData);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");
  if (!payload.text) throw new Error("Question text is required.");
  if (!Number.isFinite(payload.score) || payload.score <= 0) throw new Error("Question score must be greater than zero.");
  if (!["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "ESSAY"].includes(payload.type)) {
    throw new Error("Invalid question type.");
  }
  if (payload.type !== "ESSAY" && payload.options.length === 0) {
    throw new Error("At least one answer option is required.");
  }
  if (payload.type === "SINGLE_CHOICE" && payload.options.filter((option) => option.isCorrect).length !== 1) {
    throw new Error("Single choice question must have exactly one correct option.");
  }
  if (payload.type === "TRUE_FALSE" && payload.options.filter((option) => option.isCorrect).length !== 1) {
    throw new Error("True/false question must have exactly one correct option.");
  }
  if (payload.type === "MULTIPLE_CHOICE" && payload.options.filter((option) => option.isCorrect).length === 0) {
    throw new Error("Multiple choice question must have at least one correct option.");
  }

  const quiz = await getInstructorQuizById(teacherId, courseId, quizId);
  if (!quiz) throw new Error("Quiz not found for this course.");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `
        INSERT INTO questions (quiz_id, question_text, question_type, score)
        VALUES (?, ?, ?, ?)
      `,
      [quizId, payload.text, payload.type, payload.score],
    );

    const questionId = result.insertId;
    if (payload.type !== "ESSAY") {
      for (const option of payload.options) {
        await connection.query(
          `
            INSERT INTO answer_options (question_id, option_text, is_correct)
            VALUES (?, ?, ?)
          `,
          [questionId, option.text, option.isCorrect ? 1 : 0],
        );
      }
    }

    await connection.commit();
    return getInstructorQuestionById(teacherId, courseId, questionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateInstructorQuestion(rawTeacherId, rawCourseId, rawQuizId, rawQuestionId, questionData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);
  const questionId = Number(rawQuestionId);
  const payload = parseQuestionPayload(questionData);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");
  if (!Number.isFinite(questionId) || questionId <= 0) throw new Error("Invalid question id.");
  if (!payload.text) throw new Error("Question text is required.");
  if (!Number.isFinite(payload.score) || payload.score <= 0) throw new Error("Question score must be greater than zero.");
  if (!["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "ESSAY"].includes(payload.type)) {
    throw new Error("Invalid question type.");
  }
  if (payload.type !== "ESSAY" && payload.options.length === 0) {
    throw new Error("At least one answer option is required.");
  }
  if (payload.type === "SINGLE_CHOICE" && payload.options.filter((option) => option.isCorrect).length !== 1) {
    throw new Error("Single choice question must have exactly one correct option.");
  }
  if (payload.type === "TRUE_FALSE" && payload.options.filter((option) => option.isCorrect).length !== 1) {
    throw new Error("True/false question must have exactly one correct option.");
  }
  if (payload.type === "MULTIPLE_CHOICE" && payload.options.filter((option) => option.isCorrect).length === 0) {
    throw new Error("Multiple choice question must have at least one correct option.");
  }

  const quiz = await getInstructorQuizById(teacherId, courseId, quizId);
  if (!quiz) throw new Error("Quiz not found for this course.");

  const currentQuestion = await getInstructorQuestionById(teacherId, courseId, questionId);
  if (!currentQuestion || currentQuestion.quizId !== quizId) throw new Error("Question not found for this quiz.");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `
        UPDATE questions
        SET question_text = ?, question_type = ?, score = ?
        WHERE question_id = ?
      `,
      [payload.text, payload.type, payload.score, questionId],
    );

    await connection.query(`DELETE FROM answer_options WHERE question_id = ?`, [questionId]);

    if (payload.type !== "ESSAY") {
      for (const option of payload.options) {
        await connection.query(
          `
            INSERT INTO answer_options (question_id, option_text, is_correct)
            VALUES (?, ?, ?)
          `,
          [questionId, option.text, option.isCorrect ? 1 : 0],
        );
      }
    }

    await connection.commit();
    return getInstructorQuestionById(teacherId, courseId, questionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteInstructorQuestion(rawTeacherId, rawCourseId, rawQuizId, rawQuestionId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);
  const questionId = Number(rawQuestionId);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");
  if (!Number.isFinite(questionId) || questionId <= 0) throw new Error("Invalid question id.");

  const currentQuestion = await getInstructorQuestionById(teacherId, courseId, questionId);
  if (!currentQuestion || currentQuestion.quizId !== quizId) throw new Error("Question not found for this quiz.");

  await db.query(`DELETE FROM questions WHERE question_id = ?`, [questionId]);
  return { id: questionId, quizId };
}

export async function gradeInstructorQuizAttempt(rawTeacherId, rawCourseId, rawQuizId, rawAttemptId, gradeData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const quizId = Number(rawQuizId);
  const attemptId = Number(rawAttemptId);
  const score = Number(gradeData?.score);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(quizId) || quizId <= 0) throw new Error("Invalid quiz id.");
  if (!Number.isFinite(attemptId) || attemptId <= 0) throw new Error("Invalid attempt id.");
  if (!Number.isFinite(score) || score < 0) throw new Error("Score must be zero or greater.");

  const [attemptRows] = await db.query(
    `
      SELECT
        qa.attempt_id AS id,
        q.max_score AS maxScore
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON q.quiz_id = qa.quiz_id
      INNER JOIN course_batches b ON b.batch_id = q.batch_id
      WHERE qa.attempt_id = ? AND qa.quiz_id = ? AND b.teacher_id = ? AND b.course_id = ?
      LIMIT 1
    `,
    [attemptId, quizId, teacherId, courseId],
  );

  const attempt = attemptRows[0];
  if (!attempt) throw new Error("Attempt not found for this quiz.");
  if (score > Number(attempt.maxScore ?? 0)) throw new Error("Score cannot be greater than max score.");

  await db.query(
    `
      UPDATE quiz_attempts
      SET score = ?, status = 'GRADED', submitted_at = COALESCE(submitted_at, NOW())
      WHERE attempt_id = ?
    `,
    [score, attemptId],
  );

  return { id: attemptId, quizId, score: String(score), status: "GRADED" };
}

export async function respondInstructorCourseReview(rawTeacherId, rawCourseId, rawReviewId, reviewData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const reviewId = Number(rawReviewId);
  const teacherComment = String(reviewData?.teacherComment ?? reviewData?.comment ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(reviewId) || reviewId <= 0) throw new Error("Invalid review id.");
  if (!teacherComment) throw new Error("Teacher comment is required.");

  const [reviewRows] = await db.query(
    `
      SELECT r.review_id AS id, r.student_id
      FROM course_reviews r
      INNER JOIN courses c ON c.course_id = r.course_id
      WHERE r.review_id = ? AND r.course_id = ? AND c.teacher_id = ?
      LIMIT 1
    `,
    [reviewId, courseId, teacherId],
  );

  if (!reviewRows[0]) throw new Error("Review not found for this course.");

  await db.query(
    `
      UPDATE course_reviews
      SET teacher_comment = ?
      WHERE review_id = ?
    `,
    [teacherComment, reviewId],
  );

  await createNotification({
    userId: Number(reviewRows[0].student_id),
    type: "COURSE_REVIEW_RESPONDED",
    title: "Giảng viên đã phản hồi đánh giá",
    content: teacherComment,
    referenceType: "COURSE_REVIEW",
    referenceId: reviewId,
    targetUrl: `/student?view=courseDetail&courseId=${courseId}&reviewId=${reviewId}`,
    priority: "NORMAL",
  }).catch((error) => {
    console.error("Failed to notify student about review response.", error);
  });

  return { id: reviewId, teacherComment };
}

export async function bulkImportInstructorLessons(rawTeacherId, rawCourseId, rawModuleId, lessonItems) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const moduleId = Number(rawModuleId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(moduleId) || moduleId <= 0) {
    throw new Error("Module is required.");
  }

  const lessons = Array.isArray(lessonItems) ? lessonItems : [];
  if (lessons.length === 0) {
    throw new Error("At least one lesson is required.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [moduleRows] = await db.query(
    `
      SELECT module_id AS id
      FROM course_modules
      WHERE module_id = ? AND course_id = ?
      LIMIT 1
    `,
    [moduleId, courseId],
  );

  if (!moduleRows[0]) {
    throw new Error("Module not found for this course.");
  }

  const [orderRows] = await db.query(
    `
      SELECT COALESCE(MAX(order_no), 0) AS max_order
      FROM lessons
      WHERE module_id = ?
    `,
    [moduleId],
  );

  let nextOrder = Number(orderRows[0]?.max_order ?? 0) + 1;
  const createdLessons = [];

  for (const lessonItem of lessons) {
    const title = String(lessonItem?.title ?? "").trim();
    const lessonType = String(lessonItem?.type ?? "VIDEO").toUpperCase();
    const content = String(lessonItem?.content ?? "").trim();
    const videoUrl = String(lessonItem?.videoUrl ?? "").trim();
    const durationMinutes = Number(lessonItem?.durationMinutes ?? 0);
    const isPreview = Boolean(lessonItem?.isPreview);

    if (!title) {
      throw new Error("Lesson title is required.");
    }

    const [result] = await db.query(
      `
        INSERT INTO lessons (
          module_id,
          lesson_title,
          lesson_type,
          content,
          video_url,
          duration_minutes,
          is_preview,
          order_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        moduleId,
        title,
        lessonType,
        content || null,
        videoUrl || null,
        Number.isFinite(durationMinutes) ? durationMinutes : 0,
        isPreview ? 1 : 0,
        nextOrder,
      ],
    );

    createdLessons.push({
      id: result.insertId,
      courseId,
      moduleId,
      title,
      type: lessonType,
      content: content || null,
      videoUrl: videoUrl || null,
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
      isPreview,
      order: nextOrder,
    });
    nextOrder += 1;
  }

  return {
    courseId,
    moduleId,
    importedCount: createdLessons.length,
    lessons: createdLessons,
  };
}

export async function createInstructorBatch(rawTeacherId, rawCourseId, batchData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchCode = String(batchData?.batchCode ?? "").trim();
  const batchName = String(batchData?.batchName ?? "").trim();
  const startDate = String(batchData?.startDate ?? "").trim();
  const endDate = String(batchData?.endDate ?? "").trim();
  const enrollmentStartDate = String(batchData?.enrollmentStartDate ?? "").trim();
  const enrollmentDeadline = String(batchData?.enrollmentDeadline ?? "").trim();
  const minStudents = Number(batchData?.minStudents ?? 1);
  const maxStudents = Number(batchData?.maxStudents ?? 50);
  const tuitionFee = batchData?.tuitionFee === "" || batchData?.tuitionFee == null
    ? null
    : Number(batchData?.tuitionFee);
  const learningMode = String(batchData?.learningMode ?? "ONLINE").toUpperCase();
  const onlinePlatform = String(batchData?.onlinePlatform ?? "ZOOM").toUpperCase();
  const defaultMeetingUrl = String(batchData?.defaultMeetingUrl ?? "").trim();
  const classroomName = String(batchData?.classroomName ?? "").trim();
  const classroomAddress = String(batchData?.classroomAddress ?? "").trim();
  const timezone = String(batchData?.timezone ?? "Asia/Ho_Chi_Minh").trim() || "Asia/Ho_Chi_Minh";
  const status = String(batchData?.status ?? "DRAFT").toUpperCase();
  const note = String(batchData?.note ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!batchName) {
    throw new Error("Batch name is required.");
  }

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required.");
  }

  assertBatchDateOrder({
    startDate,
    endDate,
    enrollmentStartDate,
    enrollmentDeadline,
  });

  if (!Number.isFinite(minStudents) || minStudents <= 0) {
    throw new Error("Min students must be greater than zero.");
  }

  if (!Number.isFinite(maxStudents) || maxStudents < minStudents) {
    throw new Error("Max students must be greater than or equal to min students.");
  }

  if (tuitionFee != null && (!Number.isFinite(tuitionFee) || tuitionFee < 0)) {
    throw new Error("Tuition fee must be zero or greater.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const resolvedBatchCode =
    batchCode ||
    `BATCH-${String(courseId).padStart(3, "0")}-${Date.now().toString().slice(-4)}`;

  const [result] = await db.query(
    `
      INSERT INTO course_batches (
        course_id,
        teacher_id,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      courseId,
      teacherId,
      resolvedBatchCode,
      batchName,
      startDate,
      endDate,
      enrollmentStartDate || null,
      enrollmentDeadline || null,
      minStudents,
      maxStudents,
      tuitionFee,
      learningMode,
      onlinePlatform,
      defaultMeetingUrl || null,
      classroomName || null,
      classroomAddress || null,
      timezone,
      status,
      note || null,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        b.batch_id AS id,
        b.batch_code AS code,
        b.batch_name AS name,
        b.start_date,
        b.end_date,
        b.enrollment_start_date,
        b.enrollment_deadline,
        b.min_students,
        b.learning_mode,
        b.online_platform,
        b.default_meeting_url,
        b.classroom_name,
        b.classroom_address,
        b.tuition_fee,
        b.status,
        b.max_students,
        b.note,
        COUNT(DISTINCT e.student_id) AS enrolled_students
      FROM course_batches b
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
      WHERE b.batch_id = ? AND b.teacher_id = ? AND b.course_id = ?
      GROUP BY b.batch_id, b.batch_code, b.batch_name, b.start_date, b.end_date, b.enrollment_start_date, b.enrollment_deadline, b.min_students, b.learning_mode, b.online_platform, b.default_meeting_url, b.classroom_name, b.classroom_address, b.tuition_fee, b.status, b.max_students, b.note
      LIMIT 1
    `,
    [result.insertId, teacherId, courseId],
  );

  return mapBatchRow(rows[0]);
}

export async function updateInstructorBatch(rawTeacherId, rawCourseId, rawBatchId, batchData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const batchName = String(batchData?.batchName ?? "").trim();
  const startDate = String(batchData?.startDate ?? "").trim();
  const endDate = String(batchData?.endDate ?? "").trim();
  const enrollmentStartDate = String(batchData?.enrollmentStartDate ?? "").trim();
  const enrollmentDeadline = String(batchData?.enrollmentDeadline ?? "").trim();
  const minStudents = Number(batchData?.minStudents ?? 1);
  const maxStudents = Number(batchData?.maxStudents ?? 50);
  const tuitionFee = batchData?.tuitionFee === "" || batchData?.tuitionFee == null
    ? null
    : Number(batchData?.tuitionFee);
  const learningMode = String(batchData?.learningMode ?? "ONLINE").toUpperCase();
  const onlinePlatform = String(batchData?.onlinePlatform ?? "ZOOM").toUpperCase();
  const defaultMeetingUrl = String(batchData?.defaultMeetingUrl ?? "").trim();
  const classroomName = String(batchData?.classroomName ?? "").trim();
  const classroomAddress = String(batchData?.classroomAddress ?? "").trim();
  const timezone = String(batchData?.timezone ?? "Asia/Ho_Chi_Minh").trim() || "Asia/Ho_Chi_Minh";
  const status = String(batchData?.status ?? "DRAFT").toUpperCase();
  const note = String(batchData?.note ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(batchId) || batchId <= 0) {
    throw new Error("Invalid batch id.");
  }

  if (!batchName) {
    throw new Error("Batch name is required.");
  }

  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required.");
  }

  assertBatchDateOrder({
    startDate,
    endDate,
    enrollmentStartDate,
    enrollmentDeadline,
  });

  if (!Number.isFinite(minStudents) || minStudents <= 0) {
    throw new Error("Min students must be greater than zero.");
  }

  if (!Number.isFinite(maxStudents) || maxStudents < minStudents) {
    throw new Error("Max students must be greater than or equal to min students.");
  }

  if (tuitionFee != null && (!Number.isFinite(tuitionFee) || tuitionFee < 0)) {
    throw new Error("Tuition fee must be zero or greater.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [existingRows] = await db.query(
    `
      SELECT batch_id AS id
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [batchId, teacherId, courseId],
  );

  if (!existingRows[0]) {
    throw new Error("Batch not found for this course.");
  }

  await db.query(
    `
      UPDATE course_batches
      SET
        batch_name = ?,
        start_date = ?,
        end_date = ?,
        enrollment_start_date = ?,
        enrollment_deadline = ?,
        min_students = ?,
        max_students = ?,
        tuition_fee = ?,
        learning_mode = ?,
        online_platform = ?,
        default_meeting_url = ?,
        classroom_name = ?,
        classroom_address = ?,
        timezone = ?,
        status = ?,
        note = ?,
        updated_at = NOW()
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
    `,
    [
      batchName,
      startDate,
      endDate,
      enrollmentStartDate || null,
      enrollmentDeadline || null,
      minStudents,
      maxStudents,
      tuitionFee,
      learningMode,
      onlinePlatform,
      defaultMeetingUrl || null,
      classroomName || null,
      classroomAddress || null,
      timezone,
      status,
      note || null,
      batchId,
      teacherId,
      courseId,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        b.batch_id AS id,
        b.batch_code AS code,
        b.batch_name AS name,
        b.start_date,
        b.end_date,
        b.enrollment_start_date,
        b.enrollment_deadline,
        b.min_students,
        b.learning_mode,
        b.online_platform,
        b.default_meeting_url,
        b.classroom_name,
        b.classroom_address,
        b.tuition_fee,
        b.status,
        b.max_students,
        b.note,
        COUNT(DISTINCT e.student_id) AS enrolled_students
      FROM course_batches b
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id AND e.status IN ('ACTIVE', 'COMPLETED')
      WHERE b.batch_id = ? AND b.teacher_id = ? AND b.course_id = ?
      GROUP BY b.batch_id, b.batch_code, b.batch_name, b.start_date, b.end_date, b.enrollment_start_date, b.enrollment_deadline, b.min_students, b.learning_mode, b.online_platform, b.default_meeting_url, b.classroom_name, b.classroom_address, b.tuition_fee, b.status, b.max_students, b.note
      LIMIT 1
    `,
    [batchId, teacherId, courseId],
  );

  return mapBatchRow(rows[0]);
}

export async function deleteInstructorBatch(rawTeacherId, rawCourseId, rawBatchId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(batchId) || batchId <= 0) {
    throw new Error("Invalid batch id.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [existingRows] = await db.query(
    `
      SELECT batch_id AS id
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [batchId, teacherId, courseId],
  );

  if (!existingRows[0]) {
    throw new Error("Batch not found for this course.");
  }

  await db.query(
    `
      DELETE FROM course_batches
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
    `,
    [batchId, teacherId, courseId],
  );

  return { id: batchId, courseId };
}

export async function createInstructorSession(rawTeacherId, rawCourseId, rawBatchId, sessionData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const title = String(sessionData?.title ?? "").trim();
  const description = String(sessionData?.description ?? "").trim();
  const startTime = String(sessionData?.startTime ?? "").trim();
  const endTime = String(sessionData?.endTime ?? "").trim();
  const meetingUrl = String(sessionData?.meetingUrl ?? "").trim();
  const meetingPassword = String(sessionData?.meetingPassword ?? "").trim();
  const platform = String(sessionData?.platform ?? "ZOOM").toUpperCase();
  const status = String(sessionData?.status ?? "SCHEDULED").toUpperCase();
  const recordingUrl = String(sessionData?.recordingUrl ?? "").trim();
  const note = String(sessionData?.note ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!title) throw new Error("Session title is required.");
  if (!startTime || !endTime) throw new Error("Start time and end time are required.");
  if (new Date(endTime) <= new Date(startTime)) throw new Error("End time must be later than start time.");

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) throw new Error("Course not found for this instructor.");

  const [batchRows] = await db.query(
    `
      SELECT
        batch_id AS id,
        start_date,
        end_date
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [batchId, teacherId, courseId],
  );

  if (!batchRows[0]) throw new Error("Batch not found for this course.");

  assertSessionWithinBatchRange(
    startTime,
    endTime,
    batchRows[0].start_date,
    batchRows[0].end_date,
  );

  const conflictingSession = await findBatchSessionConflict(
    batchId,
    teacherId,
    startTime,
    endTime,
  );
  if (conflictingSession) {
    throw new Error("Session time overlaps with another session in this batch.");
  }

  const [result] = await db.query(
    `
      INSERT INTO class_sessions (
        batch_id,
        teacher_id,
        session_title,
        session_description,
        start_time,
        end_time,
        meeting_url,
        meeting_password,
        platform,
        status,
        recording_url,
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      batchId,
      teacherId,
      title,
      description || null,
      startTime,
      endTime,
      meetingUrl || null,
      meetingPassword || null,
      toSessionPlatformValue(platform),
      toSessionStatusValue(status),
      recordingUrl || null,
      note || null,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        s.session_id AS id,
        s.batch_id AS batchId,
        s.session_title AS title,
        s.session_description AS description,
        s.start_time,
        s.end_time,
        s.meeting_url AS meetingUrl,
        s.meeting_password AS meetingPassword,
        s.platform,
        s.status,
        s.recording_url AS recordingUrl,
        s.note
      FROM class_sessions s
      WHERE s.session_id = ? AND s.teacher_id = ? AND s.batch_id = ?
      LIMIT 1
    `,
    [result.insertId, teacherId, batchId],
  );

  return mapSessionRow(rows[0]);
}

export async function generateInstructorRecurringSessions(rawTeacherId, rawCourseId, rawBatchId, scheduleData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const weekdays = Array.isArray(scheduleData?.weekdays)
    ? [...new Set(scheduleData.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [];
  const startTime = String(scheduleData?.startTime ?? "").trim();
  const endTime = String(scheduleData?.endTime ?? "").trim();
  const titlePrefix = String(scheduleData?.titlePrefix ?? "Buổi học").trim() || "Buổi học";
  const description = String(scheduleData?.description ?? "").trim();
  const meetingUrl = String(scheduleData?.meetingUrl ?? "").trim();
  const meetingPassword = String(scheduleData?.meetingPassword ?? "").trim();
  const platform = String(scheduleData?.platform ?? "").trim();
  const status = String(scheduleData?.status ?? "SCHEDULED").toUpperCase();
  const note = String(scheduleData?.note ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (weekdays.length === 0) throw new Error("At least one weekday is required.");
  if (!startTime || !endTime) throw new Error("Start time and end time are required.");

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes == null || endMinutes == null) throw new Error("Invalid session time.");
  if (endMinutes <= startMinutes) throw new Error("End time must be later than start time.");

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) throw new Error("Course not found for this instructor.");

  const [batchRows] = await db.query(
    `
      SELECT
        batch_id AS id,
        batch_code AS code,
        start_date,
        end_date,
        online_platform,
        default_meeting_url
      FROM course_batches
      WHERE batch_id = ? AND teacher_id = ? AND course_id = ?
      LIMIT 1
    `,
    [batchId, teacherId, courseId],
  );

  const batch = batchRows[0];
  if (!batch) throw new Error("Batch not found for this course.");

  const rangeStart = parseDateOnly(batch.start_date);
  const rangeEnd = parseDateOnly(batch.end_date);
  if (!rangeStart || !rangeEnd) throw new Error("Batch start date and end date are required.");
  if (rangeEnd < rangeStart) throw new Error("Batch end date must be later than start date.");

  const [existingRows] = await db.query(
    `
      SELECT
        start_time,
        end_time
      FROM class_sessions
      WHERE batch_id = ? AND teacher_id = ? AND start_time BETWEEN ? AND ?
    `,
    [
      batchId,
      teacherId,
      `${formatDateOnly(rangeStart)} 00:00:00`,
      `${formatDateOnly(rangeEnd)} 23:59:59`,
    ],
  );

  const existingStarts = new Set(
    existingRows.map((row) => formatDateTimeSql(new Date(row.start_time))),
  );
  const existingIntervals = existingRows.map((row) => ({
    start: new Date(row.start_time),
    end: new Date(row.end_time),
  }));
  const rowsToInsert = [];
  const createdStartTimes = [];
  const createdIntervals = [];
  let sessionIndex = 1;
  let skippedCount = 0;

  for (const date = new Date(rangeStart); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
    if (!weekdays.includes(date.getDay())) continue;

    const sessionStart = combineDateAndTime(date, startTime);
    const sessionEnd = combineDateAndTime(date, endTime);
    if (!sessionStart || !sessionEnd) continue;

    const startSql = formatDateTimeSql(sessionStart);
    const endSql = formatDateTimeSql(sessionEnd);
    const overlapsExisting = existingIntervals.some((interval) =>
      hasTimeRangeOverlap(sessionStart, sessionEnd, interval.start, interval.end),
    );
    const overlapsCreated = createdIntervals.some((interval) =>
      hasTimeRangeOverlap(sessionStart, sessionEnd, interval.start, interval.end),
    );

    if (existingStarts.has(startSql) || overlapsExisting || overlapsCreated) {
      skippedCount += 1;
      continue;
    }

    existingStarts.add(startSql);
    createdStartTimes.push(startSql);
    createdIntervals.push({ start: sessionStart, end: sessionEnd });
    rowsToInsert.push([
      batchId,
      teacherId,
      `${titlePrefix} ${sessionIndex}`,
      description || null,
      startSql,
      endSql,
      meetingUrl || batch.default_meeting_url || null,
      meetingPassword || null,
      toSessionPlatformValue(platform || batch.online_platform),
      toSessionStatusValue(status),
      null,
      note || null,
    ]);
    sessionIndex += 1;
  }

  if (rowsToInsert.length > 0) {
    await db.query(
      `
        INSERT INTO class_sessions (
          batch_id,
          teacher_id,
          session_title,
          session_description,
          start_time,
          end_time,
          meeting_url,
          meeting_password,
          platform,
          status,
          recording_url,
          note
        ) VALUES ?
      `,
      [rowsToInsert],
    );
  }

  let sessions = [];
  if (createdStartTimes.length > 0) {
    const placeholders = createdStartTimes.map(() => "?").join(", ");
    const [rows] = await db.query(
      `
        SELECT
          s.session_id AS id,
          s.batch_id AS batchId,
          s.session_title AS title,
          s.session_description AS description,
          s.start_time,
          s.end_time,
          s.meeting_url AS meetingUrl,
          s.meeting_password AS meetingPassword,
          s.platform,
          s.status,
          s.recording_url AS recordingUrl,
          s.note
        FROM class_sessions s
        WHERE s.batch_id = ? AND s.teacher_id = ? AND s.start_time IN (${placeholders})
        ORDER BY s.start_time ASC, s.session_id ASC
      `,
      [batchId, teacherId, ...createdStartTimes],
    );
    sessions = rows.map(mapSessionRow);
  }

  return {
    batchId,
    courseId,
    generatedCount: rowsToInsert.length,
    skippedCount,
    sessions,
  };
}

export async function updateInstructorSession(rawTeacherId, rawCourseId, rawBatchId, rawSessionId, sessionData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const sessionId = Number(rawSessionId);
  const title = String(sessionData?.title ?? "").trim();
  const description = String(sessionData?.description ?? "").trim();
  const startTime = String(sessionData?.startTime ?? "").trim();
  const endTime = String(sessionData?.endTime ?? "").trim();
  const meetingUrl = String(sessionData?.meetingUrl ?? "").trim();
  const meetingPassword = String(sessionData?.meetingPassword ?? "").trim();
  const platform = String(sessionData?.platform ?? "ZOOM").toUpperCase();
  const status = String(sessionData?.status ?? "SCHEDULED").toUpperCase();
  const recordingUrl = String(sessionData?.recordingUrl ?? "").trim();
  const note = String(sessionData?.note ?? "").trim();

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(sessionId) || sessionId <= 0) throw new Error("Invalid session id.");
  if (!title) throw new Error("Session title is required.");
  if (!startTime || !endTime) throw new Error("Start time and end time are required.");
  if (new Date(endTime) <= new Date(startTime)) throw new Error("End time must be later than start time.");

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) throw new Error("Course not found for this instructor.");

  const [sessionRows] = await db.query(
    `
      SELECT
        s.session_id AS id,
        b.start_date,
        b.end_date
      FROM class_sessions s
      INNER JOIN course_batches b ON b.batch_id = s.batch_id
      WHERE s.session_id = ? AND s.teacher_id = ? AND s.batch_id = ? AND b.course_id = ?
      LIMIT 1
    `,
    [sessionId, teacherId, batchId, courseId],
  );

  if (!sessionRows[0]) throw new Error("Session not found for this batch.");

  assertSessionWithinBatchRange(
    startTime,
    endTime,
    sessionRows[0].start_date,
    sessionRows[0].end_date,
  );

  const conflictingSession = await findBatchSessionConflict(
    batchId,
    teacherId,
    startTime,
    endTime,
    sessionId,
  );
  if (conflictingSession) {
    throw new Error("Session time overlaps with another session in this batch.");
  }

  await db.query(
    `
      UPDATE class_sessions
      SET
        session_title = ?,
        session_description = ?,
        start_time = ?,
        end_time = ?,
        meeting_url = ?,
        meeting_password = ?,
        platform = ?,
        status = ?,
        recording_url = ?,
        note = ?,
        updated_at = NOW()
      WHERE session_id = ? AND teacher_id = ? AND batch_id = ?
    `,
    [
      title,
      description || null,
      startTime,
      endTime,
      meetingUrl || null,
      meetingPassword || null,
      toSessionPlatformValue(platform),
      toSessionStatusValue(status),
      recordingUrl || null,
      note || null,
      sessionId,
      teacherId,
      batchId,
    ],
  );

  const [rows] = await db.query(
    `
      SELECT
        s.session_id AS id,
        s.batch_id AS batchId,
        s.session_title AS title,
        s.session_description AS description,
        s.start_time,
        s.end_time,
        s.meeting_url AS meetingUrl,
        s.meeting_password AS meetingPassword,
        s.platform,
        s.status,
        s.recording_url AS recordingUrl,
        s.note
      FROM class_sessions s
      WHERE s.session_id = ? AND s.teacher_id = ? AND s.batch_id = ?
      LIMIT 1
    `,
    [sessionId, teacherId, batchId],
  );

  return mapSessionRow(rows[0]);
}

export async function deleteInstructorSession(rawTeacherId, rawCourseId, rawBatchId, rawSessionId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const sessionId = Number(rawSessionId);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(sessionId) || sessionId <= 0) throw new Error("Invalid session id.");

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) throw new Error("Course not found for this instructor.");

  const [sessionRows] = await db.query(
    `
      SELECT s.session_id AS id
      FROM class_sessions s
      INNER JOIN course_batches b ON b.batch_id = s.batch_id
      WHERE s.session_id = ? AND s.teacher_id = ? AND s.batch_id = ? AND b.course_id = ?
      LIMIT 1
    `,
    [sessionId, teacherId, batchId, courseId],
  );

  if (!sessionRows[0]) throw new Error("Session not found for this batch.");

  await db.query(
    `
      DELETE FROM class_sessions
      WHERE session_id = ? AND teacher_id = ? AND batch_id = ?
    `,
    [sessionId, teacherId, batchId],
  );

  return { id: sessionId, batchId, courseId };
}

export async function getInstructorSessionAttendance(rawTeacherId, rawCourseId, rawBatchId, rawSessionId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const sessionId = Number(rawSessionId);

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(sessionId) || sessionId <= 0) throw new Error("Invalid session id.");

  const [sessionRows] = await db.query(
    `
      SELECT
        s.session_id AS id,
        s.batch_id AS batchId,
        s.session_title AS title,
        s.start_time,
        s.end_time,
        b.batch_code AS batchCode,
        c.course_name AS courseTitle
      FROM class_sessions s
      INNER JOIN course_batches b ON b.batch_id = s.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      WHERE s.session_id = ? AND s.batch_id = ? AND b.course_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [sessionId, batchId, courseId, teacherId],
  );

  const session = sessionRows[0];
  if (!session) throw new Error("Session not found for this batch.");

  const [studentRows] = await db.query(
    `
      SELECT
        u.user_id AS studentId,
        u.full_name AS studentName,
        u.email,
        e.progress_percent AS progress,
        COALESCE(sa.status, 'ABSENT') AS status,
        COALESCE(sa.duration_minutes, 0) AS durationMinutes,
        sa.note
      FROM enrollments e
      INNER JOIN users u ON u.user_id = e.student_id
      LEFT JOIN session_attendance sa
        ON sa.session_id = ? AND sa.student_id = e.student_id
      WHERE e.batch_id = ? AND e.status IN ('ACTIVE', 'COMPLETED', 'PENDING')
      ORDER BY u.full_name ASC, u.user_id ASC
    `,
    [sessionId, batchId],
  );

  const students = studentRows.map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName,
    email: row.email,
    progress: percent(row.progress),
    status: normalizeAttendanceStatus(row.status),
    statusLabel: toAttendanceStatusLabel(normalizeAttendanceStatus(row.status)),
    durationMinutes: Number(row.durationMinutes ?? 0),
    note: row.note ?? "",
  }));

  return {
    session: {
      id: session.id,
      batchId: session.batchId,
      title: session.title,
      batchCode: session.batchCode,
      courseTitle: session.courseTitle,
      startLabel: session.start_time
        ? new Date(session.start_time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
        : "",
      endLabel: session.end_time
        ? new Date(session.end_time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
        : "",
    },
    summary: {
      total: students.length,
      present: students.filter((student) => student.status === "PRESENT").length,
      late: students.filter((student) => student.status === "LATE").length,
      excused: students.filter((student) => student.status === "EXCUSED").length,
      absent: students.filter((student) => student.status === "ABSENT").length,
    },
    students,
  };
}

export async function updateInstructorSessionAttendance(rawTeacherId, rawCourseId, rawBatchId, rawSessionId, attendanceData) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const batchId = Number(rawBatchId);
  const sessionId = Number(rawSessionId);
  const attendances = Array.isArray(attendanceData?.attendances) ? attendanceData.attendances : [];

  if (!Number.isFinite(courseId) || courseId <= 0) throw new Error("Invalid course id.");
  if (!Number.isFinite(batchId) || batchId <= 0) throw new Error("Invalid batch id.");
  if (!Number.isFinite(sessionId) || sessionId <= 0) throw new Error("Invalid session id.");
  if (attendances.length === 0) throw new Error("Attendance list is required.");

  const [sessionRows] = await db.query(
    `
      SELECT s.session_id AS id
      FROM class_sessions s
      INNER JOIN course_batches b ON b.batch_id = s.batch_id
      WHERE s.session_id = ? AND s.batch_id = ? AND b.course_id = ? AND b.teacher_id = ?
      LIMIT 1
    `,
    [sessionId, batchId, courseId, teacherId],
  );

  if (!sessionRows[0]) throw new Error("Session not found for this batch.");

  const [enrollmentRows] = await db.query(
    `
      SELECT student_id AS studentId
      FROM enrollments
      WHERE batch_id = ? AND status IN ('ACTIVE', 'COMPLETED', 'PENDING')
    `,
    [batchId],
  );
  const enrolledStudentIds = new Set(enrollmentRows.map((row) => Number(row.studentId)));

  for (const item of attendances) {
    const studentId = Number(item?.studentId);
    if (!Number.isFinite(studentId) || studentId <= 0 || !enrolledStudentIds.has(studentId)) {
      throw new Error("Invalid student id.");
    }

    const status = normalizeAttendanceStatus(item?.status);
    const durationMinutes = Math.max(0, Number(item?.durationMinutes ?? 0) || 0);
    const note = String(item?.note ?? "").trim();

    await db.query(
      `
        INSERT INTO session_attendance (session_id, student_id, status, duration_minutes, note)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          duration_minutes = VALUES(duration_minutes),
          note = VALUES(note)
      `,
      [sessionId, studentId, status, durationMinutes, note || null],
    );
  }

  return getInstructorSessionAttendance(teacherId, courseId, batchId, sessionId);
}

export async function deleteInstructorLesson(rawTeacherId, rawCourseId, rawLessonId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const courseId = Number(rawCourseId);
  const lessonId = Number(rawLessonId);

  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Invalid course id.");
  }

  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    throw new Error("Invalid lesson id.");
  }

  const course = await assertInstructorCourseOwnership(teacherId, courseId);
  if (!course) {
    throw new Error("Course not found for this instructor.");
  }

  const [lessonRows] = await db.query(
    `
      SELECT l.lesson_id AS id
      FROM lessons l
      INNER JOIN course_modules m ON m.module_id = l.module_id
      WHERE l.lesson_id = ? AND m.course_id = ?
      LIMIT 1
    `,
    [lessonId, courseId],
  );

  if (!lessonRows[0]) {
    throw new Error("Lesson not found for this course.");
  }

  await db.query(
    `
      DELETE l
      FROM lessons l
      INNER JOIN course_modules m ON m.module_id = l.module_id
      WHERE l.lesson_id = ? AND m.course_id = ?
    `,
    [lessonId, courseId],
  );

  return { id: lessonId, courseId };
}
