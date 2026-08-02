import { beforeEach, describe, expect, it, vi } from "vitest";

function buildAttemptRow(attemptId, examId = 10, status = "IN_PROGRESS") {
  return {
    exam_id: examId,
    attempt_id: attemptId,
    started_at: new Date().toISOString(),
    submitted_at: null,
    score: null,
    status,
    feedback: null,
    graded_at: null,
    graded_by: null,
    answer_count: 0,
  };
}

const {
  mockGetExamOverviewRows,
  mockGetClassQuizOverviewRows,
  mockGetBatchRowsByCourseIds,
  mockGetEnrollmentRowsByStudentAndCourseIds,
  mockGetAttemptRowsByStudentAndExamIds,
  mockGetQuizAttemptRowsByStudentAndQuizIds,
  mockGetQuestionRowsByExamId,
  mockGetQuestionRowsByQuizId,
  mockGetAttemptAnswers,
  mockGetQuizAttemptAnswers,
  mockCreateExamAttempt,
  mockCreateQuizAttempt,
  mockDeleteAttemptAnswers,
  mockDeleteQuizAttemptAnswers,
  mockInsertAttemptAnswer,
  mockInsertQuizAttemptAnswer,
  mockUpdateAttemptSubmission,
  mockUpdateQuizAttemptSubmission,
  mockGetConnection,
} = vi.hoisted(() => ({
  mockGetExamOverviewRows: vi.fn(),
  mockGetClassQuizOverviewRows: vi.fn(),
  mockGetBatchRowsByCourseIds: vi.fn(),
  mockGetEnrollmentRowsByStudentAndCourseIds: vi.fn(),
  mockGetAttemptRowsByStudentAndExamIds: vi.fn(),
  mockGetQuizAttemptRowsByStudentAndQuizIds: vi.fn(),
  mockGetQuestionRowsByExamId: vi.fn(),
  mockGetQuestionRowsByQuizId: vi.fn(),
  mockGetAttemptAnswers: vi.fn(),
  mockGetQuizAttemptAnswers: vi.fn(),
  mockCreateExamAttempt: vi.fn(),
  mockCreateQuizAttempt: vi.fn(),
  mockDeleteAttemptAnswers: vi.fn(),
  mockDeleteQuizAttemptAnswers: vi.fn(),
  mockInsertAttemptAnswer: vi.fn(),
  mockInsertQuizAttemptAnswer: vi.fn(),
  mockUpdateAttemptSubmission: vi.fn(),
  mockUpdateQuizAttemptSubmission: vi.fn(),
  mockGetConnection: vi.fn(),
}));

vi.mock("../../services/studentExams.repository.js", () => ({
  createExamAttempt: mockCreateExamAttempt,
  createQuizAttempt: mockCreateQuizAttempt,
  deleteAttemptAnswers: mockDeleteAttemptAnswers,
  deleteQuizAttemptAnswers: mockDeleteQuizAttemptAnswers,
  getAttemptAnswers: mockGetAttemptAnswers,
  getAttemptRowsByStudentAndExamIds: mockGetAttemptRowsByStudentAndExamIds,
  getBatchRowsByCourseIds: mockGetBatchRowsByCourseIds,
  getClassQuizOverviewRows: mockGetClassQuizOverviewRows,
  getConnection: mockGetConnection,
  getEnrollmentRowsByStudentAndCourseIds: mockGetEnrollmentRowsByStudentAndCourseIds,
  getExamOverviewRows: mockGetExamOverviewRows,
  getQuestionRowsByExamId: mockGetQuestionRowsByExamId,
  getQuestionRowsByQuizId: mockGetQuestionRowsByQuizId,
  getQuizAttemptAnswers: mockGetQuizAttemptAnswers,
  getQuizAttemptRowsByStudentAndQuizIds: mockGetQuizAttemptRowsByStudentAndQuizIds,
  insertAttemptAnswer: mockInsertAttemptAnswer,
  insertQuizAttemptAnswer: mockInsertQuizAttemptAnswer,
  updateAttemptSubmission: mockUpdateAttemptSubmission,
  updateQuizAttemptSubmission: mockUpdateQuizAttemptSubmission,
}));

