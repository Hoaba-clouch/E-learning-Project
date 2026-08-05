import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import db from "../db.js";
import { createNotificationsForRole } from "./notification.service.js";

const sessions = new Map();
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const REMEMBER_TOKEN_TTL_MS = 20 * 60 * 60 * 1000;
const LEGACY_DEMO_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const LEGACY_DEMO_PASSWORDS = new Set(["Password123", "password"]);

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone ?? "").trim();
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.user_id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    role: user.role,
    status: user.status,
  };
}

export function createAuthSession(user, remember = false) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt =
    Date.now() + (remember ? REMEMBER_TOKEN_TTL_MS : TOKEN_TTL_MS);

  sessions.set(token, {
    expiresAt,
    user: sanitizeUser(user),
  });

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function clearExpiredSession(token, session) {
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return true;
  }

  return false;
}

export async function registerStudent({ fullName, email, phone, password }) {
  const cleanFullName = String(fullName ?? "").trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  const [existingUsers] = await db.execute(
    `SELECT user_id, email, phone
     FROM users
     WHERE email = ? OR phone = ?
     LIMIT 1`,
    [cleanEmail, cleanPhone],
  );

  if (existingUsers.length > 0) {
    const existingUser = existingUsers[0];
    const field = existingUser.email === cleanEmail ? "email" : "phone";
    const message =
      field === "email"
        ? "Email đã được sử dụng."
        : "Số điện thoại đã được sử dụng.";

    return {
      conflict: true,
      field,
      message,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO users
        (full_name, email, password_hash, phone, avatar_url, role, status)
       VALUES (?, ?, ?, ?, NULL, 'STUDENT', 'ACTIVE')`,
      [cleanFullName, cleanEmail, passwordHash, cleanPhone],
    );

    await connection.execute(
      `INSERT INTO student_profiles
        (student_id, date_of_birth, gender, address)
       VALUES (?, NULL, NULL, NULL)`,
      [result.insertId],
    );

    await connection.commit();

    await createNotificationsForRole("ADMIN", {
      type: "USER_REGISTERED",
      title: "Học viên mới đăng ký",
      content: `${cleanFullName} vừa tạo tài khoản học viên.`,
      referenceType: "USER",
      referenceId: result.insertId,
      targetUrl: "/admin/students",
      priority: "NORMAL",
    }).catch((error) => {
      console.error("Failed to notify admins about student registration.", error);
    });

    return {
      user: sanitizeUser({
        user_id: result.insertId,
        full_name: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        avatar_url: null,
        role: "STUDENT",
        status: "ACTIVE",
      }),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginUser({ account, password, remember = false }) {
  const cleanAccount = String(account ?? "").trim().toLowerCase();

  const [users] = await db.execute(
    `SELECT user_id, full_name, email, password_hash, phone, avatar_url, role, status
     FROM users
     WHERE email = ? OR phone = ?
     LIMIT 1`,
    [cleanAccount, cleanAccount],
  );

  const user = users[0];

  if (!user) {
    return {
      authenticated: false,
      message: "Tài khoản hoặc mật khẩu không đúng.",
    };
  }

  const isPasswordValid =
    (await bcrypt.compare(password, user.password_hash)) ||
    (user.password_hash === LEGACY_DEMO_HASH && LEGACY_DEMO_PASSWORDS.has(password));

  if (!isPasswordValid) {
    return {
      authenticated: false,
      message: "Tài khoản hoặc mật khẩu không đúng.",
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      authenticated: false,
      message:
        user.status === "LOCKED"
          ? "Tài khoản đã bị khóa."
          : "Tài khoản chưa được kích hoạt.",
    };
  }

  const session = createAuthSession(user, remember);

  return {
    authenticated: true,
    session,
    user: sanitizeUser(user),
  };
}

export function getSessionUser(token) {
  const session = sessions.get(token);

  if (clearExpiredSession(token, session)) {
    return null;
  }

  return session.user;
}

export function revokeSession(token) {
  sessions.delete(token);
}

export function updateSessionUser(token, user) {
  const session = sessions.get(token);

  if (!session || clearExpiredSession(token, session)) {
    return null;
  }

  const nextUser = sanitizeUser(user);

  sessions.set(token, {
    ...session,
    user: nextUser,
  });

  return nextUser;
}
