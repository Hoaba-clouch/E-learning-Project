import type { ReactNode } from "react";
import logo from "../../../assets/logo-learnX.png";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
};

function AuthLayout({ children, eyebrow, title, subtitle }: AuthLayoutProps) {
  return (
    <main className="student-auth-page">
      <section className="student-auth-shell" aria-label="Học viên">
        <div className="student-auth-brand">
          <img alt="LearnX" src={logo} />
          {eyebrow ? <span>{eyebrow}</span> : null}
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </section>

      <footer className="student-auth-footer">
        <p>© 2026 LearnX. Nền tảng học tập trực tuyến.</p>
        <nav aria-label="Liên kết hỗ trợ">
          <a href="#">Điều khoản</a>
          <a href="#">Bảo mật</a>
          <a href="#">Hỗ trợ</a>
        </nav>
      </footer>
    </main>
  );
}

export default AuthLayout;