import {
  getStudentExams,
  saveStudentExamDraft,
  startStudentExam,
  submitStudentExam,
} from "../../services/studentExams.service.js";

describe("studentExams.service", () => {
  beforeEach(() => {
    mockGetExamOverviewRows.mockReset();
    mockGetClassQuizOverviewRows.mockReset();
    mockGetBatchRowsByCourseIds.mockReset();
    mockGetEnrollmentRowsByStudentAndCourseIds.mockReset();
    mockGetAttemptRowsByStudentAndExamIds.mockReset();
    mockGetQuizAttemptRowsByStudentAndQuizIds.mockReset();
    mockGetQuestionRowsByExamId.mockReset();
    mockGetQuestionRowsByQuizId.mockReset();
    mockGetAttemptAnswers.mockReset();
    mockGetQuizAttemptAnswers.mockReset();
    mockCreateExamAttempt.mockReset();
    mockCreateQuizAttempt.mockReset();
    mockDeleteAttemptAnswers.mockReset();
    mockDeleteQuizAttemptAnswers.mockReset();
    mockInsertAttemptAnswer.mockReset();
    mockInsertQuizAttemptAnswer.mockReset();
    mockUpdateAttemptSubmission.mockReset();
    mockUpdateQuizAttemptSubmission.mockReset();
    mockGetConnection.mockReset();
  });

  it("should build the exam list and summary from course exams and class quizzes", async () => {
    // Test nghiệp vụ: khi lấy danh sách bài kiểm tra cho học viên,
    // service phải gom cả bài thi khóa học và quiz lớp thành một collection thống nhất.
    mockGetExamOverviewRows.mockResolvedValue([
      {
        exam_id: 10,
        title: "Midterm",
        description: "Bài giữa kỳ",
        open_at: "2026-01-01T00:00:00.000Z",
        close_at: "2026-01-02T00:00:00.000Z",
        duration_minutes: 60,
        max_score: 100,
        pass_score: 60,
        attempt_limit: 2,
        question_count: 10,
        created_at: "2026-01-01T00:00:00.000Z",
        status: "PUBLISHED",
        course_id: 1,
        course_name: "React",
        thumbnail_url: null,
        level: "BEGINNER",
        category_id: 1,
        category_name: "Frontend",
        teacher_id: 4,
        teacher_name: "Teacher A",
        teacher_email: "teacher@example.com",
        teacher_avatar_url: null,
      },
    ]);
    mockGetClassQuizOverviewRows.mockResolvedValue([
      {
        quiz_id: 20,
        title: "Quiz lớp",
        course_id: 1,
        course_name: "React",
        batch_id: 3,
        batch_code: "B3",
        batch_name: "Lớp 3",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        status: "OPEN",
        attempt_limit: 1,
        batch_status: "OPEN",
        learning_mode: "ONLINE",
        online_platform: "ZOOM",
        teacher_id: 4,
        teacher_name: "Teacher A",
        teacher_email: "teacher@example.com",
        teacher_avatar_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    mockGetBatchRowsByCourseIds.mockResolvedValue([]);
    mockGetEnrollmentRowsByStudentAndCourseIds.mockResolvedValue([
      {
        course_id: 1,
        enrollment_id: 99,
        enrollment_status: "ACTIVE",
        progress_percent: 40,
        batch_id: 3,
        batch_code: "B3",
        batch_name: "Lớp 3",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        batch_status: "OPEN",
        learning_mode: "ONLINE",
        online_platform: "ZOOM",
      },
    ]);
    mockGetAttemptRowsByStudentAndExamIds.mockResolvedValue([]);
    mockGetQuizAttemptRowsByStudentAndQuizIds.mockResolvedValue([]);

    const result = await getStudentExams(7);

    expect(result.summary.total).toBe(2);
    expect(result.exams.some((exam) => exam.source === "CLASS_QUIZ")).toBe(true);
    expect(result.exams.some((exam) => exam.source === "COURSE_EXAM")).toBe(true);
    const classQuizExam = result.exams.find((exam) => exam.source === "CLASS_QUIZ");
    expect(classQuizExam?.availability.canStart).toBe(true);
  });

  it("should create a new attempt and open the exam workspace for a student", async () => {
    // Test nghiệp vụ: khi học viên bắt đầu làm bài kiểm tra còn đủ điều kiện,
    // service phải tạo lượt làm bài mới và mở workspace tương ứng.
    mockGetExamOverviewRows.mockResolvedValue([
      {
        exam_id: 10,
        title: "Midterm",
        description: "Bài giữa kỳ",
        open_at: null,
        close_at: null,
        duration_minutes: 60,
        max_score: 100,
        pass_score: 60,
        attempt_limit: 2,
        question_count: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        status: "PUBLISHED",
        course_id: 1,
        course_name: "React",
        thumbnail_url: null,
        level: "BEGINNER",
        category_id: 1,
        category_name: "Frontend",
        teacher_id: 4,
        teacher_name: "Teacher A",
        teacher_email: "teacher@example.com",
        teacher_avatar_url: null,
      },
    ]);
    mockGetClassQuizOverviewRows.mockResolvedValue([]);
    mockGetBatchRowsByCourseIds.mockResolvedValue([]);
    mockGetEnrollmentRowsByStudentAndCourseIds.mockResolvedValue([
      {
        course_id: 1,
        enrollment_id: 99,
        enrollment_status: "ACTIVE",
        progress_percent: 40,
        batch_id: 3,
        batch_code: "B3",
        batch_name: "Lớp 3",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        batch_status: "OPEN",
        learning_mode: "ONLINE",
        online_platform: "ZOOM",
      },
    ]);
    mockGetAttemptRowsByStudentAndExamIds
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildAttemptRow(500)]);
    mockGetQuizAttemptRowsByStudentAndQuizIds.mockResolvedValue([]);
    mockGetConnection.mockResolvedValue({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    });
    mockGetQuestionRowsByExamId.mockResolvedValue([]);
    mockGetAttemptAnswers.mockResolvedValue([]);
    mockCreateExamAttempt.mockResolvedValue(500);

    const result = await startStudentExam(7, 10);

    expect(result.ok).toBe(true);
    expect(result.data.attempt.id).toBe(500);
    expect(mockCreateExamAttempt).toHaveBeenCalled();
  });

  it("should save draft answers and return the refreshed workspace", async () => {
    // Test nghiệp vụ: khi học viên lưu bản nháp câu trả lời,
    // service phải normalise đáp án và lưu snapshot vào hệ thống mà không làm thay đổi trạng thái bài làm.
    mockGetExamOverviewRows.mockResolvedValue([
      {
        exam_id: 10,
        title: "Midterm",
        description: "Bài giữa kỳ",
        open_at: null,
        close_at: null,
        duration_minutes: 60,
        max_score: 100,
        pass_score: 60,
        attempt_limit: 2,
        question_count: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        status: "PUBLISHED",
        course_id: 1,
        course_name: "React",
        thumbnail_url: null,
        level: "BEGINNER",
        category_id: 1,
        category_name: "Frontend",
        teacher_id: 4,
        teacher_name: "Teacher A",
        teacher_email: "teacher@example.com",
        teacher_avatar_url: null,
      },
    ]);
    mockGetClassQuizOverviewRows.mockResolvedValue([]);
    mockGetBatchRowsByCourseIds.mockResolvedValue([]);
    mockGetEnrollmentRowsByStudentAndCourseIds.mockResolvedValue([
      {
        course_id: 1,
        enrollment_id: 99,
        enrollment_status: "ACTIVE",
        progress_percent: 40,
        batch_id: 3,
        batch_code: "B3",
        batch_name: "Lớp 3",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        batch_status: "OPEN",
        learning_mode: "ONLINE",
        online_platform: "ZOOM",
      },
    ]);
    mockGetAttemptRowsByStudentAndExamIds.mockResolvedValue([buildAttemptRow(500)]);
    mockGetQuizAttemptRowsByStudentAndQuizIds.mockResolvedValue([]);
    mockGetConnection.mockResolvedValue({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    });
    mockCreateExamAttempt.mockResolvedValue(500);
    mockGetQuestionRowsByExamId.mockResolvedValue([
      {
        question_id: 101,
        exam_id: 10,
        question_text: "Câu hỏi 1",
        question_type: "SINGLE_CHOICE",
        score: 10,
        order_no: 1,
        option_id: 11,
        option_text: "Đáp án A",
        option_order_no: 1,
        is_correct: true,
      },
    ]);
    mockGetAttemptAnswers.mockResolvedValue([]);

    const result = await saveStudentExamDraft(7, 10, 500, [{ questionId: 101, optionId: 11 }]);

    expect(result.ok).toBe(true);
    expect(mockDeleteAttemptAnswers).toHaveBeenCalled();
    expect(mockInsertAttemptAnswer).toHaveBeenCalled();
  });

  it("should submit an exam, grade objective answers, and return the review summary", async () => {
    // Test nghiệp vụ: khi học viên nộp bài, service phải chấm điểm câu hỏi objective,
    // lưu kết quả và trả về bản tóm tắt điểm số cho review.
    mockGetExamOverviewRows.mockResolvedValue([
      {
        exam_id: 10,
        title: "Midterm",
        description: "Bài giữa kỳ",
        open_at: null,
        close_at: null,
        duration_minutes: 60,
        max_score: 100,
        pass_score: 60,
        attempt_limit: 2,
        question_count: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        status: "PUBLISHED",
        course_id: 1,
        course_name: "React",
        thumbnail_url: null,
        level: "BEGINNER",
        category_id: 1,
        category_name: "Frontend",
        teacher_id: 4,
        teacher_name: "Teacher A",
        teacher_email: "teacher@example.com",
        teacher_avatar_url: null,
      },
    ]);
    mockGetClassQuizOverviewRows.mockResolvedValue([]);
    mockGetBatchRowsByCourseIds.mockResolvedValue([]);
    mockGetEnrollmentRowsByStudentAndCourseIds.mockResolvedValue([
      {
        course_id: 1,
        enrollment_id: 99,
        enrollment_status: "ACTIVE",
        progress_percent: 40,
        batch_id: 3,
        batch_code: "B3",
        batch_name: "Lớp 3",
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        batch_status: "OPEN",
        learning_mode: "ONLINE",
        online_platform: "ZOOM",
      },
    ]);
    mockGetAttemptRowsByStudentAndExamIds.mockResolvedValue([buildAttemptRow(500)]);
    mockGetQuizAttemptRowsByStudentAndQuizIds.mockResolvedValue([]);
    mockGetConnection.mockResolvedValue({
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    });
    mockCreateExamAttempt.mockResolvedValue(500);
    mockGetQuestionRowsByExamId.mockResolvedValue([
      {
        question_id: 101,
        exam_id: 10,
        question_text: "Câu hỏi 1",
        question_type: "SINGLE_CHOICE",
        score: 10,
        order_no: 1,
        option_id: 11,
        option_text: "Đáp án A",
        option_order_no: 1,
        is_correct: true,
      },
    ]);
    mockGetAttemptAnswers.mockResolvedValue([]);

    const result = await submitStudentExam(7, 10, 500, [{ questionId: 101, optionId: 11 }]);

    expect(result.ok).toBe(true);
    expect(result.data.score).toBe(10);
    expect(result.data.pendingEssayReview).toBe(false);
    expect(mockUpdateAttemptSubmission).toHaveBeenCalled();
  });
});
