import { getAuthHeaders } from "../../auth/authHeaders";
import type {
  PublicInstructorDetail,
  StudentCourse,
  StudentCourseCategory,
  StudentCourseDetail,
  StudentCourseReviewEligibility,
  StudentEnrolledCourse,
  StudentOwnCourseReview,
} from "../types/course.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function readApiData<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "API khóa học chưa sẵn sàng. Vui lòng khởi động lại backend."
        : "Backend không trả về dữ liệu JSON hợp lệ.",
    );
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? "Không thể tải dữ liệu.");
  }

  return payload.data;
}

export async function getCourseCategories() {
  const response = await fetch(`${API_BASE_URL}/api/student/course-categories`, {
    headers: getAuthHeaders(),
  });

  return readApiData<StudentCourseCategory[]>(response);
}

export async function getCourses(filters: {
  categoryId?: number | null;
  level?: string;
  search?: string;
} = {}) {
  const params = new URLSearchParams();

  if (filters.categoryId) {
    params.set("categoryId", String(filters.categoryId));
  }

  if (filters.level) {
    params.set("level", filters.level);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/student/courses${query ? `?${query}` : ""}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return readApiData<StudentCourse[]>(response);
}

export async function getCourseDetail(courseId: number) {
  const response = await fetch(`${API_BASE_URL}/api/student/courses/${courseId}`, {
    headers: getAuthHeaders(),
  });

  return readApiData<StudentCourseDetail>(response);
}

export async function getPublicInstructor(teacherId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/instructors/${teacherId}`,
  );

  return readApiData<PublicInstructorDetail>(response);
}

export async function getCourseReviewEligibility(courseId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/courses/${courseId}/review-eligibility`,
    { headers: getAuthHeaders() },
  );

  return readApiData<StudentCourseReviewEligibility>(response);
}

export async function saveCourseReview(
  courseId: number,
  payload: {
    rating: number;
    teacherRating: number;
    comment: string;
  },
  isEditing: boolean,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/courses/${courseId}/reviews${isEditing ? "/me" : ""}`,
    {
      method: isEditing ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return readApiData<StudentOwnCourseReview>(response);
}

export async function getMyCourses() {
  const response = await fetch(`${API_BASE_URL}/api/student/my-courses`, {
    headers: getAuthHeaders(),
  });

  return readApiData<StudentEnrolledCourse[]>(response);
}

export async function completeLesson(lessonId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/lessons/${lessonId}/progress`,
    {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    },
  );

  return readApiData<{
    lessonId: number;
    courseId: number;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
  }>(response);
}
