import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { instructorApiRequest } from "../api/instructorApi";
import { getInstructorAuthTeacherId } from "../auth/instructorAuth";
import InstructorLayout from "../components/InstructorLayout";
import {
  gradingQueue,
  instructorQuizzes,
  quizManagementStats,
  quizQuestionBank,
} from "../data/instructorMockData";

const DEFAULT_TEACHER_ID = getInstructorAuthTeacherId();

type QuizStat = (typeof quizManagementStats)[number];
type InstructorQuiz = (typeof instructorQuizzes)[number];
type QuestionBankItem = (typeof quizQuestionBank)[number];
type GradingItem = (typeof gradingQueue)[number];
type AssignmentSubmission = {
  id: number;
  student: string;
  fileUrl: string;
  content: string;
  submitted: string;
  score: string;
  feedback: string;
  gradedAt: string;
  status: string;
};
type AssignmentItem = {
  id: number;
  batchId: number;
  lessonId: number | null;
  title: string;
  description: string;
  course: string;
  batch: string;
  lessonTitle: string;
  moduleTitle: string;
  dueDateInput: string;
  dueDate: string;
  maxScore: string;
  submissions: number;
  pendingSubmissions: number;
  submissionItems: AssignmentSubmission[];
};
type BatchOption = {
  id: number;
  batchCode: string;
  courseName: string;
};
type LessonOption = {
  id: number;
  batchId: number;
  title: string;
  moduleTitle: string;
};
type AssignmentFormData = {
  batchScope: string;
  batchId: string;
  lessonId: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: string;
};

type InstructorQuizzesApiResponse = {
  success: boolean;
  data: {
    quizManagementStats: QuizStat[];
    instructorQuizzes: InstructorQuiz[];
    quizQuestionBank: QuestionBankItem[];
    gradingQueue: GradingItem[];
    batchOptions: BatchOption[];
    lessonOptions: LessonOption[];
    assignmentItems: AssignmentItem[];
  };
};

type QuizFilter = "all" | "published" | "draft";
type AssignmentSubmissionFilter = "all" | "pending" | "graded";
type InstructorToast = { type: "success" | "error"; message: string } | null;

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function useInstructorToast() {
  const [toast, setToast] = useState<InstructorToast>(null);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  return { toast, setToast };
}

function getQuizStatusClass(status: string) {
  return status === "Ban nhap" || status === "Bản nháp" ? "review" : "excellent";
}

function getQuizFilterStatus(status: string) {
  if (status === "Bản nháp" || status === "Ban nhap") {
    return "draft";
  }

  return "published";
}

