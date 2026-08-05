/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import InstructorLayout from "../components/InstructorLayout";
import { getInstructorAuthTeacherId, getInstructorAuthToken } from "../auth/instructorAuth";
import { useLocation, useNavigate } from "react-router-dom";
import {
  courseBatches,
  courseManagementStats,
  instructorCourses,
  lessonPlanner,
} from "../data/instructorMockData";
import type {
  BatchFormData,
  ConfirmDialogState,
  CourseDetail,
  CourseDetailApiResponse,
  CourseDetailTab,
  CourseEditFormData,
  CourseFilter,
  CourseQuiz,
  CourseQuizAttempt,
  CourseQuizQuestion,
  CourseSession,
  CourseUpdateApiResponse,
  CourseWorkflowAction,
  InstructorCourseItem,
  InstructorCoursesApiResponse,
  InstructorToast,
  LessonImportFormData,
  QuizFormData,
  QuizQuestionFormData,
  RecurringScheduleFormData,
  RecurringScheduleApiResponse,
  SessionAttendanceApiResponse,
  SessionAttendanceData,
  SessionFormData,
  AttendanceStudent,
} from "../types/instructorCourseTypes";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const DEFAULT_TEACHER_ID = getInstructorAuthTeacherId();
const COURSE_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
];

function instructorFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getInstructorAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

function getCourseFilterStatus(status: string) {
  if (status === "Đã xuất bản" || status === "Da xuat ban") {
    return "published";
  }

  if (status === "Chờ duyệt" || status === "Cho duyet") {
    return "pending";
  }

  if (status === "Bản nháp" || status === "Ban nhap") {
    return "draft";
  }

  return "all";
}

function getCourseWorkflowStatus(course?: Pick<CourseDetail, "workflowStatus" | "status"> | null) {
  if (!course) return "";
  const rawStatus = course.workflowStatus?.toUpperCase();

  if (rawStatus) {
    return rawStatus;
  }

  const filterStatus = getCourseFilterStatus(course.status);
  if (filterStatus === "published") return "APPROVED";
  if (filterStatus === "pending") return "PENDING";
  if (filterStatus === "draft") return "DRAFT";
  if (course.status.includes("từ chối") || course.status.includes("tu choi")) return "REJECTED";
  return "";
}

function getCourseWorkflowAction(course?: Pick<CourseDetail, "workflowStatus" | "status"> | null) {
  const workflowStatus = getCourseWorkflowStatus(course);

  if (workflowStatus === "DRAFT") {
    return {
      action: "submit" as CourseWorkflowAction,
      label: "Gửi duyệt",
      title: "Gửi khóa học cho admin duyệt",
      message: "Khóa học sẽ chuyển sang trạng thái chờ duyệt. Admin sẽ kiểm tra nội dung trước khi xuất bản.",
      confirmLabel: "Gửi duyệt",
    };
  }

  if (workflowStatus === "REJECTED") {
    return {
      action: "submit" as CourseWorkflowAction,
      label: "Gửi duyệt lại",
      title: "Gửi duyệt lại khóa học",
      message: "Khóa học sẽ được gửi lại cho admin sau khi huynh đã chỉnh sửa nội dung.",
      confirmLabel: "Gửi duyệt lại",
    };
  }

  if (workflowStatus === "PENDING") {
    return {
      action: "cancel" as CourseWorkflowAction,
      label: "Hủy gửi duyệt",
      title: "Hủy gửi duyệt khóa học",
      message: "Khóa học sẽ quay về bản nháp để huynh tiếp tục chỉnh sửa trước khi gửi lại.",
      confirmLabel: "Hủy gửi duyệt",
    };
  }

  return null;
}

function getCourseThumbnail(course: InstructorCourseItem | CourseDetail, index: number) {
  if (course.thumbnail?.startsWith("http")) return course.thumbnail;
  return COURSE_FALLBACK_IMAGES[index % COURSE_FALLBACK_IMAGES.length];
}

function getBatchLabel(batch: { id: number; code?: string | null; batchCode?: string | null; name?: string | null; batchName?: string | null }) {
  const code = batch.code ?? batch.batchCode ?? (batch.id ? `BATCH-${batch.id}` : "BATCH");
  const name = batch.name ?? batch.batchName ?? "";
  return name ? `${code} - ${name}` : code;
}

function getBatchStudentCounts(batch: { students?: string; enrolledStudents?: number; maxStudents?: number }) {
  const fromText = String(batch.students ?? "").split("/").map((value) => Number(value.trim()));
  const enrolled = Number(batch.enrolledStudents ?? fromText[0] ?? 0);
  const max = Number(batch.maxStudents ?? fromText[1] ?? 0);

  return {
    enrolled: Number.isFinite(enrolled) ? enrolled : 0,
    max: Number.isFinite(max) ? max : 0,
  };
}

function getBatchReceivingStatus(batch: { status?: string; statusValue?: string; students?: string; enrolledStudents?: number; maxStudents?: number }) {
  const { enrolled, max } = getBatchStudentCounts(batch);
  const status = String(batch.statusValue ?? "").toUpperCase();

  if (max > 0 && enrolled >= max) return "Đã đủ học viên";
  if (status === "OPEN") return "Đang nhận học viên";
  if (status === "FULL") return "Đã đủ học viên";

  return batch.status ?? "Bản nháp";
}

function getBatchRemainingSlots(batch: { students?: string; enrolledStudents?: number; maxStudents?: number }) {
  const { enrolled, max } = getBatchStudentCounts(batch);
  if (!max) return null;
  return Math.max(max - enrolled, 0);
}

