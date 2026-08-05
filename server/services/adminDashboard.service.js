import db from "../db.js";

function formatCurrency(value) {
  return Number(value ?? 0);
}

function formatPercentage(value) {
  return Number(Number(value ?? 0).toFixed(1));
}

function toMonthLabel(value) {
  const month = Number(String(value).slice(5, 7));
  return `T${month}`;
}

function buildTrend(currentValue, previousValue, suffix = "") {
  const current = Number(currentValue ?? 0);
  const previous = Number(previousValue ?? 0);

  if (previous === 0) {
    if (current === 0) {
      return { value: `0${suffix}`, direction: "neutral" };
    }

    return { value: `+100${suffix}`, direction: "up" };
  }

  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.abs(percent).toFixed(1);

  if (percent > 0) {
    return { value: `+${rounded}${suffix}`, direction: "up" };
  }

  if (percent < 0) {
    return { value: `-${rounded}${suffix}`, direction: "down" };
  }

  return { value: `0${suffix}`, direction: "neutral" };
}

async function getSummaryStats() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS total_students,
      (
        (SELECT COUNT(*) FROM courses WHERE status = 'PENDING') +
        (SELECT COUNT(*) FROM payments WHERE payment_status = 'PENDING') +
        (SELECT COUNT(*) FROM users WHERE status = 'LOCKED')
      ) AS unresolved_alerts,
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE payment_status = 'SUCCESS'
      ) AS total_revenue,
      (
        SELECT COUNT(*)
        FROM courses
      ) AS active_courses,
      (
        SELECT COALESCE(
          (SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0),
          0
        )
        FROM lesson_progress
      ) AS completion_rate
  `);

  return rows[0];
}

async function getPreviousSummaryStats() {
  const [rows] = await db.query(`
    SELECT
      (
        SELECT COUNT(*)
        FROM users
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS total_users,
      (
        SELECT COUNT(*)
        FROM users
        WHERE role = 'STUDENT'
          AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS total_students,
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE payment_status = 'SUCCESS'
          AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS total_revenue,
      (
        SELECT COUNT(*)
        FROM courses
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS active_courses,
      (
        SELECT COALESCE(
          (SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0),
          0
        )
        FROM lesson_progress p
        INNER JOIN lessons l ON l.lesson_id = p.lesson_id
        INNER JOIN course_modules m ON m.module_id = l.module_id
        INNER JOIN courses c ON c.course_id = m.course_id
        WHERE c.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS completion_rate
  `);

  return rows[0];
}

async function getRevenueTrajectory() {
  const [rows] = await db.query(`
    WITH RECURSIVE months AS (
      SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 MONTH), '%Y-%m') AS month_key
      UNION ALL
      SELECT DATE_FORMAT(DATE_ADD(STR_TO_DATE(CONCAT(month_key, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH), '%Y-%m')
      FROM months
      WHERE month_key < DATE_FORMAT(CURDATE(), '%Y-%m')
    )
    SELECT
      m.month_key,
      COALESCE(SUM(o.amount), 0) AS revenue
    FROM months m
    LEFT JOIN payments o
      ON DATE_FORMAT(o.paid_at, '%Y-%m') = m.month_key
      AND o.payment_status = 'SUCCESS'
    GROUP BY m.month_key
    ORDER BY m.month_key
  `);

  return rows.map((row) => ({
    label: toMonthLabel(row.month_key),
    revenue: formatCurrency(row.revenue),
  }));
}

async function getUserGrowth() {
  const [rows] = await db.query(`
    SELECT
      role,
      COUNT(*) AS total
    FROM users
    GROUP BY role
    ORDER BY total DESC
  `);

  const totalUsers = rows.reduce((sum, row) => sum + Number(row.total), 0);

  return rows.map((row) => ({
    label: row.role,
    total: Number(row.total),
    percentage: totalUsers === 0 ? 0 : formatPercentage((Number(row.total) / totalUsers) * 100),
  }));
}

async function getTopCourses() {
  const [rows] = await db.query(`
    SELECT
      c.course_id AS id,
      c.course_name AS title,
      c.thumbnail_url AS thumbnail,
      u.full_name AS instructor_name,
      COALESCE(enrollment_stats.students, 0) AS students,
      COALESCE(payment_stats.revenue, 0) AS revenue,
      COALESCE(review_stats.rating, 0) AS rating
    FROM courses c
    LEFT JOIN users u ON u.user_id = c.teacher_id
    LEFT JOIN (
      SELECT b.course_id, COUNT(DISTINCT e.enrollment_id) AS students
      FROM course_batches b
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id
      GROUP BY b.course_id
    ) enrollment_stats ON enrollment_stats.course_id = c.course_id
    LEFT JOIN (
      SELECT b.course_id, SUM(p.amount) AS revenue
      FROM course_batches b
      INNER JOIN payments p
        ON p.batch_id = b.batch_id
        AND p.payment_status = 'SUCCESS'
      GROUP BY b.course_id
    ) payment_stats ON payment_stats.course_id = c.course_id
    LEFT JOIN (
      SELECT course_id, AVG(rating) AS rating
      FROM course_reviews
      GROUP BY course_id
    ) review_stats ON review_stats.course_id = c.course_id
    ORDER BY revenue DESC, students DESC
    LIMIT 5
  `);

  return rows.map((row, index) => ({
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail,
    instructorName: row.instructor_name ?? "Unknown instructor",
    students: Number(row.students),
    revenue: formatCurrency(row.revenue),
    rating: formatPercentage(row.rating),
    badge:
      index === 0 ? "Top Earner" : Number(row.rating) >= 4.5 ? "Highly Rated" : "Trending",
  }));
}

async function getRecentActivity() {
  const [rows] = await db.query(`
    SELECT *
    FROM (
      SELECT
        CONCAT('payment-', o.payment_id) AS id,
        'order_paid' AS type,
        CONCAT('Payment #', o.payment_id, ' was marked as ', o.payment_status) AS title,
        CONCAT(
          'Student ID ',
          o.student_id,
          ' paid ',
          FORMAT(o.amount, 0, 'vi_VN'),
          ' VND'
        ) AS description,
        COALESCE(o.paid_at, o.created_at) AS created_at
      FROM payments o

      UNION ALL

      SELECT
        CONCAT('course-', c.course_id) AS id,
        'course_created' AS type,
        'New course published' AS title,
        CONCAT(c.course_name, ' was added to the catalog') AS description,
        c.created_at AS created_at
      FROM courses c

      UNION ALL

      SELECT
        CONCAT('user-', u.user_id) AS id,
        'user_joined' AS type,
        'New account created' AS title,
        CONCAT(u.full_name, ' joined as ', u.role) AS description,
        u.created_at AS created_at
      FROM users u

      UNION ALL

      SELECT
        CONCAT('review-', r.review_id) AS id,
        'review_added' AS type,
        'New review submitted' AS title,
        CONCAT('Course ID ', r.course_id, ' received a ', r.rating, '-star review') AS description,
        r.created_at AS created_at
      FROM course_reviews r
    ) activity_feed
    ORDER BY created_at DESC
    LIMIT 8
  `);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  }));
}

export async function getAdminDashboardData() {
  const [
    summary,
    previousSummary,
    revenueTrajectory,
    userGrowth,
    topCourses,
    recentActivity,
  ] = await Promise.all([
    getSummaryStats(),
    getPreviousSummaryStats(),
    getRevenueTrajectory(),
    getUserGrowth(),
    getTopCourses(),
    getRecentActivity(),
  ]);

  return {
    summary: {
      totalUsers: {
        value: Number(summary.total_users),
        trend: buildTrend(summary.total_users, previousSummary.total_users, "%"),
      },
      totalStudents: {
        value: Number(summary.total_students),
        trend: buildTrend(summary.total_students, previousSummary.total_students, "%"),
      },
      totalRevenue: {
        value: formatCurrency(summary.total_revenue),
        trend: buildTrend(summary.total_revenue, previousSummary.total_revenue, "%"),
      },
      activeCourses: {
        value: Number(summary.active_courses),
        trend: buildTrend(summary.active_courses, previousSummary.active_courses, "%"),
      },
      completionRate: {
        value: formatPercentage(summary.completion_rate),
        trend: buildTrend(summary.completion_rate, previousSummary.completion_rate, "%"),
      },
      unresolvedAlerts: {
        value: Number(summary.unresolved_alerts),
        trend: {
          value: Number(summary.unresolved_alerts) === 0 ? "Da xu ly" : "Can xu ly",
          direction: Number(summary.unresolved_alerts) === 0 ? "neutral" : "down",
        },
      },
    },
    revenueTrajectory,
    userGrowth,
    topCourses,
    recentActivity,
    generatedAt: new Date().toISOString(),
  };
}
