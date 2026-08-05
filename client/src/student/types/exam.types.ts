export type StudentExamState =
  | "UPCOMING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LOCKED";

export type StudentExamAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED";

export type StudentExamQuestionType = "SINGLE_CHOICE" | "ESSAY";

export type StudentExamAttempt = {
  id: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  status: StudentExamAttemptStatus;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: number | null;
  answerCount: number;
  isPassed: boolean;
};

export type StudentExam = {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxScore: number;
  passScore: number;
  attemptLimit: number;
  questionCount: number;
  createdAt: string;
  state: StudentExamState;
  course: {
    id: number;
    name: string;
    thumbnailUrl: string | null;
    level: string;
  };
  category: {
    id: number;
    name: string;
  };
  batch: {
    id: number;
    code: string | null;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    learningMode: string;
    onlinePlatform: string;
  };
  teacher: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  lesson: {
    id: number;
    title: string;
  } | null;
  enrollment: {
    id: number;
    status: string;
    progressPercent: number;
  } | null;
  attempts: {
    count: number;
    remaining: number;
    latest: StudentExamAttempt | null;
    items: StudentExamAttempt[];
  };
};

export type StudentExamResult = {
  examId: number;
  attemptId: number | null;
  title: string;
  courseName: string;
  batchName: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  passScore: number;
  status: "PASSED" | "FAILED";
};

export type StudentExamSummary = {
  total: number;
  upcoming: number;
  incomplete: number;
  completed: number;
  averageScore: number;
};

export type StudentExamDashboard = {
  summary: StudentExamSummary;
  exams: StudentExam[];
  recentResults: StudentExamResult[];
};

export type StudentExamAnswerDraft = {
  questionId: number;
  optionId: number | null;
  essayAnswer: string;
};

export type StudentExamQuestionOption = {
  id: number;
  text: string;
  orderNo: number;
  isCorrect: boolean;
};

export type StudentExamQuestion = {
  id: number;
  examId: number;
  type: StudentExamQuestionType;
  orderNo: number;
  text: string;
  score: number;
  options: StudentExamQuestionOption[];
  answer: StudentExamAnswerDraft;
};

export type StudentExamWorkspace = {
  exam: {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    maxScore: number;
    passScore: number;
    questionCount: number;
    openAt: string | null;
    closeAt: string | null;
    course: {
      id: number;
      name: string;
      thumbnailUrl: string | null;
      level: string;
    };
    batch: {
      id: number;
      code: string | null;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
      learningMode: string;
      onlinePlatform: string;
    };
    teacher: {
      id: number;
      fullName: string;
      email: string;
      avatarUrl: string | null;
    };
    attempts: {
      count: number;
      remaining: number;
      latest: StudentExamAttempt | null;
      items: StudentExamAttempt[];
    };
  };
  attempt: {
    id: number;
    startedAt: string;
    submittedAt: string | null;
    status: StudentExamAttemptStatus;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
    isPassed: boolean;
  };
  progress: {
    answeredCount: number;
    totalQuestions: number;
    completionPercent: number;
    remainingSeconds: number;
  };
  questions: StudentExamQuestion[];
};

export type StudentExamSubmissionResult = {
  attemptId: number;
  examId: number;
  status: StudentExamAttemptStatus;
  score: number;
  autoGradedScore: number;
  maxScore: number;
  passScore: number;
  pendingEssayReview: boolean;
  reviewedQuestions: number;
};

export type StudentExamReviewQuestion = StudentExamQuestion & {
  review: {
    status: "CORRECT" | "INCORRECT" | "PENDING";
    earnedScore: number | null;
    correctOptionId?: number | null;
  };
};

export type StudentExamReview = {
  exam: {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    maxScore: number;
    passScore: number;
    course: {
      id: number;
      name: string;
      thumbnailUrl: string | null;
      level: string;
    };
    batch: {
      id: number;
      code: string | null;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
      learningMode: string;
      onlinePlatform: string;
    };
    teacher: {
      id: number;
      fullName: string;
      email: string;
      avatarUrl: string | null;
    };
  };
  attempt: {
    id: number;
    startedAt: string;
    submittedAt: string | null;
    status: StudentExamAttemptStatus;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
    isPassed: boolean;
  };
  summary: {
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    essayCount: number;
    objectiveScore: number;
    pendingEssayReview: boolean;
    completionMinutes: number;
  };
  questions: StudentExamReviewQuestion[];
};
