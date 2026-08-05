import type {
  ApiFieldErrors,
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "./auth.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ApiFieldErrors;
};

export class AuthApiError extends Error {
  errors?: ApiFieldErrors;
  status: number;

  constructor(message: string, status: number, errors?: ApiFieldErrors) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || !payload.data) {
    throw new AuthApiError(
      payload.message ?? "Không thể xử lý yêu cầu.",
      response.status,
      payload.errors,
    );
  }

  return payload.data;
}

export async function login(payload: LoginPayload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseApiResponse<AuthSession>(response);
}

export async function registerStudent(payload: RegisterPayload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseApiResponse<{ user: AuthUser }>(response);
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse<{ user: AuthUser }>(response);
}

export async function logout(token: string) {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
  });
}
