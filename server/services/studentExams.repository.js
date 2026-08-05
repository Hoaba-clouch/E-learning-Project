import db from "../db.js";

function getExecutor(connection) {
  return connection ?? db;
}

export async function getExamOverviewRows() {
  const [rows] = await db.execute(
    `SELECT
       exam.exam_id,
       exam.course_id,
       exam.title,
       exam.description,
       exam.open_at,
       exam.close_at,
       exam.duration_minutes,
       exam.max_score,
       exam.pass_score,
       exam.attempt_limit,
       exam.status,
       exam.created_at,
       course.course_name,
       course.thumbnail_url,
       course.level,
       category.category_id,
       category.category_name,
       teacher.user_id AS teacher_id,
       teacher.full_name AS teacher_name,
       teacher.email AS teacher_email,
       teacher.avatar_url AS teacher_avatar_url,
       COUNT(DISTINCT question.question_id) AS question_count
     FROM course_exams exam
     INNER JOIN courses course ON course.course_id = exam.course_id
     INNER JOIN course_categories category ON category.category_id = course.category_id
     INNER JOIN users teacher ON teacher.user_id = course.teacher_id
     LEFT JOIN course_exam_questions question ON question.exam_id = exam.exam_id
     WHERE course.status = 'APPROVED'
     GROUP BY
       exam.exam_id,
       exam.course_id,
       exam.title,
       exam.description,
       exam.open_at,
       exam.close_at,
       exam.duration_minutes,
       exam.max_score,
       exam.pass_score,
       exam.attempt_limit,
       exam.status,
       exam.created_at,
       course.course_name,
       course.thumbnail_url,
       course.level,
       category.category_id,
       category.category_name,
       teacher.user_id,
       teacher.full_name,
       teacher.email,
       teacher.avatar_url
     ORDER BY COALESCE(exam.open_at, exam.created_at) DESC, exam.exam_id DESC`,
  );

  return rows;
}

export async function getClassQuizOverviewRows(studentId) {
  const [rows] = await db.execute(
    `SELECT
       quiz.quiz_id,
       quiz.batch_id,
       batch.course_id,
       batch.batch_code,
       batch.batch_name,
       batch.start_date,
       batch.end_date,
       batch.status AS batch_status,
       batch.learning_mode,
       batch.online_platform,
       quiz.title,
       quiz.description,
       quiz.duration_minutes,
       quiz.max_score,
       quiz.pass_score,
       quiz.attempt_limit,
       quiz.created_at,
       course.course_name,
       course.thumbnail_url,
       course.level,
       category.category_id,
       category.category_name,
       teacher.user_id AS teacher_id,
       teacher.full_name AS teacher_name,
       teacher.email AS teacher_email,
       teacher.avatar_url AS teacher_avatar_url,
       COUNT(DISTINCT question.question_id) AS question_count
     FROM quizzes quiz
     INNER JOIN course_batches batch ON batch.batch_id = quiz.batch_id
     INNER JOIN enrollments enroll
       ON enroll.batch_id = batch.batch_id
      AND enroll.student_id = ?
      AND enroll.status IN ('ACTIVE', 'COMPLETED')
     INNER JOIN courses course ON course.course_id = batch.course_id
     INNER JOIN course_categories category ON category.category_id = course.category_id
     INNER JOIN users teacher ON teacher.user_id = course.teacher_id
     LEFT JOIN questions question ON question.quiz_id = quiz.quiz_id
     WHERE quiz.lesson_id IS NULL
       AND course.status = 'APPROVED'
     GROUP BY
       quiz.quiz_id,
       quiz.batch_id,
       batch.course_id,
       batch.batch_code,
       batch.batch_name,
       batch.start_date,
       batch.end_date,
       batch.status,
       batch.learning_mode,
       batch.online_platform,
       quiz.title,
       quiz.description,
       quiz.duration_minutes,
       quiz.max_score,
       quiz.pass_score,
       quiz.attempt_limit,
       quiz.created_at,
       course.course_name,
       course.thumbnail_url,
       course.level,
       category.category_id,
       category.category_name,
       teacher.user_id,
       teacher.full_name,
       teacher.email,
       teacher.avatar_url
     ORDER BY quiz.created_at DESC, quiz.quiz_id DESC`,
    [studentId],
  );

  return rows;
}

