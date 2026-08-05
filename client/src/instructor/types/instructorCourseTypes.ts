import type { courseBatches, courseManagementStats, instructorCourses, lessonPlanner } from "../data/instructorMockData";

export type CourseManagementStat = (typeof courseManagementStats)[number];
export type InstructorCourse = (typeof instructorCourses)[number];
export type InstructorCourseItem = InstructorCourse & {
  id?: number;
  categoryId?: number;
  description?: string | null;
  statusTone?: string;
  workflowStatus?: string;
};
export type CourseBatch = (typeof courseBatches)[number];
export type LessonPlannerItem = (typeof lessonPlanner)[number];

export type CourseQuiz = {
  id: number;
  batchId: number;
  batchCode: string;
  lessonId: number | null;
  lessonTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  duration: string;
  maxScore: string;
  passScore: string;
  attemptLimit: number;
  questions: number;
  attempts: number;
  createdAt: string;
  questionItems: CourseQuizQuestion[];
  attemptItems: CourseQuizAttempt[];
};

export type CourseQuizQuestion = {
  id: number;
  quizId: number;
  text: string;
  type: string;
  score: string;
  options: Array<{ id: number; text: string; isCorrect: boolean }>;
};

export type CourseQuizAttempt = {
  id: number;
  quizId: number;
  studentId: number;
  studentName: string;
  startedAt: string;
  submittedAt: string | null;
  startedLabel: string;
  submittedLabel: string;
  score: string;
  status: string;
  answers: Array<{
    id: number;
    questionId: number;
    questionText: string;
    questionType: string;
    optionId: number | null;
    optionText: string;
    isCorrect: boolean | null;
    essayAnswer: string;
  }>;
};

export type CourseSession = {
  id: number;
  batchId: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
  meetingUrl: string;
  meetingPassword: string;
  platform: string;
  platformLabel: string;
  status: string;
  statusLabel: string;
  recordingUrl: string;
  note: string;
};

export type AttendanceStudent = {
  studentId: number;
  studentName: string;
  email: string;
  progress: number;
  status: string;
  statusLabel: string;
  durationMinutes: number;
  note: string;
};

export type CourseDetail = {
  id?: number;
  categoryId?: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string;
  level: string;
  status: string;
  statusTone?: string;
  workflowStatus?: string;
  price: string;
  duration: string;
  rating: number;
  overview: Array<{ label: string; value: string; icon: string }>;
  batches: Array<{
    id: number;
    code: string;
    name: string;
    dates: string;
    students: string;
    enrolledStudents?: number;
    mode: string;
    platform: string;
    status: string;
    statusValue?: string;
    startDate?: string;
    endDate?: string;
    enrollmentStartDate?: string;
    enrollmentDeadline?: string;
    minStudents?: number;
    maxStudents?: number;
    tuitionFee?: string;
    learningModeValue?: string;
    onlinePlatform?: string;
    defaultMeetingUrl?: string;
    classroomName?: string;
    classroomAddress?: string;
    note?: string;
    sessions?: CourseSession[];
  }>;
  modules: Array<{
    id: number;
    order: number;
    title: string;
    description: string | null;
    lessons: Array<{
      id: number;
      title: string;
      type: string;
      content?: string | null;
      videoUrl?: string | null;
      durationMinutes?: number;
      duration: string;
      isPreview: boolean;
    }>;
  }>;
  quizzes: CourseQuiz[];
  reviews: Array<{
    id: number;
    student: string;
    rating: number;
    comment: string | null;
    teacherComment: string | null;
    createdAt: string;
  }>;
};

export type InstructorCoursesApiResponse = {
  success: boolean;
  data: {
    teacherId: number;
    profile: {
      name: string;
      role: string;
      avatar: string | null;
      workplace?: string | null;
    };
    summary: CourseManagementStat[];
    categories: Array<{ id: number; key: string; label: string; active: boolean }>;
    instructorCourses: InstructorCourseItem[];
    courseBatches: CourseBatch[];
    lessonPlanner: LessonPlannerItem[];
    generatedAt: string;
  };
};

export type CourseDetailApiResponse = {
  success: boolean;
  data: CourseDetail;
};

export type CourseUpdateApiResponse = {
  success: boolean;
  data: {
    id: number;
    title: string;
    description: string | null;
    thumbnail: string | null;
    category: string;
    categoryId: number;
    level: string;
    status: string;
    statusTone: string;
    workflowStatus?: string;
  };
};

export type CourseFilter = "all" | "published" | "draft" | "pending";
export type CourseDetailTab = "overview" | "schedule" | "curriculum" | "quizzes" | "preview";
export type CourseWorkflowAction = "submit" | "cancel";
export type SessionFormData = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  meetingPassword: string;
  platform: string;
  status: string;
  recordingUrl: string;
  note: string;
};
export type RecurringScheduleFormData = {
  weekdays: string[];
  startTime: string;
  endTime: string;
  titlePrefix: string;
  description: string;
  meetingUrl: string;
  meetingPassword: string;
  platform: string;
  status: string;
  note: string;
};
export type BatchFormData = {
  batchCode: string;
  batchName: string;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentDeadline: string;
  minStudents: string;
  maxStudents: string;
  tuitionFee: string;
  learningMode: string;
  onlinePlatform: string;
  defaultMeetingUrl: string;
  classroomName: string;
  classroomAddress: string;
  timezone: string;
  status: string;
  note: string;
};
export type CourseEditFormData = {
  title: string;
  description: string;
  thumbnailUrl: string;
  price: string;
  categoryId: string;
  level: string;
};
export type LessonImportFormData = {
  moduleId: string;
  lines: string;
  defaultType: string;
  defaultDurationMinutes: string;
  defaultIsPreview: boolean;
  defaultContent: string;
  defaultVideoUrl: string;
};
export type QuizFormData = {
  batchScope: string;
  batchId: string;
  lessonId: string;
  title: string;
  description: string;
  durationMinutes: string;
  maxScore: string;
  passScore: string;
  attemptLimit: string;
};
export type QuizQuestionFormData = {
  text: string;
  type: string;
  score: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: string;
  trueFalseAnswer: string;
};
export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
} | null;
export type InstructorToast = {
  message: string;
  type: "success" | "error";
} | null;

export type SessionAttendanceData = {
  session: {
    id: number;
    batchId: number;
    title: string;
    batchCode: string;
    courseTitle: string;
    startLabel: string;
    endLabel: string;
  };
  summary: {
    total: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
  };
  students: AttendanceStudent[];
};

export type SessionAttendanceApiResponse = {
  success: boolean;
  data: SessionAttendanceData;
};

export type RecurringScheduleApiResponse = {
  success: boolean;
  data: {
    batchId: number;
    courseId: number;
    generatedCount: number;
    skippedCount: number;
    sessions: CourseSession[];
  };
};
