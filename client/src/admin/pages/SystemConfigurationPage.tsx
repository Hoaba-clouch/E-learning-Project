import { useTranslation } from "react-i18next";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import { useAdminData } from "../hooks/useAdminData";
import type { AdminPage } from "../adminNavigation";
import "../../index.css";

type SystemConfigurationPageProps = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

type SystemConfigApiResponse = {
  success: boolean;
  data: {
    tabs: Array<{ key: string; label: string; icon: string; active: boolean }>;
    general: {
      platformName: string;
      defaultLanguage: string;
      logo: { label: string; acceptedFormats: string };
      favicon: { label: string; acceptedFormats: string };
    };
    email: {
      smtpHost: string;
      port: string;
      senderEmail: string;
    };
    security: {
      twoFactorAuthentication: boolean;
      sessionTimeoutEnabled: boolean;
      passwordRules: Array<{ key: string; label: string; enabled: boolean }>;
    };
  };
};

function SystemConfigurationPage({
  activePage,
  onNavigate,
}: SystemConfigurationPageProps) {
  const { t } = useTranslation("admin");
  const {
    data: pageData,
    error,
    isLoading,
  } = useAdminData<SystemConfigApiResponse["data"]>("/system-config");

  if (!pageData) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.system")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.system")} />

        <section className="content system-page">
          <div className="hero">
            <p className="eyebrow">Trung tâm cấu hình</p>
            <h1>Cấu hình hệ thống</h1>
            <p className="hero-copy">
              Bảng điều khiển tổng cho nhận diện nền tảng, giao thức bảo mật và
              luồng tích hợp cốt lõi.
            </p>
          </div>

          <div className="system-layout">
            <nav className="system-tabs">
              {pageData.tabs.map((tab) => (
                <button
                  key={tab.label}
                  className={tab.active ? "active" : ""}
                  type="button"
                >
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="system-sections">
              <section className="system-section">
                <div className="system-section-head">
                  <h3>Nhận diện nền tảng</h3>
                  <span>Toàn cục</span>
                </div>

                <div className="system-field-grid">
                  <div className="panel system-field-card">
                    <label>Tên nền tảng</label>
                    <input type="text" value={pageData.general.platformName} readOnly />
                    <p>Tên này xuất hiện ở tab trình duyệt và email hệ thống.</p>
                  </div>

                  <div className="panel system-field-card">
                    <label>Ngôn ngữ mặc định</label>
                    <select value={pageData.general.defaultLanguage} disabled>
                      <option>Tiếng Anh (Hoa Kỳ)</option>
                      <option>Tiếng Tây Ban Nha</option>
                      <option>Tiếng Pháp</option>
                      <option>Tiếng Đức</option>
                    </select>
                  </div>

                  <div className="panel system-brand-card">
                    <div>
                      <h4>Tài sản thương hiệu</h4>
                      <p>
                        Tải logo vector và favicon độ phân giải cao để cá nhân
                        hóa trải nghiệm white-label.
                      </p>

                      <div className="system-upload-list">
                        <button type="button">
                          <span className="material-symbols-outlined">
                            upload_file
                          </span>
                          <div>
                            <strong>{pageData.general.logo.label}</strong>
                            <small>{pageData.general.logo.acceptedFormats}</small>
                          </div>
                        </button>

                        <button type="button">
                          <span className="material-symbols-outlined">
                            filter_vintage
                          </span>
                          <div>
                            <strong>{pageData.general.favicon.label}</strong>
                            <small>{pageData.general.favicon.acceptedFormats}</small>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="system-brand-preview">
                      <div className="system-brand-mark">
                        <span className="material-symbols-outlined">school</span>
                      </div>
                      <p>Nhận diện thương hiệu hiện tại</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="system-section">
                <div className="system-section-head icon-only">
                  <h3>Kiến trúc liên lạc</h3>
                  <span className="material-symbols-outlined">alternate_email</span>
                </div>

                <div className="panel system-form-card">
                  <div className="system-form-grid">
                    <div className="system-form-group wide">
                      <label>Máy chủ SMTP</label>
                      <input type="text" placeholder="smtp.provider.com" value={pageData.email.smtpHost} readOnly />
                    </div>
                    <div className="system-form-group">
                      <label>Cổng kết nối</label>
                      <input type="text" placeholder="587" value={pageData.email.port} readOnly />
                    </div>
                    <div className="system-form-group full">
                      <label>Email gửi mặc định</label>
                      <input
                        type="email"
                        placeholder="notifications@editorialscholar.edu"
                        value={pageData.email.senderEmail}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="system-section">
                <div className="system-section-head icon-only">
                  <h3>Bảo mật và mã hóa</h3>
                  <span className="material-symbols-outlined danger">lock</span>
                </div>

                <div className="system-security-grid">
                  <div className="panel system-toggle-card">
                    <div>
                      <h4>Xác thực hai lớp</h4>
                      <p>Yêu cầu xác minh bổ sung cho toàn bộ tài khoản admin.</p>
                    </div>
                    <label className="system-switch">
                      <input type="checkbox" checked={pageData.security.twoFactorAuthentication} readOnly />
                      <span />
                    </label>
                  </div>

                  <div className="panel system-toggle-card">
                    <div>
                      <h4>Tự động hết phiên</h4>
                      <p>Đăng xuất sau 30 phút không hoạt động.</p>
                    </div>
                    <label className="system-switch">
                      <input type="checkbox" checked={pageData.security.sessionTimeoutEnabled} readOnly />
                      <span />
                    </label>
                  </div>

                  <div className="panel system-rules-card">
                    <label>Quy tắc mật khẩu</label>
                    <div className="system-rules-grid">
                      {pageData.security.passwordRules.map((rule) => (
                        <label key={rule.key}>
                          <input type="checkbox" checked={rule.enabled} readOnly />
                          <span>{rule.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <div className="system-footer-bar">
        <button type="button" className="system-ghost-btn">
          Hủy thay đổi
        </button>
        <button type="button" className="system-save-btn">
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}

export default SystemConfigurationPage;
