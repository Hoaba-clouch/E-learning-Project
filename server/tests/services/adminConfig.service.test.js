import { beforeEach, describe, expect, it, vi } from "vitest";

let adminConfig;

beforeEach(async () => {
  vi.resetModules();
  adminConfig = await import("../../services/adminConfig.service.js");
});

describe("adminConfig.service", () => {
  it("should return system config data with default tabs and values", async () => {
    // Test nghiệp vụ: khi admin mở trang cấu hình hệ thống,
    // service phải trả về dữ liệu tab và cấu hình hiện tại của hệ thống.
    const result = await adminConfig.getAdminSystemConfigData();

    expect(result.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "general", label: "Cài đặt chung", active: true }),
        expect.objectContaining({ key: "email", label: "Cấu hình email" }),
      ]),
    );
    expect(result.general.platformName).toBe("Editorial Scholar Pro");
    expect(result.email.senderEmail).toBe("notifications@editorialscholar.edu");
    expect(result.security.passwordRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "uppercase", enabled: true }),
      ]),
    );
  });

  it("should update general settings and persist changes across reads", async () => {
    // Test nghiệp vụ: khi admin cập nhật cài đặt chung,
    // service phải ghi nhận việc thay đổi và trả về dữ liệu mới cho lần đọc sau.
    const updated = await adminConfig.updateAdminSystemConfigData({
      general: {
        platformName: "E-Learning Center",
        defaultLanguage: "Tiếng Việt",
      },
    });

    expect(updated.general.platformName).toBe("E-Learning Center");
    expect(updated.general.defaultLanguage).toBe("Tiếng Việt");

    const nextRead = await adminConfig.getAdminSystemConfigData();
    expect(nextRead.general.platformName).toBe("E-Learning Center");
    expect(nextRead.general.defaultLanguage).toBe("Tiếng Việt");
  });

  it("should update email settings and leave other sections unchanged", async () => {
    // Test nghiệp vụ: khi admin thay đổi cấu hình email,
    // service phải chỉ cập nhật phần email và giữ nguyên các cài đặt khác.
    const updated = await adminConfig.updateAdminSystemConfigData({
      email: {
        smtpHost: "smtp.example.com",
        senderEmail: "admin@example.com",
      },
    });

    expect(updated.email.smtpHost).toBe("smtp.example.com");
    expect(updated.email.senderEmail).toBe("admin@example.com");
    expect(updated.general.platformName).toBe("Editorial Scholar Pro");
  });

  it("should update security settings and preserve current boolean flags", async () => {
    // Test nghiệp vụ: khi admin cập nhật cấu hình bảo mật,
    // service phải gộp payload vào config hiện tại và giữ lại các giá trị khác.
    const updated = await adminConfig.updateAdminSystemConfigData({
      security: {
        twoFactorAuthentication: false,
      },
    });

    expect(updated.security.twoFactorAuthentication).toBe(false);
    expect(updated.security.sessionTimeoutEnabled).toBe(true);
    expect(updated.security.passwordRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "uppercase", enabled: true }),
      ]),
    );
  });
});
