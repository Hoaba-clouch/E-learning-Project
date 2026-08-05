import type {
  AdminLoginFormErrors,
  AdminLoginFormValues,
} from "./adminAuth.types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateAdminLoginForm(
  values: AdminLoginFormValues,
): AdminLoginFormErrors {
  const errors: AdminLoginFormErrors = {};
  const account = values.account.trim();

  if (!account) {
    errors.account = "Vui lòng nhập email quản trị viên.";
  } else if (!emailPattern.test(account)) {
    errors.account = "Email quản trị viên không đúng định dạng.";
  }

  if (!values.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  }

  return errors;
}

export function hasAdminLoginErrors(errors: AdminLoginFormErrors) {
  return Object.values(errors).some(Boolean);
}
