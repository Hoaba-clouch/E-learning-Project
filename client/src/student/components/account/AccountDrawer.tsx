import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "../../../auth/auth.types";
import type { StudentAccountProfileData } from "../../types/account.types";
import type { StudentView } from "../../types/student.types";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import Icon from "../Icon";
import "./AccountDrawer.css";

type AccountDrawerProps = {
  activeView: StudentView;
  isOpen: boolean;
  profileData: StudentAccountProfileData | null;
  user: AuthUser | null;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (view: Extract<
    StudentView,
    "accountProfile" | "accountCertificates" | "accountPaymentHistory"
  >) => void;
};

const drawerItems: Array<{
  labelKey: string;
  icon: string;
  view: "accountProfile" | "accountCertificates" | "accountPaymentHistory";
}> = [
  {
    labelKey: "drawer.profile",
    icon: "person",
    view: "accountProfile",
  },
  {
    labelKey: "drawer.certificates",
    icon: "workspace_premium",
    view: "accountCertificates",
  },
  {
    labelKey: "drawer.payments",
    icon: "payments",
    view: "accountPaymentHistory",
  },
];

function AccountDrawer({
  activeView,
  isOpen,
  profileData,
  user,
  onClose,
  onLogout,
  onNavigate,
}: AccountDrawerProps) {
  const { t } = useTranslation("student");
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const displayName =
    profileData?.profile.fullName ?? user?.fullName ?? t("drawer.student");
  const displayEmail = profileData?.profile.email ?? user?.email ?? "";
  const displayAvatar =
    resolveMediaUrl(profileData?.profile.avatarUrl) ??
    resolveMediaUrl(user?.avatarUrl) ??
    `https://api.dicebear.com/9.x/personas/svg?seed=${user?.email ?? "student"}`;

  return (
    <div className={`sp-account-drawer-root ${isOpen ? "open" : ""}`}>
      <button
        aria-label={t("drawer.closeMenu")}
        className="sp-account-drawer-backdrop"
        onClick={onClose}
        type="button"
      />

      <aside className="sp-account-drawer" aria-label={t("drawer.navigation")}>
        <div className="sp-account-drawer-top">
          <div>
            <h2>{t("drawer.title")}</h2>
            <p>{t("drawer.description")}</p>
          </div>

          <button onClick={onClose} type="button" aria-label={t("drawer.closeMenu")}>
            <Icon name="close" />
          </button>
        </div>

        <div className="sp-account-drawer-profile">
          <img alt={displayName} src={displayAvatar} />
          <div>
            <strong>{displayName}</strong>
            <span>{displayEmail}</span>
          </div>
        </div>

        <nav className="sp-account-drawer-nav">
          {drawerItems.map((item) => (
            <button
              key={item.view}
              className={activeView === item.view ? "active" : ""}
              onClick={() => {
                onNavigate(item.view);
                onClose();
              }}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="sp-account-drawer-summary">
          <div>
            <span>{t("drawer.completed")}</span>
            <strong>{profileData?.summary.completedCourses ?? "—"}</strong>
          </div>
          <div>
            <span>{t("profile.stats.certificates")}</span>
            <strong>{profileData?.summary.certificatesCount ?? "—"}</strong>
          </div>
        </div>

        <button className="sp-account-drawer-logout" onClick={onLogout} type="button">
          <Icon name="logout" />
          <span>{t("drawer.logout")}</span>
        </button>
      </aside>
    </div>
  );
}

export default AccountDrawer;
