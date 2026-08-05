export type StudentCourseCategory = {
  id: number;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  courseCount: number;
};

export type StudentCourse = {
  id: number;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
    description: string | null;
    status: string;
  };
  teacher: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  stats: {
    averageRating: number;
    reviewCount: number;
    enrollmentCount: number;
    lessonCount: number;
    moduleCount: number;
    totalDurationMinutes: number;
  };
};

export type StudentCourseBatch = {
  id: number;
  code: string | null;
  name: string;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string | null;
  enrollmentDeadline: string | null;
  minStudents: number;
  maxStudents: number;
  tuitionFee: number | null;
  learningMode: "ONLINE" | "OFFLINE" | "HYBRID";
  onlinePlatform: string;
  defaultMeetingUrl: string | null;
  classroomName: string | null;
  classroomAddress: string | null;
  timezone: string;
  status: string;
  note: string | null;
  stats: {
    enrollmentCount: number;
    activeEnrollmentCount: number;
    paymentCount: number;
    paidAmount: number;
  };
  sessions: StudentClassSession[];
};

export type StudentClassSession = {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
  platform: string;
  status: string;
  recordingUrl: string | null;
  note: string | null;
};

export type StudentAssignment = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  submission: StudentAssignmentSubmission | null;
};

export type StudentAssignmentSubmission = {
  id: number;
  fileUrl: string | null;
  originalFileName: string | null;
  note: string | null;
  githubUrl: string | null;
  driveUrl: string | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
};

export type StudentQuiz = {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxScore: number;
  passScore: number;
  attemptLimit: number;
  questions: StudentQuizQuestion[];
};

export type StudentQuizQuestion = {
  id: number;
  text: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY";
  score: number;
  options: StudentQuizOption[];
};

export type StudentQuizOption = {
  id: number;
  text: string;
  isCorrect: boolean;
};

export type StudentLessonResource = {
  id: number;
  name: string;
  type: string;
  url: string;
};

export type StudentCourseLesson = {
  id: number;
  title: string;
  type: string;
  content: string | null;
  videoUrl: string | null;
  durationMinutes: number;
  isPreview: boolean;
  isCompleted: boolean;
  orderNo: number;
  resources: StudentLessonResource[];
  assignments: StudentAssignment[];
  quizzes: StudentQuiz[];
};

export type StudentCourseModule = {
  id: number;
  title: string;
  description: string | null;
  orderNo: number;
  lessons: StudentCourseLesson[];
};

export type StudentCourseReview = {
  id: number;
  rating: number;
  teacherRating: number | null;
  comment: string | null;
  teacherComment: string | null;
  createdAt: string;
  student: {
    id: number;
    fullName: string;
    avatarUrl: string | null;
  };
};

export type StudentOwnCourseReview = {
  id: number;
  courseId: number;
  rating: number;
  teacherRating: number | null;
  comment: string | null;
  teacherComment: string | null;
  status: "VISIBLE" | "HIDDEN" | "REPORTED";
  createdAt: string;
  updatedAt: string;
};

export type StudentCourseReviewEligibility = {
  eligible: boolean;
  reason: string | null;
  progressPercent: number;
  minimumProgress: number;
  hasEnrollment: boolean;
  hasSuccessfulPayment: boolean;
  existingReview: StudentOwnCourseReview | null;
};

export type PublicInstructorDetail = {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  specialization: string | null;
  experienceYears: number;
  qualification: string | null;
  workplace: string | null;
  stats: {
    courseCount: number;
    studentCount: number;
    averageRating: number;
    reviewCount: number;
  };
  courses: StudentCourse[];
  reviews: Array<{
    id: number;
    teacherRating: number;
    comment: string | null;
    createdAt: string;
    course: { id: number; name: string };
    student: {
      id: number;
      fullName: string;
      avatarUrl: string | null;
    };
  }>;
};

export type StudentCourseDetail = StudentCourse & {
  batches: StudentCourseBatch[];
  modules: StudentCourseModule[];
  reviews: StudentCourseReview[];
};

export type StudentEnrolledCourse = {
  enrollment: {
    id: number;
    enrolledAt: string;
    status: "PENDING" | "ACTIVE" | "COMPLETED";
    progressPercent: number;
  };
  batch: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  course: StudentCourse;
};
