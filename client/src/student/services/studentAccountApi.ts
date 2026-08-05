import { getAuthHeaders } from "../../auth/authHeaders";
import type { ApiFieldErrors, AuthUser } from "../../auth/auth.types";
import type {
  StudentAccountCertificatesData,
  StudentAccountOverview,
  StudentAccountPaymentHistoryData,
  StudentAccountProfileData,
  StudentProfileUpdatePayload,
} from "../types/account.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiFieldErrors;
};

export class StudentAccountApiError extends Error {
  errors?: ApiFieldErrors;
  status: number;

  constructor(message: string, status: number, errors?: ApiFieldErrors) {
    super(message);
    this.name = "StudentAccountApiError";
    this.status = status;
    this.errors = errors;
  }
}

function throwIfNotJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new StudentAccountApiError(
      "Backend không trả về dữ liệu JSON hợp lệ.",
      response.status,
    );
  }
}

async function parseStudentAccountResponse<T>(response: Response, fallbackMessage: string) {
  throwIfNotJson(response);

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new StudentAccountApiError(
      payload.message ?? fallbackMessage,
      response.status,
      payload.errors,
    );
  }

  return payload.data;
}

export async function getStudentAccountOverview() {
  const response = await fetch(`${API_BASE_URL}/api/student/account/overview`, {
    headers: getAuthHeaders(),
  });

  return parseStudentAccountResponse<StudentAccountOverview>(
    response,
    "Không thể tải dữ liệu tài khoản.",
  );
}

async function getStudentAccountResource<T>(path: string, fallbackMessage: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });

  return parseStudentAccountResponse<T>(response, fallbackMessage);
}

export function getStudentAccountProfile() {
  return getStudentAccountResource<StudentAccountProfileData>(
    "/api/student/account/profile",
    "Không thể tải hồ sơ học viên.",
  );
}

export function getStudentAccountCertificates() {
  return getStudentAccountResource<StudentAccountCertificatesData>(
    "/api/student/account/certificates",
    "Không thể tải chứng chỉ học viên.",
  );
}

export function getStudentAccountPaymentHistory() {
  return getStudentAccountResource<StudentAccountPaymentHistoryData>(
    "/api/student/account/payments",
    "Không thể tải lịch sử thanh toán.",
  );
}

export async function updateStudentAccountProfile(payload: StudentProfileUpdatePayload) {
  const formData = new FormData();

  formData.set("fullName", payload.fullName);
  formData.set("phone", payload.phone);
  formData.set("dateOfBirth", payload.dateOfBirth);
  formData.set("gender", payload.gender);
  formData.set("address", payload.address);

  if (payload.avatarFile) {
    formData.set("avatar", payload.avatarFile);
  }

  const response = await fetch(`${API_BASE_URL}/api/student/account/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: formData,
  });

  return parseStudentAccountResponse<{
    profile: StudentAccountProfileData["profile"];
    sessionUser: AuthUser | null;
  }>(response, "Không thể cập nhật hồ sơ học viên.");
}
