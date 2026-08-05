import db from "../db.js";
import { createNotification } from "./notification.service.js";

const permissionKeys = ["users", "courses", "finance", "system"];

async function ensurePermissionTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_user_permissions (
      user_id BIGINT PRIMARY KEY,
      can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_courses BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_finance BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_system BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_admin_permission_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);
}

function mapPermissions(row) {
  return {
    users: Boolean(row?.can_manage_users),
    courses: Boolean(row?.can_manage_courses),
    finance: Boolean(row?.can_manage_finance),
    system: Boolean(row?.can_manage_system),
  };
}

function mapUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    courseCount: Number(row.course_count ?? 0),
    activityCount: Number(row.activity_count ?? 0),
    permissions: mapPermissions(row),
  };
}

export async function getAdminUsersPageData() {
  await ensurePermissionTable();

  const [rows] = await db.query(`
    SELECT
      u.user_id AS id,
      u.full_name AS name,
      u.email,
      u.phone,
      u.avatar_url AS avatar,
      u.role,
      u.status,
      u.created_at,
      CASE
        WHEN u.role = 'TEACHER' THEN (
          SELECT COUNT(*) FROM courses c WHERE c.teacher_id = u.user_id
        )
        WHEN u.role = 'STUDENT' THEN (
          SELECT COUNT(DISTINCT b.course_id)
          FROM enrollments e
          INNER JOIN course_batches b ON b.batch_id = e.batch_id
          WHERE e.student_id = u.user_id
        )
        ELSE 0
      END AS course_count,
      (
        (SELECT COUNT(*) FROM course_reviews r WHERE r.student_id = u.user_id) +
        (SELECT COUNT(*) FROM payments p WHERE p.student_id = u.user_id) +
        (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = u.user_id)
      ) AS activity_count,
      ap.can_manage_users,
      ap.can_manage_courses,
      ap.can_manage_finance,
      ap.can_manage_system
    FROM users u
    LEFT JOIN admin_user_permissions ap ON ap.user_id = u.user_id
    ORDER BY u.created_at DESC, u.user_id DESC
  `);

  const users = rows.map(mapUser);

  return {
    summary: {
      total: users.length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      teachers: users.filter((user) => user.role === "TEACHER").length,
      students: users.filter((user) => user.role === "STUDENT").length,
      locked: users.filter((user) => user.status === "LOCKED").length,
    },
    users,
    permissionGroups: [
      { key: "users", label: "Người dùng" },
      { key: "courses", label: "Khóa học" },
      { key: "finance", label: "Tài chính" },
      { key: "system", label: "Cấu hình hệ thống" },
    ],
  };
}

