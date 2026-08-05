import { useState, type ChangeEventHandler } from "react";

type AdminPasswordFieldProps = {
  error?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  value: string;
};

function AdminPasswordField({
  error,
  onChange,
  value,
}: AdminPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = "admin-password-error";

  return (
    <div className="admin-login-field">
      <div className="admin-password-label">
        <label htmlFor="admin-password">Mật khẩu</label>
        <a href="#admin-support">Quên mật khẩu?</a>
      </div>
      <div className={`admin-login-input${error ? " has-error" : ""}`}>
        <span className="material-symbols-outlined">lock_person</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="current-password"
          id="admin-password"
          name="password"
          onChange={onChange}
          placeholder="••••••••••••"
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          <span className="material-symbols-outlined">
            {isVisible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
      {error ? (
        <p className="admin-login-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AdminPasswordField;
