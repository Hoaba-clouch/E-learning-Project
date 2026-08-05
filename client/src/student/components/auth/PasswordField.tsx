import { useState, type ChangeEventHandler } from "react";

type PasswordFieldProps = {
  autoComplete?: string;
  error?: string;
  icon?: string;
  label: string;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  value: string;
};

function PasswordField({
  autoComplete,
  error,
  icon = "lock",
  label,
  name,
  onChange,
  placeholder = "••••••••",
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = `${name}-error`;

  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <div className={`auth-input-wrap${error ? " auth-input-error" : ""}`}>
        <span className="material-symbols-outlined">{icon}</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          id={name}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="auth-icon-button"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          <span className="material-symbols-outlined">
            {isVisible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
      {error ? (
        <p className="auth-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordField;
