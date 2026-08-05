import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthApiError } from "../../auth/authApi";
import { useAuth } from "../../auth/AuthContext";
import type { UserRole } from "../../auth/auth.types";
import AuthLayout from "../components/auth/AuthLayout";
import AuthTextField from "../components/auth/AuthTextField";
import PasswordField from "../components/auth/PasswordField";
import SocialAuthButtons from "../components/auth/SocialAuthButtons";
import {
  hasErrors,
  type LoginFormErrors,
  type LoginFormValues,
  validateLoginForm,
} from "../utils/authValidation";
import "./StudentAuth.css";

const initialValues: LoginFormValues = {
  account: "",
  password: "",
  remember: false,
};

const roleHomePaths: Record<UserRole, string> = {
  ADMIN: "/admin",
  STUDENT: "/student",
  TEACHER: "/student",
};

function StudentLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setFormMessage("");
  }

  function handleRememberChange(event: ChangeEvent<HTMLInputElement>) {
    setValues((current) => ({
      ...current,
      remember: event.target.checked,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    setFormMessage("");

    try {
      const session = await login({
        account: values.account,
        password: values.password,
        remember: values.remember,
      });
      const from = location.state as { from?: { pathname?: string } } | null;
      const fallbackPath = roleHomePaths[session.user.role];

      navigate(from?.from?.pathname ?? fallbackPath, { replace: true });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors(error.errors ?? {});
        setFormMessage(error.message);
      } else {
        setFormMessage("Không thể đăng nhập. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Cổng học viên"
      subtitle="Vui lòng đăng nhập để tiếp tục hành trình học tập của bạn."
      title="Chào mừng trở lại"
    >
      <form className="student-auth-form" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="username"
          error={errors.account}
          icon="mail"
          label="Email hoặc số điện thoại"
          name="account"
          onChange={handleTextChange}
          placeholder="student@learnx.edu.vn hoặc 0920000001"
          type="text"
          value={values.account}
        />

        <div className="auth-password-row">
          <PasswordField
            autoComplete="current-password"
            error={errors.password}
            label="Mật khẩu"
            name="password"
            onChange={handleTextChange}
            value={values.password}
          />
          <Link to="/student/forgot-password">Quên mật khẩu?</Link>
        </div>

        <label className="auth-check-row">
          <input
            checked={values.remember}
            name="remember"
            onChange={handleRememberChange}
            type="checkbox"
          />
          <span>Ghi nhớ đăng nhập trong 20 giờ</span>
        </label>

        {formMessage ? <p className="auth-form-message">{formMessage}</p> : null}

        <button className="auth-submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <div className="auth-divider">
        <span>Hoặc đăng nhập với</span>
      </div>

      <SocialAuthButtons />

      <p className="auth-switch">
        Chưa có tài khoản?
        <Link to="/student/register">Đăng ký ngay</Link>
      </p>
    </AuthLayout>
  );
}

export default StudentLoginPage;
