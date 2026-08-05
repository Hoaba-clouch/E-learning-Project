import db from "../db.js";

export async function getStudentProfileRow(studentId) {
  const [rows] = await db.execute(
    `SELECT
       u.user_id,
       u.full_name,
       u.email,
       u.phone,
       u.avatar_url,
       u.role,
       u.status,
       sp.date_of_birth,
       sp.gender,
       sp.address
     FROM users u
     LEFT JOIN student_profiles sp ON sp.student_id = u.user_id
     WHERE u.user_id = ? AND u.role = 'STUDENT'
     LIMIT 1`,
    [studentId],
  );

  return rows[0] ?? null;
}

export async function updateStudentProfileRow(studentId, payload) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE users
       SET full_name = ?, phone = ?, avatar_url = ?
       WHERE user_id = ? AND role = 'STUDENT'`,
      [payload.fullName, payload.phone, payload.avatarUrl, studentId],
    );

    await connection.execute(
      `INSERT INTO student_profiles (student_id, date_of_birth, gender, address)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         date_of_birth = VALUES(date_of_birth),
         gender = VALUES(gender),
         address = VALUES(address)`,
      [studentId, payload.dateOfBirth, payload.gender, payload.address],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getStudentProfileRow(studentId);
}

export async function findStudentByPhone(phone, exceptStudentId) {
  const [rows] = await db.execute(
    `SELECT user_id
     FROM users
     WHERE phone = ?
       AND role = 'STUDENT'
       AND user_id <> ?
     LIMIT 1`,
    [phone, exceptStudentId],
  );

  return rows[0] ?? null;
}

export async function getStudentEnrollmentStatsRow(studentId) {
  const [rows] = await db.execute(
    `SELECT
       COUNT(*) AS total_courses,
       SUM(CASE WHEN e.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_courses,
       SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_courses,
       COALESCE(AVG(e.progress_percent), 0) AS average_progress
     FROM enrollments e
     WHERE e.student_id = ?`,
    [studentId],
  );

  return rows[0] ?? null;
}

export async function getStudentCertificateRows(studentId) {
  const [rows] = await db.execute(
    `SELECT
       cert.certificate_id,
       cert.batch_id,
       cert.certificate_code,
       cert.certificate_url,
       cert.issued_at,
       batch.batch_name,
       batch.batch_code,
       course.course_id,
       course.course_name,
       course.level,
       teacher.user_id AS teacher_id,
       teacher.full_name AS teacher_name
     FROM certificates cert
     INNER JOIN course_batches batch ON batch.batch_id = cert.batch_id
     INNER JOIN courses course ON course.course_id = batch.course_id
     LEFT JOIN users teacher ON teacher.user_id = course.teacher_id
     WHERE cert.student_id = ?
     ORDER BY cert.issued_at DESC, cert.certificate_id DESC`,
    [studentId],
  );

  return rows;
}

export async function getStudentPaymentRows(studentId) {
  const [rows] = await db.execute(
    `SELECT
       payment.payment_id,
       payment.student_id,
       payment.batch_id,
       payment.amount,
       payment.payment_method,
       payment.payment_status,
       payment.transaction_code,
       payment.paid_at,
       payment.created_at,
       batch.batch_name,
       batch.batch_code,
       course.course_id,
       course.course_name,
       teacher.user_id AS teacher_id,
       teacher.full_name AS teacher_name
     FROM payments payment
     LEFT JOIN course_batches batch ON batch.batch_id = payment.batch_id
     LEFT JOIN courses course ON course.course_id = batch.course_id
     LEFT JOIN users teacher ON teacher.user_id = course.teacher_id
     WHERE payment.student_id = ?
     ORDER BY COALESCE(payment.paid_at, payment.created_at) DESC, payment.payment_id DESC`,
    [studentId],
  );

  return rows;
}
