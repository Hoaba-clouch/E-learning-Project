import db from "../db.js";
import { createNotification } from "./notification.service.js";

async function getEnrollment(studentId, batchId) {
  const [rows] = await db.query(
    `SELECT e.enrollment_id, b.batch_id, b.teacher_id, b.course_id
     FROM enrollments e
     INNER JOIN course_batches b ON b.batch_id = e.batch_id
     WHERE e.student_id = ? AND e.batch_id = ?
       AND e.status IN ('ACTIVE','COMPLETED') LIMIT 1`,
    [studentId, batchId],
  );
  return rows[0] ?? null;
}

export async function getStudentInteractionData(studentId, filters = {}) {
  const params = [];
  const where = ["d.status <> 'HIDDEN'"];
  if (filters.courseId) {
    where.push("c.course_id = ?");
    params.push(Number(filters.courseId));
  }
  if (filters.type === "QUESTION") where.push("d.discussion_type = 'QUESTION'");
  if (filters.mine) {
    where.push("d.user_id = ?");
    params.push(studentId);
  }
  if (filters.unresolved) where.push("d.status = 'OPEN'");
  if (filters.search) {
    where.push("(d.title LIKE ? OR d.content LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const [enrolledCourseRows] = await db.query(
    `SELECT DISTINCT c.course_id id, c.course_name name, b.batch_id batchId,
            b.batch_name batchName
     FROM enrollments e
     INNER JOIN course_batches b ON b.batch_id=e.batch_id
     INNER JOIN courses c ON c.course_id=b.course_id
     WHERE e.student_id=? AND e.status IN ('ACTIVE','COMPLETED')
     ORDER BY c.course_name`,
    [studentId],
  );
  const courseRows = Array.from(
    new Map(enrolledCourseRows.map((row) => [row.id, { id: row.id, name: row.name }])).values(),
  );
  const [lessonRows] = await db.query(
    `SELECT l.lesson_id id, l.lesson_title title, b.batch_id batchId
     FROM enrollments e
     INNER JOIN course_batches b ON b.batch_id=e.batch_id
     INNER JOIN course_modules m ON m.course_id=b.course_id
     INNER JOIN lessons l ON l.module_id=m.module_id
     WHERE e.student_id=? AND e.status IN ('ACTIVE','COMPLETED')
     ORDER BY m.order_no,l.order_no`,
    [studentId],
  );
  const [rows] = await db.query(
    `SELECT d.discussion_id,d.batch_id,d.lesson_id,d.user_id,d.discussion_type,
            d.title,d.content,d.status,d.is_pinned,d.created_at,d.updated_at,
            author.full_name author_name,author.avatar_url author_avatar,
            author.role author_role,c.course_id,c.course_name,b.batch_name,
            l.lesson_title,
            COUNT(DISTINCT dc.comment_id) comment_count,
            COUNT(DISTINCT dr.reaction_id) like_count,
            MAX(dr.user_id = ?) liked_by_me
     FROM discussions d
     INNER JOIN course_batches b ON b.batch_id=d.batch_id
     INNER JOIN courses c ON c.course_id=b.course_id
     INNER JOIN enrollments viewer_enrollment
       ON viewer_enrollment.batch_id=d.batch_id
      AND viewer_enrollment.student_id=?
      AND viewer_enrollment.status IN ('ACTIVE','COMPLETED')
     LEFT JOIN users author ON author.user_id=d.user_id
     LEFT JOIN lessons l ON l.lesson_id=d.lesson_id
     LEFT JOIN discussion_comments dc
       ON dc.discussion_id=d.discussion_id AND dc.status='VISIBLE'
     LEFT JOIN discussion_reactions dr ON dr.discussion_id=d.discussion_id
     WHERE ${where.join(" AND ")}
     GROUP BY d.discussion_id
     ORDER BY d.is_pinned DESC,d.updated_at DESC`,
    [studentId, studentId, ...params],
  );
  const ids = rows.map((row) => row.discussion_id);
  let comments = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    [comments] = await db.query(
      `SELECT dc.comment_id,dc.discussion_id,dc.parent_comment_id,dc.user_id,
              dc.content,dc.is_instructor_answer,dc.created_at,
              u.full_name author_name,u.avatar_url author_avatar,u.role author_role
       FROM discussion_comments dc
       LEFT JOIN users u ON u.user_id=dc.user_id
       WHERE dc.discussion_id IN (${placeholders}) AND dc.status='VISIBLE'
       ORDER BY dc.created_at`,
      ids,
    );
  }
  return {
    courses: courseRows,
    enrolledCourses: enrolledCourseRows,
    lessons: lessonRows,
    discussions: rows.map((row) => ({
      id: Number(row.discussion_id),
      batchId: Number(row.batch_id),
      lessonId: row.lesson_id ? Number(row.lesson_id) : null,
      type: row.discussion_type,
      title: row.title,
      content: row.content,
      status: row.status,
      isPinned: Boolean(row.is_pinned),
      isMine: Number(row.user_id) === Number(studentId),
      createdAt: row.created_at,
      course: { id: Number(row.course_id), name: row.course_name },
      batchName: row.batch_name,
      lessonTitle: row.lesson_title,
      author: {
        id: Number(row.user_id),
        name: row.author_name ?? "Tài khoản không còn tồn tại",
        avatar: row.author_avatar, role: row.author_role,
      },
      commentCount: Number(row.comment_count),
      likeCount: Number(row.like_count),
      likedByMe: Boolean(row.liked_by_me),
      comments: comments.filter((item) => item.discussion_id === row.discussion_id)
        .map((item) => ({
          id: Number(item.comment_id),
          parentId: item.parent_comment_id ? Number(item.parent_comment_id) : null,
          content: item.content,
          isInstructorAnswer: Boolean(item.is_instructor_answer),
          isMine: Number(item.user_id) === Number(studentId),
          createdAt: item.created_at,
          author: {
            id: Number(item.user_id),
            name: item.author_name ?? "Tài khoản không còn tồn tại",
            avatar: item.author_avatar, role: item.author_role },
        })),
    })),
  };
}