export async function getBatchRowsByCourseIds(courseIds) {
  if (!courseIds.length) {
    return [];
  }

  const placeholders = courseIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT
       batch_id,
       course_id,
       batch_code,
       batch_name,
       start_date,
       end_date,
       status,
       learning_mode,
       online_platform
     FROM course_batches
     WHERE course_id IN (${placeholders})
     ORDER BY
       FIELD(status, 'OPEN', 'STARTED', 'FINISHED', 'DRAFT', 'CANCELLED'),
       start_date DESC,
       batch_id DESC`,
    courseIds,
  );

  return rows;
}

export async function getEnrollmentRowsByStudentAndCourseIds(studentId, courseIds) {
  if (!courseIds.length) {
    return [];
  }

  const placeholders = courseIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT
       enroll.enrollment_id,
       enroll.status AS enrollment_status,
       enroll.progress_percent,
       batch.course_id,
       batch.batch_id,
       batch.batch_code,
       batch.batch_name,
       batch.start_date,
       batch.end_date,
       batch.status AS batch_status,
       batch.learning_mode,
       batch.online_platform
     FROM enrollments enroll
     INNER JOIN course_batches batch ON batch.batch_id = enroll.batch_id
     WHERE enroll.student_id = ?
       AND batch.course_id IN (${placeholders})
       AND enroll.status IN ('PENDING', 'ACTIVE', 'COMPLETED')
     ORDER BY
       FIELD(enroll.status, 'ACTIVE', 'COMPLETED', 'PENDING'),
       enroll.enrolled_at DESC,
       enroll.enrollment_id DESC`,
    [studentId, ...courseIds],
  );

  return rows;
}

export async function getAttemptRowsByStudentAndExamIds(studentId, examIds) {
  if (!examIds.length) {
    return [];
  }

  const placeholders = examIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT
       attempt.attempt_id,
       attempt.exam_id,
       attempt.started_at,
       attempt.submitted_at,
       attempt.score,
       attempt.status,
       attempt.feedback,
       attempt.graded_at,
       attempt.graded_by,
       COUNT(DISTINCT answer.answer_id) AS answer_count
     FROM course_exam_attempts attempt
     LEFT JOIN course_exam_answers answer ON answer.attempt_id = attempt.attempt_id
     WHERE attempt.student_id = ?
       AND attempt.exam_id IN (${placeholders})
     GROUP BY
       attempt.attempt_id,
       attempt.exam_id,
       attempt.started_at,
       attempt.submitted_at,
       attempt.score,
       attempt.status,
       attempt.feedback,
       attempt.graded_at,
       attempt.graded_by
     ORDER BY COALESCE(attempt.submitted_at, attempt.started_at) DESC, attempt.attempt_id DESC`,
    [studentId, ...examIds],
  );

  return rows;
}

export async function getQuizAttemptRowsByStudentAndQuizIds(studentId, quizIds) {
  if (!quizIds.length) {
    return [];
  }

  const placeholders = quizIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT
       attempt.attempt_id,
       attempt.quiz_id,
       attempt.started_at,
       attempt.submitted_at,
       attempt.score,
       attempt.status,
       COUNT(DISTINCT answer.answer_id) AS answer_count
     FROM quiz_attempts attempt
     LEFT JOIN quiz_answers answer ON answer.attempt_id = attempt.attempt_id
     WHERE attempt.student_id = ?
       AND attempt.quiz_id IN (${placeholders})
     GROUP BY
       attempt.attempt_id,
       attempt.quiz_id,
       attempt.started_at,
       attempt.submitted_at,
       attempt.score,
       attempt.status
     ORDER BY COALESCE(attempt.submitted_at, attempt.started_at) DESC, attempt.attempt_id DESC`,
    [studentId, ...quizIds],
  );

  return rows;
}

export async function getQuestionRowsByExamId(examId) {
  const [rows] = await db.execute(
    `SELECT
       question.question_id,
       question.exam_id,
       question.question_text,
       question.question_type,
       question.score,
       question.order_no,
       option_item.option_id,
       option_item.option_text,
       option_item.is_correct,
       option_item.order_no AS option_order_no
     FROM course_exam_questions question
     LEFT JOIN course_exam_options option_item
       ON option_item.question_id = question.question_id
     WHERE question.exam_id = ?
     ORDER BY question.order_no ASC, question.question_id ASC, option_item.order_no ASC, option_item.option_id ASC`,
    [examId],
  );

  return rows;
}

