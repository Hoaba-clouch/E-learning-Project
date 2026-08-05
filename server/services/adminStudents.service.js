import db from "../db.js";
import { createNotification } from "./notification.service.js";

function formatPercentage(value) {
  return Number(Number(value ?? 0).toFixed(1));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function toInitials(title) {
  return String(title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function resolveStudentStatus(student) {
  if (student.account_status === "LOCKED") return "suspended";
  if (student.account_status === "INACTIVE") return "inactive";
  return "active";
}

async function getStudentSummary() {
  const [rows] = await db.query(`
    SELECT
      COUNT(*) AS total_students,
      SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_registrations
    FROM users
    WHERE role = 'STUDENT'
  `);

  const [activityRows] = await db.query(`
    SELECT
      COUNT(DISTINCT e.student_id) AS active_students,
      COALESCE(AVG(e.progress_percent), 0) AS average_progress
    FROM enrollments e
    INNER JOIN users u ON u.user_id = e.student_id
    WHERE u.role = 'STUDENT'
      AND e.status IN ('ACTIVE', 'COMPLETED')
  `);

  return {
    totalStudents: Number(rows[0]?.total_students ?? 0),
    activeStudents: Number(activityRows[0]?.active_students ?? 0),
    newRegistrations: Number(rows[0]?.new_registrations ?? 0),
    averageProgress: formatPercentage(activityRows[0]?.average_progress ?? 0),
  };
}

async function getStudentsBase() {
  const [rows] = await db.query(`
    SELECT
      u.user_id AS id,
      u.full_name AS name,
      u.email,
      u.avatar_url AS avatar,
      u.status AS account_status,
      u.created_at,
      COUNT(DISTINCT b.course_id) AS enrolled_courses_count,
      COALESCE(AVG(e.progress_percent), 0) AS progress_percentage
    FROM users u
    LEFT JOIN enrollments e ON e.student_id = u.user_id
    LEFT JOIN course_batches b ON b.batch_id = e.batch_id
    WHERE u.role = 'STUDENT'
    GROUP BY u.user_id, u.full_name, u.email, u.avatar_url, u.status, u.created_at
    ORDER BY u.created_at DESC, u.user_id DESC
  `);

  const [courseRows] = await db.query(`
    SELECT
      e.student_id AS user_id,
      c.course_id,
      c.course_name AS title
    FROM enrollments e
    INNER JOIN course_batches b ON b.batch_id = e.batch_id
    INNER JOIN courses c ON c.course_id = b.course_id
    INNER JOIN users u ON u.user_id = e.student_id
    WHERE u.role = 'STUDENT'
    ORDER BY e.enrolled_at DESC
  `);

  const coursesByStudent = new Map();

  for (const row of courseRows) {
    if (!coursesByStudent.has(row.user_id)) {
      coursesByStudent.set(row.user_id, []);
    }

    const current = coursesByStudent.get(row.user_id);
    if (current.length < 3) {
      current.push({
        id: row.course_id,
        title: row.title,
        shortLabel: toInitials(row.title),
      });
    }
  }

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    createdAt: row.created_at,
    enrolledCoursesCount: Number(row.enrolled_courses_count ?? 0),
    progressPercentage: formatPercentage(row.progress_percentage),
    status: resolveStudentStatus(row),
    courses: coursesByStudent.get(row.id) ?? [],
    selected: index === 0,
  }));
}

