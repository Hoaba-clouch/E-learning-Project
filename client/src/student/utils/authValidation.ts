export type LoginFormValues = {
  account: string;
  password: string;
  remember: boolean;
};

export type RegisterFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
export type RegisterFormErrors = Partial<
  Record<keyof RegisterFormValues, string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const namePattern = /^[A-Za-zÀ-ỹ\s'.-]+$/;
const phonePattern = /^(0|\+84)[0-9]{9,10}$/;

export function validateEmail(value: string) {
  const email = value.trim();

  if (!email) {
    return "Vui lòng nhập email.";
  }

  if (!emailPattern.test(email)) {
    return "Email không đúng định dạng.";
  }

  return "";
}

export function validatePhone(value: string) {
  const phone = value.trim();

  if (!phone) {
    return "Vui lòng nhập số điện thoại.";
  }

  if (!phonePattern.test(phone)) {
    return "Số điện thoại không đúng định dạng.";
  }

  return "";
}

export function validatePassword(value: string) {
  if (!value) {
    return "Vui lòng nhập mật khẩu.";
  }

  if (value.length < 8) {
    return "Mật khẩu cần ít nhất 8 ký tự.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Mật khẩu cần có ít nhất 1 chữ hoa.";
  }

  if (!/[a-z]/.test(value)) {
    return "Mật khẩu cần có ít nhất 1 chữ thường.";
  }

  if (!/\d/.test(value)) {
    return "Mật khẩu cần có ít nhất 1 chữ số.";
  }

  if (!/[^\w\s]/.test(value)) {
    return "Mật khẩu cần có ít nhất 1 ký tự đặc biệt.";
  }

  return "";
}

export function getPasswordStrength(password: string) {
  const rules = [
    password.length >= 8,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password),
    /[^\w\s]/.test(password),
  ];

  return rules.filter(Boolean).length;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const passwordError = values.password ? "" : "Vui lòng nhập mật khẩu.";

  if (!values.account.trim()) {
    errors.account = "Vui lòng nhập email hoặc số điện thoại.";
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const fullName = values.fullName.trim();
  const emailError = validateEmail(values.email);
  const phoneError = validatePhone(values.phone);
  const passwordError = validatePassword(values.password);

  if (!fullName) {
    errors.fullName = "Vui lòng nhập họ và tên.";
  } else if (fullName.length < 3) {
    errors.fullName = "Họ và tên cần ít nhất 3 ký tự.";
  } else if (!namePattern.test(fullName)) {
    errors.fullName = "Họ và tên chỉ nên gồm chữ cái và khoảng trắng.";
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (phoneError) {
    errors.phone = phoneError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  if (!values.terms) {
    errors.terms = "Bạn cần đồng ý điều khoản để đăng ký.";
  }

  return errors;
}

export function hasErrors<T extends Record<string, string | undefined>>(
  errors: T,
) {
  return Object.values(errors).some(Boolean);
}
