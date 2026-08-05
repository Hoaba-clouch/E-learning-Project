import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import StatusModal, {
  type StatusModalTone,
} from "../../shared/components/feedback/StatusModal";
import AssignmentSubmissionPanel from "../components/AssignmentSubmissionPanel";
import Icon from "../components/Icon";
import {
  completeLesson,
  getCourseDetail,
} from "../services/studentCoursesApi";
import type {
  StudentAssignmentSubmission,
  StudentCourseDetail,
  StudentCourseLesson,
  StudentQuiz,
  StudentQuizQuestion,
} from "../types/course.types";
import {
  getStoredLearningProgress,
  isLessonComplete,
  storeLearningProgress,
  type CourseLearningProgress,
  type LessonProgress,
} from "../utils/learningProgress";

type LearningPageProps = {
  courseId: number;
  onBack: () => void;
};

type LearningItem = "video" | "reading" | "quiz" | "assignment";
type SelectedAnswers = Record<number, number[]>;

type FlatLesson = {
  lesson: StudentCourseLesson;
  lessonIndex: number;
  moduleIndex: number;
  moduleTitle: string;
};

type FeedbackModalState = {
  isOpen: boolean;
  message: string;
  title: string;
  tone: StatusModalTone;
};

const fallbackPoster =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";

function flattenLessons(course: StudentCourseDetail) {
  return course.modules.flatMap((module, moduleIndex) =>
    module.lessons.map((lesson, lessonIndex) => ({
      lesson,
      lessonIndex,
      moduleIndex,
      moduleTitle: module.title,
    })),
  );
}

function areSameSet(first: number[], second: number[]) {
  return (
    first.length === second.length &&
    first.every((value) => second.includes(value))
  );
}

function isQuestionCorrect(question: StudentQuizQuestion, selected: number[]) {
  const correctIds = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id);

  return correctIds.length > 0 && areSameSet(selected, correctIds);
}

function isQuizPassed(quiz: StudentQuiz, selectedAnswers: SelectedAnswers) {
  return quiz.questions.every((question) =>
    isQuestionCorrect(question, selectedAnswers[question.id] ?? []),
  );
}

