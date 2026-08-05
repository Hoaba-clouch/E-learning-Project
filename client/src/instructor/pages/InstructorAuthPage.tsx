import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FormEvent } from "react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";
import { instructorApiRequest } from "../api/instructorApi";
import {
  getInstructorAuthSession,
  setInstructorAuthSession,
  type InstructorAuthSession,
} from "../auth/instructorAuth";
import { setStoredAuthSession } from "../../auth/authStorage";
import type { AuthSession } from "../../auth/auth.types";
import logo from "../../assets/logo-learnX.png";
import LanguageSwitcher from "../../shared/components/language/LanguageSwitcher";
import "./InstructorPortal.css";

type InstructorAuthPageProps = {
  mode: "login" | "register";
};

type InstructorAuthApiResponse = {
  success: boolean;
  message?: string;
  data: InstructorAuthSession & AuthSession;
};

function InstructorAuthPage({ mode }: InstructorAuthPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("instructor");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    workplace: "E-learning Center",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  if (getInstructorAuthSession()) {
    return <Navigate to="/instructor" replace />;
  }

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await instructorApiRequest<InstructorAuthApiResponse>(`/api/instructor/auth/${mode}`, {
        method: "POST",
        body: formData,
      });
      if (!payload.success) {
        throw new Error(payload?.message ?? t("auth.authError"));
      }

      setInstructorAuthSession(payload.data);
      setStoredAuthSession(
        {
          token: payload.data.token,
          expiresAt: payload.data.expiresAt,
          user: payload.data.user,
        },
        true,
      );
      navigate("/instructor", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("auth.authError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="instructor-auth-shell">
      <section className="instructor-auth-visual">
        <div className="instructor-brand-mark">
          <img alt="LearnX" src={logo} />
        </div>
        <div className="instructor-auth-visual-head">
          <p className="instructor-eyebrow">{t("auth.portal")}</p>
          <LanguageSwitcher compact />
        </div>
        <h1>{t("auth.heroTitle")}</h1>
        <p>{t("auth.heroCopy")}</p>
      </section>

      <section className="instructor-auth-card">
        <div>
          <p className="instructor-eyebrow">{isRegister ? t("auth.createAccount") : t("auth.login")}</p>
          <h2>{isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}</h2>
          <p>{isRegister ? t("auth.registerCopy") : t("auth.loginCopy")}</p>
        </div>

        <form className="instructor-auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>
                <span>{t("auth.fullName")}</span>
                <input
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                />
              </label>

              <label>
                <span>{t("auth.expertise")}</span>
                <input
                  value={formData.specialization}
                  onChange={(event) => updateField("specialization", event.target.value)}
                  placeholder={t("auth.expertisePlaceholder")}
                />
              </label>
            </>
          )}

          <label>
            <span>{t("auth.email")}</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder={t("auth.emailPlaceholder")}
            />
          </label>

          <label>
            <span>{t("auth.password")}</span>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
            />
          </label>

          {isRegister && (
            <label>
              <span>{t("auth.phone")}</span>
              <input
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder={t("auth.phonePlaceholder")}
              />
            </label>
          )}

          {error && <p className="instructor-auth-error">{error}</p>}

          <button className="instructor-primary-button" disabled={isSubmitting} type="submit">
            <span className="material-symbols-outlined">{isRegister ? "person_add" : "login"}</span>
            {isSubmitting ? t("auth.processing") : isRegister ? t("auth.registerButton") : t("auth.loginButton")}
          </button>
        </form>

        <p className="instructor-auth-switch">
          {isRegister ? t("auth.hasAccount") : t("auth.noAccount")}
          <NavLink to={isRegister ? "/instructor/login" : "/instructor/register"}>
            {isRegister ? t("auth.loginButton") : t("auth.registerButton")}
          </NavLink>
        </p>
      </section>
    </main>
  );
}

export default InstructorAuthPage;