export async function getQuestionRowsByQuizId(quizId) {
  const [rows] = await db.execute(
    `SELECT
       question.question_id,
       question.quiz_id AS exam_id,
       question.question_text,
       question.question_type,
       question.score,
       question.question_id AS order_no,
       option_item.option_id,
       option_item.option_text,
       option_item.is_correct,
       option_item.option_id AS option_order_no
     FROM questions question
     LEFT JOIN answer_options option_item
       ON option_item.question_id = question.question_id
     WHERE question.quiz_id = ?
     ORDER BY question.question_id ASC, option_item.option_id ASC`,
    [quizId],
  );

  return rows;
}

export async function getAttemptAnswers(attemptId) {
  const [rows] = await db.execute(
    `SELECT answer_id, attempt_id, question_id, option_id, essay_answer
     FROM course_exam_answers
     WHERE attempt_id = ?
     ORDER BY answer_id ASC`,
    [attemptId],
  );

  return rows;
}

export async function getQuizAttemptAnswers(attemptId) {
  const [rows] = await db.execute(
    `SELECT answer_id, attempt_id, question_id, option_id, essay_answer
     FROM quiz_answers
     WHERE attempt_id = ?
     ORDER BY answer_id ASC`,
    [attemptId],
  );

  return rows;
}

export async function createExamAttempt(connection, examId, studentId) {
  const executor = getExecutor(connection);
  const [result] = await executor.execute(
    `INSERT INTO course_exam_attempts (
       exam_id,
       student_id,
       started_at,
       submitted_at,
       score,
       status,
       feedback,
       graded_at,
       graded_by
     ) VALUES (?, ?, NOW(), NULL, 0, 'IN_PROGRESS', NULL, NULL, NULL)`,
    [examId, studentId],
  );

  return result.insertId;
}

export async function createQuizAttempt(connection, quizId, studentId) {
  const executor = getExecutor(connection);
  const [result] = await executor.execute(
    `INSERT INTO quiz_attempts (
       quiz_id,
       student_id,
       started_at,
       submitted_at,
       score,
       status
     ) VALUES (?, ?, NOW(), NULL, 0, 'IN_PROGRESS')`,
    [quizId, studentId],
  );

  return result.insertId;
}

export async function deleteAttemptAnswers(connection, attemptId) {
  const executor = getExecutor(connection);
  await executor.execute(
    `DELETE FROM course_exam_answers WHERE attempt_id = ?`,
    [attemptId],
  );
}

export async function deleteQuizAttemptAnswers(connection, attemptId) {
  const executor = getExecutor(connection);
  await executor.execute(
    `DELETE FROM quiz_answers WHERE attempt_id = ?`,
    [attemptId],
  );
}

export async function insertAttemptAnswer(connection, attemptId, answer) {
  const executor = getExecutor(connection);
  await executor.execute(
    `INSERT INTO course_exam_answers (attempt_id, question_id, option_id, essay_answer)
     VALUES (?, ?, ?, ?)`,
    [
      attemptId,
      answer.questionId,
      answer.optionId ?? null,
      answer.essayAnswer ?? null,
    ],
  );
}

export async function insertQuizAttemptAnswer(connection, attemptId, answer) {
  const executor = getExecutor(connection);
  await executor.execute(
    `INSERT INTO quiz_answers (attempt_id, question_id, option_id, essay_answer)
     VALUES (?, ?, ?, ?)`,
    [
      attemptId,
      answer.questionId,
      answer.optionId ?? null,
      answer.essayAnswer ?? null,
    ],
  );
}

export async function updateAttemptSubmission(connection, attemptId, payload) {
  const executor = getExecutor(connection);
  await executor.execute(
    `UPDATE course_exam_attempts
     SET submitted_at = ?,
         score = ?,
         status = ?,
         feedback = ?,
         graded_at = ?,
         graded_by = ?
     WHERE attempt_id = ?`,
    [
      payload.submittedAt,
      payload.score,
      payload.status,
      payload.feedback ?? null,
      payload.gradedAt ?? null,
      payload.gradedBy ?? null,
      attemptId,
    ],
  );
}

export async function updateQuizAttemptSubmission(connection, attemptId, payload) {
  const executor = getExecutor(connection);
  await executor.execute(
    `UPDATE quiz_attempts
     SET submitted_at = ?,
         score = ?,
         status = ?
     WHERE attempt_id = ?`,
    [
      payload.submittedAt,
      payload.score,
      payload.status,
      attemptId,
    ],
  );
}

export async function getConnection() {
  return db.getConnection();
}
