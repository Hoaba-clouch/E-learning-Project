import { beforeEach, describe, expect, it, vi } from "vitest";

let adminContent;

beforeEach(async () => {
  vi.resetModules();
  adminContent = await import("../../services/adminContent.service.js");
});

describe("adminContent.service", () => {
  it("should return the general content data and compute summary counts", async () => {
    // Test nghiệp vụ: khi admin truy cập phần nội dung chung,
    // service phải trả về thông tin bài viết, FAQ, banner và summary chính xác.
    const result = await adminContent.getAdminGeneralContentData();

    expect(result.summary.totalPosts).toBe(2);
    expect(result.summary.publishedPosts).toBe(1);
    expect(result.summary.draftPosts).toBe(1);
    expect(result.posts).toHaveLength(2);
    expect(result.faqs).toHaveLength(2);
    expect(result.banners).toHaveLength(2);
  });

  it("should update an existing FAQ and reflect changes in subsequent reads", async () => {
    // Test nghiệp vụ: khi admin cập nhật FAQ,
    // service phải thay đổi đúng FAQ và giữ trạng thái mới cho lần đọc sau.
    const updatedFaq = await adminContent.updateAdminFaq(2, {
      answer: "Đã cập nhật câu trả lời mới",
      expanded: true,
    });

    expect(updatedFaq).toEqual(
      expect.objectContaining({
        id: 2,
        answer: "Đã cập nhật câu trả lời mới",
        expanded: true,
      }),
    );

    const result = await adminContent.getAdminGeneralContentData();
    expect(result.faqs.find((item) => item.id === 2).answer).toBe("Đã cập nhật câu trả lời mới");
  });

  it("should return null when updating a missing FAQ", async () => {
    // Test nghiệp vụ: nếu admin thử cập nhật FAQ không tồn tại,
    // service phải trả về null và không ném lỗi.
    const updatedFaq = await adminContent.updateAdminFaq(999, {
      answer: "Nội dung mới",
    });

    expect(updatedFaq).toBeNull();
  });

  it("should delete an existing FAQ and remove it from the content list", async () => {
    // Test nghiệp vụ: khi admin xóa FAQ,
    // service phải xóa phần tử khỏi state và trả về true.
    const deleted = await adminContent.deleteAdminFaq(2);

    expect(deleted).toBe(true);

    const result = await adminContent.getAdminGeneralContentData();
    expect(result.faqs.some((item) => item.id === 2)).toBe(false);
    expect(result.faqs).toHaveLength(1);
  });

  it("should return false when deleting a non-existing FAQ", async () => {
    // Test nghiệp vụ: nếu admin xóa FAQ không tồn tại,
    // service phải trả về false.
    const deleted = await adminContent.deleteAdminFaq(999);

    expect(deleted).toBe(false);
  });

  it("should update an existing banner and persist the updated fields", async () => {
    // Test nghiệp vụ: khi admin cập nhật banner,
    // service phải thay đổi banner đúng ID và trả về object mới.
    const updatedBanner = await adminContent.updateAdminBanner(1, {
      active: false,
      title: "Khuyến mãi đặc biệt 2026",
    });

    expect(updatedBanner).toEqual(
      expect.objectContaining({
        id: 1,
        active: false,
        title: "Khuyến mãi đặc biệt 2026",
      }),
    );

    const result = await adminContent.getAdminGeneralContentData();
    expect(result.banners.find((item) => item.id === 1).active).toBe(false);
  });

  it("should return null when updating a missing banner", async () => {
    // Test nghiệp vụ: nếu admin cập nhật banner không tồn tại,
    // service phải trả về null.
    const updatedBanner = await adminContent.updateAdminBanner(999, {
      active: true,
    });

    expect(updatedBanner).toBeNull();
  });
});
