import { useTranslation } from "react-i18next";
import type { AdminPage } from "../adminNavigation";

type AdminSidebarProps = {
  activePage: AdminPage;
  description: string;
  onNavigate: (page: AdminPage) => void;
};

const navItems: Array<{ key: AdminPage; icon: string }> = [
  { key: "dashboard", icon: "dashboard" },
  { key: "teachers", icon: "co_present" },
  { key: "students", icon: "group" },
  { key: "courses", icon: "library_books" },
  { key: "system", icon: "settings" },
  { key: "content", icon: "description" },
];

function AdminSidebar({
  activePage,
  description,
  onNavigate,
}: AdminSidebarProps) {
  const { t } = useTranslation("admin");

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="brand-title">{t("brand.title")}</p>
        <p className="brand-subtitle">{t("brand.subtitle")}</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`nav-item${item.key === activePage ? " active" : ""}`}
            onClick={() => onNavigate(item.key)}
            type="button"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{t(`nav.${item.key}`)}</span>
          </button>
        ))}
      </nav>

      <div className="pro-card">
        <p className="pro-label">{t("sidebar.proLabel")}</p>
        <p className="pro-copy">{description}</p>
      </div>
    </aside>
  );
}

export default AdminSidebar;