function InstructorQuizTestsPage() {
  const { t } = useTranslation("instructor");
  const navigate = useNavigate();
  const [pageData, setPageData] =
    useState<InstructorQuizzesApiResponse["data"] | null>(null);
  const [quizFilter, setQuizFilter] = useState<QuizFilter>("all");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentBatchFilter, setAssignmentBatchFilter] = useState("all");
  const [assignmentSubmissionFilter, setAssignmentSubmissionFilter] =
    useState<AssignmentSubmissionFilter>("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [assignmentScore, setAssignmentScore] = useState("");
  const [assignmentFeedback, setAssignmentFeedback] = useState("");
  const [assignmentGradeError, setAssignmentGradeError] = useState<string | null>(null);
  const [isSavingAssignmentGrade, setIsSavingAssignmentGrade] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignmentFormError, setAssignmentFormError] = useState<string | null>(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const { toast, setToast } = useInstructorToast();
  const [assignmentFormData, setAssignmentFormData] = useState<AssignmentFormData>({
    batchScope: "SINGLE",
    batchId: "",
    lessonId: "",
    title: "",
    description: "",
    dueDate: "",
    maxScore: "10",
  });

  async function loadQuizzes(signal?: AbortSignal) {
    try {
      const payload = await instructorApiRequest<InstructorQuizzesApiResponse>(
        "/api/instructor/quizzes",
        {
          query: { teacherId: DEFAULT_TEACHER_ID },
          signal,
        },
      );
      if (!payload.success) throw new Error("Quizzes API returned unsuccessful response.");

      setPageData(payload.data);
      setSelectedAssignmentId((current) =>
        payload.data.assignmentItems.some((assignment) => assignment.id === current)
          ? current
          : payload.data.assignmentItems[0]?.id ?? null,
      );
      setSelectedSubmissionId((current) => {
        const submissions = payload.data.assignmentItems.flatMap((assignment) => assignment.submissionItems);
        return submissions.some((submission) => submission.id === current) ? current : submissions[0]?.id ?? null;
      });
      setAssignmentFormData((current) => ({
        ...current,
        batchId: current.batchId || String(payload.data.batchOptions[0]?.id ?? ""),
        lessonId: current.lessonId || String(payload.data.lessonOptions[0]?.id ?? ""),
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error(error);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    loadQuizzes(controller.signal);
    return () => controller.abort();
  }, []);

  function openSubmission(assignment: AssignmentItem, submission: AssignmentSubmission) {
    setSelectedAssignmentId(assignment.id);
    setSelectedSubmissionId(submission.id);
    setAssignmentScore(submission.score);
    setAssignmentFeedback(submission.feedback);
    setAssignmentGradeError(null);
  }

  function openAssignmentForm(assignment?: AssignmentItem) {
    const matchedBatchId = assignment
      ? String(assignment.batchId)
      : assignmentFormData.batchId || String(displayedBatchOptions[0]?.id ?? "");
    const batchLessonOptions =
      pageData?.lessonOptions.filter((lesson) => lesson.batchId === Number(matchedBatchId)) ?? [];

    setShowAssignmentForm(true);
    setEditingAssignmentId(assignment?.id ?? null);
    setAssignmentFormError(null);
    setAssignmentFormData({
      batchScope: "SINGLE",
      batchId: matchedBatchId,
      lessonId: assignment?.lessonId ? String(assignment.lessonId) : String(batchLessonOptions[0]?.id ?? ""),
      title: assignment?.title ?? "",
      description: assignment?.description ?? "",
      dueDate: assignment?.dueDateInput ?? "",
      maxScore: assignment?.maxScore ?? "10",
    });
  }

  function closeAssignmentForm() {
    setShowAssignmentForm(false);
    setEditingAssignmentId(null);
    setAssignmentFormError(null);
    setAssignmentFormData((current) => ({
      ...current,
      batchScope: "SINGLE",
      title: "",
      description: "",
      dueDate: "",
      maxScore: "10",
      lessonId: "",
    }));
  }

  async function handleSubmitAssignment() {
    if (!assignmentFormData.batchId) {
      setAssignmentFormError("H?y ch?n l?p thu?c kh?a nh?n b?i t?p.");
      return;
    }
    if (!assignmentFormData.lessonId) {
      setAssignmentFormError("H?y ch?n b?i h?c nh?n b?i t?p.");
      return;
    }
    if (!assignmentFormData.title.trim()) {
      setAssignmentFormError("Ti?u ?? b?i t?p kh?ng ???c ?? tr?ng.");
      return;
    }
    if (!assignmentFormData.dueDate) {
      setAssignmentFormError("H?y ch?n h?n n?p.");
      return;
    }

    setIsCreatingAssignment(true);
    setAssignmentFormError(null);

    try {
      const isEditing = editingAssignmentId != null;
      await instructorApiRequest(
        isEditing
          ? `/api/instructor/assignments/${editingAssignmentId}`
          : "/api/instructor/assignments",
        {
          method: isEditing ? "PATCH" : "POST",
          query: { teacherId: DEFAULT_TEACHER_ID },
          body: {
            batchScope: assignmentFormData.batchScope,
            batchId: Number(assignmentFormData.batchId),
            lessonId: Number(assignmentFormData.lessonId),
            title: assignmentFormData.title,
            description: assignmentFormData.description,
            dueDate: assignmentFormData.dueDate,
            maxScore: Number(assignmentFormData.maxScore) || 10,
          },
        },
      );

      await loadQuizzes();
      closeAssignmentForm();
      setToast({
        type: "success",
        message:
          editingAssignmentId
            ? "?? l?u thay ??i b?i t?p."
            : assignmentFormData.batchScope === "ALL"
              ? "?? t?o b?i t?p cho t?t c? l?p trong kh?a."
              : "?? t?o b?i t?p m?i.",
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu bài tập.";
      setAssignmentFormError(message);
      setToast({ type: "error", message });
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  async function handleDeleteAssignment(assignmentId = editingAssignmentId) {
    if (assignmentId == null) return;
    const confirmed = window.confirm(t("quizzesPage.deleteAssignmentConfirm"));
    if (!confirmed) return;

    setIsDeletingAssignment(true);
    setAssignmentFormError(null);

    try {
      await instructorApiRequest(`/api/instructor/assignments/${assignmentId}`, {
        method: "DELETE",
        query: { teacherId: DEFAULT_TEACHER_ID },
      });

      await loadQuizzes();
      closeAssignmentForm();
      setToast({ type: "success", message: "Đã xóa bài tập." });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể xóa bài tập.";
      setAssignmentFormError(message);
      setToast({ type: "error", message });
    } finally {
      setIsDeletingAssignment(false);
    }
  }

  async function handleSaveAssignmentGrade() {
    const selectedAssignment = pageData?.assignmentItems.find((assignment) => assignment.id === selectedAssignmentId);
    const selectedSubmission = selectedAssignment?.submissionItems.find((submission) => submission.id === selectedSubmissionId);
    if (!selectedAssignment || !selectedSubmission) return;

    const score = Number(assignmentScore);
    const maxScore = Number(selectedAssignment.maxScore);
    if (!Number.isFinite(score) || score < 0) {
      setAssignmentGradeError("Điểm phải là số từ 0 trở lên.");
      return;
    }
    if (Number.isFinite(maxScore) && score > maxScore) {
      setAssignmentGradeError("Điểm không được lớn hơn điểm tối đa.");
      return;
    }

    setIsSavingAssignmentGrade(true);
    setAssignmentGradeError(null);

    try {
      await instructorApiRequest(
        `/api/instructor/assignments/${selectedAssignment.id}/submissions/${selectedSubmission.id}/grade`,
        {
          method: "PATCH",
          query: { teacherId: DEFAULT_TEACHER_ID },
          body: { score, feedback: assignmentFeedback },
        },
      );

      await loadQuizzes();
      setSelectedAssignmentId(selectedAssignment.id);
      setSelectedSubmissionId(selectedSubmission.id);
      setToast({ type: "success", message: "Đã lưu điểm bài nộp." });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu điểm bài nộp.";
      setAssignmentGradeError(message);
      setToast({ type: "error", message });
    } finally {
      setIsSavingAssignmentGrade(false);
    }
  }

  function handleExportAssignmentScores() {
    const rows = filteredAssignments.flatMap((assignment) =>
      assignment.submissionItems.map((submission) => ({
        assignment: assignment.title,
        course: assignment.course,
        batch: assignment.batch,
        student: submission.student,
        submitted: submission.submitted,
        status: submission.score === "" ? "Chờ chấm" : "Đã chấm",
        score: submission.score || "",
        maxScore: assignment.maxScore,
        feedback: submission.feedback || "",
      })),
    );

    const header = [
      "Bài tập",
      "Khóa học",
      "Lớp",
      "Học viên",
      "Thời gian nộp",
      "Trạng thái",
      "Điểm",
      "Điểm tối đa",
      "Nhận xét",
    ];
    const csv = [
      header.map(csvCell).join(","),
      ...rows.map((row) =>
        [
          row.assignment,
          row.course,
          row.batch,
          row.student,
          row.submitted,
          row.status,
          row.score,
          row.maxScore,
          row.feedback,
        ].map(csvCell).join(","),
      ),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bang-diem-bai-tap-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ type: "success", message: "Đã xuất bảng điểm CSV." });
  }

  const displayedStats = pageData?.quizManagementStats ?? quizManagementStats;
  const displayedQuizzes = pageData?.instructorQuizzes ?? instructorQuizzes;
  const filteredQuizzes = displayedQuizzes.filter((quiz) => {
    if (quizFilter === "all") return true;
    return getQuizFilterStatus(quiz.status) === quizFilter;
  });
  const displayedQuestionBank = pageData?.quizQuestionBank ?? quizQuestionBank;
  const displayedGradingQueue = pageData?.gradingQueue ?? gradingQueue;
  const displayedBatchOptions = pageData?.batchOptions ?? [];
  const displayedLessonOptions = pageData?.lessonOptions ?? [];
  const selectedAssignmentBatchId =
    Number(assignmentFormData.batchId || displayedBatchOptions[0]?.id || 0);
  const assignmentLessonOptions = displayedLessonOptions.filter(
    (lesson) => lesson.batchId === selectedAssignmentBatchId,
  );
  const displayedAssignments = pageData?.assignmentItems ?? [];
  const normalizedAssignmentSearch = assignmentSearch.trim().toLowerCase();
  const filteredAssignments = displayedAssignments
    .map((assignment) => {
      const batchMatches = assignmentBatchFilter === "all" || assignment.batch === assignmentBatchFilter;
      const assignmentTextMatches = [
        assignment.title,
        assignment.description,
        assignment.course,
        assignment.batch,
        assignment.lessonTitle,
        assignment.moduleTitle,
      ].some((value) => value.toLowerCase().includes(normalizedAssignmentSearch));
      const filteredSubmissions = assignment.submissionItems.filter((submission) => {
        const statusMatches =
          assignmentSubmissionFilter === "all" ||
          (assignmentSubmissionFilter === "pending" && submission.score === "") ||
          (assignmentSubmissionFilter === "graded" && submission.score !== "");
        const searchMatches =
          normalizedAssignmentSearch.length === 0 ||
          assignmentTextMatches ||
          [submission.student, submission.content, submission.status].some((value) =>
            value.toLowerCase().includes(normalizedAssignmentSearch),
          );

        return statusMatches && searchMatches;
      });
      const searchMatches =
        normalizedAssignmentSearch.length === 0 ||
        assignmentTextMatches ||
        filteredSubmissions.length > 0;
      const submissionFilterMatches =
        assignmentSubmissionFilter === "all" || filteredSubmissions.length > 0;

      return {
        ...assignment,
        submissionItems: filteredSubmissions,
        isVisible: batchMatches && searchMatches && submissionFilterMatches,
      };
    })
    .filter((assignment) => assignment.isVisible);
  const selectedAssignment =
    filteredAssignments.find((assignment) => assignment.id === selectedAssignmentId) ??
    filteredAssignments[0] ??
    null;
  const selectedSubmission =
    selectedAssignment?.submissionItems.find((submission) => submission.id === selectedSubmissionId) ??
    selectedAssignment?.submissionItems[0] ??
    null;
  const assignmentStats = {
    totalAssignments: filteredAssignments.length,
    totalSubmissions: filteredAssignments.reduce((sum, assignment) => sum + assignment.submissionItems.length, 0),
    pendingSubmissions: filteredAssignments.reduce(
      (sum, assignment) => sum + assignment.submissionItems.filter((submission) => submission.score === "").length,
      0,
    ),
    gradedSubmissions: filteredAssignments.reduce(
      (sum, assignment) => sum + assignment.submissionItems.filter((submission) => submission.score !== "").length,
      0,
    ),
    averageScore: (() => {
      const scoredSubmissions = filteredAssignments
        .flatMap((assignment) => assignment.submissionItems)
        .map((submission) => Number(submission.score))
        .filter((score) => Number.isFinite(score));

      if (scoredSubmissions.length === 0) return "0";
      return (scoredSubmissions.reduce((sum, score) => sum + score, 0) / scoredSubmissions.length).toFixed(1);
    })(),
  };

  return (
    <InstructorLayout activePage="quizzes">
      <section className="instructor-hero instructor-quiz-hero">
        <div>
          <p className="instructor-eyebrow">{t("quizzesPage.eyebrow")}</p>
          <h2>{t("quizzesPage.title")}</h2>
          <p>
            Tạo bài kiểm tra, quản lý ngân hàng câu hỏi, theo dõi tỷ lệ đạt và
            kiểm soát bài cần chấm trước khi ảnh hưởng đến tiến độ học viên.
          </p>
        </div>
        <div className="instructor-hero-actions">
          <button
            className="instructor-secondary-button"
            onClick={() => navigate("/instructor/courses?createQuiz=1")}
            type="button"
          >
            <span className="material-symbols-outlined">library_add</span>
            Thêm câu hỏi
          </button>
          <button
            className="instructor-primary-button"
            onClick={() => navigate("/instructor/courses?createQuiz=1")}
            type="button"
          >
            <span className="material-symbols-outlined">add</span>
            {t("quizzesPage.newTest")}
          </button>
        </div>
      </section>

      <section className="instructor-stat-grid" aria-label={t("quizzesPage.statsLabel")}>
        {displayedStats.map((stat) => (
          <article className="instructor-stat-card" key={stat.label}>
            <div className={`instructor-stat-icon ${stat.tone}`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p>{stat.label}</p>
            <div>
              <strong>{stat.value}</strong>
              <span>{pageData ? "Theo bài kiểm tra" : "Không gian đánh giá"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="instructor-quiz-grid">
        <article className="instructor-panel instructor-quiz-list-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("quizzesPage.assessmentEyebrow")}</p>
              <h3>{t("quizzesPage.activeTests")}</h3>
            </div>
            <div className="instructor-filter-tabs" aria-label="Bộ lọc bài kiểm tra">
              <button
                className={quizFilter === "all" ? "active" : ""}
                onClick={() => setQuizFilter("all")}
                type="button"
              >
                {t("quizzesPage.all")}
              </button>
              <button
                className={quizFilter === "published" ? "active" : ""}
                onClick={() => setQuizFilter("published")}
                type="button"
              >
                Đã xuất bản
              </button>
              <button
                className={quizFilter === "draft" ? "active" : ""}
                onClick={() => setQuizFilter("draft")}
                type="button"
              >
                Bản nháp
              </button>
            </div>
          </div>

          <div className="instructor-quiz-list">
            {filteredQuizzes.length === 0 ? (
              <p className="instructor-empty-state">Không có bài kiểm tra phù hợp với bộ lọc này.</p>
            ) : filteredQuizzes.map((quiz) => (
              <article className="instructor-quiz-card" key={quiz.title}>
                <div className="instructor-quiz-main">
                  <span className="material-symbols-outlined">quiz</span>
                  <div>
                    <h4>{quiz.title}</h4>
                    <p>{quiz.course} · {quiz.batch}</p>
                  </div>
                </div>
                <div className="instructor-quiz-metrics">
                  <span>{quiz.questions} câu hỏi</span>
                  <span>{quiz.duration}</span>
                  <span>{quiz.attempts} lượt làm</span>
                </div>
                <div className="instructor-table-progress">
                  <div className="instructor-progress-track">
                    <span style={{ width: `${quiz.passRate}%` }} />
                  </div>
                  <b>{quiz.passRate}% đạt yêu cầu</b>
                </div>
                <em className={`instructor-status-pill ${getQuizStatusClass(quiz.status)}`}>
                  {quiz.status}
                </em>
              </article>
            ))}
          </div>
        </article>

        <aside className="instructor-panel instructor-grading-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("quizzesPage.manualGradingEyebrow")}</p>
              <h3>{t("quizzesPage.gradingQueue")}</h3>
            </div>
            <span className="material-symbols-outlined">rate_review</span>
          </div>
          <div className="instructor-grading-list">
            {displayedGradingQueue.map((item) => (
              <article className="instructor-grading-card" key={`${item.student}-${item.quiz}`}>
                <div>
                  <h4>{item.student}</h4>
                  <span>{item.score}</span>
                </div>
                <p>{item.quiz}</p>
                <small>{item.submitted}</small>
                <button type="button">Mở bài nộp</button>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="instructor-panel instructor-assignment-panel">
        <div className="instructor-panel-header">
          <div>
            <p className="instructor-eyebrow">{t("quizzesPage.assignmentEyebrow")}</p>
            <h3>{t("quizzesPage.pendingSubmissions")}</h3>
          </div>
          <button className="instructor-ghost-button" onClick={() => openAssignmentForm()} type="button">
            {t("quizzesPage.newAssignment")}
          </button>
        </div>

        <div className="instructor-assignment-filters">
          <label className="instructor-assignment-search">
            <span className="material-symbols-outlined">search</span>
            <input
              placeholder="Tìm bài tập hoặc học viên..."
              value={assignmentSearch}
              onChange={(event) => setAssignmentSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Lọc bài tập theo khóa/lớp"
            value={assignmentBatchFilter}
            onChange={(event) => setAssignmentBatchFilter(event.target.value)}
          >
            <option value="all">{t("quizzesPage.allClasses")}</option>
            {displayedBatchOptions.map((batch) => (
              <option key={batch.id} value={batch.batchCode}>
                {batch.batchCode}
              </option>
            ))}
          </select>

          <div className="instructor-filter-tabs" aria-label="Lọc trạng thái bài nộp">
            <button
              className={assignmentSubmissionFilter === "all" ? "active" : ""}
              onClick={() => setAssignmentSubmissionFilter("all")}
              type="button"
            >
              {t("quizzesPage.all")}
            </button>
            <button
              className={assignmentSubmissionFilter === "pending" ? "active" : ""}
              onClick={() => setAssignmentSubmissionFilter("pending")}
              type="button"
            >
              Chờ chấm
            </button>
            <button
              className={assignmentSubmissionFilter === "graded" ? "active" : ""}
              onClick={() => setAssignmentSubmissionFilter("graded")}
              type="button"
            >
              Đã chấm
            </button>
          </div>
        </div>

        <div className="instructor-assignment-summary">
          <article>
            <span>{t("quizzesPage.assignment")}</span>
            <strong>{assignmentStats.totalAssignments}</strong>
          </article>
          <article>
            <span>{t("quizzesPage.submissions")}</span>
            <strong>{assignmentStats.totalSubmissions}</strong>
          </article>
          <article>
            <span>Chờ chấm</span>
            <strong>{assignmentStats.pendingSubmissions}</strong>
          </article>
          <article>
            <span>Đã chấm</span>
            <strong>{assignmentStats.gradedSubmissions}</strong>
          </article>
          <article>
            <span>Điểm TB</span>
            <strong>{assignmentStats.averageScore}</strong>
          </article>
          <button
            disabled={assignmentStats.totalSubmissions === 0}
            onClick={handleExportAssignmentScores}
            type="button"
          >
            <span className="material-symbols-outlined">download</span>
            Xuất bảng điểm
          </button>
        </div>

        <div className="instructor-assignment-grid">
          <div className="instructor-assignment-list">
            {displayedAssignments.length === 0 ? (
              <p className="instructor-empty-state">Chưa có bài tập nào.</p>
            ) : filteredAssignments.length === 0 ? (
              <p className="instructor-empty-state">Không có bài tập hoặc bài nộp phù hợp với bộ lọc.</p>
            ) : (
              filteredAssignments.map((assignment) => (
                <article
                  className={`instructor-assignment-card ${selectedAssignment?.id === assignment.id ? "active" : ""}`}
                  key={assignment.id}
                >
                  <button
                    onClick={() => {
                      setSelectedAssignmentId(assignment.id);
                      setSelectedSubmissionId(assignment.submissionItems[0]?.id ?? null);
                      setAssignmentScore(assignment.submissionItems[0]?.score ?? "");
                      setAssignmentFeedback(assignment.submissionItems[0]?.feedback ?? "");
                      setAssignmentGradeError(null);
                    }}
                    type="button"
                  >
                    <strong>{assignment.title}</strong>
                    <span>{assignment.course} · {assignment.batch}</span>
                    {assignment.lessonTitle && (
                      <small>
                        Bài học: {assignment.moduleTitle ? `${assignment.moduleTitle} - ` : ""}
                        {assignment.lessonTitle}
                      </small>
                    )}
                    <p>{assignment.description || "Không có mô tả bài tập"}</p>
                    <em>{assignment.pendingSubmissions} chờ chấm</em>
                    <small>Hạn: {assignment.dueDate}</small>
                  </button>

                  <div className="instructor-assignment-actions">
                    <button type="button" onClick={() => openAssignmentForm(assignment)}>
                      Sửa
                    </button>
                    <button disabled={isDeletingAssignment} type="button" onClick={() => handleDeleteAssignment(assignment.id)}>
                      Xóa
                    </button>
                  </div>

                  <div className="instructor-submission-list">
                    {assignment.submissionItems.length === 0 ? (
                      <p className="instructor-empty-state">Chưa có học viên nộp bài.</p>
                    ) : (
                      assignment.submissionItems.map((submission) => (
                        <button
                          className={selectedSubmission?.id === submission.id ? "active" : ""}
                          key={submission.id}
                          onClick={() => openSubmission(assignment, submission)}
                          type="button"
                        >
                          <strong>{submission.student}</strong>
                          <span>{submission.submitted}</span>
                          <em>{submission.status}</em>
                        </button>
                      ))
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="instructor-assignment-grade-panel">
            {!selectedAssignment || !selectedSubmission ? (
              <p className="instructor-empty-state">Chọn một bài nộp để chấm.</p>
            ) : (
              <>
                <div className="instructor-assignment-grade-header">
                  <div>
                    <strong>{selectedSubmission.student}</strong>
                    <span>{selectedAssignment.title}</span>
                  </div>
                  <em>{selectedSubmission.status}</em>
                </div>

                <div className="instructor-submission-content">
                  <span>Nội dung nộp</span>
                  <p>{selectedSubmission.content || t("quizzesPage.emptySubmission")}</p>
                  {selectedSubmission.fileUrl && (
                    <a href={selectedSubmission.fileUrl} rel="noreferrer" target="_blank">
                      Mở tệp đính kèm
                    </a>
                  )}
                </div>

                <form
                  className="instructor-assignment-grade-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSaveAssignmentGrade();
                  }}
                >
                  {assignmentGradeError && <p className="instructor-course-detail-error">{assignmentGradeError}</p>}
                  <label className="instructor-create-course-field">
                    <span>Điểm / {selectedAssignment.maxScore}</span>
                    <input
                      min="0"
                      max={selectedAssignment.maxScore}
                      step="0.5"
                      type="number"
                      value={assignmentScore || selectedSubmission.score}
                      onChange={(event) => setAssignmentScore(event.target.value)}
                    />
                  </label>
                  <label className="instructor-create-course-field">
                    <span>Feedback</span>
                    <textarea
                      rows={4}
                      value={assignmentFeedback || selectedSubmission.feedback}
                      onChange={(event) => setAssignmentFeedback(event.target.value)}
                      placeholder="Nhận xét để học viên cải thiện..."
                    />
                  </label>
                  <button disabled={isSavingAssignmentGrade} type="submit">
                    {isSavingAssignmentGrade ? t("quizzesPage.saving") : t("quizzesPage.saveGrade")}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="instructor-panel instructor-question-bank-panel">
        <div className="instructor-panel-header">
          <div>
            <p className="instructor-eyebrow">{t("quizzesPage.questionBankEyebrow")}</p>
            <h3>{t("quizzesPage.reusableQuestions")}</h3>
          </div>
          <button className="instructor-ghost-button" type="button">{t("quizzesPage.manageBank")}</button>
        </div>
        <div className="instructor-question-grid">
          {displayedQuestionBank.map((bank) => (
            <article className="instructor-question-card" key={`${bank.topic}-${bank.type}`}>
              <span className="material-symbols-outlined">psychology_alt</span>
              <div>
                <h4>{bank.topic}</h4>
                <p>{bank.type}</p>
              </div>
              <strong>{bank.count}</strong>
              <em>{bank.difficulty}</em>
            </article>
          ))}
        </div>
      </section>

      {showAssignmentForm && (
        <div className="instructor-course-create-backdrop" onClick={closeAssignmentForm} role="presentation">
          <aside
            aria-label="Tạo bài tập mới"
            aria-modal="true"
            className="instructor-course-detail-modal instructor-create-course-modal no-hero"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <form
              className="instructor-create-course-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitAssignment();
              }}
            >
              <div className="instructor-create-course-header">
                <div>

                  <p className="instructor-eyebrow">{t("quizzesPage.assignmentEyebrow")}</p>
                  <h3>{editingAssignmentId ? t("quizzesPage.editAssignment") : t("quizzesPage.createAssignment")}</h3>
                  <p>Giao bài cho một lớp, đặt hạn nộp và điểm tối đa để chấm bài nộp của học viên.</p>

                </div>
                <button
                  aria-label="Đóng form tạo bài tập"
                  className="instructor-course-detail-close"
                  onClick={closeAssignmentForm}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {assignmentFormError && <p className="instructor-course-detail-error">{assignmentFormError}</p>}

              <div className="instructor-create-course-grid">
                {editingAssignmentId == null && (
                  <label className="instructor-create-course-field instructor-create-course-field-wide">
                    <span>Ph?m vi giao b?i</span>
                    <select
                      value={assignmentFormData.batchScope}
                      onChange={(event) =>
                        setAssignmentFormData({
                          ...assignmentFormData,
                          batchScope: event.target.value,
                        })
                      }
                    >
                      <option value="SINGLE">M?t l?p c? th?</option>
                      <option value="ALL">T?t c? l?p trong c?ng kh?a</option>
                    </select>
                  </label>
                )}

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>
                    {editingAssignmentId == null && assignmentFormData.batchScope === "ALL"
                      ? "Ch?n m?t l?p trong kh?a *"
                      : "Kh?a nh?n b?i t?p *"}
                  </span>
                  <select
                    value={assignmentFormData.batchId || displayedBatchOptions[0]?.id || ""}
                    onChange={(event) => {
                      const nextBatchId = event.target.value;
                      const nextLessonId =
                        displayedLessonOptions.find((lesson) => lesson.batchId === Number(nextBatchId))?.id ?? "";

                      setAssignmentFormData({
                        ...assignmentFormData,
                        batchId: nextBatchId,
                        lessonId: String(nextLessonId),
                      });
                    }}
                  >
                    {displayedBatchOptions.length === 0 ? (
                      <option value="">Ch?a c? l?p</option>
                    ) : (
                      displayedBatchOptions.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchCode} - {batch.courseName}
                        </option>
                      ))
                    )}
                  </select>
                  {editingAssignmentId == null && assignmentFormData.batchScope === "ALL" && (
                    <small>H? th?ng s? nh?n b?n b?i t?p n?y cho m?i l?p c?a c?ng kh?a h?c.</small>
                  )}
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>B?i h?c nh?n b?i t?p *</span>
                  <select
                    value={assignmentFormData.lessonId || assignmentLessonOptions[0]?.id || ""}
                    onChange={(event) =>
                      setAssignmentFormData({ ...assignmentFormData, lessonId: event.target.value })
                    }
                  >
                    {assignmentLessonOptions.length === 0 ? (
                      <option value="">Ch?a c? b?i h?c trong l?p n?y</option>
                    ) : (
                      assignmentLessonOptions.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.moduleTitle} - {lesson.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Tiêu đề bài tập *</span>
                  <input
                    placeholder="VD: Bài tập HTML/CSS"
                    value={assignmentFormData.title}
                    onChange={(event) =>
                      setAssignmentFormData({ ...assignmentFormData, title: event.target.value })
                    }
                  />
                </label>

                <label className="instructor-create-course-field instructor-create-course-field-wide">
                  <span>Mô tả yêu cầu</span>
                  <textarea
                    placeholder="Mô tả nội dung cần nộp, tiêu chí chấm và lưu ý cho học viên"
                    rows={4}
                    value={assignmentFormData.description}
                    onChange={(event) =>
                      setAssignmentFormData({ ...assignmentFormData, description: event.target.value })
                    }
                  />
                </label>

                <label className="instructor-create-course-field">
                  <span>Hạn nộp *</span>
                  <input
                    type="datetime-local"
                    value={assignmentFormData.dueDate}
                    onChange={(event) =>
                      setAssignmentFormData({ ...assignmentFormData, dueDate: event.target.value })
                    }
                  />
                </label>

                <label className="instructor-create-course-field">
                  <span>Điểm tối đa</span>
                  <input
                    min="1"
                    step="0.5"
                    type="number"
                    value={assignmentFormData.maxScore}
                    onChange={(event) =>
                      setAssignmentFormData({ ...assignmentFormData, maxScore: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="instructor-create-course-actions">
                <button type="button" onClick={closeAssignmentForm}>
                  {t("quizzesPage.cancel")}
                </button>
                {editingAssignmentId && (
                  <button disabled={isDeletingAssignment} type="button" onClick={() => handleDeleteAssignment(editingAssignmentId)}>
                    Xóa bài tập
                  </button>
                )}
                <button disabled={isCreatingAssignment || displayedBatchOptions.length === 0 || assignmentLessonOptions.length === 0} type="submit">
                  {isCreatingAssignment
                    ? editingAssignmentId
                      ? t("quizzesPage.saving")
                      : t("quizzesPage.creating")
                    : editingAssignmentId
                      ? t("quizzesPage.saveChanges")
                      : t("quizzesPage.createAssignment")}
                </button>
              </div>
            </form>
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

export default InstructorQuizTestsPage;
