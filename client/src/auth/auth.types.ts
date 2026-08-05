export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
};

export type AuthSession = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

export type LoginPayload = {
  account: string;
  password: string;
  remember: boolean;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export type ApiFieldErrors = Record<string, string>;
