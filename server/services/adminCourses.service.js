import db from "../db.js";
import { createNotification } from "./notification.service.js";

function formatCurrency(value) {
  return Number(value ?? 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function toClientStatus(status) {
  if (status === "APPROVED") return "approved";
  if (status === "HIDDEN") return "hidden";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function deriveCourseStatus(course) {
  return toClientStatus(course.db_status);
}

function getStatusLabel(status) {
  if (status === "approved") return "Da duyet";
  if (status === "hidden") return "Da an";
  if (status === "rejected") return "Tu choi";
  return "Cho duyet";
}

async function getBaseCourses() {
  const [rows] = await db.query(`
    SELECT
      c.course_id AS id,
      c.course_name AS title,
      c.description,
      c.price,
      c.thumbnail_url AS thumbnail,
      c.status AS db_status,
      c.created_at,
      cat.category_name AS category_name,
      u.full_name AS instructor_name,
      u.avatar_url AS instructor_avatar,
      COUNT(DISTINCT e.enrollment_id) AS enrolled_students,
      COUNT(DISTINCT r.review_id) AS review_count,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COALESCE((
        SELECT SUM(p.amount)
        FROM course_batches revenue_batch
        INNER JOIN payments p ON p.batch_id = revenue_batch.batch_id
        WHERE revenue_batch.course_id = c.course_id
          AND p.payment_status = 'SUCCESS'
      ), 0) AS total_revenue
    FROM courses c
    LEFT JOIN course_categories cat ON cat.category_id = c.category_id
    LEFT JOIN users u ON u.user_id = c.teacher_id
    LEFT JOIN course_batches b ON b.course_id = c.course_id
    LEFT JOIN enrollments e ON e.batch_id = b.batch_id
    LEFT JOIN course_reviews r ON r.course_id = c.course_id
    GROUP BY
      c.course_id,
      c.course_name,
      c.description,
      c.price,
      c.thumbnail_url,
      c.status,
      c.created_at,
      cat.category_name,
      u.full_name,
      u.avatar_url
    ORDER BY c.created_at DESC, c.course_id DESC
  `);

  return rows.map((row) => {
    const status = deriveCourseStatus(row);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      price: formatCurrency(row.price),
      thumbnail: row.thumbnail,
      category: row.category_name ?? "Chua phan loai",
      instructorName: row.instructor_name ?? "Chua co giang vien",
      instructorAvatar: row.instructor_avatar,
      enrolledStudents: Number(row.enrolled_students ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      rating: Number(Number(row.avg_rating ?? 0).toFixed(1)),
      totalRevenue: formatCurrency(row.total_revenue),
      status,
      statusLabel: getStatusLabel(status),
    };
  });
}

export async function getAdminCoursesPageData() {
  const courses = await getBaseCourses();

  const [totalStudentsRows] = await db.query(`
    SELECT COUNT(DISTINCT e.student_id) AS active_students
    FROM enrollments e
    INNER JOIN users u ON u.user_id = e.student_id
    WHERE u.role = 'STUDENT'
      AND e.status IN ('ACTIVE', 'COMPLETED')
  `);

  const [monthlyRevenueRows] = await db.query(`
    SELECT COALESCE(SUM(amount), 0) AS monthly_revenue
    FROM payments
    WHERE payment_status = 'SUCCESS'
      AND paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);

  const pendingCount = courses.filter((course) => course.status === "pending").length;

  return {
    summary: {
      totalCourses: {
        value: courses.length,
        note: "12% so voi thang truoc",
      },
      pendingReview: {
        value: pendingCount,
        note: "Can xu ly som",
      },
      activeStudents: {
        value: formatCompactNumber(totalStudentsRows[0]?.active_students ?? 0),
        note: "Phu song toan cau",
      },
      monthlyRevenue: {
        value: formatCurrency(monthlyRevenueRows[0]?.monthly_revenue ?? 0),
        note: "Du bao tang truong tich cuc",
      },
    },
    categories: [
      { key: "all", label: "Tat ca danh muc", active: true },
      ...Array.from(new Set(courses.map((course) => course.category))).map((category) => ({
        key: category.toLowerCase().replace(/\s+/g, "-"),
        label: category,
        active: false,
      })),
    ],
    courses,
    pagination: {
      total: courses.length,
      currentPage: 1,
      pageSize: 4,
    },
  };
}

export async function getAdminCourseDetail(courseId) {
  const courses = await getBaseCourses();
  return courses.find((course) => course.id === Number(courseId)) ?? null;
}

export async function reviewAdminCourse(courseId, status) {
  const detail = await getAdminCourseDetail(courseId);

  if (!detail) return null;

  const dbStatus =
    status === "approved"
      ? "APPROVED"
      : status === "rejected"
        ? "REJECTED"
        : status === "hidden"
          ? "HIDDEN"
          : "PENDING";

  await db.query("UPDATE courses SET status = ? WHERE course_id = ?", [
    dbStatus,
    courseId,
  ]);

  const [courseRows] = await db.query(
    "SELECT teacher_id, course_name FROM courses WHERE course_id = ? LIMIT 1",
    [courseId],
  );
  const course = courseRows[0];

  if (course) {
    const type =
      status === "approved"
        ? "COURSE_APPROVED"
        : status === "rejected"
          ? "COURSE_REJECTED"
          : status === "hidden"
            ? "COURSE_HIDDEN"
            : "COURSE_PENDING";

    await createNotification({
      userId: course.teacher_id,
      type,
      title:
        status === "approved"
          ? "Khóa học đã được duyệt"
          : status === "rejected"
            ? "Khóa học bị từ chối"
            : status === "hidden"
              ? "Khóa học đã bị ẩn"
              : "Khóa học đang chờ duyệt",
      content: `${course.course_name} vừa được cập nhật trạng thái.`,
      referenceType: "COURSE",
      referenceId: Number(courseId),
      targetUrl: `/instructor/courses?courseId=${courseId}`,
      priority: status === "rejected" || status === "hidden" ? "HIGH" : "NORMAL",
    }).catch((error) => {
      console.error("Failed to notify instructor about course review.", error);
    });
  }

  return {
    id: Number(courseId),
    status,
    statusLabel: getStatusLabel(status),
  };
}
