import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApiError } from "../../auth/authApi";
import { useAuth } from "../../auth/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import AuthTextField from "../components/auth/AuthTextField";
import PasswordField from "../components/auth/PasswordField";
import PasswordStrength from "../components/auth/PasswordStrength";
import SocialAuthButtons from "../components/auth/SocialAuthButtons";
import {
  getPasswordStrength,
  hasErrors,
  type RegisterFormErrors,
  type RegisterFormValues,
  validateRegisterForm,
} from "../utils/authValidation";
import "./StudentAuth.css";

const initialValues: RegisterFormValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

function StudentRegisterPage() {
  const navigate = useNavigate();
  const { registerStudent } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
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

  function handleTermsChange(event: ChangeEvent<HTMLInputElement>) {
    setValues((current) => ({
      ...current,
      terms: event.target.checked,
    }));

    setErrors((current) => ({
      ...current,
      terms: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateRegisterForm(values);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setIsSubmitting(true);
    setFormMessage("");

    try {
      await registerStudent({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      navigate("/student/login", { replace: true });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrors(error.errors ?? {});
        setFormMessage(error.message);
      } else {
        setFormMessage("Không thể đăng ký. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Tài khoản học viên"
      subtitle="Bắt đầu hành trình tri thức của bạn cùng LearnX."
      title="Kiến tạo tương lai"
    >
      <form className="student-auth-form" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="name"
          error={errors.fullName}
          icon="person"
          label="Họ và tên"
          name="fullName"
          onChange={handleTextChange}
          placeholder="Nguyễn Văn A"
          type="text"
          value={values.fullName}
        />

        <AuthTextField
          autoComplete="email"
          error={errors.email}
          icon="mail"
          label="Email"
          name="email"
          onChange={handleTextChange}
          placeholder="student@learnx.edu.vn"
          type="email"
          value={values.email}
        />

        <AuthTextField
          autoComplete="tel"
          error={errors.phone}
          icon="call"
          label="Số điện thoại"
          name="phone"
          onChange={handleTextChange}
          placeholder="0920000001"
          type="tel"
          value={values.phone}
        />

        <PasswordField
          autoComplete="new-password"
          error={errors.password}
          label="Mật khẩu"
          name="password"
          onChange={handleTextChange}
          value={values.password}
        />

        <PasswordStrength score={getPasswordStrength(values.password)} />

        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword}
          icon="verified_user"
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          onChange={handleTextChange}
          value={values.confirmPassword}
        />

        <div className="auth-terms">
          <label className="auth-check-row">
            <input
              checked={values.terms}
              name="terms"
              onChange={handleTermsChange}
              type="checkbox"
            />
            <span>
              Tôi đồng ý với <a href="#">Điều khoản dịch vụ</a> và{" "}
              <a href="#">Chính sách bảo mật</a>.
            </span>
          </label>
          {errors.terms ? <p className="auth-error">{errors.terms}</p> : null}
        </div>

        {formMessage ? <p className="auth-form-message">{formMessage}</p> : null}

        <button className="auth-submit-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Đang đăng ký..." : "Đăng ký tài khoản"}
        </button>
      </form>

      <div className="auth-divider">
        <span>Hoặc đăng ký bằng</span>
      </div>

      <SocialAuthButtons />

      <p className="auth-switch">
        Đã có tài khoản?
        <Link to="/student/login">Đăng nhập ngay</Link>
      </p>
    </AuthLayout>
  );
}

export default StudentRegisterPage;
