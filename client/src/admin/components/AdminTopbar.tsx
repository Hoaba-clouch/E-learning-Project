import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import LanguageSwitcher from "../../shared/components/language/LanguageSwitcher";
import NotificationBell from "../../shared/components/notifications/NotificationBell";

type AdminTopbarProps = {
  searchPlaceholder?: string;
};

function AdminTopbar({ searchPlaceholder }: AdminTopbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const { logout, user } = useAuth();
  const avatar =
    user?.avatarUrl ??
    `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(user?.email ?? "admin")}`;

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <header className="topbar">
      <label className="searchbar" aria-label={t("topbar.searchLabel")}>
        <span className="material-symbols-outlined">search</span>
        <input type="text" placeholder={searchPlaceholder ?? t("topbar.defaultSearch")} />
      </label>

      <div className="topbar-actions">
        <LanguageSwitcher compact />

        <NotificationBell
          className="admin-notification-bell"
          onOpenNotification={(notification) => {
            if (notification.targetUrl) {
              navigate(notification.targetUrl);
            }
          }}
        />

        <div className="profile-chip">
          <div>
            <p className="profile-name">{user?.fullName ?? t("topbar.adminName")}</p>
            <p className="profile-role">{t("topbar.adminRole")}</p>
          </div>
          <img src={avatar} alt={user?.fullName ?? t("topbar.adminName")} />
        </div>

        <button
          className="icon-button"
          onClick={() => void handleLogout()}
          title={t("topbar.logout")}
          type="button"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;
