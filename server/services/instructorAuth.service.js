import bcrypt from "bcryptjs";
import db from "../db.js";
import { createAuthSession } from "./auth.service.js";

const LEGACY_DEMO_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const LEGACY_DEMO_PASSWORDS = new Set(["Password123", "password"]);

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toInstructorSession(row) {
  return {
    teacherId: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.specialization ?? "Giảng viên",
    avatar: row.avatar,
    workplace: row.workplace ?? "",
  };
}

function toAuthUser(row) {
  return {
    user_id: row.id,
    full_name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    avatar_url: row.avatar,
    role: "TEACHER",
    status: row.status,
  };
}

async function getInstructorByEmail(email) {
  const [rows] = await db.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS name,
        u.email,
        u.phone,
        u.password_hash AS passwordHash,
        u.avatar_url AS avatar,
        u.status,
        tp.specialization,
        tp.workplace
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.teacher_id = u.user_id
      WHERE LOWER(u.email) = ? AND u.role = 'TEACHER'
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function loginInstructor(credentials) {
  const email = normalizeEmail(credentials?.email);
  const password = String(credentials?.password ?? "");

  if (!email || !password) {
    throw new Error("Email và mật khẩu không được để trống.");
  }

  const instructor = await getInstructorByEmail(email);
  if (!instructor) {
    throw new Error("Tài khoản giảng viên không tồn tại.");
  }

  if (instructor.status !== "ACTIVE") {
    throw new Error("Tài khoản giảng viên chưa hoạt động hoặc đã bị khóa.");
  }

  const isPasswordValid =
    (await bcrypt.compare(password, instructor.passwordHash)) ||
    (instructor.passwordHash === LEGACY_DEMO_HASH && LEGACY_DEMO_PASSWORDS.has(password));
  if (!isPasswordValid) {
    throw new Error("Mật khẩu không đúng.");
  }

  const session = createAuthSession(toAuthUser(instructor), true);
  return {
    ...toInstructorSession(instructor),
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: instructor.id,
      fullName: instructor.name,
      email: instructor.email,
      phone: instructor.phone ?? null,
      avatarUrl: instructor.avatar,
      role: "TEACHER",
      status: instructor.status,
    },
  };
}

export async function registerInstructor(registrationData) {
  const name = String(registrationData?.name ?? "").trim();
  const email = normalizeEmail(registrationData?.email);
  const password = String(registrationData?.password ?? "");
  const phone = String(registrationData?.phone ?? "").trim();
  const specialization = String(registrationData?.specialization ?? "").trim();
  const workplace = String(registrationData?.workplace ?? "").trim();

  if (!name || !email || !password) {
    throw new Error("Họ tên, email và mật khẩu không được để trống.");
  }

  if (password.length < 6) {
    throw new Error("Mật khẩu cần ít nhất 6 ký tự.");
  }

  const [existingRows] = await db.query("SELECT user_id FROM users WHERE LOWER(email) = ? LIMIT 1", [email]);
  if (existingRows[0]) {
    throw new Error("Email này đã được sử dụng.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `
        INSERT INTO users (full_name, email, password_hash, phone, avatar_url, role, status)
        VALUES (?, ?, ?, ?, NULL, 'TEACHER', 'ACTIVE')
      `,
      [name, email, passwordHash, phone || null],
    );

    const teacherId = Number(userResult.insertId);

    await connection.query(
      `
        INSERT INTO teacher_profiles (
          teacher_id,
          bio,
          specialization,
          experience_years,
          qualification,
          workplace
        )
        VALUES (?, NULL, ?, 0, NULL, ?)
      `,
      [teacherId, specialization || "Giảng viên mới", workplace || "E-learning Center"],
    );

    await connection.commit();
    const instructor = await getInstructorByEmail(email);
    const session = createAuthSession(toAuthUser(instructor), true);
    return {
      ...toInstructorSession(instructor),
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: instructor.id,
        fullName: instructor.name,
        email: instructor.email,
        phone: instructor.phone ?? null,
        avatarUrl: instructor.avatar,
        role: "TEACHER",
        status: instructor.status,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
