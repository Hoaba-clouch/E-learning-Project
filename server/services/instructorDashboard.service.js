import db from "../db.js";

const DEFAULT_TEACHER_ID = 4;

function normalizeTeacherId(value) {
  const teacherId = Number(value ?? DEFAULT_TEACHER_ID);
  return Number.isFinite(teacherId) && teacherId > 0 ? teacherId : DEFAULT_TEACHER_ID;
}

function formatPercentage(value) {
  return Number(Number(value ?? 0).toFixed(0));
}

function formatRating(value) {
  return Number(Number(value ?? 0).toFixed(1));
}

function formatCurrencyLabel(value) {
  const amount = Number(value ?? 0);

  if (amount >= 1000000) {
    return `${Math.round(amount / 1000000)} triệu`;
  }

  return new Intl.NumberFormat("vi-VN").format(amount);
}

function toOnlinePlatformLabel(platform) {
  if (platform === "GOOGLE_MEET") return "Google Meet";
  if (platform === "MICROSOFT_TEAMS") return "Microsoft Teams";
  if (platform === "JITSI") return "Jitsi";
  if (platform === "INTERNAL_ROOM") return "Phòng nội bộ";
  if (platform === "OTHER") return "Khác";
  return "Zoom";
}

function toCourseStatusLabel(status) {
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "PENDING") return "Chờ duyệt";
  if (status === "REJECTED") return "Bị từ chối";
  if (status === "HIDDEN") return "Đã ẩn";
  return "Bản nháp";
}

function toSessionStatusLabel(status) {
  if (status === "LIVE") return "Đang diễn ra";
  if (status === "COMPLETED") return "Đã hoàn thành";
  if (status === "CANCELLED") return "Đã hủy";
  return "Sắp diễn ra";
}

function buildStudentNote(progress) {
  if (progress < 50) return "Tiến độ dưới 50%, cần chú ý hỗ trợ sớm.";
  if (progress < 75) return "Đang chậm hơn tiến độ lớp.";
  return "Sẵn sàng kiểm tra hoặc duyệt bài tiếp theo.";
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
        (
          SELECT COUNT(*)
          FROM courses
          WHERE teacher_id = ?
            AND status IN ('DRAFT', 'PENDING', 'APPROVED')
        ) AS teaching_courses,
        (
          SELECT COUNT(DISTINCT e.student_id)
          FROM enrollments e
          INNER JOIN course_batches b ON b.batch_id = e.batch_id
          WHERE b.teacher_id = ?
            AND e.status IN ('ACTIVE', 'COMPLETED')
        ) AS total_students,
        (
          SELECT COALESCE(AVG(e.progress_percent), 0)
          FROM enrollments e
          INNER JOIN course_batches b ON b.batch_id = e.batch_id
          WHERE b.teacher_id = ?
            AND e.status IN ('ACTIVE', 'COMPLETED')
        ) AS average_completion,
        (
          SELECT COUNT(*)
          FROM assignment_submissions s
          INNER JOIN assignments a ON a.assignment_id = s.assignment_id
          INNER JOIN lessons l ON l.lesson_id = a.lesson_id
          INNER JOIN course_modules m ON m.module_id = l.module_id
          INNER JOIN courses c ON c.course_id = m.course_id
          WHERE c.teacher_id = ?
            AND s.score IS NULL
        ) AS pending_grading
    `,
    [teacherId, teacherId, teacherId, teacherId],
  );

  const stats = rows[0] ?? {};
  const averageCompletion = formatPercentage(stats.average_completion);

  return [
    {
      label: "Khóa học đang dạy",
      value: String(Number(stats.teaching_courses ?? 0)),
      change: "Lấy từ khóa học của giảng viên",
      icon: "menu_book",
      tone: "blue",
    },
    {
      label: "Tổng học viên",
      value: String(Number(stats.total_students ?? 0)),
      change: "Trong các lớp đang học",
      icon: "groups",
      tone: "slate",
    },
    {
      label: "Hoàn thành TB",
      value: `${averageCompletion}%`,
      change: "Tính theo tiến độ ghi danh",
      icon: "trending_up",
      tone: "green",
    },
    {
      label: "Cần chấm điểm",
      value: String(Number(stats.pending_grading ?? 0)),
      change: "Bài nộp chưa có điểm",
      icon: "rate_review",
      tone: "amber",
    },
  ];
}

async function getTeachingSchedule(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        DATE_FORMAT(s.start_time, '%H:%i') AS time,
        s.session_title AS title,
        b.batch_code AS batch,
        COALESCE(s.platform, b.online_platform) AS platform,
        s.status
      FROM class_sessions s
      INNER JOIN course_batches b ON b.batch_id = s.batch_id
      WHERE s.teacher_id = ?
        AND s.start_time >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      ORDER BY s.start_time ASC
      LIMIT 3
    `,
    [teacherId],
  );

  return rows.map((row) => ({
    time: row.time,
    title: row.title,
    batch: row.batch ?? "Chưa có mã lớp",
    mode: toOnlinePlatformLabel(row.platform),
    status: toSessionStatusLabel(row.status),
  }));
}

