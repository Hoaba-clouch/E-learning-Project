import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthApiError } from "../../auth/authApi";
import { useAuth } from "../../auth/AuthContext";
import type { AdminLoginFormErrors, AdminLoginFormValues } from "../auth/adminAuth.types";
import {
  hasAdminLoginErrors,
  validateAdminLoginForm,
} from "../auth/adminAuthValidation";
import AdminLoginField from "../components/auth/AdminLoginField";
import AdminLoginLayout from "../components/auth/AdminLoginLayout";
import AdminPasswordField from "../components/auth/AdminPasswordField";
import "./AdminLoginPage.css";

const initialValues: AdminLoginFormValues = {
  account: "",
  password: "",
  remember: false,
};

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAdmin, status, user } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<AdminLoginFormErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "authenticated" && user?.role === "ADMIN") {
    return <Navigate replace to="/admin" />;
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
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

    const nextErrors = validateAdminLoginForm(values);
    setErrors(nextErrors);

    if (hasAdminLoginErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    setFormMessage("");

    try {
      await loginAdmin({
        account: values.account.trim(),
        password: values.password,
        remember: values.remember,
      });

      const routeState = location.state as
        | { from?: { pathname?: string } }
        | null;
      const destination = routeState?.from?.pathname?.startsWith("/admin")
        ? routeState.from.pathname
        : "/admin";

      navigate(destination, { replace: true });
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
    <AdminLoginLayout>
      <section className="admin-login-card">
        <header>
          <h2>Đăng nhập hệ thống</h2>
          <p>
            Cung cấp thông tin quản trị viên để truy cập bảng điều khiển
            LearnX.
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit}>
          <AdminLoginField
            autoComplete="username"
            error={errors.account}
            icon="alternate_email"
            label="Email quản trị viên"
            name="account"
            onChange={handleTextChange}
            placeholder="admin@learnx.edu.vn"
            type="email"
            value={values.account}
          />

          <AdminPasswordField
            error={errors.password}
            onChange={handleTextChange}
            value={values.password}
          />

          <label className="admin-remember-row">
            <input
              checked={values.remember}
              name="remember"
              onChange={handleRememberChange}
              type="checkbox"
            />
            <span>Ghi nhớ phiên đăng nhập này</span>
          </label>

          {formMessage ? (
            <p className="admin-login-message" role="alert">
              {formMessage}
            </p>
          ) : null}

          <button
            className="admin-login-submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="admin-login-spinner" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <footer id="admin-support">
          <span className="material-symbols-outlined">verified_user</span>
          <div>
            <strong>Thông báo bảo mật</strong>
            <p>
              Đây là cổng quản trị hạn chế. Hoạt động đăng nhập và truy cập đều
              được hệ thống giám sát.
            </p>
          </div>
        </footer>
      </section>
    </AdminLoginLayout>
  );
}

export default AdminLoginPage;
