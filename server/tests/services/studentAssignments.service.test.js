import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    execute: executeMock,
  },
}));

import { saveStudentAssignmentSubmission } from "../../services/studentAssignments.service.js";

describe("studentAssignments.service", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("should return 404 when the student does not belong to the assignment", async () => {
    // Test nghiệp vụ: nếu học viên không thuộc khóa học chứa bài tập này,
    // service phải từ chối ngay để tránh lưu submission sai phạm vi.
    executeMock.mockResolvedValueOnce([[]]);

    const result = await saveStudentAssignmentSubmission(99, 7, { note: "Đã làm" });

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "Không tìm thấy bài tập thuộc khóa học của bạn.",
    });
  });

  it("should reject empty submission payloads before touching the database", async () => {
    // Test nghiệp vụ: nếu không có file hoặc link nào được gửi,
    // service phải dừng lại sớm để tránh lưu một submission rỗng.
    executeMock.mockResolvedValueOnce([[{ assignment_id: 99 }]]);

    const result = await saveStudentAssignmentSubmission(99, 7, { note: "" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Hãy tải file lên hoặc dán ít nhất một link GitHub/Google Drive.",
    });
  });

  it("should reject invalid GitHub URLs before storing the submission", async () => {
    // Test nghiệp vụ: nếu link GitHub không đúng định dạng,
    // service phải chặn lại và không lưu dữ liệu sai.
    executeMock.mockResolvedValueOnce([[{ assignment_id: 99 }]]);

    const result = await saveStudentAssignmentSubmission(99, 7, {
      githubUrl: "https://example.com/not-github",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Link GitHub chưa đúng định dạng.",
    });
  });

  it("should save a new submission and normalize the returned payload", async () => {
    // Test nghiệp vụ: khi học viên nộp file hợp lệ,
    // service phải lưu submission mới và trả về thông tin đã được chuẩn hoá.
    executeMock
      .mockResolvedValueOnce([[{ assignment_id: 99 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[{
        submission_id: 1001,
        file_url: "/uploads/submissions/abc.pdf",
        content: JSON.stringify({
          note: "Hoàn thành",
          githubUrl: null,
          driveUrl: null,
          originalFileName: "abc.pdf",
        }),
        submitted_at: "2026-01-02 10:00:00",
        score: null,
        feedback: null,
        graded_at: null,
      }]]);

    const result = await saveStudentAssignmentSubmission(99, 7, {
      note: "Hoàn thành",
      file: {
        filename: "abc.pdf",
        originalname: "abc.pdf",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.submission.fileUrl).toContain("/uploads/submissions/abc.pdf");
    expect(result.submission.note).toBe("Hoàn thành");
    expect(result.submission.originalFileName).toBe("abc.pdf");
    expect(executeMock).toHaveBeenCalledTimes(4);
  });
});
