import { useTranslation } from "react-i18next";
import logo from "../../assets/logo-learnX.png";
import type { AuthUser } from "../../auth/auth.types";
import LanguageSwitcher from "../../shared/components/language/LanguageSwitcher";
import type { StudentView } from "../types/student.types";
import { resolveMediaUrl } from "../utils/mediaUrl";
import Icon from "./Icon";
import NotificationBell from "../../shared/components/notifications/NotificationBell";
import type { AppNotification } from "../../shared/services/notificationApi";

type StudentHeaderProps = {
  activeView: StudentView;
  isGuest?: boolean;
  onNavigate: (view: StudentView) => void;
  onOpenNotification?: (notification: AppNotification) => void;
  onOpenAccountDrawer: () => void;
  user: AuthUser | null;
};

const navItems: Array<{ label: string; labelKey: string; view: StudentView }> = [
  { label: "Khóa học", labelKey: "header.nav.courses", view: "courses" },
  { label: "Khóa học của tôi", labelKey: "header.nav.myCourses", view: "myCourses" },
  { label: "Lịch học", labelKey: "header.nav.schedule", view: "schedule" },
  { label: "Giỏ hàng", labelKey: "header.nav.cart", view: "cart" },
  { label: "Tương tác", labelKey: "header.nav.interaction", view: "interaction" },
];

function StudentHeader({
  activeView,
  isGuest = false,
  onNavigate,
  onOpenNotification,
  onOpenAccountDrawer,
  user,
}: StudentHeaderProps) {
  const { t } = useTranslation("student");

  return (
    <header className="sp-header">
      <button className="sp-brand" type="button" onClick={() => onNavigate("home")}>
        <img alt="LearnX" src={logo} />
      </button>

      <nav className="sp-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={
              activeView === item.view ||
              (item.view === "myCourses" &&
                (activeView === "lesson" || activeView === "learning"))
                ? "active"
                : ""
            }
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            {t(item.labelKey, { defaultValue: item.label })}
          </button>
        ))}
        <button
          className={
            activeView === "exam" ||
            activeView === "examTake" ||
            activeView === "examReview"
              ? "active"
              : ""
          }
          type="button"
          onClick={() => onNavigate("exam")}
        >
          {t("header.nav.exams")}
        </button>
      </nav>

      <div className="sp-header-actions">
        <label className="sp-search">
          <Icon name="search" />
          <input placeholder={t("header.searchPlaceholder")} />
        </label>

        <LanguageSwitcher className="sp-language-select" />

        {isGuest ? (
          <button
            aria-label="Đăng nhập để xem thông báo"
            onClick={() => onNavigate("interaction")}
            type="button"
          >
            <Icon name="notifications" />
          </button>
        ) : (
          <NotificationBell
            className="student-notification-bell"
            icon={<Icon name="notifications" />}
            onOpenNotification={(notification) => {
              if (notification.targetUrl) {
                onOpenNotification?.(notification);
                return;
              }

              if (notification.type.includes("EXAM")) {
                onNavigate("exam");
              } else if (notification.type.includes("ASSIGNMENT")) {
                onNavigate("myCourses");
              } else if (notification.type.includes("PAYMENT")) {
                onNavigate("accountPaymentHistory");
              } else if (notification.type.includes("COURSE")) {
                onNavigate("myCourses");
              }
            }}
          />
        )}
        <button
          type="button"
          aria-label={t("header.cart")}
          onClick={() => onNavigate("cart")}
        >
          <Icon name="shopping_cart" />
        </button>
        <button
          className="sp-avatar"
          type="button"
          aria-label={t("header.account")}
          onClick={onOpenAccountDrawer}
        >
          {isGuest ? (
            <Icon name="account_circle" />
          ) : (
            <img
              src={
                resolveMediaUrl(user?.avatarUrl) ??
                `https://api.dicebear.com/9.x/personas/svg?seed=${user?.email ?? "Scholar"}`
              }
              alt=""
            />
          )}
        </button>
      </div>
    </header>
  );
}

export default StudentHeader;