async function getEngagementBars(teacherId) {
  const [rows] = await db.query(
    `
      WITH RECURSIVE months AS (
        SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m') AS month_key
        UNION ALL
        SELECT DATE_FORMAT(
          DATE_ADD(STR_TO_DATE(CONCAT(month_key, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH),
          '%Y-%m'
        )
        FROM months
        WHERE month_key < DATE_FORMAT(CURDATE(), '%Y-%m')
      )
      SELECT
        m.month_key,
        COUNT(DISTINCT CASE WHEN b.teacher_id IS NOT NULL THEN e.student_id END) AS active_students
      FROM months m
      LEFT JOIN enrollments e
        ON DATE_FORMAT(e.enrolled_at, '%Y-%m') = m.month_key
      LEFT JOIN course_batches b
        ON b.batch_id = e.batch_id
        AND b.teacher_id = ?
      GROUP BY m.month_key
      ORDER BY m.month_key
    `,
    [teacherId],
  );

  const maxValue = Math.max(...rows.map((row) => Number(row.active_students ?? 0)), 1);

  return rows.map((row) => ({
    label: `T${Number(String(row.month_key).slice(5, 7))}`,
    value: Math.max(20, Math.round((Number(row.active_students ?? 0) / maxValue) * 100)),
  }));
}

async function getCoursePerformance(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        c.course_id AS id,
        c.course_name AS title,
        cat.category_name AS category,
        c.status,
        COUNT(DISTINCT e.student_id) AS students,
        COALESCE(AVG(e.progress_percent), 0) AS completion,
        COALESCE(AVG(r.rating), 0) AS rating,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          INNER JOIN course_batches pb ON pb.batch_id = p.batch_id
          WHERE pb.course_id = c.course_id
            AND p.payment_status = 'SUCCESS'
        ) AS revenue
      FROM courses c
      LEFT JOIN course_categories cat ON cat.category_id = c.category_id
      LEFT JOIN course_batches b ON b.course_id = c.course_id
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id
      LEFT JOIN course_reviews r ON r.course_id = c.course_id
      WHERE c.teacher_id = ?
      GROUP BY c.course_id, c.course_name, cat.category_name, c.status
      ORDER BY students DESC, c.created_at DESC
      LIMIT 3
    `,
    [teacherId],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    category: row.category ?? "Chưa phân loại",
    students: Number(row.students ?? 0),
    completion: formatPercentage(row.completion),
    rating: formatRating(row.rating),
    revenue: formatCurrencyLabel(row.revenue),
    status: toCourseStatusLabel(row.status),
  }));
}

async function getStudentSignals(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        c.course_name AS course,
        COALESCE(e.progress_percent, 0) AS progress
      FROM enrollments e
      INNER JOIN users u ON u.user_id = e.student_id
      INNER JOIN course_batches b ON b.batch_id = e.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      WHERE b.teacher_id = ?
        AND e.status IN ('ACTIVE', 'COMPLETED')
      ORDER BY
        CASE
          WHEN e.progress_percent < 50 THEN 0
          WHEN e.progress_percent < 75 THEN 1
          ELSE 2
        END,
        e.progress_percent ASC,
        e.enrolled_at DESC
      LIMIT 3
    `,
    [teacherId],
  );

  return rows.map((row) => {
    const progress = formatPercentage(row.progress);

    return {
      id: Number(row.id),
      name: row.name,
      course: row.course,
      progress,
      note: buildStudentNote(progress),
    };
  });
}

export async function getInstructorDashboardData(rawTeacherId) {
  const teacherId = normalizeTeacherId(rawTeacherId);
  const profile = await getInstructorProfile(teacherId);

  if (!profile) {
    return null;
  }

  const [
    dashboardStats,
    teachingSchedule,
    analyticsBars,
    coursePerformance,
    studentSignals,
  ] = await Promise.all([
    getSummaryStats(teacherId),
    getTeachingSchedule(teacherId),
    getEngagementBars(teacherId),
    getCoursePerformance(teacherId),
    getStudentSignals(teacherId),
  ]);

  return {
    teacherId,
    profile: {
      name: profile.name,
      role: profile.specialization ?? "Giảng viên",
      avatar: profile.avatar,
      workplace: profile.workplace,
    },
    dashboardStats,
    teachingSchedule,
    analyticsBars,
    coursePerformance,
    studentSignals,
    generatedAt: new Date().toISOString(),
  };
}