async function getAccessibleDiscussion(studentId, discussionId) {
  const [rows] = await db.query(
    `SELECT d.discussion_id, d.batch_id, b.teacher_id
     FROM discussions d
     INNER JOIN course_batches b ON b.batch_id = d.batch_id
     INNER JOIN enrollments e ON e.batch_id = d.batch_id
     WHERE d.discussion_id = ?
       AND e.student_id = ?
       AND e.status IN ('ACTIVE','COMPLETED')
       AND d.status <> 'HIDDEN'
     LIMIT 1`,
    [discussionId, studentId],
  );

  return rows[0] ?? null;
}

export async function createStudentDiscussion(studentId, payload) {
  const batchId = Number(payload.batchId);
  const enrollment = await getEnrollment(studentId, batchId);
  if (!enrollment) return null;
  const type = payload.type === "QUESTION" ? "QUESTION" : "DISCUSSION";
  const title = String(payload.title ?? "").trim();
  const content = String(payload.content ?? "").trim();
  const lessonId = payload.lessonId ? Number(payload.lessonId) : null;
  if (lessonId) {
    const [lessonRows] = await db.query(
      `SELECT l.lesson_id
       FROM lessons l
       INNER JOIN course_modules m ON m.module_id = l.module_id
       WHERE l.lesson_id = ? AND m.course_id = ?
       LIMIT 1`,
      [lessonId, enrollment.course_id],
    );

    if (!lessonRows[0]) {
      throw new Error("Lesson does not belong to this class course.");
    }
  }
  if (!title || !content) throw new Error("Tiêu đề và nội dung là bắt buộc.");
  const [result] = await db.query(
    `INSERT INTO discussions
      (batch_id,lesson_id,user_id,discussion_type,title,content)
     VALUES (?,?,?,?,?,?)`,
    [batchId, lessonId, studentId, type, title, content],
  );
  await createNotification({
    userId: enrollment.teacher_id,
    type: "DISCUSSION_CREATED",
    title: type === "QUESTION" ? "Có câu hỏi mới" : "Có thảo luận mới",
    content: title,
    referenceType: "DISCUSSION",
    referenceId: result.insertId,
    targetUrl: "/instructor/interaction",
  }).catch(() => undefined);
  return { id: Number(result.insertId) };
}