async function getStudentDetail(studentId) {
  const [studentRows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.email,
        u.avatar_url AS avatar,
        u.created_at
      FROM users u
      WHERE u.user_id = ? AND u.role = 'STUDENT'
      LIMIT 1
    `,
    [studentId],
  );

  if (studentRows.length === 0) return null;

  const student = studentRows[0];

  const [courseRows] = await db.query(
    `
      SELECT
        c.course_id AS id,
        c.course_name AS title,
        COALESCE(e.progress_percent, 0) AS progress_percentage
      FROM enrollments e
      INNER JOIN course_batches b ON b.batch_id = e.batch_id
      INNER JOIN courses c ON c.course_id = b.course_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `,
    [studentId],
  );

  const [activityRows] = await db.query(
    `
      SELECT *
      FROM (
        SELECT
          'enrollment' AS type,
          CONCAT('Ghi danh khoa hoc: ', c.course_name) AS title,
          e.enrolled_at AS activity_time
        FROM enrollments e
        INNER JOIN course_batches b ON b.batch_id = e.batch_id
        INNER JOIN courses c ON c.course_id = b.course_id
        WHERE e.student_id = ?

        UNION ALL

        SELECT
          'review' AS type,
          CONCAT('Danh gia ', r.rating, ' sao cho khoa hoc ID ', r.course_id) AS title,
          r.created_at AS activity_time
        FROM course_reviews r
        WHERE r.student_id = ?

        UNION ALL

        SELECT
          'progress' AS type,
          CONCAT('Hoan thanh bai hoc ID ', p.lesson_id) AS title,
          p.completed_at AS activity_time
        FROM lesson_progress p
        WHERE p.student_id = ? AND p.is_completed = TRUE
      ) student_activities
      ORDER BY activity_time DESC
      LIMIT 6
    `,
    [studentId, studentId, studentId],
  );

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    avatar: student.avatar,
    createdAt: student.created_at,
    enrolledCourses: courseRows.map((course) => ({
      id: course.id,
      title: course.title,
      progressPercentage: formatPercentage(course.progress_percentage),
    })),
    recentActivity: activityRows.map((activity) => ({
      type: activity.type,
      title: activity.title,
      activityTime: activity.activity_time,
    })),
  };
}

export async function getAdminStudentsPageData() {
  const [summary, students] = await Promise.all([
    getStudentSummary(),
    getStudentsBase(),
  ]);

  const selectedStudent = students[0] ? await getStudentDetail(students[0].id) : null;

  return {
    summary: {
      totalStudents: {
        value: summary.totalStudents,
        trend: "+4.2%",
      },
      activeStudents: {
        value: summary.activeStudents,
        trend: "On dinh",
      },
      newRegistrations: {
        value: summary.newRegistrations,
        trend: `${formatCompactNumber(summary.newRegistrations)} / thang`,
      },
      averageProgress: {
        value: summary.averageProgress,
        trend: "+2%",
      },
    },
    filters: [
      { key: "all", label: "Tat ca hoc vien", active: true },
      { key: "active", label: "Dang hoc", active: false },
      { key: "inactive", label: "Khong hoat dong", active: false },
    ],
    students,
    selectedStudent,
    pagination: {
      total: summary.totalStudents,
      currentPage: 1,
      pageSize: 10,
    },
  };
}

export async function getAdminStudentDetail(studentId) {
  return getStudentDetail(studentId);
}

export async function updateAdminStudentStatus(studentId, status) {
  const detail = await getStudentDetail(studentId);

  if (!detail) return null;

  const dbStatus =
    status === "suspended"
      ? "LOCKED"
      : status === "inactive"
        ? "INACTIVE"
        : "ACTIVE";

  await db.query(
    "UPDATE users SET status = ? WHERE user_id = ? AND role = 'STUDENT'",
    [dbStatus, studentId],
  );

  await createNotification({
    userId: Number(studentId),
    type: dbStatus === "LOCKED" ? "ACCOUNT_LOCKED" : "ACCOUNT_STATUS_CHANGED",
    title: dbStatus === "LOCKED" ? "Tài khoản đã bị khóa" : "Trạng thái tài khoản đã thay đổi",
    content:
      dbStatus === "LOCKED"
        ? "Tài khoản học viên của bạn đã bị quản trị viên khóa."
        : "Tài khoản học viên của bạn đã được cập nhật trạng thái.",
    referenceType: "USER",
    referenceId: Number(studentId),
    targetUrl: "/student",
    priority: dbStatus === "LOCKED" ? "HIGH" : "NORMAL",
  }).catch((error) => {
    console.error("Failed to notify student about account status.", error);
  });

  return {
    id: Number(studentId),
    status,
  };
}
