import db from "../db.js";
import { createNotification } from "./notification.service.js";

function mapStatus(status) {
  if (status === "LOCKED") return "suspended";
  if (status === "INACTIVE") return "inactive";
  return "active";
}

function toInitials(title) {
  return String(title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export async function getAdminTeachersPageData() {
  const [rows] = await db.query(`
    SELECT
      u.user_id AS id,
      u.full_name AS name,
      u.email,
      u.phone,
      u.avatar_url AS avatar,
      u.status AS account_status,
      u.created_at,
      tp.specialization,
      tp.experience_years,
      tp.qualification,
      tp.workplace,
      COUNT(DISTINCT c.course_id) AS course_count,
      COUNT(DISTINCT e.student_id) AS student_count,
      COALESCE(AVG(r.teacher_rating), 0) AS average_rating
    FROM users u
    LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
    LEFT JOIN courses c ON c.teacher_id = u.user_id
    LEFT JOIN course_batches b ON b.course_id = c.course_id
    LEFT JOIN enrollments e
      ON e.batch_id = b.batch_id
      AND e.status IN ('ACTIVE', 'COMPLETED')
    LEFT JOIN course_reviews r ON r.teacher_id = u.user_id
    WHERE u.role = 'TEACHER'
    GROUP BY
      u.user_id, u.full_name, u.email, u.phone, u.avatar_url,
      u.status, u.created_at, tp.specialization, tp.experience_years,
      tp.qualification, tp.workplace
    ORDER BY u.created_at DESC, u.user_id DESC
  `);

  const [courseRows] = await db.query(`
    SELECT course_id AS id, teacher_id, course_name AS title
    FROM courses
    ORDER BY created_at DESC, course_id DESC
  `);

  const coursesByTeacher = new Map();
  for (const course of courseRows) {
    const courses = coursesByTeacher.get(course.teacher_id) ?? [];
    if (courses.length < 3) {
      courses.push({
        id: Number(course.id),
        title: course.title,
        shortLabel: toInitials(course.title),
      });
      coursesByTeacher.set(course.teacher_id, courses);
    }
  }

  const teachers = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    specialization: row.specialization ?? "Chưa cập nhật",
    experienceYears: Number(row.experience_years ?? 0),
    qualification: row.qualification,
    workplace: row.workplace,
    createdAt: row.created_at,
    courseCount: Number(row.course_count ?? 0),
    studentCount: Number(row.student_count ?? 0),
    averageRating: Number(Number(row.average_rating ?? 0).toFixed(1)),
    status: mapStatus(row.account_status),
    courses: coursesByTeacher.get(row.id) ?? [],
  }));

  const activeTeachers = teachers.filter((teacher) => teacher.status === "active");
  const totalCourses = teachers.reduce((sum, teacher) => sum + teacher.courseCount, 0);
  const ratingValues = teachers
    .map((teacher) => teacher.averageRating)
    .filter((rating) => rating > 0);

  const [studentRows] = await db.query(`
    SELECT COUNT(DISTINCT e.student_id) AS total_students
    FROM enrollments e
    INNER JOIN course_batches b ON b.batch_id = e.batch_id
    INNER JOIN users teacher ON teacher.user_id = b.teacher_id
    WHERE teacher.role = 'TEACHER'
      AND e.status IN ('ACTIVE', 'COMPLETED')
  `);

  return {
    summary: {
      totalTeachers: teachers.length,
      activeTeachers: activeTeachers.length,
      totalCourses,
      totalStudents: Number(studentRows[0]?.total_students ?? 0),
      averageRating:
        ratingValues.length === 0
          ? 0
          : Number(
              (
                ratingValues.reduce((sum, rating) => sum + rating, 0) /
                ratingValues.length
              ).toFixed(1),
            ),
    },
    teachers,
    pagination: {
      total: teachers.length,
      currentPage: 1,
      pageSize: 10,
    },
  };
}