export async function createStudentDiscussionComment(studentId, discussionId, payload) {
  const [rows] = await db.query(
    `SELECT d.discussion_id,b.teacher_id
     FROM discussions d
     INNER JOIN course_batches b ON b.batch_id=d.batch_id
     INNER JOIN enrollments e ON e.batch_id=b.batch_id
     WHERE d.discussion_id=? AND e.student_id=?
       AND e.status IN ('ACTIVE','COMPLETED') AND d.status<>'HIDDEN' LIMIT 1`,
    [discussionId, studentId],
  );
  if (!rows[0]) return null;
  const content = String(payload.content ?? "").trim();
  if (!content) throw new Error("Nội dung phản hồi là bắt buộc.");
  const [result] = await db.query(
    `INSERT INTO discussion_comments
      (discussion_id,parent_comment_id,user_id,content)
     VALUES (?,?,?,?)`,
    [discussionId, payload.parentId || null, studentId, content],
  );
  await db.query("UPDATE discussions SET updated_at=NOW() WHERE discussion_id=?", [discussionId]);
  await createNotification({
    userId: rows[0].teacher_id,
    type: "DISCUSSION_COMMENTED",
    title: "Có phản hồi mới trong thảo luận",
    content,
    referenceType: "DISCUSSION",
    referenceId: Number(discussionId),
    targetUrl: "/instructor/interaction",
  }).catch(() => undefined);
  return { id: Number(result.insertId) };
}

export async function toggleDiscussionReaction(studentId, discussionId) {
  const discussion = await getAccessibleDiscussion(studentId, discussionId);
  if (!discussion) return null;

  const [existing] = await db.query(
    "SELECT reaction_id FROM discussion_reactions WHERE discussion_id=? AND user_id=?",
    [discussionId, studentId],
  );
  if (existing[0]) {
    await db.query("DELETE FROM discussion_reactions WHERE reaction_id=?", [existing[0].reaction_id]);
    return { liked: false };
  }
  await db.query(
    "INSERT INTO discussion_reactions (discussion_id,user_id) VALUES (?,?)",
    [discussionId, studentId],
  );
  return { liked: true };
}

export async function updateOwnDiscussion(studentId, discussionId, payload) {
  const fields = [];
  const values = [];
  if (payload.title !== undefined) { fields.push("title=?"); values.push(String(payload.title).trim()); }
  if (payload.content !== undefined) { fields.push("content=?"); values.push(String(payload.content).trim()); }
  if (payload.status === "RESOLVED" || payload.status === "OPEN") {
    fields.push("status=?"); values.push(payload.status);
  }
  if (!fields.length) throw new Error("Không có dữ liệu cập nhật.");
  values.push(discussionId, studentId);
  const [result] = await db.query(
    `UPDATE discussions SET ${fields.join(",")}, updated_at=NOW()
     WHERE discussion_id=? AND user_id=? AND status <> 'HIDDEN'`,
    values,
  );
  return result.affectedRows > 0;
}

export async function reportInteractionContent(studentId, payload) {
  const type = String(payload.targetType ?? "").toUpperCase();
  if (!["DISCUSSION","COMMENT","REVIEW"].includes(type)) throw new Error("Loại báo cáo không hợp lệ.");
  const [result] = await db.query(
    `INSERT INTO content_reports
      (reporter_id,target_type,target_id,reason,details)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE reason=VALUES(reason),details=VALUES(details),status='PENDING'`,
    [studentId, type, Number(payload.targetId), String(payload.reason ?? "Nội dung không phù hợp"),
      String(payload.details ?? "").trim() || null],
  );
  return { id: Number(result.insertId || 0), reported: true };
}
