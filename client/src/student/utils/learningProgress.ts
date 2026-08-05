export type LessonProgress = {
  assignmentDone?: boolean;
  quizPassed?: boolean;
  readingDone?: boolean;
  videoDone?: boolean;
};

export type CourseLearningProgress = Record<number, LessonProgress>;

function getProgressKey(courseId: number) {
  return `learnx.learning.course.${courseId}`;
}

export function getStoredLearningProgress(courseId: number) {
  const rawProgress = localStorage.getItem(getProgressKey(courseId));

  if (!rawProgress) {
    return {};
  }

  try {
    return JSON.parse(rawProgress) as CourseLearningProgress;
  } catch {
    localStorage.removeItem(getProgressKey(courseId));
    return {};
  }
}

export function storeLearningProgress(
  courseId: number,
  progress: CourseLearningProgress,
) {
  localStorage.setItem(getProgressKey(courseId), JSON.stringify(progress));
}

export function isLessonComplete(progress?: LessonProgress) {
  return Boolean(progress?.videoDone && progress.readingDone && progress.quizPassed);
}
