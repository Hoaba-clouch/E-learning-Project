import { getAuthHeaders } from "../../auth/authHeaders";
import type { StudentAssignmentSubmission } from "../types/course.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function readApiData<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("Backend không trả về dữ liệu JSON hợp lệ.");
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? "Không thể xử lý bài nộp.");
  }

  return payload.data;
}

export async function submitAssignment(
  assignmentId: number,
  formData: FormData,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/assignments/${assignmentId}/submission`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    },
  );

  return readApiData<StudentAssignmentSubmission>(response);
}