function getAutoAssignPriorityBatchId(batches: CourseDetail["batches"]) {
  const candidates = batches.filter((batch) => {
    const status = String(batch.statusValue ?? "").toUpperCase();
    const remainingSlots = getBatchRemainingSlots(batch);
    return status === "OPEN" && (remainingSlots == null || remainingSlots > 0);
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const leftDate = left.startDate ? new Date(left.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDate = right.startDate ? new Date(right.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDate - rightDate;
  })[0]?.id ?? null;
}

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
  { value: "0", label: "Chủ nhật" },
];

function createFallbackCourseDetail(course: InstructorCourseItem): CourseDetail {
  return {
    id: course.id,
    title: course.title,
    description:
      course.description ??
      `Khóa học cấp độ ${course.level.toLowerCase()} với lộ trình rõ ràng cho học viên.`,
    thumbnail: course.thumbnail ?? null,
    category: course.category,
    level: course.level,
    status: course.status,
    statusTone: course.statusTone,
    workflowStatus: course.workflowStatus,
    price: "Chưa cập nhật",
    duration: "Chưa cập nhật",
    rating: 0,
    overview: [
      { label: "Học viên", value: String(course.students), icon: "groups" },
      { label: "Chương", value: String(course.modules), icon: "view_list" },
      { label: "Bài học", value: String(course.lessons), icon: "play_lesson" },
      { label: "Hoàn thành TB", value: `${course.completion}%`, icon: "trending_up" },
    ],
    batches: [],
    modules: [],
    quizzes: [],
    reviews: [],
  };
}

function InstructorCourseManagementPage() {
  const { t } = useTranslation("instructor");
  const location = useLocation();
  const navigate = useNavigate();
  const [pageData, setPageData] =
    useState<InstructorCoursesApiResponse["data"] | null>(null);
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseDetail | null>(null);
  const [isCourseDetailLoading, setIsCourseDetailLoading] = useState(false);
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    price: "",
    categoryId: "",
    level: "BEGINNER",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [courseDetailTab, setCourseDetailTab] = useState<CourseDetailTab>("overview");
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [moduleFormMode, setModuleFormMode] = useState<"create" | "edit">("create");
  const [moduleFormTargetId, setModuleFormTargetId] = useState<number | null>(null);
  const [moduleFormData, setModuleFormData] = useState({ title: "", description: "" });
  const [lessonFormMode, setLessonFormMode] = useState<"create" | "edit">("create");
  const [lessonFormTargetId, setLessonFormTargetId] = useState<number | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    moduleId: "",
    title: "",
    type: "VIDEO",
    content: "",
    videoUrl: "",
    durationMinutes: "",
    isPreview: false,
  });
  const [showImportLessonsForm, setShowImportLessonsForm] = useState(false);
  const [importLessonCourseId, setImportLessonCourseId] = useState("");
  const [importLessonCourseDetail, setImportLessonCourseDetail] = useState<CourseDetail | null>(null);
  const [importLessonError, setImportLessonError] = useState<string | null>(null);
  const [isImportCourseLoading, setIsImportCourseLoading] = useState(false);
  const [isImportingLessons, setIsImportingLessons] = useState(false);
  const [importLessonFormData, setImportLessonFormData] = useState<LessonImportFormData>({
    moduleId: "",
    lines: "",
    defaultType: "VIDEO",
    defaultDurationMinutes: "",
    defaultIsPreview: false,
    defaultContent: "",
    defaultVideoUrl: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenCreateCourse = params.get("createCourse") === "1";
    const shouldOpenImportLessons = params.get("importLessons") === "1";

    if (!shouldOpenCreateCourse && !shouldOpenImportLessons) {
      return;
    }

    if (shouldOpenCreateCourse) {
      setShowCreateForm(true);
      params.delete("createCourse");
    }

    if (shouldOpenImportLessons) {
      setShowImportLessonsForm(true);
      setImportLessonError(null);
      params.delete("importLessons");
    }

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchFormMode, setBatchFormMode] = useState<"create" | "edit">("create");
  const [batchFormTarget, setBatchFormTarget] = useState<{ batchId?: number; courseId?: number } | null>(null);
  const [batchFormError, setBatchFormError] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchFormData, setBatchFormData] = useState<BatchFormData>({
    batchCode: "",
    batchName: "",
    startDate: "",
    endDate: "",
    enrollmentStartDate: "",
    enrollmentDeadline: "",
    minStudents: "1",
    maxStudents: "50",
    tuitionFee: "",
    learningMode: "ONLINE",
    onlinePlatform: "ZOOM",
    defaultMeetingUrl: "",
    classroomName: "",
    classroomAddress: "",
    timezone: "Asia/Ho_Chi_Minh",
    status: "OPEN",
    note: "",
  });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionFormMode, setSessionFormMode] = useState<"create" | "edit">("create");
  const [sessionFormTarget, setSessionFormTarget] = useState<{ batchId?: number; sessionId?: number } | null>(null);
  const [sessionFormError, setSessionFormError] = useState<string | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [showRecurringScheduleForm, setShowRecurringScheduleForm] = useState(false);
  const [recurringScheduleTarget, setRecurringScheduleTarget] = useState<{ batchId: number } | null>(null);
  const [recurringScheduleError, setRecurringScheduleError] = useState<string | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [recurringScheduleFormData, setRecurringScheduleFormData] = useState<RecurringScheduleFormData>({
    weekdays: ["1", "3", "5"],
    startTime: "19:00",
    endTime: "20:30",
    titlePrefix: "Buổi học",
    description: "",
    meetingUrl: "",
    meetingPassword: "",
    platform: "ZOOM",
    status: "SCHEDULED",
    note: "",
  });
  const [attendanceTarget, setAttendanceTarget] = useState<{ batchId: number; sessionId: number } | null>(null);
  const [attendanceData, setAttendanceData] = useState<SessionAttendanceData | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [sessionFormData, setSessionFormData] = useState<SessionFormData>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    meetingUrl: "",
    meetingPassword: "",
    platform: "ZOOM",
    status: "SCHEDULED",
    recordingUrl: "",
    note: "",
  });
  const [quizFormMode, setQuizFormMode] = useState<"create" | "edit">("create");
  const [quizFormTargetId, setQuizFormTargetId] = useState<number | null>(null);
  const [quizFormError, setQuizFormError] = useState<string | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedQuizAttemptId, setSelectedQuizAttemptId] = useState<number | null>(null);
  const [quizAttemptScore, setQuizAttemptScore] = useState("");
  const [quizAttemptError, setQuizAttemptError] = useState<string | null>(null);
  const [isSavingQuizAttemptGrade, setIsSavingQuizAttemptGrade] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [reviewReplyText, setReviewReplyText] = useState("");
  const [reviewReplyError, setReviewReplyError] = useState<string | null>(null);
  const [isSavingReviewReply, setIsSavingReviewReply] = useState(false);
  const [quizQuestionFormMode, setQuizQuestionFormMode] = useState<"create" | "edit">("create");
  const [quizQuestionFormTargetId, setQuizQuestionFormTargetId] = useState<number | null>(null);
  const [quizQuestionFormError, setQuizQuestionFormError] = useState<string | null>(null);
  const [isSavingQuizQuestion, setIsSavingQuizQuestion] = useState(false);
  const [isDeletingQuizQuestion, setIsDeletingQuizQuestion] = useState<number | null>(null);
  const [quizQuestionFormData, setQuizQuestionFormData] = useState<QuizQuestionFormData>({
    text: "",
    type: "SINGLE_CHOICE",
    score: "1",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctIndex: "0",
    trueFalseAnswer: "true",
  });
  const [quizFormData, setQuizFormData] = useState<QuizFormData>({
    batchScope: "SINGLE",
    batchId: "",
    lessonId: "",
    title: "",
    description: "",
    durationMinutes: "30",
    maxScore: "10",
    passScore: "5",
    attemptLimit: "1",
  });
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isReorderingModuleId, setIsReorderingModuleId] = useState<number | null>(null);
  const [isReorderingLessonId, setIsReorderingLessonId] = useState<number | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState<number | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isDeletingModule, setIsDeletingModule] = useState<number | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState<number | null>(null);
  const [isUpdatingWorkflow, setIsUpdatingWorkflow] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<CourseEditFormData>({
    title: "",
    description: "",
    thumbnailUrl: "",
    price: "",
    categoryId: "",
    level: "BEGINNER",
  });
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [editCourseError, setEditCourseError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [toast, setToast] = useState<InstructorToast>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourses() {
      try {
        const response = await instructorFetch(
          `${API_BASE_URL}/api/instructor/courses?teacherId=${DEFAULT_TEACHER_ID}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as InstructorCoursesApiResponse;

        if (!payload.success) {
          throw new Error("Instructor courses API returned unsuccessful response.");
        }

        setPageData(payload.data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error(error);
      }
    }

    loadCourses();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedCourseDetail) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCourseDetail();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCourseDetail]);

  useEffect(() => {
    if (!showCreateForm) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCreateForm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateForm]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!showImportLessonsForm || !importLessonCourseId) {
      return;
    }

    const courseId = Number(importLessonCourseId);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return;
    }

    let active = true;

    loadImportCourseDetail(courseId).catch((error) => {
      if (!active) return;
      console.error(error);
      setImportLessonError(error instanceof Error ? error.message : "Không thể tải khóa học để nhập bài học.");
    });

    return () => {
      active = false;
    };
  }, [importLessonCourseId, showImportLessonsForm]);

  useEffect(() => {
    if (!showImportLessonsForm || importLessonCourseId) {
      return;
    }

    const fallbackCourseId = selectedCourseDetail?.id ?? pageData?.instructorCourses[0]?.id;
    if (fallbackCourseId) {
      setImportLessonCourseId(String(fallbackCourseId));
    }
  }, [importLessonCourseId, pageData?.instructorCourses, selectedCourseDetail?.id, showImportLessonsForm]);

  useEffect(() => {
    if (!selectedCourseDetail) {
      closeEditState();
      return;
    }

    setEditFormData({
      title: selectedCourseDetail.title,
      description: selectedCourseDetail.description ?? "",
      thumbnailUrl: selectedCourseDetail.thumbnail ?? "",
      price: selectedCourseDetail.price.replace(/[^\d]/g, ""),
      categoryId: resolveCourseCategoryId(selectedCourseDetail),
      level:
        selectedCourseDetail.level === "Trung cấp"
          ? "INTERMEDIATE"
          : selectedCourseDetail.level === "Nâng cao"
            ? "ADVANCED"
            : "BEGINNER",
    });
  }, [selectedCourseDetail, pageData?.categories]);

  async function handleCreateCourse() {
    if (!createFormData.title || !createFormData.description) {
      setCreateError("Tiêu đề và mô tả không được để trống.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: createFormData.title,
            description: createFormData.description,
            thumbnailUrl: createFormData.thumbnailUrl,
            price: Number(createFormData.price) || 0,
            categoryId: createFormData.categoryId ? Number(createFormData.categoryId) : null,
            level: createFormData.level,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = (await response.json()) as { success: boolean; data: InstructorCourseItem };

      if (!result.success) {
        throw new Error("Failed to create course.");
      }

      // Close form and reset
      setShowCreateForm(false);
      setCreateFormData({
        title: "",
        description: "",
        thumbnailUrl: "",
        price: "",
        categoryId: "",
        level: "BEGINNER",
      });

      await refreshCoursesList();
    } catch (error) {
      console.error(error);
      setCreateError("Không thỒ tạo khóa học. Vui lòng thử lại.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateCourse() {
    if (!selectedCourseDetail?.id) {
      return;
    }

    if (!editFormData.title.trim() || !editFormData.description.trim()) {
      setEditCourseError("Tiêu đề và mô tả không được để trống.");
      return;
    }

    setIsUpdatingCourse(true);
    setEditCourseError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editFormData.title,
            description: editFormData.description,
            thumbnailUrl: editFormData.thumbnailUrl,
            price: Number(editFormData.price) || 0,
            categoryId: editFormData.categoryId ? Number(editFormData.categoryId) : null,
            level: editFormData.level,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as CourseUpdateApiResponse;

      if (!payload.success) {
        throw new Error("Failed to update course.");
      }

      await refreshCourseDetail(selectedCourseDetail.id);

      if (pageData) {
        const nextCourses = pageData.instructorCourses.map((course) =>
          course.id === selectedCourseDetail.id
            ? {
              ...course,
              title: payload.data.title,
              description: payload.data.description ?? course.description,
              thumbnail: payload.data.thumbnail ?? course.thumbnail,
              category: payload.data.category,
              categoryId: payload.data.categoryId,
              level: payload.data.level,
              status: payload.data.status,
              statusTone: payload.data.statusTone,
              workflowStatus: payload.data.workflowStatus ?? course.workflowStatus,
            }
            : course,
        );

        setPageData({
          ...pageData,
          instructorCourses: nextCourses,
        });
      }
    } catch (error) {
      console.error(error);
      setEditCourseError(error instanceof Error ? error.message : "Không thỒ cập nhật khóa học.");
    } finally {
      setIsUpdatingCourse(false);
    }
  }

  async function handleDeleteCourse() {
    if (!selectedCourseDetail?.id) {
      return;
    }

    setConfirmDialog({
      title: "Xóa khóa học",
      message: "Khóa học sẽ được ẩn khỏi danh sách giảng dạy. Các dữ liệu liên quan vẫn được giữ an toàn trong hệ thống.",
      confirmLabel: "Xóa khóa học",
      onConfirm: async () => {
        setIsDeletingCourse(true);
        setEditCourseError(null);

        try {
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}?teacherId=${DEFAULT_TEACHER_ID}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          closeCourseDetail();
          setCourseDetailTab("overview");
          resetCurriculumForms();
          await refreshCoursesList();
          setToast({ message: "Đã xóa khóa học khỏi danh sách.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thỒ xóa khóa học.";
          setEditCourseError(message);
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingCourse(false);
        }
      },
    });
  }

  async function handleCourseWorkflowAction(action: CourseWorkflowAction) {
    if (!selectedCourseDetail?.id) {
      return;
    }

    const courseId = selectedCourseDetail.id;

    setIsUpdatingWorkflow(true);
    setEditCourseError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}/workflow?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(courseId);
      await refreshCoursesList();
      setToast({
        message: action === "submit" ? "Đã gửi khóa học cho admin duyệt." : "Đã đưa khóa học về bản nháp.",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái duyệt.";
      setEditCourseError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsUpdatingWorkflow(false);
    }
  }

  function requestCourseWorkflowAction() {
    const workflowAction = getCourseWorkflowAction(selectedCourseDetail);

    if (!workflowAction) {
      return;
    }

    setConfirmDialog({
      title: workflowAction.title,
      message: workflowAction.message,
      confirmLabel: workflowAction.confirmLabel,
      onConfirm: () => handleCourseWorkflowAction(workflowAction.action),
    });
  }

  async function handleDeleteModule(moduleId: number) {
    if (!selectedCourseDetail?.id) {
      return;
    }

    const courseId = selectedCourseDetail.id;

    setConfirmDialog({
      title: "Xóa chương",
      message: "Toàn bộ bài học trong chương này cũng sẽ bị xóa khỏi khóa học.",
      confirmLabel: "Xóa chương",
      onConfirm: async () => {
        setIsDeletingModule(moduleId);
        setModuleError(null);

        try {
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${courseId}/modules/${moduleId}?teacherId=${DEFAULT_TEACHER_ID}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(courseId);
          setToast({ message: "Đã xóa chương khỏi khóa học.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thỒ xóa chương.";
          setModuleError(message);
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingModule(null);
        }
      },
    });
  }

  async function handleDeleteLesson(lessonId: number) {
    if (!selectedCourseDetail?.id) {
      return;
    }

    const courseId = selectedCourseDetail.id;

    setConfirmDialog({
      title: "Xóa bài học",
      message: "Bài học này sẽ bị xóa khỏi chương hiện tại.",
      confirmLabel: "Xóa bài học",
      onConfirm: async () => {
        setIsDeletingLesson(lessonId);
        setLessonError(null);

        try {
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${courseId}/lessons/${lessonId}?teacherId=${DEFAULT_TEACHER_ID}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(courseId);
          setToast({ message: "Đã xóa bài học.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thỒ xóa bài học.";
          setLessonError(message);
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingLesson(null);
        }
      },
    });
  }

  type StatItem = { label: string; value: string; icon: string; tone?: string };
  const displayedStats = (pageData?.summary ?? courseManagementStats).map((stat: StatItem) =>
    stat.icon === "event_available" ? { ...stat, label: "Lớp nhận học viên" } : stat,
  );
  const displayedCourses: InstructorCourseItem[] = pageData?.instructorCourses ?? instructorCourses;
  const filteredCourses = displayedCourses.filter((course) => {
    if (courseFilter === "all") return true;
    return getCourseFilterStatus(course.status) === courseFilter;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenCreateQuiz = params.get("createQuiz") === "1";

    if (!shouldOpenCreateQuiz || displayedCourses.length === 0) {
      return;
    }

    const targetCourse = displayedCourses.find((course) => course.id) ?? displayedCourses[0];

    async function openQuizCreator() {
      await openCourseDetail(targetCourse);
      setCourseDetailTab("quizzes");
      resetQuizForm("");
      params.delete("createQuiz");

      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true },
      );
    }

    openQuizCreator();
  }, [displayedCourses, location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseId = Number(params.get("courseId"));

    if (!Number.isFinite(courseId) || courseId <= 0 || displayedCourses.length === 0) {
      return;
    }

    const targetCourse = displayedCourses.find((course) => Number(course.id) === courseId);
    if (!targetCourse) {
      return;
    }

    openCourseDetail(targetCourse);
    params.delete("courseId");

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [displayedCourses, location.pathname, location.search, navigate]);

  const displayedBatches = pageData?.courseBatches ?? courseBatches;
  const displayedLessonPlanner = pageData?.lessonPlanner ?? lessonPlanner;
  const courseWorkflowAction = getCourseWorkflowAction(selectedCourseDetail);
  const selectedCourseWorkflowStatus = getCourseWorkflowStatus(selectedCourseDetail);
  const importTargetCourseDetail =
    importLessonCourseDetail ??
    (selectedCourseDetail?.id && Number(importLessonCourseId) === selectedCourseDetail.id
      ? selectedCourseDetail
      : null);
  const importTargetModules = importTargetCourseDetail?.modules ?? [];

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateError(null);
    setCreateFormData({
      title: "",
      description: "",
      thumbnailUrl: "",
      price: "",
      categoryId: "",
      level: "BEGINNER",
    });
  }

  function resolveCourseCategoryId(course: CourseDetail) {
    if (Number.isFinite(course.categoryId ?? NaN) && (course.categoryId ?? 0) > 0) {
      return String(course.categoryId);
    }

    const match = pageData?.categories.find((category) => category.label === course.category);
    return match ? String(match.id) : "";
  }

  function closeEditState() {
    setEditCourseError(null);
    setEditFormData({
      title: "",
      description: "",
      thumbnailUrl: "",
      price: "",
      categoryId: "",
      level: "BEGINNER",
    });
  }

  async function refreshCoursesList() {
    const response = await instructorFetch(
      `${API_BASE_URL}/api/instructor/courses?teacherId=${DEFAULT_TEACHER_ID}`,
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as InstructorCoursesApiResponse;

    if (!payload.success) {
      throw new Error("Instructor courses API returned unsuccessful response.");
    }

    setPageData(payload.data);
    return payload.data;
  }

  function resetCurriculumForms() {
    setModuleError(null);
    setLessonError(null);
    setModuleFormMode("create");
    setModuleFormTargetId(null);
    setLessonFormMode("create");
    setLessonFormTargetId(null);
    setModuleFormData({ title: "", description: "" });
    setLessonFormData({
      moduleId: "",
      title: "",
      type: "VIDEO",
      content: "",
      videoUrl: "",
      durationMinutes: "",
      isPreview: false,
    });
    setSelectedModuleId(null);
  }

  async function refreshCourseDetail(courseId: number) {
    const response = await instructorFetch(
      `${API_BASE_URL}/api/instructor/courses/${courseId}?teacherId=${DEFAULT_TEACHER_ID}`,
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as CourseDetailApiResponse;

    if (!payload.success) {
      throw new Error("Instructor course detail API returned unsuccessful response.");
    }

    setSelectedCourseDetail(payload.data);
    setSelectedModuleId(payload.data.modules[0]?.id ?? null);
    setSelectedBatchId((current) =>
      payload.data.batches.some((batch) => batch.id === current)
        ? current
        : payload.data.batches[0]?.id ?? null,
    );
    return payload.data;
  }

  function closeImportLessonsForm() {
    setShowImportLessonsForm(false);
    setImportLessonError(null);
    setImportLessonCourseDetail(null);
    setImportLessonCourseId("");
    setImportLessonFormData({
      moduleId: "",
      lines: "",
      defaultType: "VIDEO",
      defaultDurationMinutes: "",
      defaultIsPreview: false,
      defaultContent: "",
      defaultVideoUrl: "",
    });
  }

  function closeBatchForm() {
    setShowBatchForm(false);
    setBatchFormError(null);
    setBatchFormMode("create");
    setBatchFormTarget(null);
    setBatchFormData({
      batchCode: "",
      batchName: "",
      startDate: "",
      endDate: "",
      enrollmentStartDate: "",
      enrollmentDeadline: "",
      minStudents: "1",
      maxStudents: "50",
      tuitionFee: "",
      learningMode: "ONLINE",
      onlinePlatform: "ZOOM",
      defaultMeetingUrl: "",
      classroomName: "",
      classroomAddress: "",
      timezone: "Asia/Ho_Chi_Minh",
      status: "OPEN",
      note: "",
    });
  }

  function closeSessionForm() {
    setShowSessionForm(false);
    setSessionFormError(null);
    setSessionFormMode("create");
    setSessionFormTarget(null);
    setSessionFormData({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      meetingUrl: "",
      meetingPassword: "",
      platform: "ZOOM",
      status: "SCHEDULED",
      recordingUrl: "",
      note: "",
    });
  }

  function closeRecurringScheduleForm() {
    setShowRecurringScheduleForm(false);
    setRecurringScheduleTarget(null);
    setRecurringScheduleError(null);
    setRecurringScheduleFormData({
      weekdays: ["1", "3", "5"],
      startTime: "19:00",
      endTime: "20:30",
      titlePrefix: "Buổi học",
      description: "",
      meetingUrl: "",
      meetingPassword: "",
      platform: "ZOOM",
      status: "SCHEDULED",
      note: "",
    });
  }

  function resetQuizForm(batchId = selectedCourseDetail?.batches[0]?.id ?? "") {
    setQuizFormMode("create");
    setQuizFormTargetId(null);
    setQuizFormError(null);
    setQuizFormData({
      batchScope: "SINGLE",
      batchId: batchId ? String(batchId) : "",
      lessonId: "",
      title: "",
      description: "",
      durationMinutes: "30",
      maxScore: "10",
      passScore: "5",
      attemptLimit: "1",
    });
  }

  function resetQuizQuestionForm() {
    setQuizQuestionFormMode("create");
    setQuizQuestionFormTargetId(null);
    setQuizQuestionFormError(null);
    setQuizQuestionFormData({
      text: "",
      type: "SINGLE_CHOICE",
      score: "1",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctIndex: "0",
      trueFalseAnswer: "true",
    });
  }

  function resetQuizAttemptPanel() {
    setSelectedQuizAttemptId(null);
    setQuizAttemptScore("");
    setQuizAttemptError(null);
  }

  function resetReviewReplyPanel() {
    setSelectedReviewId(null);
    setReviewReplyText("");
    setReviewReplyError(null);
  }

  function closeCourseDetail() {
    setSelectedCourseDetail(null);
    closeBatchForm();
    closeSessionForm();
    closeRecurringScheduleForm();
    resetQuizForm("");
    resetQuizQuestionForm();
    resetQuizAttemptPanel();
    resetReviewReplyPanel();
  }

  function openCreateBatchForm(courseId?: number) {
    setBatchFormMode("create");
    setBatchFormTarget(courseId ? { courseId } : null);
    setBatchFormError(null);
    setBatchFormData({
      batchCode: "",
      batchName: "",
      startDate: "",
      endDate: "",
      enrollmentStartDate: "",
      enrollmentDeadline: "",
      minStudents: "1",
      maxStudents: "50",
      tuitionFee: "",
      learningMode: "ONLINE",
      onlinePlatform: "ZOOM",
      defaultMeetingUrl: "",
      classroomName: "",
      classroomAddress: "",
      timezone: "Asia/Ho_Chi_Minh",
      status: "OPEN",
      note: "",
    });
    setShowBatchForm(true);
  }

  function openEditBatchForm(courseId: number, batch: CourseDetail["batches"][number]) {
    setBatchFormMode("edit");
    setBatchFormTarget({ courseId, batchId: batch.id });
    setBatchFormError(null);
    setBatchFormData({
      batchCode: batch.code ?? "",
      batchName: batch.name ?? "",
      startDate: batch.startDate ?? "",
      endDate: batch.endDate ?? "",
      enrollmentStartDate: batch.enrollmentStartDate ?? "",
      enrollmentDeadline: batch.enrollmentDeadline ?? "",
      minStudents: String(batch.minStudents ?? 1),
      maxStudents: String(batch.maxStudents ?? 50),
      tuitionFee: batch.tuitionFee ?? "",
      learningMode: batch.learningModeValue ?? "ONLINE",
      onlinePlatform: batch.onlinePlatform ?? "ZOOM",
      defaultMeetingUrl: batch.defaultMeetingUrl ?? "",
      classroomName: batch.classroomName ?? "",
      classroomAddress: batch.classroomAddress ?? "",
      timezone: "Asia/Ho_Chi_Minh",
      status: batch.statusValue ?? "OPEN",
      note: batch.note ?? "",
    });
    setShowBatchForm(true);
  }

  function parseBatchFormPayload() {
    return {
      batchCode: batchFormData.batchCode.trim(),
      batchName: batchFormData.batchName.trim(),
      startDate: batchFormData.startDate,
      endDate: batchFormData.endDate,
      enrollmentStartDate: batchFormData.enrollmentStartDate,
      enrollmentDeadline: batchFormData.enrollmentDeadline,
      minStudents: Number(batchFormData.minStudents) || 1,
      maxStudents: Number(batchFormData.maxStudents) || 50,
      tuitionFee: batchFormData.tuitionFee,
      learningMode: batchFormData.learningMode,
      onlinePlatform: batchFormData.onlinePlatform,
      defaultMeetingUrl: batchFormData.defaultMeetingUrl.trim(),
      classroomName: batchFormData.classroomName.trim(),
      classroomAddress: batchFormData.classroomAddress.trim(),
      timezone: batchFormData.timezone.trim() || "Asia/Ho_Chi_Minh",
      status: batchFormData.status,
      note: batchFormData.note.trim(),
    };
  }

  async function handleSaveBatch() {
    const targetCourseId = batchFormTarget?.courseId ?? selectedCourseDetail?.id;
    if (!targetCourseId) {
      setBatchFormError("Hãy chọn khóa học.");
      return;
    }

    if (!batchFormData.batchName.trim()) {
      setBatchFormError("Tên lớp không được để trống.");
      return;
    }

    if (!batchFormData.startDate || !batchFormData.endDate) {
      setBatchFormError("Hãy chọn ngày bắt đầu và ngày kết thúc.");
      return;
    }

    setIsSavingBatch(true);
    setBatchFormError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${targetCourseId}/batches${batchFormMode === "edit" && batchFormTarget?.batchId ? `/${batchFormTarget.batchId}` : ""}?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: batchFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parseBatchFormPayload()),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(targetCourseId);
      await refreshCoursesList();
      setToast({
        message: batchFormMode === "edit" ? "Đã cập nhật lớp học." : "Đã tạo lớp học mới.",
        type: "success",
      });
      closeBatchForm();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu lớp học.";
      setBatchFormError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsSavingBatch(false);
    }
  }

  async function handleDeleteBatch(courseId: number, batchId: number) {
    setConfirmDialog({
      title: "Xóa lớp học",
      message: "Lớp học sẽ bị xóa khỏi khóa này và toàn bộ dữ liệu đợt mở lớp liên quan sẽ mất.",
      confirmLabel: "Xóa lớp học",
      onConfirm: async () => {
        setIsDeletingBatch(batchId);
        try {
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${courseId}/batches/${batchId}?teacherId=${DEFAULT_TEACHER_ID}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(courseId);
          await refreshCoursesList();
          setToast({ message: "Đã xóa lớp học.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thể xóa lớp học.";
          setBatchFormError(message);
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingBatch(null);
        }
      },
    });
  }

  function toDateTimeLocalValue(value: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function openCreateSessionForm(batchId?: number) {
    const targetBatch =
      selectedCourseDetail?.batches.find((batch) => batch.id === batchId) ?? null;
    const isOfflineBatch = String(targetBatch?.learningModeValue ?? "").toUpperCase() === "OFFLINE";

    setSessionFormMode("create");
    setSessionFormTarget(batchId ? { batchId } : null);
    setSessionFormError(null);
    setSessionFormData({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      meetingUrl: isOfflineBatch ? targetBatch?.classroomName ?? "" : targetBatch?.defaultMeetingUrl ?? "",
      meetingPassword: "",
      platform: isOfflineBatch ? "INTERNAL_ROOM" : targetBatch?.onlinePlatform ?? "ZOOM",
      status: "SCHEDULED",
      recordingUrl: "",
      note: "",
    });
    setShowSessionForm(true);
  }

  function openRecurringScheduleForm(batch: CourseDetail["batches"][number]) {
    setRecurringScheduleTarget({ batchId: batch.id });
    setRecurringScheduleError(null);
    const isOfflineBatch = String(batch.learningModeValue ?? "").toUpperCase() === "OFFLINE";
    setRecurringScheduleFormData({
      weekdays: ["1", "3", "5"],
      startTime: "19:00",
      endTime: "20:30",
      titlePrefix: "Buổi học",
      description: "",
      meetingUrl: isOfflineBatch ? batch.classroomName ?? "" : batch.defaultMeetingUrl ?? "",
      meetingPassword: "",
      platform: isOfflineBatch ? "INTERNAL_ROOM" : batch.onlinePlatform ?? "ZOOM",
      status: "SCHEDULED",
      note: "",
    });
    setShowRecurringScheduleForm(true);
  }

  function toggleRecurringWeekday(value: string) {
    setRecurringScheduleFormData((current) => {
      const weekdays = current.weekdays.includes(value)
        ? current.weekdays.filter((weekday) => weekday !== value)
        : [...current.weekdays, value];

      return { ...current, weekdays };
    });
  }

  async function handleGenerateRecurringSchedule() {
    const courseId = selectedCourseDetail?.id;
    const batchId = recurringScheduleTarget?.batchId;

    if (!courseId || !batchId) {
      setRecurringScheduleError("Hãy chọn khóa học và lớp học.");
      return;
    }

    if (recurringScheduleFormData.weekdays.length === 0) {
      setRecurringScheduleError("Hãy chọn ít nhất một thứ trong tuần.");
      return;
    }

    if (!recurringScheduleFormData.startTime || !recurringScheduleFormData.endTime) {
      setRecurringScheduleError("Hãy chọn giờ bắt đầu và giờ kết thúc.");
      return;
    }

    if (recurringScheduleFormData.endTime <= recurringScheduleFormData.startTime) {
      setRecurringScheduleError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    setIsGeneratingSchedule(true);
    setRecurringScheduleError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}/batches/${batchId}/sessions/generate?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...recurringScheduleFormData,
            weekdays: recurringScheduleFormData.weekdays.map(Number),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as RecurringScheduleApiResponse;
      if (!payload.success) throw new Error("Không thể tạo lịch định kỳ.");

      await refreshCourseDetail(courseId);
      await refreshCoursesList();
      setCourseDetailTab("schedule");
      setToast({
        message: `Đã tạo ${payload.data.generatedCount} buổi học${
          payload.data.skippedCount ? `, bỏ qua ${payload.data.skippedCount} buổi trùng lịch.` : "."
        }`,
        type: "success",
      });
      closeRecurringScheduleForm();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể tạo lịch định kỳ.";
      setRecurringScheduleError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsGeneratingSchedule(false);
    }
  }

  function openEditSessionForm(batchId: number, session: CourseSession) {
    setSessionFormMode("edit");
    setSessionFormTarget({ batchId, sessionId: session.id });
    setSessionFormError(null);
    setSessionFormData({
      title: session.title ?? "",
      description: session.description ?? "",
      startTime: toDateTimeLocalValue(session.startTime),
      endTime: toDateTimeLocalValue(session.endTime),
      meetingUrl: session.meetingUrl ?? "",
      meetingPassword: session.meetingPassword ?? "",
      platform: session.platform ?? "ZOOM",
      status: session.status ?? "SCHEDULED",
      recordingUrl: session.recordingUrl ?? "",
      note: session.note ?? "",
    });
    setShowSessionForm(true);
  }

  function parseSessionFormPayload() {
    return {
      title: sessionFormData.title.trim(),
      description: sessionFormData.description.trim(),
      startTime: sessionFormData.startTime,
      endTime: sessionFormData.endTime,
      meetingUrl: sessionFormData.meetingUrl.trim(),
      meetingPassword: sessionFormData.meetingPassword.trim(),
      platform: sessionFormData.platform,
      status: sessionFormData.status,
      recordingUrl: sessionFormData.recordingUrl.trim(),
      note: sessionFormData.note.trim(),
    };
  }

  async function handleSaveSession() {
    const targetCourseId = selectedCourseDetail?.id;
    const targetBatchId = sessionFormTarget?.batchId ?? selectedBatchId;

    if (!targetCourseId) {
      setSessionFormError("Hãy chọn khóa học.");
      return;
    }

    if (!targetBatchId) {
      setSessionFormError("Hãy chọn lớp học.");
      return;
    }

    if (!sessionFormData.title.trim()) {
      setSessionFormError("Tiêu đề buổi học không được để trống.");
      return;
    }

    if (!sessionFormData.startTime || !sessionFormData.endTime) {
      setSessionFormError("Hãy chọn thời gian bắt đầu và kết thúc.");
      return;
    }

    if (new Date(sessionFormData.endTime) <= new Date(sessionFormData.startTime)) {
      setSessionFormError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    setIsSavingSession(true);
    setSessionFormError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${targetCourseId}/batches/${targetBatchId}/sessions${
          sessionFormMode === "edit" && sessionFormTarget?.sessionId ? `/${sessionFormTarget.sessionId}` : ""
        }?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: sessionFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parseSessionFormPayload()),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(targetCourseId);
      await refreshCoursesList();
      setToast({
        message: sessionFormMode === "edit" ? "Đã cập nhật buổi học." : "Đã tạo buổi học mới.",
        type: "success",
      });
      closeSessionForm();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu buổi học.";
      setSessionFormError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsSavingSession(false);
    }
  }

  async function handleDeleteSession(batchId: number, sessionId: number) {
    const courseId = selectedCourseDetail?.id;
    if (!courseId) return;

    setConfirmDialog({
      title: "Xóa buổi học",
      message: "Buổi học sẽ bị xóa khỏi lịch của lớp và không thể khôi phục.",
      confirmLabel: "Xóa buổi học",
      onConfirm: async () => {
        try {
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${courseId}/batches/${batchId}/sessions/${sessionId}?teacherId=${DEFAULT_TEACHER_ID}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(courseId);
          await refreshCoursesList();
          setToast({ message: "Đã xóa buổi học.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thể xóa buổi học.";
          setToast({ message, type: "error" });
        }
      },
    });
  }

  async function openAttendanceModal(batchId: number, sessionId: number) {
    const courseId = selectedCourseDetail?.id;
    if (!courseId) return;

    setAttendanceTarget({ batchId, sessionId });
    setAttendanceData(null);
    setAttendanceError(null);
    setIsAttendanceLoading(true);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}/batches/${batchId}/sessions/${sessionId}/attendance?teacherId=${DEFAULT_TEACHER_ID}`,
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as SessionAttendanceApiResponse;
      if (!payload.success) throw new Error("Không thể tải dữ liệu điểm danh.");
      setAttendanceData(payload.data);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể tải dữ liệu điểm danh.";
      setAttendanceError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsAttendanceLoading(false);
    }
  }

  function updateAttendanceStudent(studentId: number, patch: Partial<AttendanceStudent>) {
    setAttendanceData((current) => {
      if (!current) return current;
      return {
        ...current,
        students: current.students.map((student) =>
          student.studentId === studentId ? { ...student, ...patch } : student,
        ),
      };
    });
  }

  async function handleSaveAttendance() {
    const courseId = selectedCourseDetail?.id;
    if (!courseId || !attendanceTarget || !attendanceData) return;

    setIsSavingAttendance(true);
    setAttendanceError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}/batches/${attendanceTarget.batchId}/sessions/${attendanceTarget.sessionId}/attendance?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendances: attendanceData.students.map((student) => ({
              studentId: student.studentId,
              status: student.status,
              durationMinutes: student.durationMinutes,
              note: student.note,
            })),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as SessionAttendanceApiResponse;
      if (!payload.success) throw new Error("Không thể lưu điểm danh.");

      setAttendanceData(payload.data);
      await refreshCourseDetail(courseId);
      setToast({ message: "Đã lưu điểm danh buổi học.", type: "success" });
      setAttendanceTarget(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu điểm danh.";
      setAttendanceError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsSavingAttendance(false);
    }
  }

  function openEditQuizForm(quiz: CourseQuiz) {
    setSelectedQuizId(quiz.id);
    setQuizFormMode("edit");
    setQuizFormTargetId(quiz.id);
    setQuizFormError(null);
    setQuizFormData({
      batchScope: "SINGLE",
      batchId: String(quiz.batchId),
      lessonId: quiz.lessonId ? String(quiz.lessonId) : "",
      title: quiz.title ?? "",
      description: quiz.description ?? "",
      durationMinutes: quiz.durationMinutes ? String(quiz.durationMinutes) : "30",
      maxScore: quiz.maxScore ?? "10",
      passScore: quiz.passScore ?? "5",
      attemptLimit: quiz.attemptLimit ? String(quiz.attemptLimit) : "1",
    });
    setCourseDetailTab("quizzes");
    setQuizQuestionFormMode("create");
    setQuizQuestionFormTargetId(null);
  }

  async function handleSaveQuiz() {
    if (!selectedCourseDetail?.id) return;

    const isCreateForAllBatches = quizFormMode === "create" && quizFormData.batchScope === "ALL";
    const batchId = Number(quizFormData.batchId);
    if (!isCreateForAllBatches && (!Number.isFinite(batchId) || batchId <= 0)) {
      setQuizFormError("Hãy chọn lớp cho quiz.");
      return;
    }

    if (!quizFormData.title.trim()) {
      setQuizFormError("Tiêu đề quiz không được để trống.");
      return;
    }

    const maxScore = Number(quizFormData.maxScore);
    const passScore = Number(quizFormData.passScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setQuizFormError("Điểm tối đa phải lớn hơn 0.");
      return;
    }

    if (!Number.isFinite(passScore) || passScore < 0 || passScore > maxScore) {
      setQuizFormError("Điểm đạt phải nằm trong khoảng 0 đến điểm tối đa.");
      return;
    }

    setIsSavingQuiz(true);
    setQuizFormError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/quizzes${
          quizFormMode === "edit" && quizFormTargetId ? `/${quizFormTargetId}` : ""
        }?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: quizFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...quizFormData,
            batchId: Number.isFinite(batchId) && batchId > 0 ? batchId : null,
            lessonId: quizFormData.lessonId ? Number(quizFormData.lessonId) : null,
            durationMinutes: Number(quizFormData.durationMinutes) || 30,
            maxScore,
            passScore,
            attemptLimit: Number(quizFormData.attemptLimit) || 1,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(selectedCourseDetail.id);
      await refreshCoursesList();
      setCourseDetailTab("quizzes");
      resetQuizForm(batchId);
      setToast({
        message:
          quizFormMode === "edit"
            ? "Đã cập nhật quiz."
            : isCreateForAllBatches
              ? "Đã tạo quiz cho tất cả lớp trong khóa."
              : "Đã tạo quiz mới.",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      setQuizFormError(error instanceof Error ? error.message : "Không thỒ lưu quiz.");
    } finally {
      setIsSavingQuiz(false);
    }
  }

  async function handleDeleteQuiz(quizId: number) {
    if (!selectedCourseDetail?.id) return;

    const courseId = selectedCourseDetail.id;
    setConfirmDialog({
      title: "Xóa quiz",
      message: "Quiz này sẽ bị xóa khỏi khóa học. Những dữ liệu làm bài liên quan có thể không còn dùng được.",
      confirmLabel: "Xóa quiz",
      onConfirm: async () => {
        try {
          setIsDeletingQuiz(quizId);
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${courseId}/quizzes/${quizId}?teacherId=${DEFAULT_TEACHER_ID}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(courseId);
          await refreshCoursesList();
          if (quizFormTargetId === quizId) {
            resetQuizForm();
            resetQuizQuestionForm();
          }
          setCourseDetailTab("quizzes");
          setToast({ message: "Đã xóa quiz.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thỒ xóa quiz.";
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingQuiz(null);
        }
      },
    });
  }

  function openEditQuizQuestion(quiz: CourseQuiz, question: CourseQuizQuestion) {
    setSelectedQuizId(quiz.id);
    setQuizQuestionFormMode("edit");
    setQuizQuestionFormTargetId(question.id);
    setQuizQuestionFormError(null);
    setQuizQuestionFormData({
      text: question.text ?? "",
      type: question.type ?? "SINGLE_CHOICE",
      score: question.score ?? "1",
      optionA: question.options[0]?.text ?? "",
      optionB: question.options[1]?.text ?? "",
      optionC: question.options[2]?.text ?? "",
      optionD: question.options[3]?.text ?? "",
      correctIndex:
        question.type === "TRUE_FALSE"
          ? question.options.findIndex((option) => option.isCorrect).toString()
          : question.options.findIndex((option) => option.isCorrect).toString(),
      trueFalseAnswer: question.type === "TRUE_FALSE"
        ? (question.options.find((option) => option.isCorrect)?.text ?? "true").toLowerCase()
        : "true",
    });
    setCourseDetailTab("quizzes");
  }

  async function handleSaveQuizQuestion() {
    if (!selectedCourseDetail?.id || !selectedQuiz) return;

    if (!quizQuestionFormData.text.trim()) {
      setQuizQuestionFormError("Nội dung câu hỏi không được để trống.");
      return;
    }

    const score = Number(quizQuestionFormData.score);
    if (!Number.isFinite(score) || score <= 0) {
      setQuizQuestionFormError("Điểm câu hỏi phải lớn hơn 0.");
      return;
    }

    const type = quizQuestionFormData.type;
    const options =
      type === "ESSAY"
        ? []
        : type === "TRUE_FALSE"
          ? [
              { text: "True", isCorrect: quizQuestionFormData.trueFalseAnswer === "true" },
              { text: "False", isCorrect: quizQuestionFormData.trueFalseAnswer === "false" },
            ]
          : [
              { text: quizQuestionFormData.optionA.trim(), isCorrect: quizQuestionFormData.correctIndex === "0" },
              { text: quizQuestionFormData.optionB.trim(), isCorrect: quizQuestionFormData.correctIndex === "1" },
              { text: quizQuestionFormData.optionC.trim(), isCorrect: quizQuestionFormData.correctIndex === "2" },
              { text: quizQuestionFormData.optionD.trim(), isCorrect: quizQuestionFormData.correctIndex === "3" },
            ].filter((option) => option.text);

    if (type !== "ESSAY" && options.length === 0) {
      setQuizQuestionFormError("Hãy nhập ít nhất một đáp án.");
      return;
    }

    if (type === "SINGLE_CHOICE" && options.filter((option) => option.isCorrect).length !== 1) {
      setQuizQuestionFormError("Câu trắc nghiệm 1 đáp án phải có đúng 1 đáp án đúng.");
      return;
    }

    if (type === "TRUE_FALSE" && options.filter((option) => option.isCorrect).length !== 1) {
      setQuizQuestionFormError("Câu đúng/sai phải chọn đúng 1 đáp án đúng.");
      return;
    }

    if (type === "MULTIPLE_CHOICE" && options.filter((option) => option.isCorrect).length === 0) {
      setQuizQuestionFormError("Câu chọn nhiều đáp án phải có ít nhất 1 đáp án đúng.");
      return;
    }

    setIsSavingQuizQuestion(true);
    setQuizQuestionFormError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/quizzes/${selectedQuiz.id}/questions${
          quizQuestionFormMode === "edit" && quizQuestionFormTargetId ? `/${quizQuestionFormTargetId}` : ""
        }?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: quizQuestionFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: quizQuestionFormData.text.trim(),
            type,
            score,
            options,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(selectedCourseDetail.id);
      await refreshCoursesList();
      setCourseDetailTab("quizzes");
      resetQuizQuestionForm();
      setSelectedQuizId(selectedQuiz.id);
      setToast({
        message: quizQuestionFormMode === "edit" ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi mới.",
        type: "success",
      });
    } catch (error) {
      console.error(error);
      setQuizQuestionFormError(error instanceof Error ? error.message : "Không thỒ lưu câu hỏi.");
    } finally {
      setIsSavingQuizQuestion(false);
    }
  }

  async function handleDeleteQuizQuestion(quizId: number, questionId: number) {
    if (!selectedCourseDetail?.id) return;

    setConfirmDialog({
      title: "Xóa câu hỏi",
      message: "Câu hỏi này sẽ bị xóa khỏi quiz.",
      confirmLabel: "Xóa câu hỏi",
      onConfirm: async () => {
        try {
          setIsDeletingQuizQuestion(questionId);
          const response = await instructorFetch(
            `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/quizzes/${quizId}/questions/${questionId}?teacherId=${DEFAULT_TEACHER_ID}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
          }

          await refreshCourseDetail(selectedCourseDetail.id!);
          await refreshCoursesList();
          setSelectedQuizId(quizId);
          setToast({ message: "Đã xóa câu hỏi.", type: "success" });
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Không thỒ xóa câu hỏi.";
          setToast({ message, type: "error" });
        } finally {
          setIsDeletingQuizQuestion(null);
        }
      },
    });
  }

  function openQuizAttempt(attempt: CourseQuizAttempt) {
    setSelectedQuizAttemptId(attempt.id);
    setQuizAttemptScore(attempt.score ?? "");
    setQuizAttemptError(null);
    setCourseDetailTab("quizzes");
  }

  function openReviewReply(review: { id: number; teacherComment: string | null }) {
    setSelectedReviewId(review.id);
    setReviewReplyText(review.teacherComment ?? "");
    setReviewReplyError(null);
    setCourseDetailTab("overview");
  }

  async function handleGradeQuizAttempt() {
    if (!selectedCourseDetail?.id || !selectedQuiz || !selectedQuizAttempt) return;

    const score = Number(quizAttemptScore);
    const maxScore = Number(selectedQuiz.maxScore);
    if (!Number.isFinite(score) || score < 0) {
      setQuizAttemptError("Điểm phải là số từ 0 trở lên.");
      return;
    }

    if (Number.isFinite(maxScore) && score > maxScore) {
      setQuizAttemptError("Điểm không được lớn hơn điểm tối đa của quiz.");
      return;
    }

    setIsSavingQuizAttemptGrade(true);
    setQuizAttemptError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/quizzes/${selectedQuiz.id}/attempts/${selectedQuizAttempt.id}/grade?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(selectedCourseDetail.id);
      await refreshCoursesList();
      setSelectedQuizId(selectedQuiz.id);
      setSelectedQuizAttemptId(selectedQuizAttempt.id);
      setToast({ message: "Đã chấm điểm lượt làm.", type: "success" });
    } catch (error) {
      console.error(error);
      setQuizAttemptError(error instanceof Error ? error.message : "Không thể chấm điểm lượt làm.");
    } finally {
      setIsSavingQuizAttemptGrade(false);
    }
  }

  async function handleSaveReviewReply() {
    if (!selectedCourseDetail?.id || !selectedReviewId) return;

    const teacherComment = reviewReplyText.trim();
    if (!teacherComment) {
      setReviewReplyError("Phản hồi không được để trống.");
      return;
    }

    setIsSavingReviewReply(true);
    setReviewReplyError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/reviews/${selectedReviewId}/respond?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherComment }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      await refreshCourseDetail(selectedCourseDetail.id);
      await refreshCoursesList();
      setSelectedReviewId(selectedReviewId);
      setToast({ message: "Đã lưu phản hồi đánh giá.", type: "success" });
    } catch (error) {
      console.error(error);
      setReviewReplyError(error instanceof Error ? error.message : "Không thể lưu phản hồi.");
    } finally {
      setIsSavingReviewReply(false);
    }
  }

  const activeBatch =
    selectedCourseDetail?.batches.find((batch) => batch.id === selectedBatchId) ??
    selectedCourseDetail?.batches[0] ??
    null;
  const sessionFormBatch =
    selectedCourseDetail?.batches.find((batch) => batch.id === sessionFormTarget?.batchId) ??
    activeBatch;
  const isOfflineSessionBatch =
    String(sessionFormBatch?.learningModeValue ?? sessionFormBatch?.mode ?? "").toUpperCase() ===
    "OFFLINE";
  const recurringScheduleBatch =
    selectedCourseDetail?.batches.find((batch) => batch.id === recurringScheduleTarget?.batchId) ??
    null;
  const isOfflineRecurringBatch =
    String(recurringScheduleBatch?.learningModeValue ?? recurringScheduleBatch?.mode ?? "").toUpperCase() ===
    "OFFLINE";
  const autoAssignPriorityBatchId = selectedCourseDetail
    ? getAutoAssignPriorityBatchId(selectedCourseDetail.batches)
    : null;

  const selectedQuiz =
    selectedCourseDetail?.quizzes.find((quiz) => quiz.id === selectedQuizId) ??
    selectedCourseDetail?.quizzes[0] ??
    null;

  const selectedQuizAttempt =
    selectedQuiz?.attemptItems.find((attempt) => attempt.id === selectedQuizAttemptId) ??
    selectedQuiz?.attemptItems[0] ??
    null;

  const selectedReview =
    selectedCourseDetail?.reviews.find((review) => review.id === selectedReviewId) ??
    selectedCourseDetail?.reviews[0] ??
    null;

  const courseLessons =
    selectedCourseDetail?.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        ...lesson,
        moduleTitle: module.title,
      })),
    ) ?? [];

  function parseImportLessonLines(text: string) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, durationMinutes, type, preview, content, videoUrl] = line
          .split("|")
          .map((part) => part.trim());

        return {
          title,
          durationMinutes: durationMinutes || importLessonFormData.defaultDurationMinutes || "0",
          type: (type || importLessonFormData.defaultType || "VIDEO").toUpperCase(),
          isPreview:
            /^(1|true|yes|y|preview)$/i.test(preview || "")
            || importLessonFormData.defaultIsPreview,
          content: content || importLessonFormData.defaultContent || "",
          videoUrl: videoUrl || importLessonFormData.defaultVideoUrl || "",
        };
      })
      .filter((lesson) => lesson.title);
  }

  async function loadImportCourseDetail(courseId: number) {
    setIsImportCourseLoading(true);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}?teacherId=${DEFAULT_TEACHER_ID}`,
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as CourseDetailApiResponse;
      if (!payload.success) {
        throw new Error("Instructor course detail API returned unsuccessful response.");
      }

      setImportLessonCourseDetail(payload.data);
      setImportLessonFormData((current) => ({
        ...current,
        moduleId: current.moduleId || String(payload.data.modules[0]?.id ?? ""),
      }));
    } finally {
      setIsImportCourseLoading(false);
    }
  }

  function openImportLessonsForm() {
    const fallbackCourseId = selectedCourseDetail?.id ?? pageData?.instructorCourses[0]?.id ?? null;

    setShowImportLessonsForm(true);
    setImportLessonError(null);

    if (fallbackCourseId) {
      setImportLessonCourseId(String(fallbackCourseId));
    }
  }

  async function openCourseDetail(course: InstructorCourseItem) {
    setSelectedCourseDetail(createFallbackCourseDetail(course));
    setCourseDetailError(null);
    setCourseDetailTab("overview");
    resetCurriculumForms();
    resetQuizForm("");
    resetQuizQuestionForm();
    setSelectedBatchId(null);

    if (!course.id) {
      return;
    }

    setIsCourseDetailLoading(true);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${course.id}?teacherId=${DEFAULT_TEACHER_ID}`,
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as CourseDetailApiResponse;

      if (!payload.success) {
        throw new Error("Instructor course detail API returned unsuccessful response.");
      }

      setSelectedCourseDetail(payload.data);
      setSelectedModuleId(payload.data.modules[0]?.id ?? null);
      setSelectedBatchId(payload.data.batches[0]?.id ?? null);
      setQuizFormData((current) => ({
        ...current,
        batchId: current.batchId || String(payload.data.batches[0]?.id ?? ""),
      }));
      setSelectedQuizId((current) =>
        payload.data.quizzes.some((quiz) => quiz.id === current) ? current : payload.data.quizzes[0]?.id ?? null,
      );
      setSelectedReviewId((current) =>
        payload.data.reviews.some((review) => review.id === current) ? current : payload.data.reviews[0]?.id ?? null,
      );
      setReviewReplyText(payload.data.reviews[0]?.teacherComment ?? "");
    } catch (error) {
      console.error(error);
      setCourseDetailError("Chưa tải được dữ liệu chi tiết mới nhất.");
    } finally {
      setIsCourseDetailLoading(false);
    }
  }

  async function handleCreateModule() {
    if (!selectedCourseDetail?.id) {
      return;
    }

    if (!moduleFormData.title.trim()) {
      setModuleError("Tiêu đề chương không được để trống.");
      return;
    }

    setIsCreatingModule(true);
    setModuleError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/modules${moduleFormMode === "edit" && moduleFormTargetId ? `/${moduleFormTargetId}` : ""}?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: moduleFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(moduleFormData),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const detail = await refreshCourseDetail(selectedCourseDetail.id);
      setCourseDetailTab("curriculum");
      if (moduleFormMode === "edit") {
        cancelModuleEdit();
      } else {
        setModuleFormData({ title: "", description: "" });
        setSelectedModuleId(detail.modules[detail.modules.length - 1]?.id ?? null);
      }
    } catch (error) {
      console.error(error);
      setModuleError(error instanceof Error ? error.message : "Không thỒ tạo chương.");
    } finally {
      setIsCreatingModule(false);
    }
  }

  function openEditModuleForm(module: CourseDetail["modules"][number]) {
    setModuleFormMode("edit");
    setModuleFormTargetId(module.id);
    setModuleError(null);
    setModuleFormData({
      title: module.title ?? "",
      description: module.description ?? "",
    });
    setCourseDetailTab("curriculum");
  }

  function openEditLessonForm(moduleId: number, lesson: CourseDetail["modules"][number]["lessons"][number]) {
    setLessonFormMode("edit");
    setLessonFormTargetId(lesson.id);
    setLessonError(null);
    setLessonFormData({
      moduleId: String(moduleId),
      title: lesson.title ?? "",
      type: lesson.type ?? "VIDEO",
      content: lesson.content ?? "",
      videoUrl: lesson.videoUrl ?? "",
      durationMinutes: lesson.durationMinutes ? String(lesson.durationMinutes) : "",
      isPreview: lesson.isPreview ?? false,
    });
    setSelectedModuleId(moduleId);
    setCourseDetailTab("curriculum");
  }

  function cancelModuleEdit() {
    setModuleFormMode("create");
    setModuleFormTargetId(null);
    setModuleError(null);
    setModuleFormData({ title: "", description: "" });
  }

  function cancelLessonEdit() {
    setLessonFormMode("create");
    setLessonFormTargetId(null);
    setLessonError(null);
    setLessonFormData({
      moduleId: selectedModuleId ? String(selectedModuleId) : "",
      title: "",
      type: "VIDEO",
      content: "",
      videoUrl: "",
      durationMinutes: "",
      isPreview: false,
    });
  }

  function moveId(items: number[], itemId: number, direction: -1 | 1) {
    const index = items.indexOf(itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return items;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    return nextItems;
  }

  async function handleMoveModule(moduleId: number, direction: -1 | 1) {
    if (!selectedCourseDetail?.id) return;

    const moduleIds = selectedCourseDetail.modules.map((module) => module.id);
    const nextModuleIds = moveId(moduleIds, moduleId, direction);
    if (nextModuleIds.join(",") === moduleIds.join(",")) return;

    const previousDetail = selectedCourseDetail;
    setSelectedCourseDetail({
      ...selectedCourseDetail,
      modules: nextModuleIds
        .map((id, index) => {
          const module = selectedCourseDetail.modules.find((item) => item.id === id);
          return module ? { ...module, order: index + 1 } : null;
        })
        .filter(Boolean) as CourseDetail["modules"],
    });
    setIsReorderingModuleId(moduleId);
    setModuleError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/modules/order?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleIds: nextModuleIds }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      setCourseDetailTab("curriculum");
      setSelectedModuleId(moduleId);
    } catch (error) {
      console.error(error);
      setSelectedCourseDetail(previousDetail);
      setModuleError(error instanceof Error ? error.message : "Không thỒ sắp xếp chương.");
    } finally {
      setIsReorderingModuleId(null);
    }
  }

  async function handleMoveLesson(moduleId: number, lessonId: number, direction: -1 | 1) {
    if (!selectedCourseDetail?.id) return;

    const module = selectedCourseDetail.modules.find((item) => item.id === moduleId);
    if (!module) return;

    const lessonIds = module.lessons.map((lesson) => lesson.id);
    const nextLessonIds = moveId(lessonIds, lessonId, direction);
    if (nextLessonIds.join(",") === lessonIds.join(",")) return;

    const previousDetail = selectedCourseDetail;
    setSelectedCourseDetail({
      ...selectedCourseDetail,
      modules: selectedCourseDetail.modules.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              lessons: nextLessonIds
                .map((id) => item.lessons.find((lesson) => lesson.id === id))
                .filter(Boolean) as CourseDetail["modules"][number]["lessons"],
            }
          : item,
      ),
    });
    setIsReorderingLessonId(lessonId);
    setLessonError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/modules/${moduleId}/lessons/order?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonIds: nextLessonIds }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      setCourseDetailTab("curriculum");
      setSelectedModuleId(moduleId);
    } catch (error) {
      console.error(error);
      setSelectedCourseDetail(previousDetail);
      setLessonError(error instanceof Error ? error.message : "Không thỒ sắp xếp bài học.");
    } finally {
      setIsReorderingLessonId(null);
    }
  }

  async function handleCreateLesson() {
    if (!selectedCourseDetail?.id) {
      return;
    }

    const moduleId = Number(lessonFormData.moduleId || selectedModuleId);

    if (!Number.isFinite(moduleId) || moduleId <= 0) {
      setLessonError("Hãy chọn một chương trước.");
      return;
    }

    if (!lessonFormData.title.trim()) {
      setLessonError("Tiêu đề bài học không được để trống.");
      return;
    }

    setIsCreatingLesson(true);
    setLessonError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${selectedCourseDetail.id}/lessons${lessonFormMode === "edit" && lessonFormTargetId ? `/${lessonFormTargetId}` : ""}?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: lessonFormMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...lessonFormData,
            moduleId,
            durationMinutes: Number(lessonFormData.durationMinutes) || 0,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const detail = await refreshCourseDetail(selectedCourseDetail.id);
      const fallbackModuleId = detail.modules.find((module) => module.id === moduleId)?.id ?? detail.modules[0]?.id ?? null;
      setCourseDetailTab("curriculum");
      if (lessonFormMode === "edit") {
        cancelLessonEdit();
      } else {
        setLessonFormData({
          moduleId: fallbackModuleId ? String(fallbackModuleId) : "",
          title: "",
          type: "VIDEO",
          content: "",
          videoUrl: "",
          durationMinutes: "",
          isPreview: false,
        });
      }
      setSelectedModuleId(fallbackModuleId);
    } catch (error) {
      console.error(error);
      setLessonError(error instanceof Error ? error.message : "Không thỒ lưu bài học.");
    } finally {
      setIsCreatingLesson(false);
    }
  }

  async function handleImportLessons() {
    const courseId = Number(importLessonCourseId);
    const moduleId = Number(importLessonFormData.moduleId);

    if (!Number.isFinite(courseId) || courseId <= 0) {
      setImportLessonError("Hãy chọn khóa học.");
      return;
    }

    if (!Number.isFinite(moduleId) || moduleId <= 0) {
      setImportLessonError("Hãy chọn một chương trước.");
      return;
    }

    const lessons = parseImportLessonLines(importLessonFormData.lines);
    if (lessons.length === 0) {
      setImportLessonError("Hãy dán ít nhất một dòng bài học hợp lệ.");
      return;
    }

    setIsImportingLessons(true);
    setImportLessonError(null);

    try {
      const response = await instructorFetch(
        `${API_BASE_URL}/api/instructor/courses/${courseId}/lessons/import?teacherId=${DEFAULT_TEACHER_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            lessons,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { success: boolean; data: { importedCount: number } };

      if (!payload.success) {
        throw new Error("Không thỒ nhập bài học.");
      }

      if (selectedCourseDetail?.id === courseId) {
        await refreshCourseDetail(courseId);
      }

      await refreshCoursesList();
      setToast({ message: `Đã nhập ${payload.data.importedCount} bài học.`, type: "success" });
      closeImportLessonsForm();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thỒ nhập bài học.";
      setImportLessonError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsImportingLessons(false);
    }
  }

  return (
    <InstructorLayout activePage="courses">
      <section className="instructor-hero instructor-course-hero">
        <div>
          <p className="instructor-eyebrow">{t("coursesPage.eyebrow")}</p>
          <h2>{t("coursesPage.title")}</h2>
          <p>{t("coursesPage.description")}</p>
        </div>
        <div className="instructor-hero-actions">
          <button className="instructor-secondary-button" onClick={openImportLessonsForm} type="button">
            <span className="material-symbols-outlined">upload_file</span>
            {t("coursesPage.importLessons")}
          </button>
          <button className="instructor-primary-button" type="button" onClick={() => setShowCreateForm(true)}>
            <span className="material-symbols-outlined">add</span>
            {t("coursesPage.newCourse")}
          </button>
        </div>
      </section>

      <section className="instructor-stat-grid" aria-label={t("coursesPage.overviewLabel")}>
        {displayedStats.map((stat) => (
          <article className="instructor-stat-card" key={stat.label}>
            <div className={`instructor-stat-icon ${stat.tone}`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p>{stat.label}</p>
            <div>
              <strong>{stat.value}</strong>
              <span>{pageData ? "Theo danh mục hiện tại" : "Không gian hiện tại"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="instructor-panel instructor-course-workbench">
        <div className="instructor-panel-header">
          <div>
            <p className="instructor-eyebrow">{t("coursesPage.catalogEyebrow")}</p>
            <h3>{t("coursesPage.teachingCourses")}</h3>
          </div>
          <div className="instructor-filter-tabs" aria-label="Bộ lọc khóa học">
            <button
              className={courseFilter === "all" ? "active" : ""}
              onClick={() => setCourseFilter("all")}
              type="button"
            >
              {t("coursesPage.all")}
            </button>
            <button
              className={courseFilter === "published" ? "active" : ""}
              onClick={() => setCourseFilter("published")}
              type="button"
            >
              Đã xuất bản
            </button>
            <button
              className={courseFilter === "draft" ? "active" : ""}
              onClick={() => setCourseFilter("draft")}
              type="button"
            >
              Bản nháp
            </button>
            <button
              className={courseFilter === "pending" ? "active" : ""}
              onClick={() => setCourseFilter("pending")}
              type="button"
            >
              Chờ duyệt
            </button>
          </div>
        </div>

        <div className="instructor-course-card-grid">
          {filteredCourses.length === 0 ? (
            <p className="instructor-empty-state">Không có khóa học phù hợp với bộ lọc này.</p>
          ) : filteredCourses.map((course, index) => (
            <article className="instructor-management-card" key={`${(course as InstructorCourseItem).id ?? index}-${course.title}`}>
              <img
                alt=""
                onError={(event) => {
                  event.currentTarget.src =
                    COURSE_FALLBACK_IMAGES[index % COURSE_FALLBACK_IMAGES.length];
                }}
                src={getCourseThumbnail(course, index)}
              />
              <div className="instructor-management-card-body">
                <div className="instructor-card-kicker">
                  <span>{course.category}</span>
                  <em>{course.status}</em>
                </div>
                <h4>{course.title}</h4>
                <p>{t("coursesPage.levelDescription", { level: course.level.toLowerCase() })}</p>

                <div className="instructor-course-metrics">
                  <span>{course.students} học viên</span>
                  <span>{course.modules} chương</span>
                  <span>{course.lessons} bài học</span>
                </div>

                <div className="instructor-progress-track">
                  <span style={{ width: `${course.completion}%` }} />
                </div>

                <div className="instructor-card-footer">
                  <strong>{course.completion}% hoàn thành</strong>
                  <button onClick={() => openCourseDetail(course)} type="button">
                    {t("coursesPage.manage")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="instructor-course-management-grid">
        <article className="instructor-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("coursesPage.classesEyebrow")}</p>
              <h3>{t("coursesPage.openClasses")}</h3>
            </div>
            <span className="material-symbols-outlined">event</span>
          </div>

          <div className="instructor-batch-list">
            {displayedBatches.map((batch: { id: number; code: string; name: string; students: string; status: string; statusValue: string; course?: string; dates?: string; mode?: string }) => (
              <div className="instructor-batch-item" key={batch.code}>
                <div>
                  <strong>{batch.code}</strong>
                  <h4>{batch.course}</h4>
                  <p>{batch.dates}</p>
                </div>
                <span>{batch.students}</span>
                <em>{batch.mode}</em>
                <b>{batch.status}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="instructor-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("coursesPage.lessonBuilderEyebrow")}</p>
              <h3>{t("coursesPage.modulePlan")}</h3>
            </div>
            <span className="material-symbols-outlined">view_list</span>
          </div>

          <div className="instructor-module-list">
            {displayedLessonPlanner.map((module: { id: number; module?: string; title: string; courseId: number; lessons?: number; duration?: string; state?: string }) => (
              <div className="instructor-module-item" key={module.title}>
                <div className="instructor-module-index">{module.module}</div>
                <div>
                  <h4>{module.title}</h4>
                  <p>
                    {module.lessons} bài học · {module.duration}
                  </p>
                </div>
                <span>{module.state}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {selectedCourseDetail && (
        <div
          className="instructor-course-detail-backdrop"
          onClick={closeCourseDetail}
          role="presentation"
        >
          <aside
            aria-label="Chi tiết khóa học"
            aria-modal="true"
            className="instructor-course-detail-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="instructor-course-detail-hero">
              <img
                alt=""
                onError={(event) => {
                  event.currentTarget.src = COURSE_FALLBACK_IMAGES[0];
                }}
                src={getCourseThumbnail(selectedCourseDetail, 0)}
              />
              <button
                aria-label="Đóng chi tiết khóa học"
                className="instructor-course-detail-close"
                onClick={closeCourseDetail}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="instructor-course-detail-body">
              <div className="instructor-course-detail-title">
                <div>
                  <p className="instructor-eyebrow">{selectedCourseDetail.category}</p>
                  <h3>{selectedCourseDetail.title}</h3>
                  <p>{selectedCourseDetail.description}</p>
                </div>
                <span className={`instructor-course-detail-status ${selectedCourseDetail.statusTone ?? "draft"}`}>
                  {selectedCourseDetail.status}
                </span>
              </div>

              <div className="instructor-course-detail-meta">
                <span>{selectedCourseDetail.level}</span>
                <span>{selectedCourseDetail.price}</span>
                <span>{selectedCourseDetail.duration}</span>
                <span>{selectedCourseDetail.rating > 0 ? `${selectedCourseDetail.rating}/5 sao` : "Chưa có đánh giá"}</span>
              </div>

              {courseDetailTab === "overview" && (
                <section className="instructor-course-edit-panel">
                  <div className="instructor-course-detail-section-title">
                    <h4>Chỉnh sửa khóa học</h4>
                    <span>Cập nhật thông tin cơ bản</span>
                  </div>

                  {editCourseError && <p className="instructor-course-detail-error">{editCourseError}</p>}

                  <div className="instructor-create-course-grid">
                    <label className="instructor-create-course-field instructor-create-course-field-wide">
                      <span>Tiêu đề khóa học *</span>
                      <input
                        value={editFormData.title}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, title: event.target.value })
                        }
                        placeholder="Nhập tiêu đề khóa học"
                      />
                    </label>

                    <label className="instructor-create-course-field instructor-create-course-field-wide">
                      <span>Mô tả *</span>
                      <textarea
                        rows={4}
                        value={editFormData.description}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, description: event.target.value })
                        }
                        placeholder="Nhập mô tả chi tiết"
                      />
                    </label>

                    <label className="instructor-create-course-field instructor-create-course-field-wide">
                      <span>Ảnh bìa khóa học</span>
                      <input
                        type="url"
                        value={editFormData.thumbnailUrl}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, thumbnailUrl: event.target.value })
                        }
                        placeholder="Dán URL ảnh, ví dụ https://..."
                      />
                    </label>

                    <div className="instructor-thumbnail-preview instructor-create-course-field-wide">
                      <img
                        alt=""
                        onError={(event) => {
                          event.currentTarget.src = getCourseThumbnail(selectedCourseDetail, 0);
                        }}
                        src={
                          editFormData.thumbnailUrl.trim().startsWith("http")
                            ? editFormData.thumbnailUrl.trim()
                            : getCourseThumbnail(selectedCourseDetail, 0)
                        }
                      />
                      <div>
                        <span>Ảnh này sẽ hiển thị trên card khóa học và phần đầu modal.</span>
                     
                      </div>
                    </div>

                    <label className="instructor-create-course-field">
                      <span>Giá (VND)</span>
                      <input
                        min="0"
                        type="number"
                        value={editFormData.price}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, price: event.target.value })
                        }
                      />
                    </label>

                    <label className="instructor-create-course-field">
                      <span>Cấp độ</span>
                      <select
                        value={editFormData.level}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, level: event.target.value })
                        }
                      >
                        <option value="BEGINNER">Cơ bản</option>
                        <option value="INTERMEDIATE">Trung cấp</option>
                        <option value="ADVANCED">Nâng cao</option>
                      </select>
                    </label>

                    <label className="instructor-create-course-field">
                      <span>Danh mục</span>
                      <select
                        value={editFormData.categoryId}
                        onChange={(event) =>
                          setEditFormData({ ...editFormData, categoryId: event.target.value })
                        }
                      >
                        <option value="">Chọn danh mục</option>
                        {pageData?.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="instructor-create-course-actions">
                    <button
                      disabled={isDeletingCourse}
                      onClick={handleDeleteCourse}
                      type="button"
                    >
                      {isDeletingCourse ? t("coursesPage.deleting") : t("coursesPage.deleteCourse")}
                    </button>
                    {courseWorkflowAction ? (
                      <button
                        className="instructor-workflow-action"
                        disabled={isUpdatingWorkflow}
                        onClick={requestCourseWorkflowAction}
                        type="button"
                      >
                        {isUpdatingWorkflow ? t("coursesPage.processing") : courseWorkflowAction.label}
                      </button>
                    ) : (
                      selectedCourseWorkflowStatus === "APPROVED" && (
                        <span className="instructor-workflow-note">Admin đã duyệt khóa học này</span>
                      )
                    )}
                    <button
                      disabled={isUpdatingCourse}
                      onClick={handleUpdateCourse}
                      type="button"
                    >
                      {isUpdatingCourse ? t("coursesPage.saving") : t("commonActions.saveChanges")}
                    </button>
                  </div>
                </section>
              )}

              {isCourseDetailLoading && (
                <p className="instructor-course-detail-loading">{t("coursesPage.loadingDetail")}</p>
              )}

              {courseDetailError && (
                <p className="instructor-course-detail-error">{courseDetailError}</p>
              )}

              <div className="instructor-course-detail-overview">
                {selectedCourseDetail.overview.map((item) => (
                  <div key={item.label}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <p>{item.label}</p>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <section className="instructor-course-detail-section">
                <div className="instructor-course-detail-section-title">
                  <h4>Lớp nhận học viên</h4>
                  <div className="instructor-course-detail-section-actions">
                    <span>{selectedCourseDetail.batches.length} lớp</span>
                    <button
                      className="instructor-inline-action"
                      onClick={() => openCreateBatchForm(selectedCourseDetail.id)}
                      type="button"
                    >
                      Mở lớp học
                    </button>
                  </div>
                </div>
                <div className="instructor-course-detail-batches">
                  {selectedCourseDetail.batches.length === 0 ? (
                    <p className="instructor-empty-state">Chưa có lớp nhận học viên cho khóa học này.</p>
                  ) : (
                    selectedCourseDetail.batches.map((batch) => {
                      const { enrolled, max } = getBatchStudentCounts(batch);
                      const remainingSlots = getBatchRemainingSlots(batch);
                      const isFull = max > 0 && enrolled >= max;
                      const isPriority = batch.id === autoAssignPriorityBatchId;

                      return (
                        <div
                          className={`${isFull ? "is-full" : ""} ${isPriority ? "is-priority" : ""}`}
                          key={batch.id}
                        >
                          <div className="instructor-course-batch-main">
                            <strong>{batch.code}</strong>
                            <p>
                              {batch.name}
                              {isPriority && <i>Ưu tiên tự xếp</i>}
                            </p>
                          </div>
                          <div className="instructor-course-batch-meta">
                            <span>{batch.dates}</span>
                            <div className="instructor-course-batch-capacity">
                              <em>Sĩ số {batch.minStudents ?? 1}-{batch.maxStudents ?? "?"}</em>
                              <em>Đã xếp {enrolled} / {max || "?"}</em>
                              <em>{remainingSlots == null ? "Chưa đặt sĩ số" : `Còn ${remainingSlots} chỗ`}</em>
                            </div>
                            <div className="instructor-course-batch-status">
                              <b>{batch.mode} · {batch.platform}</b>
                              <small>
                                {batch.classroomName
                                  ? `Phòng học: ${batch.classroomName}${
                                      batch.classroomAddress ? ` - ${batch.classroomAddress}` : ""
                                    }`
                                  : batch.defaultMeetingUrl
                                    ? `Link phòng học: ${batch.defaultMeetingUrl}`
                                    : "Chưa có thông tin phòng học."}
                              </small>
                              <small>{getBatchReceivingStatus(batch)}</small>
                              <small>
                                {isFull
                                  ? "Lớp đã đủ chỗ, học viên mới sẽ được chuyển sang lớp còn chỗ."
                                  : "Học viên mua khóa sẽ được hệ thống tự xếp vào lớp phù hợp."}
                              </small>
                            </div>
                          </div>
                          <div className="instructor-course-batch-actions">
                            <button
                              className="instructor-inline-action"
                              onClick={() => openEditBatchForm(selectedCourseDetail.id!, batch)}
                              type="button"
                            >
                              Sửa
                            </button>
                            <button
                              className="instructor-inline-action danger"
                              disabled={isDeletingBatch === batch.id}
                              onClick={() => handleDeleteBatch(selectedCourseDetail.id!, batch.id)}
                              type="button"
                            >
                              {isDeletingBatch === batch.id ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <div className="instructor-course-detail-toolbar">
                <button
                  className={courseDetailTab === "overview" ? "active" : ""}
                  onClick={() => setCourseDetailTab("overview")}
                  type="button"
                >
                  {t("coursesPage.overviewTab")}
                </button>
                <button
                  className={courseDetailTab === "schedule" ? "active" : ""}
                  onClick={() => setCourseDetailTab("schedule")}
                  type="button"
                >
                  Lớp & lịch học
                </button>
                <button
                  className={courseDetailTab === "curriculum" ? "active" : ""}
                  onClick={() => setCourseDetailTab("curriculum")}
                  type="button"
                >
                  Chương & bài học
                </button>
                <button
                  className={courseDetailTab === "quizzes" ? "active" : ""}
                  onClick={() => setCourseDetailTab("quizzes")}
                  type="button"
                >
                  Quiz
                </button>
                <button
                  className={courseDetailTab === "preview" ? "active" : ""}
                  onClick={() => setCourseDetailTab("preview")}
                  type="button"
                >
                  Xem trước
                </button>
              </div>

              {courseDetailTab === "schedule" && (
                <section className="instructor-course-detail-section instructor-course-session-section">
                  <div className="instructor-course-detail-section-title">
                    <h4>Lịch học</h4>
                    <div className="instructor-course-detail-section-actions">
                      <span>{activeBatch?.sessions?.length ?? 0} buổi</span>
                      <button
                        className="instructor-inline-action"
                        disabled={!activeBatch}
                        onClick={() => activeBatch && openCreateSessionForm(activeBatch.id)}
                        type="button"
                      >
                        Thêm buổi
                      </button>
                      <button
                        className="instructor-inline-action"
                        disabled={!activeBatch}
                        onClick={() => activeBatch && openRecurringScheduleForm(activeBatch)}
                        type="button"
                      >
                        {t("coursesPage.createRecurringSchedule")}
                      </button>
                    </div>
                  </div>

                  <label className="instructor-course-session-picker">
                    <span>Chọn lớp</span>
                    <select
                      disabled={selectedCourseDetail.batches.length === 0}
                      value={activeBatch?.id ?? ""}
                      onChange={(event) => setSelectedBatchId(Number(event.target.value) || null)}
                    >
                      {selectedCourseDetail.batches.length === 0 ? (
                        <option value="">Chưa có lớp</option>
                      ) : (
                        selectedCourseDetail.batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {getBatchLabel(batch)}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  {activeBatch && (
                    <div className="instructor-course-session-summary">
                      <strong>{activeBatch.code}</strong>
                      <span>{activeBatch.name}</span>
                      <em>{activeBatch.sessions?.length ?? 0} buổi lịch</em>
                    </div>
                  )}

                  {!activeBatch ? (
                    <p className="instructor-empty-state">Chưa có lớp nào để quản lý lịch học.</p>
                  ) : activeBatch.sessions && activeBatch.sessions.length > 0 ? (
                    <div className="instructor-course-session-list">
                      {activeBatch.sessions.map((session) => (
                        <article className="instructor-course-session-card" key={session.id}>
                          <div className="instructor-course-session-main">
                            <div className="instructor-course-session-title">
                              <strong>{session.title}</strong>
                              <span>{session.startLabel}</span>
                            </div>
                            <div className="instructor-course-session-badges">
                              <span>{session.statusLabel}</span>
                              <span>{session.platformLabel}</span>
                            </div>
                          </div>

                          <div className="instructor-course-session-meta">
                            {session.endLabel && <span>Kết thúc: {session.endLabel}</span>}
                            {session.meetingUrl && <span>Link: {session.meetingUrl}</span>}
                            {session.recordingUrl && <span>Recording: {session.recordingUrl}</span>}
                            {session.description && <span>{session.description}</span>}
                          </div>

                          <div className="instructor-course-session-actions">
                            <button
                              className="instructor-inline-action"
                              onClick={() => openAttendanceModal(activeBatch.id, session.id)}
                              type="button"
                            >
                              {t("coursesPage.attendanceEyebrow")}
                            </button>
                            <button
                              className="instructor-inline-action"
                              onClick={() => openEditSessionForm(activeBatch.id, session)}
                              type="button"
                            >
                              Sửa
                            </button>
                            <button
                              className="instructor-inline-action danger"
                              onClick={() => handleDeleteSession(activeBatch.id, session.id)}
                              type="button"
                            >
                              Xóa
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="instructor-empty-state">Lớp này chưa có buổi học nào.</p>
                  )}
                </section>
              )}

              {courseDetailTab === "quizzes" && (
                <section className="instructor-course-detail-section">
                  <div className="instructor-course-detail-section-title">
                    <h4>{t("coursesPage.quizManagement")}</h4>
                    <span>{selectedCourseDetail.quizzes.length} quiz</span>
                  </div>

                  <div className="instructor-course-quiz-grid">
                    <div className="instructor-course-curriculum-column">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>Thiết lập quiz</span>
                        <strong>{quizFormMode === "edit" ? t("coursesPage.editQuiz") : t("coursesPage.createClassQuiz")}</strong>
                      </div>

                      <form className="instructor-inline-form" onSubmit={(event) => {
                        event.preventDefault();
                        handleSaveQuiz();
                      }}>
                        {quizFormError && <p className="instructor-course-detail-error">{quizFormError}</p>}
                        {quizFormMode === "create" && (
                          <label className="instructor-create-course-field">
                            <span>Phạm vi áp dụng</span>
                            <select
                              value={quizFormData.batchScope}
                              onChange={(event) =>
                                setQuizFormData({
                                  ...quizFormData,
                                  batchScope: event.target.value,
                                  batchId:
                                    event.target.value === "ALL"
                                      ? ""
                                      : quizFormData.batchId || String(selectedCourseDetail.batches[0]?.id ?? ""),
                                })
                              }
                            >
                              <option value="SINGLE">Một lớp cụ thể</option>
                              <option value="ALL">Tất cả lớp trong khóa</option>
                            </select>
                          </label>
                        )}
                        {(quizFormMode === "edit" || quizFormData.batchScope !== "ALL") && (
                          <label className="instructor-create-course-field">
                            <span>Lớp *</span>
                            <select
                              disabled={selectedCourseDetail.batches.length === 0}
                              value={quizFormData.batchId || selectedCourseDetail.batches[0]?.id || ""}
                              onChange={(event) =>
                                setQuizFormData({ ...quizFormData, batchId: event.target.value })
                              }
                            >
                              {selectedCourseDetail.batches.length === 0 ? (
                                <option value="">Chưa có lớp</option>
                              ) : (
                                selectedCourseDetail.batches.map((batch) => (
                                  <option key={batch.id} value={batch.id}>
                                    {getBatchLabel(batch)}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>
                        )}
                        {quizFormMode === "create" && quizFormData.batchScope === "ALL" && (
                          <p className="instructor-inline-helper">
                            Hệ thống sẽ tạo một quiz giống nhau cho từng lớp hiện có trong khóa này.
                          </p>
                        )}

                        <label className="instructor-create-course-field">
                          <span>Bài học liên kết</span>
                          <select
                            value={quizFormData.lessonId}
                            onChange={(event) =>
                              setQuizFormData({ ...quizFormData, lessonId: event.target.value })
                            }
                          >
                            <option value="">Quiz chung cho lớp</option>
                            {courseLessons.map((lesson) => (
                              <option key={lesson.id} value={lesson.id}>
                                {lesson.moduleTitle} - {lesson.title}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="instructor-create-course-field">
                          <span>Tiêu đề quiz *</span>
                          <input
                            placeholder="VD: Quiz HTML cơ bản"
                            value={quizFormData.title}
                            onChange={(event) =>
                              setQuizFormData({ ...quizFormData, title: event.target.value })
                            }
                          />
                        </label>

                        <label className="instructor-create-course-field">
                          <span>Mô tả</span>
                          <textarea
                            placeholder="Mục tiêu hoặc ghi chú ngắn cho quiz"
                            rows={3}
                            value={quizFormData.description}
                            onChange={(event) =>
                              setQuizFormData({ ...quizFormData, description: event.target.value })
                            }
                          />
                        </label>

                        <div className="instructor-create-course-grid instructor-create-course-grid-tight">
                          <label className="instructor-create-course-field">
                            <span>Thời lượng (phút)</span>
                            <input
                              min="1"
                              type="number"
                              value={quizFormData.durationMinutes}
                              onChange={(event) =>
                                setQuizFormData({ ...quizFormData, durationMinutes: event.target.value })
                              }
                            />
                          </label>
                          <label className="instructor-create-course-field">
                            <span>Số lần làm</span>
                            <input
                              min="1"
                              type="number"
                              value={quizFormData.attemptLimit}
                              onChange={(event) =>
                                setQuizFormData({ ...quizFormData, attemptLimit: event.target.value })
                              }
                            />
                          </label>
                          <label className="instructor-create-course-field">
                            <span>Điểm tối đa</span>
                            <input
                              min="1"
                              step="0.5"
                              type="number"
                              value={quizFormData.maxScore}
                              onChange={(event) =>
                                setQuizFormData({ ...quizFormData, maxScore: event.target.value })
                              }
                            />
                          </label>
                          <label className="instructor-create-course-field">
                            <span>Điểm đạt</span>
                            <input
                              min="0"
                              step="0.5"
                              type="number"
                              value={quizFormData.passScore}
                              onChange={(event) =>
                                setQuizFormData({ ...quizFormData, passScore: event.target.value })
                              }
                            />
                          </label>
                        </div>

                        <div className="instructor-create-course-actions">
                          {quizFormMode === "edit" && (
                            <button type="button" onClick={() => resetQuizForm()}>
                              {t("coursesPage.cancelEdit")}
                            </button>
                          )}
                          <button disabled={isSavingQuiz || selectedCourseDetail.batches.length === 0} type="submit">
                            {isSavingQuiz
                              ? t("coursesPage.saving")
                              : quizFormMode === "edit"
                                ? t("coursesPage.saveQuiz")
                                : t("coursesPage.createQuiz")}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="instructor-course-curriculum-column">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>{t("coursesPage.quizList")}</span>
                        <strong>Quiz đã tạo trong khóa học</strong>
                      </div>

                      <div className="instructor-course-quiz-list">
                        {selectedCourseDetail.batches.length === 0 ? (
                          <p className="instructor-empty-state">Cần tạo lớp trước khi tạo quiz.</p>
                        ) : selectedCourseDetail.quizzes.length === 0 ? (
                          <p className="instructor-empty-state">Chưa có quiz nào cho khóa học này.</p>
                        ) : (
                          selectedCourseDetail.quizzes.map((quiz) => (
                            <article className="instructor-course-quiz-card" key={quiz.id}>
                              <div className="instructor-course-quiz-main">
                                <strong>{quiz.title}</strong>
                                <span>{quiz.description || "Chưa có mô tả"}</span>
                              </div>
                              <div className="instructor-course-quiz-meta">
                                <span>{quiz.batchCode || "Chưa chọn lớp"}</span>
                                <span>{quiz.lessonTitle || "Quiz chung"}</span>
                                <span>{quiz.duration}</span>
                                <span>{quiz.questions} câu hỏi</span>
                                <span>{quiz.attempts} lượt làm</span>
                                <span>Đạt {quiz.passScore}/{quiz.maxScore}</span>
                                <span>{quiz.attemptLimit} lần làm</span>
                              </div>
                              <div className="instructor-course-quiz-actions">
                                <button
                                  className="instructor-inline-action"
                                  onClick={() => openEditQuizForm(quiz)}
                                  type="button"
                                >
                                  Sửa
                                </button>
                                <button
                                  className="instructor-inline-action danger"
                                  disabled={isDeletingQuiz === quiz.id}
                                  onClick={() => handleDeleteQuiz(quiz.id)}
                                  type="button"
                                >
                                  {isDeletingQuiz === quiz.id ? "Đang xóa..." : "Xóa"}
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="instructor-course-quiz-questions">
                    <div className="instructor-course-detail-section-title">
                      <h4>Câu hỏi trong quiz</h4>
                      <div className="instructor-course-detail-section-actions">
                        <select
                          className="instructor-course-quiz-picker"
                          disabled={selectedCourseDetail.quizzes.length === 0}
                          value={selectedQuiz?.id ?? ""}
                          onChange={(event) => setSelectedQuizId(Number(event.target.value) || null)}
                        >
                          {selectedCourseDetail.quizzes.length === 0 ? (
                            <option value="">Chưa có quiz</option>
                          ) : (
                            selectedCourseDetail.quizzes.map((quiz) => (
                              <option key={quiz.id} value={quiz.id}>
                                {quiz.title}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          className="instructor-inline-action"
                          disabled={!selectedQuiz}
                          onClick={() => {
                            resetQuizQuestionForm();
                            setQuizQuestionFormMode("create");
                            setSelectedQuizId(selectedQuiz?.id ?? null);
                          }}
                          type="button"
                        >
                          Thêm câu hỏi
                        </button>
                      </div>
                    </div>

                    <div className="instructor-course-quiz-questions-grid">
                      <div className="instructor-course-quiz-question-list">
                        {!selectedQuiz ? (
                          <p className="instructor-empty-state">Chọn một quiz để xem câu hỏi.</p>
                        ) : selectedQuiz.questionItems.length === 0 ? (
                          <p className="instructor-empty-state">Quiz này chưa có câu hỏi nào.</p>
                        ) : (
                          selectedQuiz.questionItems.map((question, index) => (
                            <details className="instructor-course-quiz-question-card" key={question.id}>
                              <summary>
                                <strong>
                                  {index + 1}. {question.text}
                                </strong>
                                <span>{question.type}</span>
                                <em>{question.score} điểm</em>
                                <b>{question.options.length ? `${question.options.length} đáp án` : "Tự luận"}</b>
                              </summary>
                              <div className="instructor-course-quiz-question-detail">
                                <div className="instructor-course-quiz-question-fulltext">
                                  <span>Nội dung câu hỏi</span>
                                  <p>{question.text}</p>
                                </div>
                                <div className="instructor-course-quiz-question-options">
                                  {question.options.length === 0 ? (
                                    <em>Câu tự luận</em>
                                  ) : (
                                    question.options.map((option) => (
                                      <span key={option.id} className={option.isCorrect ? "correct" : ""}>
                                        {option.text}
                                      </span>
                                    ))
                                  )}
                                </div>
                                <div className="instructor-course-quiz-actions">
                                  <button
                                    className="instructor-inline-action"
                                    onClick={() => openEditQuizQuestion(selectedQuiz, question)}
                                    type="button"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    className="instructor-inline-action danger"
                                    disabled={isDeletingQuizQuestion === question.id}
                                    onClick={() => handleDeleteQuizQuestion(selectedQuiz.id, question.id)}
                                    type="button"
                                  >
                                    {isDeletingQuizQuestion === question.id ? "Đang xóa..." : "Xóa"}
                                  </button>
                                </div>
                              </div>
                            </details>
                          ))
                        )}
                      </div>

                      <form
                        className="instructor-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleSaveQuizQuestion();
                        }}
                      >
                        {quizQuestionFormError && <p className="instructor-course-detail-error">{quizQuestionFormError}</p>}
                        <label className="instructor-create-course-field">
                          <span>Nội dung câu hỏi *</span>
                          <textarea
                            rows={3}
                            value={quizQuestionFormData.text}
                            onChange={(event) =>
                              setQuizQuestionFormData({ ...quizQuestionFormData, text: event.target.value })
                            }
                          />
                        </label>
                        <div className="instructor-create-course-grid instructor-create-course-grid-tight">
                          <label className="instructor-create-course-field">
                            <span>Loại câu hỏi</span>
                            <select
                              value={quizQuestionFormData.type}
                              onChange={(event) =>
                                setQuizQuestionFormData({
                                  ...quizQuestionFormData,
                                  type: event.target.value,
                                  correctIndex: "0",
                                })
                              }
                            >
                              <option value="SINGLE_CHOICE">Trắc nghiệm 1 đáp án</option>
                              <option value="MULTIPLE_CHOICE">Trắc nghiệm nhiều đáp án</option>
                              <option value="TRUE_FALSE">Đúng / Sai</option>
                              <option value="ESSAY">Tự luận</option>
                            </select>
                          </label>
                          <label className="instructor-create-course-field">
                            <span>ĐiỒm</span>
                            <input
                              min="1"
                              step="0.5"
                              type="number"
                              value={quizQuestionFormData.score}
                              onChange={(event) =>
                                setQuizQuestionFormData({ ...quizQuestionFormData, score: event.target.value })
                              }
                            />
                          </label>
                        </div>

                        {quizQuestionFormData.type === "TRUE_FALSE" ? (
                          <div className="instructor-create-course-grid instructor-create-course-grid-tight">
                            <label className="instructor-create-course-field">
                              <span>Đáp án đúng</span>
                              <select
                                value={quizQuestionFormData.trueFalseAnswer}
                                onChange={(event) =>
                                  setQuizQuestionFormData({
                                    ...quizQuestionFormData,
                                    trueFalseAnswer: event.target.value,
                                  })
                                }
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            </label>
                          </div>
                        ) : quizQuestionFormData.type !== "ESSAY" ? (
                          <>
                            {["A", "B", "C", "D"].map((label, index) => (
                              <label className="instructor-create-course-field instructor-quiz-option-field" key={label}>
                                <span>Đáp án {label}</span>
                                <input
                                  value={
                                    index === 0
                                      ? quizQuestionFormData.optionA
                                      : index === 1
                                        ? quizQuestionFormData.optionB
                                        : index === 2
                                          ? quizQuestionFormData.optionC
                                          : quizQuestionFormData.optionD
                                  }
                                  onChange={(event) =>
                                    setQuizQuestionFormData({
                                      ...quizQuestionFormData,
                                      [index === 0
                                        ? "optionA"
                                        : index === 1
                                          ? "optionB"
                                          : index === 2
                                            ? "optionC"
                                            : "optionD"]: event.target.value,
                                    })
                                  }
                                />
                                <label className="instructor-create-course-checkbox">
                                  <input
                                    checked={quizQuestionFormData.correctIndex === String(index)}
                                    onChange={() =>
                                      setQuizQuestionFormData({
                                        ...quizQuestionFormData,
                                        correctIndex: String(index),
                                      })
                                    }
                                    type="radio"
                                    name="quiz-correct-answer"
                                  />
                                  <span>Đúng</span>
                                </label>
                              </label>
                            ))}
                          </>
                        ) : (
                          <p className="instructor-empty-state">Câu tự luận không cần nhập đáp án.</p>
                        )}

                        <div className="instructor-create-course-actions">
                          {quizQuestionFormMode === "edit" && (
                            <button type="button" onClick={resetQuizQuestionForm}>
                              {t("coursesPage.cancelEdit")}
                            </button>
                          )}
                          <button disabled={isSavingQuizQuestion || !selectedQuiz} type="submit">
                            {isSavingQuizQuestion
                              ? t("coursesPage.saving")
                              : quizQuestionFormMode === "edit"
                                ? t("coursesPage.saveQuestion")
                                : "Thêm câu hỏi"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="instructor-course-quiz-grading">
                    <div className="instructor-course-detail-section-title">
                      <h4>Lượt làm & chấm điểm</h4>
                      <span>{selectedQuiz?.attemptItems.length ?? 0} lượt làm</span>
                    </div>

                    <div className="instructor-course-quiz-grading-grid">
                      <div className="instructor-course-quiz-attempt-list">
                        {!selectedQuiz ? (
                          <p className="instructor-empty-state">Chọn một quiz để xem lượt làm.</p>
                        ) : selectedQuiz.attemptItems.length === 0 ? (
                          <p className="instructor-empty-state">Quiz này chưa có học viên làm bài.</p>
                        ) : (
                          selectedQuiz.attemptItems.map((attempt) => (
                            <button
                              className={`instructor-course-quiz-attempt-card ${
                                selectedQuizAttempt?.id === attempt.id ? "active" : ""
                              }`}
                              key={attempt.id}
                              onClick={() => openQuizAttempt(attempt)}
                              type="button"
                            >
                              <strong>{attempt.studentName}</strong>
                              <span>{attempt.submittedLabel}</span>
                              <em>{attempt.status}</em>
                              <b>{attempt.score ? `${attempt.score}/${selectedQuiz.maxScore}` : "Chờ chấm"}</b>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="instructor-course-quiz-grade-panel">
                        {!selectedQuizAttempt ? (
                          <p className="instructor-empty-state">Chọn một lượt làm để xem câu trả lời.</p>
                        ) : (
                          <>
                            <div className="instructor-course-quiz-grade-header">
                              <div>
                                <strong>{selectedQuizAttempt.studentName}</strong>
                                <span>{selectedQuizAttempt.submittedLabel}</span>
                              </div>
                              <em>{selectedQuizAttempt.status}</em>
                            </div>

                            <div className="instructor-course-quiz-answer-list">
                              {selectedQuizAttempt.answers.length === 0 ? (
                                <p className="instructor-empty-state">Lượt làm này chưa có câu trả lời chi tiết.</p>
                              ) : (
                                selectedQuizAttempt.answers.map((answer, answerIndex) => (
                                  <article className="instructor-course-quiz-answer-card" key={answer.id}>
                                    <strong>
                                      {answerIndex + 1}. {answer.questionText}
                                    </strong>
                                    <span>
                                      {answer.questionType === "ESSAY"
                                        ? answer.essayAnswer || "Chưa nhập câu trả lời tự luận"
                                        : answer.optionText || "Chưa chọn đáp án"}
                                    </span>
                                    {answer.isCorrect != null && (
                                      <em className={answer.isCorrect ? "correct" : "wrong"}>
                                        {answer.isCorrect ? "Đúng" : "Sai"}
                                      </em>
                                    )}
                                  </article>
                                ))
                              )}
                            </div>

                            <form
                              className="instructor-course-quiz-grade-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                handleGradeQuizAttempt();
                              }}
                            >
                              {quizAttemptError && <p className="instructor-course-detail-error">{quizAttemptError}</p>}
                              <label className="instructor-create-course-field">
                                <span>Điểm tổng</span>
                                <input
                                  min="0"
                                  max={selectedQuiz?.maxScore ?? undefined}
                                  step="0.5"
                                  type="number"
                                  value={quizAttemptScore || selectedQuizAttempt.score}
                                  onChange={(event) => setQuizAttemptScore(event.target.value)}
                                />
                              </label>
                              <button disabled={isSavingQuizAttemptGrade} type="submit">
                                {isSavingQuizAttemptGrade ? t("coursesPage.saving") : t("commonActions.saveGrade")}
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {courseDetailTab === "preview" && (
                <section className="instructor-course-preview">
                  <div className="instructor-course-preview-hero">
                    <img
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = COURSE_FALLBACK_IMAGES[0];
                      }}
                      src={getCourseThumbnail(selectedCourseDetail, 0)}
                    />
                    <div className="instructor-course-preview-summary">
                      <p className="instructor-eyebrow">{t("coursesPage.previewEyebrow")}</p>
                      <h4>{selectedCourseDetail.title}</h4>
                      <p>{selectedCourseDetail.description}</p>
                      <div className="instructor-course-preview-pills">
                        <span>{selectedCourseDetail.category}</span>
                        <span>{selectedCourseDetail.level}</span>
                        <span>{selectedCourseDetail.status}</span>
                      </div>
                      <div className="instructor-course-preview-actions">
                        <button type="button">ĐĒng ký học</button>
                        <span>{selectedCourseDetail.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="instructor-course-preview-grid">
                    <article className="instructor-course-preview-panel">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>{t("coursesPage.mainInfo")}</span>
                        <strong>Tóm tắt hiển thị cho học viên</strong>
                      </div>
                      <div className="instructor-course-preview-stats">
                        <div>
                          <strong>{selectedCourseDetail.price}</strong>
                          <span>{t("coursesPage.tuition")}</span>
                        </div>
                        <div>
                          <strong>{selectedCourseDetail.duration}</strong>
                          <span>{t("coursesPage.totalDuration")}</span>
                        </div>
                        <div>
                          <strong>{selectedCourseDetail.rating > 0 ? `${selectedCourseDetail.rating}/5` : "Chưa có"}</strong>
                          <span>{t("coursesPage.rating")}</span>
                        </div>
                      </div>
                    </article>

                    <article className="instructor-course-preview-panel">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>Bạn sẽ học gì</span>
                        <strong>Các chương nổi bật</strong>
                      </div>
                      <ul className="instructor-course-preview-list">
                        {selectedCourseDetail.modules.slice(0, 4).map((module) => (
                          <li key={module.id}>
                            <strong>{module.title}</strong>
                            <span>{module.lessons.length} bài học</span>
                          </li>
                        ))}
                        {selectedCourseDetail.modules.length === 0 && (
                          <li className="instructor-empty-state">Chưa có chương học nào.</li>
                        )}
                      </ul>
                    </article>
                  </div>

                  <article className="instructor-course-preview-panel">
                    <div className="instructor-course-detail-section-subtitle">
                      <strong>Outline theo đúng thứ tự chương và bài</strong>
                      <strong>Outline theo đúng thứ tự chương và bài</strong>
                    </div>
                    <div className="instructor-course-preview-outline">
                      {selectedCourseDetail.modules.map((module) => (
                        <details key={module.id} open>
                          <summary>
                            <span>Chương {String(module.order).padStart(2, "0")}</span>
                            <strong>{module.title}</strong>
                            <em>{module.lessons.length} bài</em>
                          </summary>
                          <div>
                            {module.lessons.length === 0 ? (
                              <p className="instructor-empty-state">Chương này chưa có bài học.</p>
                            ) : (
                              module.lessons.map((lesson, lessonIndex) => (
                                <p key={lesson.id}>
                                  <span>{String(lessonIndex + 1).padStart(2, "0")}</span>
                                  <strong>{lesson.title}</strong>
                                  <em>{lesson.duration}</em>
                                  {lesson.isPreview && <b>{t("coursesPage.preview")}</b>}
                                </p>
                              ))
                            )}
                          </div>
                        </details>
                      ))}
                      {selectedCourseDetail.modules.length === 0 && (
                        <p className="instructor-empty-state">Chưa có chương học nào để xem trước.</p>
                      )}
                    </div>
                  </article>
                </section>
              )}

              {courseDetailTab === "curriculum" && (
                <section className="instructor-course-detail-section">
                  <div className="instructor-course-detail-section-title">
                    <h4>Thiết kế nội dung</h4>
                    <span>{selectedCourseDetail.modules.length} chương</span>
                  </div>

                  <div className="instructor-course-curriculum-grid">
                    <div className="instructor-course-curriculum-column">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>{t("coursesPage.moduleList")}</span>
                        <strong>{moduleFormMode === "edit" ? "Chỉnh sửa chương" : "Thêm chương mới"}</strong>
                      </div>

                      <form className="instructor-inline-form" onSubmit={(event) => {
                        event.preventDefault();
                        handleCreateModule();
                      }}>
                        {moduleError && <p className="instructor-course-detail-error">{moduleError}</p>}
                        <label className="instructor-create-course-field">
                          <span>Tiêu đề chương *</span>
                          <input
                            placeholder="VD: Nền tảng React"
                            value={moduleFormData.title}
                            onChange={(event) =>
                              setModuleFormData({ ...moduleFormData, title: event.target.value })
                            }
                          />
                        </label>
                        <label className="instructor-create-course-field">
                          <span>Mô tả</span>
                          <textarea
                            placeholder="Mục tiêu của chương"
                            rows={3}
                            value={moduleFormData.description}
                            onChange={(event) =>
                              setModuleFormData({
                                ...moduleFormData,
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="instructor-create-course-actions">
                          {moduleFormMode === "edit" && (
                            <button type="button" onClick={cancelModuleEdit}>
                              {t("coursesPage.cancelEdit")}
                            </button>
                          )}
                          <button disabled={isCreatingModule} type="submit">
                            {isCreatingModule
                              ? t("coursesPage.saving")
                              : moduleFormMode === "edit"
                                ? t("coursesPage.saveModule")
                                : "Thêm chương"}
                          </button>
                        </div>
                      </form>

                      <div className="instructor-course-module-list">
                        {selectedCourseDetail.modules.length === 0 ? (
                          <p className="instructor-empty-state">Chưa có chương học cho khóa học này.</p>
                        ) : (
                          selectedCourseDetail.modules.map((module, moduleIndex) => (
                            <div
                              className={selectedModuleId === module.id ? "active" : ""}
                              key={module.id}
                            >
                              <button
                                className="instructor-course-module-select"
                                onClick={() => {
                                  setSelectedModuleId(module.id);
                                  setLessonFormData({ ...lessonFormData, moduleId: String(module.id) });
                                }}
                                type="button"
                              >
                                <strong>Chương {String(module.order).padStart(2, "0")}</strong>
                                <span>{module.title}</span>
                                <em>{module.lessons.length} bài</em>
                              </button>
                              <button
                                className="instructor-course-order-button"
                                disabled={moduleIndex === 0 || isReorderingModuleId === module.id}
                                onClick={() => handleMoveModule(module.id, -1)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">keyboard_arrow_up</span>
                              </button>
                              <button
                                className="instructor-course-order-button"
                                disabled={
                                  moduleIndex === selectedCourseDetail.modules.length - 1 ||
                                  isReorderingModuleId === module.id
                                }
                                onClick={() => handleMoveModule(module.id, 1)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">keyboard_arrow_down</span>
                              </button>
                              <button
                                className="instructor-course-module-delete"
                                disabled={isDeletingModule === module.id}
                                onClick={() => handleDeleteModule(module.id)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                              <button
                                className="instructor-course-module-delete"
                                onClick={() => openEditModuleForm(module)}
                                type="button"
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="instructor-course-curriculum-column">
                      <div className="instructor-course-detail-section-subtitle">
                        <span>Bài học</span>
                        <strong>{lessonFormMode === "edit" ? "Chỉnh sửa bài học" : "Thêm bài vào chương"}</strong>
                      </div>

                      <form className="instructor-inline-form" onSubmit={(event) => {
                        event.preventDefault();
                        handleCreateLesson();
                      }}>
                        {lessonError && <p className="instructor-course-detail-error">{lessonError}</p>}
                        <label className="instructor-create-course-field">
                          <span>Chương</span>
                          <select
                            value={lessonFormData.moduleId || selectedModuleId || ""}
                            onChange={(event) => {
                              setLessonFormData({ ...lessonFormData, moduleId: event.target.value });
                              setSelectedModuleId(Number(event.target.value) || null);
                            }}
                          >
                            <option value="">Chọn chương</option>
                            {selectedCourseDetail.modules.map((module) => (
                              <option key={module.id} value={module.id}>
                                Chương {String(module.order).padStart(2, "0")} - {module.title}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="instructor-create-course-field">
                          <span>Tiêu đề bài học *</span>
                          <input
                            placeholder="VD: Component và Props"
                            value={lessonFormData.title}
                            onChange={(event) =>
                              setLessonFormData({ ...lessonFormData, title: event.target.value })
                            }
                          />
                        </label>

                        <div className="instructor-create-course-grid instructor-create-course-grid-tight">
                          <label className="instructor-create-course-field">
                            <span>Loại bài học</span>
                            <select
                              value={lessonFormData.type}
                              onChange={(event) =>
                                setLessonFormData({ ...lessonFormData, type: event.target.value })
                              }
                            >
                              <option value="VIDEO">Video</option>
                              <option value="TEXT">Văn bản</option>
                              <option value="PDF">Tài liệu PDF</option>
                              <option value="LIVE">Buổi live</option>
                            </select>
                          </label>
                          <label className="instructor-create-course-field">
                            <span>Thời lượng (phút)</span>
                            <input
                              min="0"
                              type="number"
                              value={lessonFormData.durationMinutes}
                              onChange={(event) =>
                                setLessonFormData({
                                  ...lessonFormData,
                                  durationMinutes: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>

                        <label className="instructor-create-course-field">
                          <span>Nội dung bài đọc</span>
                          <textarea
                            placeholder="Nhập phần bài đọc học viên sẽ thấy trong trang học bài. Có thể viết tóm tắt, hướng dẫn thực hành, ghi chú hoặc nội dung dài."
                            rows={7}
                            value={lessonFormData.content}
                            onChange={(event) =>
                              setLessonFormData({ ...lessonFormData, content: event.target.value })
                            }
                          />
                          <small>Phần này lưu vào database cột lessons.content và hiển thị ở giao diện học viên.</small>
                        </label>

                        <label className="instructor-create-course-field">
                          <span>Video URL</span>
                          <input
                            placeholder="https://..."
                            value={lessonFormData.videoUrl}
                            onChange={(event) =>
                              setLessonFormData({ ...lessonFormData, videoUrl: event.target.value })
                            }
                          />
                        </label>

                        <label className="instructor-create-course-checkbox">
                          <input
                            checked={lessonFormData.isPreview}
                            onChange={(event) =>
                              setLessonFormData({ ...lessonFormData, isPreview: event.target.checked })
                            }
                            type="checkbox"
                          />
                          <span>Cho phép xem thử</span>
                        </label>

                        <div className="instructor-create-course-actions">
                          {lessonFormMode === "edit" && (
                            <button type="button" onClick={cancelLessonEdit}>
                              {t("coursesPage.cancelEdit")}
                            </button>
                          )}
                          <button disabled={isCreatingLesson} type="submit">
                            {isCreatingLesson
                              ? t("coursesPage.saving")
                              : lessonFormMode === "edit"
                                ? t("coursesPage.saveLesson")
                                : "Thêm bài học"}
                          </button>
                        </div>
                      </form>

                      <div className="instructor-course-selected-lessons">
                        {!selectedModuleId ? (
                          <p className="instructor-empty-state">Chọn một chương để xem bài học.</p>
                        ) : (
                          selectedCourseDetail.modules
                            .filter((module) => module.id === selectedModuleId)
                            .map((module) => (
                              <div className="instructor-course-module-lesson-list" key={module.id}>
                                {module.lessons.length === 0 ? (
                                  <p className="instructor-empty-state">Chương này chưa có bài học.</p>
                                ) : (
                                  module.lessons.map((lesson, lessonIndex) => (
                                    <div key={lesson.id}>
                                      <strong>{lesson.title}</strong>
                                      <span>{lesson.duration}</span>
                                      <em>{lesson.type}</em>
                                      <button
                                        className="instructor-course-order-button"
                                        disabled={lessonIndex === 0 || isReorderingLessonId === lesson.id}
                                        onClick={() => handleMoveLesson(module.id, lesson.id, -1)}
                                        type="button"
                                      >
                                        <span className="material-symbols-outlined">keyboard_arrow_up</span>
                                      </button>
                                      <button
                                        className="instructor-course-order-button"
                                        disabled={
                                          lessonIndex === module.lessons.length - 1 ||
                                          isReorderingLessonId === lesson.id
                                        }
                                        onClick={() => handleMoveLesson(module.id, lesson.id, 1)}
                                        type="button"
                                      >
                                        <span className="material-symbols-outlined">keyboard_arrow_down</span>
                                      </button>
                                      <button
                                        className="instructor-course-lesson-delete"
                                        onClick={() =>
                                          openEditLessonForm(module.id, lesson)
                                        }
                                        type="button"
                                      >
                                        <span className="material-symbols-outlined">edit</span>
                                      </button>
                                      <button
                                        className="instructor-course-lesson-delete"
                                        disabled={isDeletingLesson === lesson.id}
                                        onClick={() => handleDeleteLesson(lesson.id)}
                                        type="button"
                                      >
                                        <span className="material-symbols-outlined">delete</span>
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="instructor-course-detail-section">
                <div className="instructor-course-detail-section-title">
                  <h4>{t("coursesPage.recentReviews")}</h4>
                  <span>{selectedCourseDetail.reviews.length} nhận xét</span>
                </div>
                <div className="instructor-course-review-grid">
                  <div className="instructor-course-review-list">
                    {selectedCourseDetail.reviews.length === 0 ? (
                      <p className="instructor-empty-state">Chưa có đánh giá nào.</p>
                    ) : (
                      selectedCourseDetail.reviews.map((review) => (
                        <button
                          className={`instructor-course-review-card ${selectedReview?.id === review.id ? "active" : ""}`}
                          key={review.id}
                          onClick={() => openReviewReply(review)}
                          type="button"
                        >
                          <strong>{review.student}</strong>
                          <span>{review.rating}/5 sao</span>
                          <p>{review.comment || "Không có nội dung nhận xét"}</p>
                          <em>{review.teacherComment ? "Đã phản hồi" : "Chưa phản hồi"}</em>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="instructor-course-review-panel">
                    {!selectedReview ? (
                      <p className="instructor-empty-state">Chọn một đánh giá để phản hồi.</p>
                    ) : (
                      <>
                        <div className="instructor-course-review-header">
                          <div>
                            <strong>{selectedReview.student}</strong>
                            <span>{selectedReview.rating}/5 sao</span>
                          </div>
                          <em>{selectedReview.createdAt}</em>
                        </div>

                        <div className="instructor-course-review-origin">
                          <span>Nhận xét của học viên</span>
                          <p>{selectedReview.comment || "Không có nội dung nhận xét"}</p>
                        </div>

                        <form
                          className="instructor-inline-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleSaveReviewReply();
                          }}
                        >
                          {reviewReplyError && <p className="instructor-course-detail-error">{reviewReplyError}</p>}
                          <label className="instructor-create-course-field">
                            <span>{t("coursesPage.teacherResponse")}</span>
                            <textarea
                              rows={4}
                              value={reviewReplyText}
                              onChange={(event) => setReviewReplyText(event.target.value)}
                              placeholder="Viết phản hồi cho học viên..."
                            />
                          </label>
                          <div className="instructor-create-course-actions">
                            <button disabled={isSavingReviewReply} type="submit">
                              {isSavingReviewReply ? t("coursesPage.saving") : t("coursesPage.saveReply")}
                            </button>
                          </div>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {showCreateForm && (
        <div className="instructor-course-create-backdrop" onClick={closeCreateForm} role="presentation">
          <aside
            aria-label="Tạo khóa học mới"
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form className="instructor-create-course-form" onSubmit={(event) => {
              event.preventDefault();
              handleCreateCourse();
            }}>
              <div className="instructor-create-course-header">
                <div>
                  <p className="instructor-eyebrow">{t("coursesPage.createCourseEyebrow")}</p>
                  <p>Điền thông tin cơ bản để tạo bản nháp nhanh.</p>
                
                </div>
                <button
                  aria-label="Đóng form tạo khóa học"
                  className="instructor-course-detail-close"
                  onClick={closeCreateForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {createError && <p className="instructor-course-detail-error">{createError}</p>}

              <div className="instructor-create-course-grid">
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Tiêu đề khóa học *</span>
                  <input
                    type="text"
                    placeholder="VD: ReactJS thực chiến cho người mới"
                    value={createFormData.title}
                    onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                    required
                  />
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Mô tả *</span>
                  <textarea
                    placeholder="Mô tả ngắn gọn nội dung, mục tiêu và đối tượng học viên"
                    value={createFormData.description}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, description: e.target.value })
                    }
                    rows={4}
                    required
                  />
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Ảnh bìa khóa học</span>
                  <input
                    type="url"
                    placeholder="Dán URL ảnh, ví dụ https://..."
                    value={createFormData.thumbnailUrl}
                    onChange={(e) => setCreateFormData({ ...createFormData, thumbnailUrl: e.target.value })}
                  />
                </label>

                {createFormData.thumbnailUrl.trim().startsWith("http") && (
                  <div className="instructor-thumbnail-preview instructor-create-course-field-wide">
                    <img
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = COURSE_FALLBACK_IMAGES[0];
                      }}
                      src={createFormData.thumbnailUrl.trim()}
                    />
                    <div>
                      <span>Ảnh sẽ được lưu vào khóa học mới sau khi tạo.</span>
                      <span>Ảnh sẽ được lưu vào khóa học mới sau khi tạo.</span>
                    </div>
                  </div>
                )}

                <label className="instructor-create-course-field">
                  <span>Giá (VND)</span>
                  <input
                    min="0"
                    placeholder="0"
                    type="number"
                    value={createFormData.price}
                    onChange={(e) => setCreateFormData({ ...createFormData, price: e.target.value })}
                  />
                </label>

                <label className="instructor-create-course-field">
                  <span>Cấp độ</span>
                  <select
                    value={createFormData.level}
                    onChange={(e) => setCreateFormData({ ...createFormData, level: e.target.value })}
                  >
                    <option value="BEGINNER">Cơ bản</option>
                    <option value="INTERMEDIATE">Trung cấp</option>
                    <option value="ADVANCED">Nâng cao</option>
                  </select>
                </label>

                <label className="instructor-create-course-field">
                  <span>Danh mục</span>
                  <select
                    value={createFormData.categoryId}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, categoryId: e.target.value })
                    }
                  >
                    <option value="">Chọn danh mục</option>
                    {pageData?.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeCreateForm}>
                  {t("commonActions.cancel")}
                </button>
                <button disabled={isCreating} type="submit">
                  {isCreating ? t("coursesPage.creating") : t("coursesPage.createCourse")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {showImportLessonsForm && (
        <div className="instructor-course-create-backdrop" onClick={closeImportLessonsForm} role="presentation">
          <aside
            aria-label="Nhập bài học"
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form
              className="instructor-create-course-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleImportLessons();
              }}
            >
              <div className="instructor-create-course-header">
                <div>
                  <p className="instructor-eyebrow">{t("coursesPage.importLessonsEyebrow")}</p>
                  <h3>{t("coursesPage.quickImportLessons")}</h3>
          
                </div>
                <button
                  aria-label="Đóng form nhập bài học"
                  className="instructor-course-detail-close"
                  onClick={closeImportLessonsForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {importLessonError && <p className="instructor-course-detail-error">{importLessonError}</p>}

              <div className="instructor-create-course-grid">
                <label className="instructor-create-course-field">
                  <span>{t("coursesPage.course")}</span>
                  <select
                    value={importLessonCourseId}
                    onChange={(event) => {
                      setImportLessonCourseId(event.target.value);
                      setImportLessonFormData({ ...importLessonFormData, moduleId: "" });
                    }}
                  >
                    <option value="">Chọn khóa học</option>
                    {(pageData?.instructorCourses ?? []).map((course, index) => (
                      <option key={course.id ?? course.title ?? index} value={course.id ?? index + 1}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="instructor-create-course-field">
                  <span>Chương</span>
                  <select
                    disabled={!importTargetCourseDetail || isImportCourseLoading}
                    value={importLessonFormData.moduleId}
                    onChange={(event) =>
                      setImportLessonFormData({ ...importLessonFormData, moduleId: event.target.value })
                    }
                  >
                    <option value="">
                      {isImportCourseLoading ? t("commonActions.loading") : t("coursesPage.selectModule")}
                    </option>
                    {importTargetModules.map((module) => (
                      <option key={module.id} value={module.id}>
                        Chương {String(module.order).padStart(2, "0")} - {module.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Danh sách bài học</span>
                  <textarea
                    rows={7}
                    value={importLessonFormData.lines}
                    onChange={(event) =>
                      setImportLessonFormData({ ...importLessonFormData, lines: event.target.value })
                    }
                    placeholder={`Mỗi dòng: tiêu đề | phút | loại | preview | mô tả | video url
VD:
Giới thiệu khóa học | 10 | VIDEO | no
HTML cơ bản | 35 | VIDEO | yes | Làm quen thẻ HTML
CSS cơ bản | 40 | TEXT | no | Các khái niệm nền tảng`}
                  />
                </label>

                <div className="instructor-thumbnail-preview instructor-create-course-field-wide">
                  <div>
                    <strong>Mẫu nhập</strong>
                    <span>
                      Dòng nào chỉ có tiêu đề thì sẽ lấy mặc định. Loại hợp lệ: VIDEO, TEXT, PDF, LIVE.
                    </span>
                  </div>
                </div>

                <label className="instructor-create-course-field">
                  <span>Loại mặc định</span>
                  <select
                    value={importLessonFormData.defaultType}
                    onChange={(event) =>
                      setImportLessonFormData({ ...importLessonFormData, defaultType: event.target.value })
                    }
                  >
                    <option value="VIDEO">Video</option>
                    <option value="TEXT">VĒn bản</option>
                    <option value="PDF">Tài liệu PDF</option>
                    <option value="LIVE">Buổi live</option>
                  </select>
                </label>

                <label className="instructor-create-course-field">
                  <span>Thời lượng mặc định</span>
                  <input
                    min="0"
                    type="number"
                    value={importLessonFormData.defaultDurationMinutes}
                    onChange={(event) =>
                      setImportLessonFormData({
                        ...importLessonFormData,
                        defaultDurationMinutes: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="instructor-create-course-field">
                  <span>Nội dung mặc định</span>
                  <textarea
                    rows={3}
                    value={importLessonFormData.defaultContent}
                    onChange={(event) =>
                      setImportLessonFormData({
                        ...importLessonFormData,
                        defaultContent: event.target.value,
                      })
                    }
                    placeholder="Dùng khi từng dòng không ghi nội dung riêng"
                  />
                </label>

                <label className="instructor-create-course-field">
                  <span>Video URL mặc định</span>
                  <input
                    value={importLessonFormData.defaultVideoUrl}
                    onChange={(event) =>
                      setImportLessonFormData({
                        ...importLessonFormData,
                        defaultVideoUrl: event.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="instructor-create-course-checkbox instructor-create-course-field-wide">
                  <input
                    checked={importLessonFormData.defaultIsPreview}
                    onChange={(event) =>
                      setImportLessonFormData({
                        ...importLessonFormData,
                        defaultIsPreview: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  <span>Mặc định cho phép xem thử</span>
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeImportLessonsForm}>
                  {t("commonActions.cancel")}
                </button>
                <button disabled={isImportingLessons || isImportCourseLoading} type="submit">
                  {isImportingLessons ? t("coursesPage.importing") : t("coursesPage.importLessons")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {showBatchForm && (
        <div className="instructor-course-create-backdrop" onClick={closeBatchForm} role="presentation">
          <aside
            aria-label={batchFormMode === "edit" ? "Chỉnh sửa lớp học" : "Mở lớp học"}
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form
              className="instructor-create-course-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveBatch();
              }}
            >
              <div className="instructor-create-course-header">
                <div>
                  <p>Chuẩn bị lớp để hệ thống tự xếp học viên sau khi mua khóa.</p>
                  <h3>{batchFormMode === "edit" ? t("coursesPage.editClass") : t("coursesPage.openClass")}</h3>
                  <p>Thiết lập lịch học, sĩ số, link/phòng học và trạng thái nhận học viên.</p>
                </div>
                <button
                  aria-label="Đóng form lớp học"
                  className="instructor-course-detail-close"
                  onClick={closeBatchForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {batchFormError && <p className="instructor-course-detail-error">{batchFormError}</p>}

              <div className="instructor-create-course-grid">
                <label className="instructor-create-course-field">
                  <span>Mã lớp</span>
                  <input
                    value={batchFormData.batchCode}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, batchCode: event.target.value })
                    }
                    placeholder="BATCH-101"
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Trạng thái</span>
                  <select
                    value={batchFormData.status}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, status: event.target.value })
                    }
                  >
                    <option value="DRAFT">Bản nháp</option>
                    <option value="OPEN">Đang nhận học viên</option>
                    <option value="FULL">Đã đủ học viên</option>
                    <option value="STARTED">Đang học</option>
                    <option value="FINISHED">Đã kết thúc</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Tên lớp</span>
                  <input
                    value={batchFormData.batchName}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, batchName: event.target.value })
                    }
                    placeholder="Lớp ReactJS buổi tối"
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Ngày bắt đầu</span>
                  <input
                    type="date"
                    value={batchFormData.startDate}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, startDate: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Ngày kết thúc</span>
                  <input
                    type="date"
                    value={batchFormData.endDate}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, endDate: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Bắt đầu đăng ký</span>
                  <input
                    type="date"
                    value={batchFormData.enrollmentStartDate}
                    onChange={(event) =>
                      setBatchFormData({
                        ...batchFormData,
                        enrollmentStartDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Hạn đăng ký</span>
                  <input
                    type="date"
                    value={batchFormData.enrollmentDeadline}
                    onChange={(event) =>
                      setBatchFormData({
                        ...batchFormData,
                        enrollmentDeadline: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Sĩ số tối thiểu</span>
                  <input
                    min="1"
                    type="number"
                    value={batchFormData.minStudents}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, minStudents: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Sĩ số tối đa</span>
                  <input
                    min="1"
                    type="number"
                    value={batchFormData.maxStudents}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, maxStudents: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Học phí</span>
                  <input
                    min="0"
                    type="number"
                    value={batchFormData.tuitionFee}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, tuitionFee: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Hình thức học</span>
                  <select
                    value={batchFormData.learningMode}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, learningMode: event.target.value })
                    }
                  >
                    <option value="ONLINE">Trực tuyến</option>
                    <option value="OFFLINE">Trực tiếp</option>
                    <option value="HYBRID">Kết hợp</option>
                  </select>
                </label>
                <label className="instructor-create-course-field">
                  <span>Nền tảng</span>
                  <select
                    value={batchFormData.onlinePlatform}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, onlinePlatform: event.target.value })
                    }
                  >
                    <option value="ZOOM">Zoom</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                    <option value="JITSI">Jitsi</option>
                    <option value="INTERNAL_ROOM">Phòng nội bộ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Link phòng học online</span>
                  <input
                    value={batchFormData.defaultMeetingUrl}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, defaultMeetingUrl: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Phòng học trực tiếp</span>
                  <input
                    value={batchFormData.classroomName}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, classroomName: event.target.value })
                    }
                    placeholder="VD: Phòng A203"
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Địa chỉ/cơ sở</span>
                  <input
                    value={batchFormData.classroomAddress}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, classroomAddress: event.target.value })
                    }
                    placeholder="VD: Cơ sở 1, 97 Man Thiện"
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Ghi chú</span>
                  <textarea
                    rows={3}
                    value={batchFormData.note}
                    onChange={(event) =>
                      setBatchFormData({ ...batchFormData, note: event.target.value })
                    }
                    placeholder="Ghi chú cho lớp học"
                  />
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeBatchForm}>
                  {t("commonActions.cancel")}
                </button>
                <button disabled={isSavingBatch} type="submit">
                  {isSavingBatch ? t("coursesPage.saving") : batchFormMode === "edit" ? t("coursesPage.saveClass") : t("coursesPage.openClass")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {showRecurringScheduleForm && (
        <div className="instructor-course-create-backdrop" onClick={closeRecurringScheduleForm} role="presentation">
          <aside
            aria-label="Tạo lịch học định kỳ"
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form
              className="instructor-create-course-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleGenerateRecurringSchedule();
              }}
            >
              <div className="instructor-create-course-header">
                <div>
                  <p className="instructor-eyebrow">{t("coursesPage.scheduleEyebrow")}</p>
                  <h3>{t("coursesPage.createSchedule")}</h3>
                  <p>
                    {isOfflineRecurringBatch
                      ? "Lớp trực tiếp sẽ tự sinh lịch theo phòng học nội bộ của lớp."
                      : "Lớp trực tuyến sẽ tự sinh buổi học theo link họp đã chọn."}
                  </p>
                </div>
                <button
                  aria-label="Đóng form lịch định kỳ"
                  className="instructor-course-detail-close"
                  onClick={closeRecurringScheduleForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {recurringScheduleError && <p className="instructor-course-detail-error">{recurringScheduleError}</p>}

              <div className="instructor-recurring-weekdays" aria-label="Chọn ngày học trong tuần">
                {WEEKDAY_OPTIONS.map((weekday) => (
                  <label key={weekday.value}>
                    <input
                      checked={recurringScheduleFormData.weekdays.includes(weekday.value)}
                      onChange={() => toggleRecurringWeekday(weekday.value)}
                      type="checkbox"
                    />
                    <span>{weekday.label}</span>
                  </label>
                ))}
              </div>

              <div className="instructor-create-course-grid">
                <label className="instructor-create-course-field">
                  <span>Giờ bắt đầu *</span>
                  <input
                    type="time"
                    value={recurringScheduleFormData.startTime}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, startTime: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Giờ kết thúc *</span>
                  <input
                    type="time"
                    value={recurringScheduleFormData.endTime}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, endTime: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Tiêu đề mẫu</span>
                  <input
                    value={recurringScheduleFormData.titlePrefix}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, titlePrefix: event.target.value })
                    }
                    placeholder="VD: Buổi học"
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Mô tả chung</span>
                  <textarea
                    rows={3}
                    value={recurringScheduleFormData.description}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, description: event.target.value })
                    }
                    placeholder="Nội dung chung cho các buổi học"
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>{isOfflineRecurringBatch ? "Phòng học / mã vào lớp" : "Meeting URL"}</span>
                  <input
                    value={recurringScheduleFormData.meetingUrl}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, meetingUrl: event.target.value })
                    }
                    placeholder={isOfflineRecurringBatch ? "VD: Phòng A203" : "https://..."}
                  />
                </label>
                {isOfflineRecurringBatch ? (
                  <label className="instructor-create-course-field">
                    <span>Mã phòng / ghi chú vào lớp</span>
                    <input
                      value={recurringScheduleFormData.meetingPassword}
                      onChange={(event) =>
                        setRecurringScheduleFormData({
                          ...recurringScheduleFormData,
                          meetingPassword: event.target.value,
                        })
                      }
                      placeholder="Nếu có"
                    />
                  </label>
                ) : (
                  <>
                    <label className="instructor-create-course-field">
                      <span>Mật khẩu</span>
                      <input
                        value={recurringScheduleFormData.meetingPassword}
                        onChange={(event) =>
                          setRecurringScheduleFormData({
                            ...recurringScheduleFormData,
                            meetingPassword: event.target.value,
                          })
                        }
                        placeholder="Nếu có"
                      />
                    </label>
                    <label className="instructor-create-course-field">
                      <span>Nền tảng</span>
                      <select
                        value={recurringScheduleFormData.platform}
                        onChange={(event) =>
                          setRecurringScheduleFormData({
                            ...recurringScheduleFormData,
                            platform: event.target.value,
                          })
                        }
                      >
                        <option value="ZOOM">Zoom</option>
                        <option value="GOOGLE_MEET">Google Meet</option>
                        <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                        <option value="JITSI">Jitsi</option>
                        <option value="INTERNAL_ROOM">Phòng nội bộ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </label>
                  </>
                )}
                {isOfflineRecurringBatch && (
                  <label className="instructor-create-course-field">
                    <span>Nền tảng</span>
                    <input value="Phòng nội bộ" readOnly />
                  </label>
                )}
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Ghi chú</span>
                  <textarea
                    rows={3}
                    value={recurringScheduleFormData.note}
                    onChange={(event) =>
                      setRecurringScheduleFormData({ ...recurringScheduleFormData, note: event.target.value })
                    }
                    placeholder="Ghi chú chung cho lịch định kỳ"
                  />
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeRecurringScheduleForm}>
                  {t("commonActions.cancel")}
                </button>
                <button disabled={isGeneratingSchedule} type="submit">
                  {isGeneratingSchedule ? t("coursesPage.creatingSchedule") : t("coursesPage.createRecurringSchedule")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {showSessionForm && (
        <div className="instructor-course-create-backdrop" onClick={closeSessionForm} role="presentation">
          <aside
            aria-label={sessionFormMode === "edit" ? "Chỉnh sửa buổi học" : "Tạo buổi học"}
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form
              className="instructor-create-course-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveSession();
              }}
            >
              <div className="instructor-create-course-header">
                <div>
                  <p>
                    {isOfflineSessionBatch
                      ? "Lớp trực tiếp sẽ dùng phòng học nội bộ, huynh chỉ cần nhập phòng học và thời gian buổi dạy."
                      : "Lớp trực tuyến sẽ dùng link họp, mật khẩu và nền tảng phù hợp cho từng buổi."}
                  </p>
                  <h3>{sessionFormMode === "edit" ? t("coursesPage.editSession") : t("coursesPage.newSession")}</h3>
                  <p>
                    {isOfflineSessionBatch
                      ? "Thiết lập buổi dạy trực tiếp, phòng học và trạng thái của buổi học."
                      : "Thiết lập link họp, nền tảng và trạng thái của buổi học."}
                  </p>
                </div>
                <button
                  aria-label="Đóng form buổi học"
                  className="instructor-course-detail-close"
                  onClick={closeSessionForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {sessionFormError && <p className="instructor-course-detail-error">{sessionFormError}</p>}

              <div className="instructor-create-course-grid">
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Tiêu đề buổi học *</span>
                  <input
                    value={sessionFormData.title}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, title: event.target.value })
                    }
                    placeholder="VD: VueJS overview"
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Mô tả</span>
                  <textarea
                    rows={3}
                    value={sessionFormData.description}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, description: event.target.value })
                    }
                    placeholder="Nội dung buổi học"
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Bắt đầu</span>
                  <input
                    type="datetime-local"
                    value={sessionFormData.startTime}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, startTime: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field">
                  <span>Kết thúc</span>
                  <input
                    type="datetime-local"
                    value={sessionFormData.endTime}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, endTime: event.target.value })
                    }
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>{isOfflineSessionBatch ? "Phòng học / mã vào lớp" : "Meeting URL"}</span>
                  <input
                    value={sessionFormData.meetingUrl}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, meetingUrl: event.target.value })
                    }
                    placeholder={isOfflineSessionBatch ? "VD: Phòng A203" : "https://..."}
                  />
                </label>
                {isOfflineSessionBatch ? (
                  <label className="instructor-create-course-field">
                    <span>Mã phòng / ghi chú vào lớp</span>
                    <input
                      value={sessionFormData.meetingPassword}
                      onChange={(event) =>
                        setSessionFormData({
                          ...sessionFormData,
                          meetingPassword: event.target.value,
                        })
                      }
                      placeholder="Nếu có"
                    />
                  </label>
                ) : (
                  <>
                    <label className="instructor-create-course-field">
                      <span>Mật khẩu</span>
                      <input
                        value={sessionFormData.meetingPassword}
                        onChange={(event) =>
                          setSessionFormData({
                            ...sessionFormData,
                            meetingPassword: event.target.value,
                          })
                        }
                        placeholder="Nếu có"
                      />
                    </label>
                    <label className="instructor-create-course-field">
                      <span>Nền tảng</span>
                      <select
                        value={sessionFormData.platform}
                        onChange={(event) =>
                          setSessionFormData({ ...sessionFormData, platform: event.target.value })
                        }
                      >
                        <option value="ZOOM">Zoom</option>
                        <option value="GOOGLE_MEET">Google Meet</option>
                        <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                        <option value="JITSI">Jitsi</option>
                        <option value="INTERNAL_ROOM">Phòng nội bộ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </label>
                  </>
                )}
                {isOfflineSessionBatch && (
                  <label className="instructor-create-course-field">
                    <span>Nền tảng</span>
                    <input value="Phòng nội bộ" readOnly />
                  </label>
                )}
                <label className="instructor-create-course-field">
                  <span>Trạng thái</span>
                  <select
                    value={sessionFormData.status}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, status: event.target.value })
                    }
                  >
                    <option value="SCHEDULED">Đã lên lịch</option>
                    <option value="LIVE">Đang học</option>
                    <option value="COMPLETED">Đã xong</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Recording URL</span>
                  <input
                    value={sessionFormData.recordingUrl}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, recordingUrl: event.target.value })
                    }
                    placeholder="Link bản ghi nếu có"
                  />
                </label>
                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Ghi chú</span>
                  <textarea
                    rows={3}
                    value={sessionFormData.note}
                    onChange={(event) =>
                      setSessionFormData({ ...sessionFormData, note: event.target.value })
                    }
                    placeholder="Ghi chú cho buổi học"
                  />
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeSessionForm}>
                  {t("commonActions.cancel")}
                </button>
                <button disabled={isSavingSession} type="submit">
                  {isSavingSession
                    ? t("coursesPage.saving")
                    : sessionFormMode === "edit"
                      ? t("coursesPage.saveSession")
                      : t("coursesPage.newSession")}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {attendanceTarget && (
        <div
          className="instructor-course-create-backdrop"
          onClick={() => {
            if (!isSavingAttendance) setAttendanceTarget(null);
          }}
          role="presentation"
        >
          <aside
            aria-label="Điểm danh buổi học"
            aria-modal="true"
            className="instructor-course-detail-modal instructor-attendance-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="instructor-create-course-header">
              <div>
                <p className="instructor-eyebrow">{t("coursesPage.attendanceEyebrow")}</p>
                <h3>{attendanceData?.session.title ?? t("coursesPage.sessionFallback")}</h3>
                <p>
                  {attendanceData
                    ? `${attendanceData.session.courseTitle} - ${attendanceData.session.batchCode}`
                    : t("coursesPage.loadingStudents")}
                </p>
              </div>
              <button
                aria-label="Đóng điểm danh"
                className="instructor-course-detail-close"
                disabled={isSavingAttendance}
                onClick={() => setAttendanceTarget(null)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {attendanceError && <p className="instructor-course-detail-error">{attendanceError}</p>}

            {isAttendanceLoading ? (
              <p className="instructor-empty-state">{t("coursesPage.loadingAttendance")}</p>
            ) : !attendanceData ? (
              <p className="instructor-empty-state">Chưa có dữ liệu điểm danh.</p>
            ) : (
              <>
                <div className="instructor-attendance-summary">
                  <article>
                    <span>{t("coursesPage.total")}</span>
                    <strong>{attendanceData.summary.total}</strong>
                  </article>
                  <article>
                    <span>Có mặt</span>
                    <strong>{attendanceData.students.filter((student) => student.status === "PRESENT").length}</strong>
                  </article>
                  <article>
                    <span>Đi trễ</span>
                    <strong>{attendanceData.students.filter((student) => student.status === "LATE").length}</strong>
                  </article>
                  <article>
                    <span>Vắng phép</span>
                    <strong>{attendanceData.students.filter((student) => student.status === "EXCUSED").length}</strong>
                  </article>
                  <article>
                    <span>Vắng</span>
                    <strong>{attendanceData.students.filter((student) => student.status === "ABSENT").length}</strong>
                  </article>
                </div>

                <div className="instructor-attendance-list">
                  {attendanceData.students.length === 0 ? (
                    <p className="instructor-empty-state">Lớp này chưa có học viên ghi danh.</p>
                  ) : (
                    attendanceData.students.map((student) => (
                      <article className="instructor-attendance-row" key={student.studentId}>
                        <div>
                          <strong>{student.studentName}</strong>
                          <span>{student.email}</span>
                        </div>
                        <select
                          value={student.status}
                          onChange={(event) =>
                            updateAttendanceStudent(student.studentId, { status: event.target.value })
                          }
                        >
                          <option value="PRESENT">Có mặt</option>
                          <option value="LATE">Đi trễ</option>
                          <option value="EXCUSED">Vắng phép</option>
                          <option value="ABSENT">Vắng</option>
                        </select>
                        <input
                          min="0"
                          placeholder="Số phút"
                          type="number"
                          value={student.durationMinutes}
                          onChange={(event) =>
                            updateAttendanceStudent(student.studentId, {
                              durationMinutes: Number(event.target.value) || 0,
                            })
                          }
                        />
                        <input
                          placeholder="Ghi chú"
                          value={student.note}
                          onChange={(event) =>
                            updateAttendanceStudent(student.studentId, { note: event.target.value })
                          }
                        />
                      </article>
                    ))
                  )}
                </div>

                <div className="instructor-create-course-actions">
                  <button disabled={isSavingAttendance} onClick={() => setAttendanceTarget(null)} type="button">
                    {t("commonActions.cancel")}
                  </button>
                  <button
                    disabled={isSavingAttendance || attendanceData.students.length === 0}
                    onClick={handleSaveAttendance}
                    type="button"
                  >
                    {isSavingAttendance ? t("coursesPage.saving") : t("coursesPage.saveAttendance")}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {confirmDialog && (
        <div
          className="instructor-confirm-backdrop"
          onClick={() => {
            if (!isConfirming) setConfirmDialog(null);
          }}
          role="presentation"
        >
          <aside
            aria-label={confirmDialog.title}
            aria-modal="true"
            className="instructor-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="instructor-confirm-icon">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <h3>{confirmDialog.title}</h3>
              <p>{confirmDialog.message}</p>
            </div>
            <div className="instructor-confirm-actions">
              <button
                disabled={isConfirming}
                onClick={() => setConfirmDialog(null)}
                type="button"
              >
                {t("commonActions.cancel")}
              </button>
              <button
                disabled={isConfirming}
                onClick={async () => {
                  setIsConfirming(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } finally {
                    setIsConfirming(false);
                  }
                }}
                type="button"
              >
                {isConfirming ? t("coursesPage.processing") : confirmDialog.confirmLabel}
              </button>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className={`instructor-toast ${toast.type}`} role="status">
          <span className="material-symbols-outlined">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p>{toast.message}</p>
          <button onClick={() => setToast(null)} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </InstructorLayout>
  );
}

export default InstructorCourseManagementPage;
