import type { ReactNode } from "react";
import logo from "../../../assets/logo-learnX.png";

type AdminLoginLayoutProps = {
  children: ReactNode;
};

function AdminLoginLayout({ children }: AdminLoginLayoutProps) {
  return (
    <main className="admin-login-page">
      <div className="admin-login-atmosphere" aria-hidden="true">
        <span />
        <span />
      </div>

      <section className="admin-login-canvas" aria-label="Cổng quản trị viên">
        <header className="admin-login-brand">
          <div className="admin-login-logo">
            <img alt="LearnX" src={logo} />
          </div>
          <div>
            <h1>LearnX Academy</h1>
            <p>Cổng quản trị viên</p>
          </div>
        </header>

        {children}

        <footer className="admin-login-system-footer">
          <div>
            <span className="admin-system-dot" />
            <strong>Hệ thống đang hoạt động</strong>
          </div>
          <nav aria-label="Liên kết quản trị">
            <a href="#security">Bảo mật</a>
            <a href="#terms">Điều khoản</a>
            <span>v1.0.0</span>
          </nav>
        </footer>
      </section>
    </main>
  );
}

export default AdminLoginLayout;
