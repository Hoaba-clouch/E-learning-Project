import type { ChangeEventHandler, InputHTMLAttributes } from "react";

type AuthTextFieldProps = {
  error?: string;
  icon?: string;
  label: string;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  value: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "onChange" | "value"
>;

function AuthTextField({
  error,
  icon,
  id,
  label,
  name,
  onChange,
  value,
  ...inputProps
}: AuthTextFieldProps) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`auth-input-wrap${error ? " auth-input-error" : ""}`}>
        {icon ? <span className="material-symbols-outlined">{icon}</span> : null}
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          id={inputId}
          name={name}
          onChange={onChange}
          value={value}
          {...inputProps}
        />
      </div>
      {error ? (
        <p className="auth-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AuthTextField;