function formatDuration(minutes: number, t: TFunction<"student">) {
  if (!minutes) {
    return t("learning.durationMinutes", { count: 0 });
  }

  if (minutes < 60) {
    return t("learning.durationMinutes", { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? t("learning.durationHoursMinutes", {
        hours,
        minutes: remainingMinutes,
      })
    : t("learning.durationHours", { count: hours });
}

function getItemDoneState(item: LearningItem, progress?: LessonProgress) {
  if (item === "video") {
    return Boolean(progress?.videoDone);
  }

  if (item === "reading") {
    return Boolean(progress?.readingDone);
  }

  if (item === "quiz") {
    return Boolean(progress?.quizPassed);
  }

  return Boolean(progress?.assignmentDone);
}

function getItemStatus(
  item: LearningItem,
  lessonUnlocked: boolean,
  progress?: LessonProgress,
) {
  if (!lessonUnlocked) {
    return "locked";
  }

  if (getItemDoneState(item, progress)) {
    return "done";
  }

  if (item === "reading" && !progress?.videoDone) {
    return "locked";
  }

  if (item === "quiz" && (!progress?.videoDone || !progress?.readingDone)) {
    return "locked";
  }

  return "open";
}

function getYoutubeEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        const videoId = parsedUrl.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        return url;
      }

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        const videoId = parsedUrl.pathname.split("/")[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isPlayableVideoFile(url: string) {
  return /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(url);
}

function LearningPage({ courseId, onBack }: LearningPageProps) {
  const { t } = useTranslation("student");
  const learningItems: Array<{
    key: LearningItem;
    label: string;
    icon: string;
  }> = [
    { key: "video", label: t("learning.items.video"), icon: "play_circle" },
    { key: "reading", label: t("learning.items.reading"), icon: "article" },
    { key: "quiz", label: t("learning.items.quiz"), icon: "quiz" },
    {
      key: "assignment",
      label: t("learning.items.assignment"),
      icon: "assignment",
    },
  ];
  const [course, setCourse] = useState<StudentCourseDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<LearningItem>("video");
  const [progress, setProgress] = useState<CourseLearningProgress>(() =>
    getStoredLearningProgress(courseId),
  );
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    isOpen: false,
    message: "",
    title: "",
    tone: "success",
  });

  useEffect(() => {
    let isMounted = true;

    getCourseDetail(courseId)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const courseLessons = flattenLessons(data);

        const storedProgress = getStoredLearningProgress(courseId);
        const databaseProgress = Object.fromEntries(
          courseLessons
            .filter((item) => item.lesson.isCompleted)
            .map((item) => [
              item.lesson.id,
              {
                assignmentDone:
                  storedProgress[item.lesson.id]?.assignmentDone,
                quizPassed: true,
                readingDone: true,
                videoDone: true,
              },
            ]),
        );

        setProgress({
          ...storedProgress,
          ...databaseProgress,
        });

        const unsyncedLessonIds = courseLessons
          .filter(
            (item) =>
              !item.lesson.isCompleted &&
              isLessonComplete(storedProgress[item.lesson.id]),
          )
          .map((item) => item.lesson.id);

        void Promise.all(
          unsyncedLessonIds.map((lessonId) => completeLesson(lessonId)),
        ).catch((syncError) => {
          if (isMounted) {
            setError(
              syncError instanceof Error
                ? syncError.message
                : t("learning.loadError"),
            );
          }
        });

        setCourse(data);
        setActiveLessonId(courseLessons[0]?.lesson.id ?? null);
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t("learning.loadError"),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, t]);

  useEffect(() => {
    storeLearningProgress(courseId, progress);
  }, [courseId, progress]);

  const lessons = useMemo(() => (course ? flattenLessons(course) : []), [course]);
  const activeLessonIndex = lessons.findIndex(
    (item) => item.lesson.id === activeLessonId,
  );
  const activeLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex] : null;
  const currentProgress = activeLesson
    ? progress[activeLesson.lesson.id] ?? {}
    : {};
  const activeLessonQuizzes = activeLesson?.lesson.quizzes ?? [];
  const activeQuiz =
    activeLessonQuizzes.find((quiz) => quiz.questions.length > 0) ??
    activeLessonQuizzes[0] ??
    null;
  const activeQuizQuestion =
    activeQuiz?.questions[Math.min(quizQuestionIndex, activeQuiz.questions.length - 1)] ??
    null;
  const completedLessonCount = lessons.filter((item) =>
    isLessonComplete(progress[item.lesson.id]),
  ).length;

  function isUnlocked(lessonIndex: number) {
    if (lessonIndex <= 0) {
      return true;
    }

    return lessons
      .slice(0, lessonIndex)
      .every((item) => isLessonComplete(progress[item.lesson.id]));
  }

  function canOpenItem(
    item: LearningItem,
    lessonIndex: number,
    lessonProgress?: LessonProgress,
  ) {
    return getItemStatus(item, isUnlocked(lessonIndex), lessonProgress) !== "locked";
  }

  function updateLessonProgress(
    lessonId: number,
    patch: CourseLearningProgress[number],
  ) {
    const currentLessonProgress = progress[lessonId] ?? {};
    const nextLessonProgress = {
      ...currentLessonProgress,
      ...patch,
    };

    setProgress((current) => ({
      ...current,
      [lessonId]: nextLessonProgress,
    }));

    if (
      !isLessonComplete(currentLessonProgress) &&
      isLessonComplete(nextLessonProgress)
    ) {
      void completeLesson(lessonId).catch((syncError) => {
        setError(
          syncError instanceof Error
            ? syncError.message
            : t("learning.loadError"),
        );
      });
    }
  }

  function updateAssignmentSubmission(
    lessonId: number,
    assignmentId: number,
    submission: StudentAssignmentSubmission,
  ) {
    setCourse((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        modules: current.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) =>
            lesson.id !== lessonId
              ? lesson
              : {
                  ...lesson,
                  assignments: lesson.assignments.map((assignment) =>
                    assignment.id !== assignmentId
                      ? assignment
                      : {
                          ...assignment,
                          submission,
                        },
                  ),
                },
          ),
        })),
      };
    });
  }

  function resetQuizState() {
    setSelectedAnswers({});
    setQuizQuestionIndex(0);
  }

  function openFeedbackModal(
    tone: StatusModalTone,
    title: string,
    message: string,
  ) {
    setFeedbackModal({
      isOpen: true,
      message,
      title,
      tone,
    });
  }

  function openLearningItem(lesson: FlatLesson, item: LearningItem) {
    const lessonProgress = progress[lesson.lesson.id] ?? {};

    if (!canOpenItem(item, lessons.indexOf(lesson), lessonProgress)) {
      return;
    }

    setActiveLessonId(lesson.lesson.id);
    setActiveItem(item);
    resetQuizState();
  }

  function handleSelectAnswer(question: StudentQuizQuestion, optionId: number) {
    setSelectedAnswers((current) => {
      const selected = current[question.id] ?? [];

      if (question.type === "MULTIPLE_CHOICE") {
        return {
          ...current,
          [question.id]: selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId],
        };
      }

      return {
        ...current,
        [question.id]: [optionId],
      };
    });
  }

  function handleSubmitQuiz() {
    if (!activeLesson) {
      return;
    }

    if (!activeQuiz || !activeQuiz.questions.length) {
      updateLessonProgress(activeLesson.lesson.id, { quizPassed: true });
      openFeedbackModal(
        "warning",
        t("learning.quizUnavailableTitle"),
        t("learning.quizUnavailableMessage"),
      );
      return;
    }

    const firstUnansweredQuestionIndex = activeQuiz.questions.findIndex(
      (question) => (selectedAnswers[question.id] ?? []).length === 0,
    );

    if (firstUnansweredQuestionIndex >= 0) {
      setQuizQuestionIndex(firstUnansweredQuestionIndex);
      openFeedbackModal(
        "warning",
        t("learning.quizIncompleteTitle"),
        t("learning.quizIncompleteMessage", {
          number: firstUnansweredQuestionIndex + 1,
        }),
      );
      return;
    }

    if (isQuizPassed(activeQuiz, selectedAnswers)) {
      updateLessonProgress(activeLesson.lesson.id, { quizPassed: true });
      openFeedbackModal(
        "success",
        t("learning.quizPassedTitle"),
        t("learning.quizPassedMessage"),
      );
      return;
    }

    resetQuizState();
    openFeedbackModal(
      "error",
      t("learning.quizFailedTitle"),
      t("learning.quizFailedMessage"),
    );
  }

  function markCurrentItemDone() {
    if (!activeLesson) {
      return;
    }

    if (activeItem === "video") {
      updateLessonProgress(activeLesson.lesson.id, { videoDone: true });
      setActiveItem("reading");
    }

    if (activeItem === "reading") {
      updateLessonProgress(activeLesson.lesson.id, { readingDone: true });
      setActiveItem("quiz");
    }

    if (activeItem === "assignment") {
      updateLessonProgress(activeLesson.lesson.id, { assignmentDone: true });
    }
  }

  function goToNextRequiredStep() {
    if (!activeLesson) {
      return;
    }

    if (activeItem === "video" && currentProgress.videoDone) {
      setActiveItem("reading");
      return;
    }

    if (activeItem === "reading" && currentProgress.readingDone) {
      setActiveItem("quiz");
      return;
    }

    if (activeItem === "quiz" && currentProgress.quizPassed) {
      const nextLesson = lessons[activeLessonIndex + 1];

      if (nextLesson && isUnlocked(activeLessonIndex + 1)) {
        setActiveLessonId(nextLesson.lesson.id);
        setActiveItem("video");
        resetQuizState();
        return;
      }

      setActiveItem("assignment");
    }

    if (activeItem === "assignment") {
      const nextLesson = lessons[activeLessonIndex + 1];

      if (nextLesson && isUnlocked(activeLessonIndex + 1)) {
        setActiveLessonId(nextLesson.lesson.id);
        setActiveItem("video");
        resetQuizState();
      }
    }
  }

  function goToPreviousItem() {
    if (!activeLesson) {
      return;
    }

    if (activeItem === "reading") {
      setActiveItem("video");
      return;
    }

    if (activeItem === "quiz") {
      setActiveItem("reading");
      return;
    }

    if (activeItem === "assignment") {
      setActiveItem("quiz");
    }
  }

  function renderVideoStep() {
    if (!activeLesson) {
      return null;
    }

    const videoUrl = activeLesson.lesson.videoUrl;
    const youtubeEmbedUrl = videoUrl ? getYoutubeEmbedUrl(videoUrl) : null;
    const canUseVideoTag = videoUrl ? isPlayableVideoFile(videoUrl) : false;

    return (
      <section className="sp-learning-content-card">
        <div className="sp-learning-video">
          {youtubeEmbedUrl ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              src={youtubeEmbedUrl}
              title={activeLesson.lesson.title}
            />
          ) : videoUrl && canUseVideoTag ? (
            <video
              controls
              onEnded={() =>
                updateLessonProgress(activeLesson.lesson.id, { videoDone: true })
              }
              poster={fallbackPoster}
              src={videoUrl}
            />
          ) : videoUrl ? (
            <div className="sp-learning-video-placeholder">
              <img src={fallbackPoster} alt="" />
              <span className="material-symbols-outlined">play_arrow</span>
              <p>
                {t("learning.videoUnsupported")}
              </p>
            </div>
          ) : (
            <div className="sp-learning-video-placeholder">
              <img src={fallbackPoster} alt="" />
              <span className="material-symbols-outlined">play_arrow</span>
              <p>{t("learning.videoMissing")}</p>
            </div>
          )}
        </div>

        <div className="sp-learning-reader">
          <h2>{t("learning.videoTitle")}</h2>
          <p>{t("learning.videoInstruction")}</p>
          {videoUrl && !youtubeEmbedUrl && !canUseVideoTag ? (
            <a href={videoUrl} rel="noreferrer" target="_blank">
              {t("learning.openVideo")}
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  function renderReadingStep() {
    if (!activeLesson) {
      return null;
    }

    return (
      <section className="sp-learning-content-card sp-learning-reader">
        <span className="sp-learning-eyebrow">{t("learning.readingTitle")}</span>
        <h2>{activeLesson.lesson.title}</h2>
        <p>
          {activeLesson.lesson.content ||
            t("learning.readingMissing")}
        </p>

        {activeLesson.lesson.resources.length ? (
          <div className="sp-learning-resources">
            <h3>{t("learning.resources")}</h3>
            {activeLesson.lesson.resources.map((resource) => (
              <a href={resource.url} key={resource.id} rel="noreferrer" target="_blank">
                <Icon name="download" />
                <span>{resource.name}</span>
                <small>{resource.type}</small>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  function renderQuizStep() {
    if (!activeLesson) {
      return null;
    }

    if (!activeQuiz || !activeQuiz.questions.length || !activeQuizQuestion) {
      return (
        <section className="sp-learning-content-card sp-learning-reader">
          <span className="sp-learning-eyebrow">
            {t("learning.items.quiz")}
          </span>
          <h2>{t("learning.quizMissingTitle")}</h2>
          <p>{t("learning.quizMissingDescription")}</p>
        </section>
      );
    }

    return (
      <section className="sp-learning-content-card">
        <div className="sp-learning-component-header">
          <div>
            <span className="sp-learning-eyebrow">
              {t("learning.items.quiz")}
            </span>
            <h2>{activeQuiz.title}</h2>
            {activeQuiz.description ? <p>{activeQuiz.description}</p> : null}
          </div>
          <div className="sp-learning-score-box">
            <strong>{activeQuiz.questions.length}</strong>
            <span>
              {t("learning.questionCount", {
                count: activeQuiz.questions.length,
              })}
            </span>
          </div>
        </div>

        <div className="sp-learning-quiz-layout">
          <aside
            className="sp-quiz-nav-grid"
            aria-label={t("learning.questionNavigation")}
          >
            {activeQuiz.questions.map((question, index) => {
              const selected = selectedAnswers[question.id]?.length;

              return (
                <button
                  className={[
                    index === quizQuestionIndex ? "current" : "",
                    selected ? "answered" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={question.id}
                  onClick={() => setQuizQuestionIndex(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              );
            })}
          </aside>

          <article className="sp-quiz-focus">
            <span>
              {t("learning.questionProgress", {
                current: quizQuestionIndex + 1,
                total: activeQuiz.questions.length,
              })}
            </span>
            <h3>{activeQuizQuestion.text}</h3>
            <div className="sp-quiz-option-list">
              {activeQuizQuestion.options.map((option) => {
                const selected =
                  selectedAnswers[activeQuizQuestion.id]?.includes(option.id) ?? false;

                return (
                  <label
                    className={selected ? "selected" : ""}
                    key={option.id}
                  >
                    <input
                      checked={selected}
                      onChange={() => handleSelectAnswer(activeQuizQuestion, option.id)}
                      type={
                        activeQuizQuestion.type === "MULTIPLE_CHOICE"
                          ? "checkbox"
                          : "radio"
                      }
                    />
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>

            <div className="sp-quiz-inline-actions">
              <button
                disabled={quizQuestionIndex === 0}
                onClick={() => setQuizQuestionIndex((index) => Math.max(index - 1, 0))}
                type="button"
              >
                <Icon name="chevron_left" /> {t("learning.previousQuestion")}
              </button>
              <button
                disabled={quizQuestionIndex === activeQuiz.questions.length - 1}
                onClick={() =>
                  setQuizQuestionIndex((index) =>
                    Math.min(index + 1, activeQuiz.questions.length - 1),
                  )
                }
                type="button"
              >
                {t("learning.nextQuestion")} <Icon name="chevron_right" />
              </button>
            </div>
          </article>
        </div>

      </section>
    );
  }

  function renderAssignmentStep() {
    if (!activeLesson) {
      return null;
    }

    return (
      <section className="sp-learning-content-card">
        <div className="sp-learning-component-header">
          <div>
            <span className="sp-learning-eyebrow">
              {t("learning.items.assignment")}
            </span>
            <h2>{t("learning.assignmentTitle")}</h2>
            <p>{t("learning.assignmentDescription")}</p>
          </div>
          <span className="sp-learning-optional">{t("learning.optional")}</span>
        </div>

        <div className="sp-assignment-list">
          {activeLesson.lesson.assignments.length ? (
            activeLesson.lesson.assignments.map((assignment) => (
              <AssignmentSubmissionPanel
                assignment={assignment}
                key={assignment.id}
                onFeedback={openFeedbackModal}
                onSubmitted={(submission) => {
                  updateAssignmentSubmission(
                    activeLesson.lesson.id,
                    assignment.id,
                    submission,
                  );
                  updateLessonProgress(activeLesson.lesson.id, {
                    assignmentDone: true,
                  });
                }}
              />
            ))
          ) : (
            <article className="sp-assignment-card">
              <Icon name="assignment_late" />
              <div>
                <h3>{t("learning.noAssignment")}</h3>
                <p>{t("learning.noAssignmentDescription")}</p>
              </div>
            </article>
          )}
        </div>
      </section>
    );
  }

  if (isLoading) {
    return <main className="sp-learning-page">{t("learning.loading")}</main>;
  }

  if (error || !course || !activeLesson) {
    return (
      <main className="sp-learning-page">
        <button className="sp-back-button" onClick={onBack} type="button">
          <Icon name="chevron_left" /> {t("learning.back")}
        </button>
        <p className="sp-state-line error">{error || t("learning.notFound")}</p>
      </main>
    );
  }

  const activeItemMeta = learningItems.find((item) => item.key === activeItem);
  const isCurrentItemDone = getItemDoneState(activeItem, currentProgress);
  const nextLesson = lessons[activeLessonIndex + 1];
  const canMoveNext =
    (activeItem === "video" && currentProgress.videoDone) ||
    (activeItem === "reading" && currentProgress.readingDone) ||
    (activeItem === "quiz" && currentProgress.quizPassed) ||
    activeItem === "assignment";

  return (
    <main className="sp-learning-page">
      <StatusModal
        isOpen={feedbackModal.isOpen}
        message={feedbackModal.message}
        onClose={() =>
          setFeedbackModal((current) => ({
            ...current,
            isOpen: false,
          }))
        }
        title={feedbackModal.title}
        tone={feedbackModal.tone}
      />

      <section className="sp-learning-main">
        <button className="sp-back-button" onClick={onBack} type="button">
          <Icon name="chevron_left" /> {t("learning.backToCourses")}
        </button>

        <header className="sp-learning-head">
          <div>
            <span>{activeLesson.moduleTitle}</span>
            <h1>{activeLesson.lesson.title}</h1>
            <p>
              {t("learning.chapterLesson", {
                chapter: activeLesson.moduleIndex + 1,
                lesson: activeLesson.lessonIndex + 1,
                duration: formatDuration(
                  activeLesson.lesson.durationMinutes,
                  t,
                ),
              })}
            </p>
          </div>
          <div className="sp-learning-status-card">
            <strong>
              {completedLessonCount}/{lessons.length}
            </strong>
            <span>
              {t("learning.completedLessons")}
            </span>
          </div>
        </header>

        {activeItem === "video" ? renderVideoStep() : null}
        {activeItem === "reading" ? renderReadingStep() : null}
        {activeItem === "quiz" ? renderQuizStep() : null}
        {activeItem === "assignment" ? renderAssignmentStep() : null}

        <footer className="sp-learning-action-bar">
          <button
            disabled={activeItem === "video"}
            onClick={goToPreviousItem}
            type="button"
          >
            <Icon name="chevron_left" /> {t("learning.previous")}
          </button>

          <div>
            <strong>{activeItemMeta?.label}</strong>
            <span>
              {activeItem === "assignment"
                ? t("learning.assignmentHint")
                : t("learning.requiredHint")}
            </span>
          </div>

          {activeItem === "quiz" ? (
            <button onClick={handleSubmitQuiz} type="button">
              <Icon name="task_alt" /> {t("learning.submitQuiz")}
            </button>
          ) : (
            <button onClick={markCurrentItemDone} type="button">
              <Icon name={isCurrentItemDone ? "check_circle" : "task_alt"} />
              {isCurrentItemDone
                ? t("learning.completed")
                : t("learning.markDone")}
            </button>
          )}

          <button
            disabled={!canMoveNext}
            onClick={goToNextRequiredStep}
            type="button"
          >
            {activeItem === "quiz" && currentProgress.quizPassed && nextLesson
              ? t("learning.nextLesson")
              : t("learning.continue")}
            <Icon name="chevron_right" />
          </button>
        </footer>
      </section>

      <aside className="sp-learning-sidebar">
        <div className="sp-learning-sidebar-head">
          <h2>{course.name}</h2>
          <p>
            {t("learning.sidebarCompleted", {
              completed: completedLessonCount,
              total: lessons.length,
            })}
          </p>
        </div>

        {course.modules.map((module, moduleIndex) => (
          <section className="sp-learning-chapter" key={module.id}>
            <h3>
              <span>{t("learning.chapter", { number: moduleIndex + 1 })}</span>
              {module.title}
            </h3>
            {module.lessons.map((lesson) => {
              const flatLesson = lessons.find((item) => item.lesson.id === lesson.id);
              const lessonIndex = flatLesson ? lessons.indexOf(flatLesson) : -1;
              const lessonUnlocked = isUnlocked(lessonIndex);
              const lessonProgress = progress[lesson.id] ?? {};
              const lessonComplete = isLessonComplete(lessonProgress);
              const currentLesson = activeLesson.lesson.id === lesson.id;

              return (
                <article
                  className={[
                    "sp-learning-lesson-node",
                    currentLesson ? "current" : "",
                    lessonComplete ? "done" : "",
                    !lessonUnlocked ? "locked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={lesson.id}
                >
                  <button
                    disabled={!lessonUnlocked}
                    onClick={() => flatLesson && openLearningItem(flatLesson, "video")}
                    type="button"
                  >
                    <Icon
                      name={
                        lessonComplete
                          ? "check_circle"
                          : lessonUnlocked
                            ? "play_circle"
                            : "lock"
                      }
                    />
                    <span>{lesson.title}</span>
                    <small>{formatDuration(lesson.durationMinutes, t)}</small>
                  </button>

                  <div className="sp-learning-component-grid">
                    {learningItems.map((item) => {
                      const status = getItemStatus(
                        item.key,
                        lessonUnlocked,
                        lessonProgress,
                      );
                      const itemCurrent =
                        currentLesson && activeItem === item.key;

                      return (
                        <button
                          className={[
                            itemCurrent ? "current" : "",
                            status === "done" ? "done" : "",
                            status === "locked" ? "locked" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={status === "locked" || !flatLesson}
                          key={item.key}
                          onClick={() => flatLesson && openLearningItem(flatLesson, item.key)}
                          type="button"
                        >
                          <Icon
                            name={
                              status === "done"
                                ? "check_circle"
                                : status === "locked"
                                  ? "lock"
                                : item.icon
                            }
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </aside>
    </main>
  );
}

export default LearningPage;
