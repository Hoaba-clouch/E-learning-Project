import { getAuthHeaders } from "../../auth/authHeaders";
import type {
  StudentExamAnswerDraft,
  StudentExamDashboard,
  StudentExamReview,
  StudentExamSubmissionResult,
  StudentExamWorkspace,
} from "../types/exam.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function readApiData<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("Backend không trả về dữ liệu JSON hợp lệ.");
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? fallbackMessage);
  }

  return payload.data;
}

function createJsonRequestOptions(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export async function getStudentExamDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/student/exams`, {
    headers: getAuthHeaders(),
  });

  return readApiData<StudentExamDashboard>(
    response,
    "Không thể tải danh sách bài kiểm tra.",
  );
}

export async function startStudentExam(examId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/exams/${examId}/start`,
    createJsonRequestOptions("POST"),
  );

  return readApiData<StudentExamWorkspace>(
    response,
    "Không thể bắt đầu bài kiểm tra.",
  );
}

export async function getStudentExamWorkspace(examId: number, attemptId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/exams/${examId}/attempts/${attemptId}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return readApiData<StudentExamWorkspace>(
    response,
    "Không thể tải bài kiểm tra đang làm.",
  );
}

export async function saveStudentExamDraft(
  examId: number,
  attemptId: number,
  answers: StudentExamAnswerDraft[],
) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/exams/${examId}/attempts/${attemptId}/answers`,
    createJsonRequestOptions("PUT", { answers }),
  );

  return readApiData<StudentExamWorkspace>(
    response,
    "Không thể lưu câu trả lời tạm thời.",
  );
}

export async function submitStudentExam(
  examId: number,
  attemptId: number,
  answers: StudentExamAnswerDraft[],
) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/exams/${examId}/attempts/${attemptId}/submit`,
    createJsonRequestOptions("POST", { answers }),
  );

  return readApiData<StudentExamSubmissionResult>(
    response,
    "Không thể nộp bài kiểm tra.",
  );
}

export async function getStudentExamReview(examId: number, attemptId?: number | null) {
  const query = attemptId ? `?attemptId=${attemptId}` : "";
  const response = await fetch(
    `${API_BASE_URL}/api/student/exams/${examId}/review${query}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return readApiData<StudentExamReview>(
    response,
    "Không thể tải phần review bài kiểm tra.",
  );
}