export async function getAdminUserDetail(userId) {
  await ensurePermissionTable();

  const [userRows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.avatar_url AS avatar,
        u.role,
        u.status,
        u.created_at,
        ap.can_manage_users,
        ap.can_manage_courses,
        ap.can_manage_finance,
        ap.can_manage_system
      FROM users u
      LEFT JOIN admin_user_permissions ap ON ap.user_id = u.user_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (userRows.length === 0) return null;

  const user = mapUser(userRows[0]);
  let courses = [];

  if (user.role === "TEACHER") {
    const [rows] = await db.query(
      `SELECT course_id AS id, course_name AS title, status
       FROM courses WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 8`,
      [userId],
    );
    courses = rows;
  } else if (user.role === "STUDENT") {
    const [rows] = await db.query(
      `SELECT c.course_id AS id, c.course_name AS title, e.status,
              e.progress_percent AS progress
       FROM enrollments e
       INNER JOIN course_batches b ON b.batch_id = e.batch_id
       INNER JOIN courses c ON c.course_id = b.course_id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC LIMIT 8`,
      [userId],
    );
    courses = rows;
  }

  const [activityRows] = await db.query(
    `
      SELECT * FROM (
        SELECT 'payment' AS type,
               CONCAT('Thanh toán ', FORMAT(amount, 0, 'vi_VN'), ' VND') AS title,
               COALESCE(paid_at, created_at) AS activity_time
        FROM payments WHERE student_id = ?
        UNION ALL
        SELECT 'review', CONCAT('Đánh giá khóa học #', course_id), created_at
        FROM course_reviews WHERE student_id = ?
        UNION ALL
        SELECT 'course', CONCAT('Tạo khóa học: ', course_name), created_at
        FROM courses WHERE teacher_id = ?
      ) activities
      ORDER BY activity_time DESC
      LIMIT 10
    `,
    [userId, userId, userId],
  );

  return {
    ...user,
    courses,
    recentActivity: activityRows.map((row) => ({
      type: row.type,
      title: row.title,
      activityTime: row.activity_time,
    })),
  };
}

export async function updateAdminUser(userId, changes) {
  const role = String(changes.role ?? "").toUpperCase();
  const status = String(changes.status ?? "").toUpperCase();
  const fields = [];
  const values = [];

  if (role) {
    if (!["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      throw new Error("Invalid user role.");
    }
    fields.push("role = ?");
    values.push(role);
  }

  if (status) {
    if (!["ACTIVE", "INACTIVE", "LOCKED"].includes(status)) {
      throw new Error("Invalid user status.");
    }
    fields.push("status = ?");
    values.push(status);
  }

  if (fields.length === 0) return getAdminUserDetail(userId);

  values.push(userId);
  const connection = await db.getConnection();
  let affectedRows = 0;

  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`,
      values,
    );
    affectedRows = result.affectedRows;

    if (affectedRows > 0 && role === "TEACHER") {
      await connection.query(
        `INSERT IGNORE INTO teacher_profiles
          (teacher_id, bio, specialization, experience_years, qualification, workplace)
         VALUES (?, NULL, NULL, 0, NULL, NULL)`,
        [userId],
      );
    }

    if (affectedRows > 0 && role === "STUDENT") {
      await connection.query(
        `INSERT IGNORE INTO student_profiles
          (student_id, date_of_birth, gender, address)
         VALUES (?, NULL, NULL, NULL)`,
        [userId],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (affectedRows === 0) return null;

  if (status) {
    await createNotification({
      userId: Number(userId),
      type: status === "LOCKED" ? "ACCOUNT_LOCKED" : "ACCOUNT_STATUS_CHANGED",
      title: status === "LOCKED" ? "Tài khoản đã bị khóa" : "Trạng thái tài khoản đã thay đổi",
      content:
        status === "LOCKED"
          ? "Quản trị viên đã khóa tài khoản của bạn."
          : `Trạng thái tài khoản của bạn đã chuyển thành ${status}.`,
      referenceType: "USER",
      referenceId: Number(userId),
      targetUrl: "/student",
      priority: status === "LOCKED" ? "HIGH" : "NORMAL",
    }).catch((error) => {
      console.error("Failed to notify user about account status.", error);
    });
  }

  return getAdminUserDetail(userId);
}

export async function updateAdminUserPermissions(userId, permissions) {
  await ensurePermissionTable();
  const normalized = Object.fromEntries(
    permissionKeys.map((key) => [key, Boolean(permissions?.[key])]),
  );

  const [users] = await db.query(
    "SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1",
    [userId],
  );
  if (users.length === 0) return null;
  if (users[0].role !== "ADMIN") {
    throw new Error("Permissions can only be assigned to admin users.");
  }

  await db.query(
    `
      INSERT INTO admin_user_permissions
        (user_id, can_manage_users, can_manage_courses, can_manage_finance, can_manage_system)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        can_manage_users = VALUES(can_manage_users),
        can_manage_courses = VALUES(can_manage_courses),
        can_manage_finance = VALUES(can_manage_finance),
        can_manage_system = VALUES(can_manage_system)
    `,
    [
      userId,
      normalized.users,
      normalized.courses,
      normalized.finance,
      normalized.system,
    ],
  );

  return getAdminUserDetail(userId);
}