export async function getAdminTeacherDetail(teacherId) {
  const [rows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.avatar_url AS avatar,
        u.status AS account_status,
        u.created_at,
        tp.bio,
        tp.specialization,
        tp.experience_years,
        tp.qualification,
        tp.workplace
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
      WHERE u.user_id = ? AND u.role = 'TEACHER'
      LIMIT 1
    `,
    [teacherId],
  );

  if (!rows[0]) return null;

  const teacher = rows[0];
  const [courses] = await db.query(
    `
      SELECT
        c.course_id AS id,
        c.course_name AS title,
        c.status,
        COUNT(DISTINCT e.student_id) AS student_count,
        COALESCE(AVG(r.rating), 0) AS rating
      FROM courses c
      LEFT JOIN course_batches b ON b.course_id = c.course_id
      LEFT JOIN enrollments e ON e.batch_id = b.batch_id
      LEFT JOIN course_reviews r ON r.course_id = c.course_id
      WHERE c.teacher_id = ?
      GROUP BY c.course_id, c.course_name, c.status
      ORDER BY c.created_at DESC
      LIMIT 8
    `,
    [teacherId],
  );

  const [activities] = await db.query(
    `
      SELECT * FROM (
        SELECT
          'course' AS type,
          CONCAT('Tạo khóa học: ', c.course_name) AS title,
          c.created_at AS activity_time
        FROM courses c
        WHERE c.teacher_id = ?

        UNION ALL

        SELECT
          'session' AS type,
          CONCAT('Lịch dạy: ', s.session_title) AS title,
          s.created_at AS activity_time
        FROM class_sessions s
        WHERE s.teacher_id = ?
      ) teacher_activities
      ORDER BY activity_time DESC
      LIMIT 8
    `,
    [teacherId, teacherId],
  );

  return {
    id: Number(teacher.id),
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    avatar: teacher.avatar,
    status: mapStatus(teacher.account_status),
    createdAt: teacher.created_at,
    bio: teacher.bio,
    specialization: teacher.specialization ?? "Chưa cập nhật",
    experienceYears: Number(teacher.experience_years ?? 0),
    qualification: teacher.qualification,
    workplace: teacher.workplace,
    courses: courses.map((course) => ({
      id: Number(course.id),
      title: course.title,
      status: course.status,
      studentCount: Number(course.student_count ?? 0),
      rating: Number(Number(course.rating ?? 0).toFixed(1)),
    })),
    recentActivity: activities.map((activity) => ({
      type: activity.type,
      title: activity.title,
      activityTime: activity.activity_time,
    })),
  };
}

export async function updateAdminTeacherStatus(teacherId, status) {
  const dbStatus =
    status === "suspended"
      ? "LOCKED"
      : status === "inactive"
        ? "INACTIVE"
        : "ACTIVE";

  const [result] = await db.query(
    `UPDATE users
     SET status = ?
     WHERE user_id = ? AND role = 'TEACHER'`,
    [dbStatus, teacherId],
  );

  if (result.affectedRows === 0) return null;

  await createNotification({
    userId: Number(teacherId),
    type: dbStatus === "LOCKED" ? "ACCOUNT_LOCKED" : "ACCOUNT_STATUS_CHANGED",
    title:
      dbStatus === "LOCKED"
        ? "Tài khoản giảng viên đã bị khóa"
        : "Tài khoản giảng viên đã được mở khóa",
    content:
      dbStatus === "LOCKED"
        ? "Quản trị viên đã tạm khóa quyền truy cập cổng giảng viên."
        : "Quản trị viên đã khôi phục quyền truy cập cổng giảng viên.",
    referenceType: "USER",
    referenceId: Number(teacherId),
    targetUrl: "/instructor",
    priority: dbStatus === "LOCKED" ? "HIGH" : "NORMAL",
  }).catch((error) => {
    console.error("Failed to notify teacher about account status.", error);
  });

  return {
    id: Number(teacherId),
    status,
  };
}
