import fs from "fs";
import path from "path";
import multer from "multer";
import db from "../db.js";

const SERVER_BASE_URL =
  process.env.PUBLIC_SERVER_URL ??
  `http://localhost:${process.env.PORT || 3000}`;
const submissionsDirectory = path.resolve(process.cwd(), "uploads", "submissions");

fs.mkdirSync(submissionsDirectory, { recursive: true });

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeAssetUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${SERVER_BASE_URL}${url}`;
  }

  return `${SERVER_BASE_URL}/${url}`;
}

function isGithubUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().includes("github.com");
  } catch {
    return false;
  }
}

function isGoogleDriveUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("drive.google.com") || hostname.includes("docs.google.com");
  } catch {
    return false;
  }
}

function parseSubmissionContent(content) {
  if (!content) {
    return {
      note: null,
      githubUrl: null,
      driveUrl: null,
      originalFileName: null,
    };
  }

  try {
    const parsed = JSON.parse(content);

    return {
      note: parsed.note ?? null,
      githubUrl: parsed.githubUrl ?? null,
      driveUrl: parsed.driveUrl ?? null,
      originalFileName: parsed.originalFileName ?? null,
    };
  } catch {
    return {
      note: content,
      githubUrl: null,
      driveUrl: null,
      originalFileName: null,
    };
  }
}

function mapSubmissionRow(row) {
  const metadata = parseSubmissionContent(row.content);

  return {
    id: row.submission_id,
    fileUrl: normalizeAssetUrl(row.file_url),
    originalFileName: metadata.originalFileName,
    note: metadata.note,
    githubUrl: metadata.githubUrl,
    driveUrl: metadata.driveUrl,
    submittedAt: row.submitted_at,
    score: row.score === null ? null : Number(row.score),
    feedback: row.feedback,
    gradedAt: row.graded_at,
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, submissionsDirectory);
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    callback(
      null,
      `${timestamp}-${sanitizeFileName(baseName)}${sanitizeFileName(extension)}`,
    );
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const assignmentUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Định dạng file chưa được hỗ trợ."));
  },
}).single("attachment");

async function getAssignmentForStudent(assignmentId, studentId) {
  const [rows] = await db.execute(
    `SELECT DISTINCT
       a.assignment_id
     FROM assignments a
     INNER JOIN lessons l ON l.lesson_id = a.lesson_id
     INNER JOIN course_modules cm ON cm.module_id = l.module_id
     INNER JOIN courses c ON c.course_id = cm.course_id
     INNER JOIN course_batches cb ON cb.course_id = c.course_id
     INNER JOIN enrollments e ON e.batch_id = cb.batch_id
     WHERE a.assignment_id = ?
       AND e.student_id = ?
       AND e.status IN ('PENDING', 'ACTIVE', 'COMPLETED')
     LIMIT 1`,
    [assignmentId, studentId],
  );

  return rows[0] ?? null;
}

export async function saveStudentAssignmentSubmission(
  assignmentId,
  studentId,
  payload,
) {
  const assignment = await getAssignmentForStudent(assignmentId, studentId);

  if (!assignment) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy bài tập thuộc khóa học của bạn.",
    };
  }

  const note = String(payload.note ?? "").trim();
  const githubUrl = String(payload.githubUrl ?? "").trim();
  const driveUrl = String(payload.driveUrl ?? "").trim();
  const file = payload.file ?? null;

  if (!file && !githubUrl && !driveUrl) {
    return {
      ok: false,
      status: 400,
      message: "Hãy tải file lên hoặc dán ít nhất một link GitHub/Google Drive.",
    };
  }

  if (githubUrl && !isGithubUrl(githubUrl)) {
    return {
      ok: false,
      status: 400,
      message: "Link GitHub chưa đúng định dạng.",
    };
  }

  if (driveUrl && !isGoogleDriveUrl(driveUrl)) {
    return {
      ok: false,
      status: 400,
      message: "Link Google Drive chưa đúng định dạng.",
    };
  }

  if (note.length > 2000) {
    return {
      ok: false,
      status: 400,
      message: "Ghi chú không được vượt quá 2000 ký tự.",
    };
  }

  const [existingRows] = await db.execute(
    `SELECT file_url, content
     FROM assignment_submissions
     WHERE assignment_id = ? AND student_id = ?
     LIMIT 1`,
    [assignmentId, studentId],
  );

  const existingSubmission = existingRows[0] ?? null;
  const existingMetadata = parseSubmissionContent(existingSubmission?.content ?? null);
  const fileUrl = file
    ? `/uploads/submissions/${file.filename}`
    : existingSubmission?.file_url ?? null;
  const content = JSON.stringify({
    note: note || null,
    githubUrl: githubUrl || null,
    driveUrl: driveUrl || null,
    originalFileName: file?.originalname ?? existingMetadata.originalFileName ?? null,
  });

  await db.execute(
    `INSERT INTO assignment_submissions (
       assignment_id,
       student_id,
       file_url,
       content,
       submitted_at
     )
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       file_url = VALUES(file_url),
       content = VALUES(content),
       submitted_at = NOW()`,
    [assignmentId, studentId, fileUrl, content],
  );

  const [rows] = await db.execute(
    `SELECT
       submission_id,
       file_url,
       content,
       submitted_at,
       score,
       feedback,
       graded_at
     FROM assignment_submissions
     WHERE assignment_id = ? AND student_id = ?
     LIMIT 1`,
    [assignmentId, studentId],
  );

  return {
    ok: true,
    submission: mapSubmissionRow(rows[0]),
  };
}

export function mapAssignmentSubmission(row) {
  return mapSubmissionRow(row);
}
