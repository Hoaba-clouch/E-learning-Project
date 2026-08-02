import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: createNotificationMock,
}));

import {
  createStudentDiscussion,
  createStudentDiscussionComment,
  reportInteractionContent,
  toggleDiscussionReaction,
} from "../../services/studentInteractions.service.js";

describe("studentInteractions.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
  });

  it("should return null when the student is not enrolled in the selected batch", async () => {
    // Test nghiệp vụ: nếu học viên chưa ghi danh vào batch này,
    // service không được tạo thảo luận và phải trả về null.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await createStudentDiscussion(11, {
      batchId: 88,
      title: "Câu hỏi về bài học",
      content: "Em chưa hiểu phần này",
    });

    expect(result).toBeNull();
  });

  it("should create a discussion and notify the teacher when the payload is valid", async () => {
    // Test nghiệp vụ: khi học viên đã ghi danh và nhập đủ tiêu đề, nội dung,
    // service phải lưu discussion mới và gửi thông báo cho giảng viên.
    queryMock
      .mockResolvedValueOnce([[{ enrollment_id: 1, batch_id: 88, teacher_id: 22, course_id: 5 }]])
      .mockResolvedValueOnce([{ insertId: 101 }]);

    const result = await createStudentDiscussion(11, {
      batchId: 88,
      title: "Câu hỏi về bài học",
      content: "Em chưa hiểu phần này",
    });

    expect(result).toEqual({ id: 101 });
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 22,
        type: "DISCUSSION_CREATED",
        referenceId: 101,
      }),
    );
  });

  it("should create a reply comment and mark the discussion as updated", async () => {
    // Test nghiệp vụ: khi học viên phản hồi một discussion hợp lệ,
    // service phải chèn comment mới, cập nhật thời gian chỉnh sửa và thông báo cho giảng viên.
    queryMock
      .mockResolvedValueOnce([[{ discussion_id: 55, teacher_id: 22 }]])
      .mockResolvedValueOnce([{ insertId: 77 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await createStudentDiscussionComment(11, 55, {
      content: "Cảm ơn anh/chị đã giải thích",
    });

    expect(result).toEqual({ id: 77 });
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 22,
        type: "DISCUSSION_COMMENTED",
        referenceId: 55,
      }),
    );
  });

  it("should toggle the reaction from liked to unliked", async () => {
    // Test nghiệp vụ: khi người dùng bấm thích một discussion đang được truy cập,
    // service phải tạo reaction mới; nếu bấm lại thì phải xóa reaction trước đó.
    queryMock
      .mockResolvedValueOnce([[{ discussion_id: 55, batch_id: 88, teacher_id: 22 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const firstResult = await toggleDiscussionReaction(11, 55);
    expect(firstResult).toEqual({ liked: true });

    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
    queryMock
      .mockResolvedValueOnce([[{ discussion_id: 55, batch_id: 88, teacher_id: 22 }]])
      .mockResolvedValueOnce([[{ reaction_id: 9001 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const secondResult = await toggleDiscussionReaction(11, 55);
    expect(secondResult).toEqual({ liked: false });
  });

  it("should reject invalid report types and persist a report for valid input", async () => {
    // Test nghiệp vụ: nếu loại báo cáo không hợp lệ,
    // service phải ném lỗi; nếu hợp lệ thì lưu report và trả về thông tin báo cáo.
    await expect(
      reportInteractionContent(11, { targetType: "UNKNOWN", targetId: 55, reason: "Spam" }),
    ).rejects.toThrow("Loại báo cáo không hợp lệ.");

    queryMock.mockResolvedValueOnce([{ insertId: 444 }]);
    const result = await reportInteractionContent(11, {
      targetType: "COMMENT",
      targetId: 55,
      reason: "Spam",
      details: "Nội dung lặp lại",
    });

    expect(result).toEqual({ id: 444, reported: true });
  });
});
