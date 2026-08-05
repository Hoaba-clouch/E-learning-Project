import type { ChangeEventHandler, InputHTMLAttributes } from "react";

type AdminLoginFieldProps = {
  error?: string;
  icon: string;
  label: string;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  value: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "onChange" | "value"
>;

function AdminLoginField({
  error,
  icon,
  label,
  name,
  onChange,
  value,
  ...inputProps
}: AdminLoginFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="admin-login-field">
      <label htmlFor={name}>{label}</label>
      <div className={`admin-login-input${error ? " has-error" : ""}`}>
        <span className="material-symbols-outlined">{icon}</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          id={name}
          name={name}
          onChange={onChange}
          value={value}
          {...inputProps}
        />
      </div>
      {error ? (
        <p className="admin-login-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AdminLoginField;
