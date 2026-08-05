import db from "../db.js";

const columnByPermission = {
  users: "can_manage_users",
  courses: "can_manage_courses",
  finance: "can_manage_finance",
  system: "can_manage_system",
};

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

export function requireAdminPermission(permission) {
  return async (req, res, next) => {
    const column = columnByPermission[permission];
    if (!column) {
      return res.status(500).json({ success: false, message: "Invalid permission group." });
    }

    try {
      await ensurePermissionTable();
      const [rows] = await db.query(
        `SELECT ${column} AS allowed
         FROM admin_user_permissions
         WHERE user_id = ?
         LIMIT 1`,
        [req.auth.user.id],
      );

      // Admin accounts without an explicit permission row remain super admins.
      if (rows.length === 0 || Boolean(rows[0].allowed)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Tài khoản admin không có quyền sử dụng nhóm chức năng này.",
      });
    } catch (error) {
      next(error);
    }
  };
}
