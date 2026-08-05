import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import StatusModal, {
  type StatusModalTone,
} from "../../shared/components/feedback/StatusModal";
import ExamWorkspaceQuestionCard from "../components/exams/ExamWorkspaceQuestionCard";
import ExamWorkspaceSidebar from "../components/exams/ExamWorkspaceSidebar";
import {
  getStudentExamWorkspace,
  saveStudentExamDraft,
  startStudentExam,
  submitStudentExam,
} from "../services/studentExamsApi";
import type {
  StudentExamQuestion,
  StudentExamSubmissionResult,
  StudentExamWorkspace,
} from "../types/exam.types";
import { formatExamDateTime, formatRemainingTime } from "../utils/examFormatters";
import {
  buildDraftAnswers,
  isQuestionAnswered,
  updateQuestionEssay,
  updateQuestionOption,
} from "../utils/examWorkspace";
import "./ExamTakingPage.css";

type ExamTakingPageProps = {
  examId: number;
  attemptId?: number | null;
  onBack: () => void;
  onSubmitted: (examId: number, attemptId: number) => void;
};

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  tone: StatusModalTone;
};

const initialModalState: ModalState = {
  isOpen: false,
  title: "",
  message: "",
  tone: "success",
};

function ExamTakingPage({
  examId,
  attemptId,
  onBack,
  onSubmitted,
}: ExamTakingPageProps) {
  const { t, i18n } = useTranslation("student");
  const [workspace, setWorkspace] = useState<StudentExamWorkspace | null>(null);
  const [questions, setQuestions] = useState<StudentExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(initialModalState);
  const skipDraftSaveRef = useRef(true);
  const lastSavedPayloadRef = useRef("");
  const questionsRef = useRef<StudentExamQuestion[]>([]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      try {
        setIsLoading(true);
        setError("");
        const data = attemptId
          ? await getStudentExamWorkspace(examId, attemptId)
          : await startStudentExam(examId);

        if (!isMounted) {
          return;
        }

        setWorkspace(data);
        setQuestions(data.questions);
        setRemainingSeconds(data.progress.remainingSeconds);
        setCurrentIndex(0);
        skipDraftSaveRef.current = true;
        lastSavedPayloadRef.current = JSON.stringify(buildDraftAnswers(data.questions));
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("exam.taking.loadError"),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [attemptId, examId, t]);

  const currentQuestion = questions[currentIndex] ?? null;
  const answeredCount = useMemo(
    () => questions.filter((question) => isQuestionAnswered(question)).length,
    [questions],
  );

  async function handleSubmit(isAutoSubmit = false) {
    if (!workspace || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result: StudentExamSubmissionResult = await submitStudentExam(
        workspace.exam.id,
        workspace.attempt.id,
        buildDraftAnswers(questionsRef.current),
      );

      setModal({
        isOpen: true,
        title: isAutoSubmit ? t("exam.taking.autoSubmitted") : t("exam.taking.submitted"),
        message: result.pendingEssayReview
          ? t("exam.taking.pendingEssay")
          : t("exam.taking.graded"),
        tone: "success",
      });

      window.setTimeout(() => {
        onSubmitted(workspace.exam.id, result.attemptId);
      }, 500);
    } catch (submitError) {
      setModal({
        isOpen: true,
        title: t("exam.taking.submitErrorTitle"),
        message:
          submitError instanceof Error
            ? submitError.message
            : t("exam.taking.submitError"),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!workspace) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          void handleSubmit(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [workspace, isSubmitting]);

  useEffect(() => {
    if (!workspace) {
      return undefined;
    }

    const payload = JSON.stringify(buildDraftAnswers(questions));

    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      lastSavedPayloadRef.current = payload;
      return undefined;
    }

    if (payload === lastSavedPayloadRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsSavingDraft(true);

      saveStudentExamDraft(workspace.exam.id, workspace.attempt.id, JSON.parse(payload))
        .then((data) => {
          setWorkspace(data);
          setQuestions(data.questions);
          setRemainingSeconds((current) =>
            Math.min(current, data.progress.remainingSeconds),
          );
          lastSavedPayloadRef.current = payload;
        })
        .catch(() => {
          setModal({
            isOpen: true,
            title: t("exam.taking.draftErrorTitle"),
            message: t("exam.taking.draftError"),
            tone: "warning",
          });
        })
        .finally(() => {
          setIsSavingDraft(false);
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [questions, workspace, t]);

  if (isLoading) {
    return (
      <main className="sp-exam-workspace-page">
        <p className="sp-state-line">{t("exam.taking.loading")}</p>
      </main>
    );
  }

  if (error || !workspace || !currentQuestion) {
    return (
      <main className="sp-exam-workspace-page">
        <div className="sp-empty-cart">
          <h2>{t("exam.taking.openError")}</h2>
          <p>{error || t("exam.taking.notReady")}</p>
          <button onClick={onBack} type="button">
            {t("exam.taking.back")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="sp-exam-workspace-page">
        <section className="sp-exam-workspace-top">
          <div>
            <p className="sp-eyebrow">{t("exam.taking.eyebrow")}</p>
            <h1>{workspace.exam.title}</h1>
            <p>
              {workspace.exam.course.name} • {workspace.exam.batch.name}
            </p>
          </div>

          <div className="sp-exam-workspace-head-stats">
            <article>
              <span>{t("exam.taking.progress")}</span>
              <strong>
                {answeredCount}/{questions.length}
              </strong>
            </article>
            <article>
              <span>{t("exam.taking.remainingTime")}</span>
              <strong>{formatRemainingTime(remainingSeconds)}</strong>
            </article>
            <article>
              <span>{t("exam.taking.startedAt")}</span>
              <strong>{formatExamDateTime(workspace.attempt.startedAt, i18n.resolvedLanguage, t("exam.noData"))}</strong>
            </article>
          </div>
        </section>

        <section className="sp-exam-workspace-layout">
          <div className="sp-exam-workspace-main">
            <div className="sp-exam-workspace-progress">
              <div>
                <strong>{t("exam.taking.complete", { percent: workspace.progress.completionPercent })}</strong>
                <small>
                  {t("exam.taking.examInfo", { questions: workspace.exam.questionCount, score: workspace.exam.maxScore })}
                </small>
              </div>
              <span>{isSavingDraft ? t("exam.taking.saving") : t("exam.taking.saved")}</span>
            </div>

            <div className="sp-exam-workspace-progress-bar">
              <span style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }} />
            </div>

            <ExamWorkspaceQuestionCard
              onEssayChange={(questionId, essayAnswer) =>
                setQuestions((current) =>
                  updateQuestionEssay(current, questionId, essayAnswer),
                )
              }
              onSelectOption={(questionId, optionId) =>
                setQuestions((current) =>
                  updateQuestionOption(current, questionId, optionId),
                )
              }
              question={currentQuestion}
              questionIndex={currentIndex}
            />

            <div className="sp-exam-workspace-actions">
              <button onClick={onBack} type="button">
                {t("exam.taking.backToList")}
              </button>

              <div>
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
                  type="button"
                >
                  {t("exam.taking.previous")}
                </button>
                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() =>
                    setCurrentIndex((value) =>
                      Math.min(value + 1, questions.length - 1),
                    )
                  }
                  type="button"
                >
                  {t("exam.taking.next")}
                </button>
                <button
                  className="primary"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit(false)}
                  type="button"
                >
                  {isSubmitting ? t("exam.taking.submitting") : t("exam.taking.submit")}
                </button>
              </div>
            </div>
          </div>

          <ExamWorkspaceSidebar
            answeredCount={answeredCount}
            currentIndex={currentIndex}
            onSelectQuestion={setCurrentIndex}
            questions={questions}
            remainingSeconds={remainingSeconds}
          />
        </section>
      </main>

      <StatusModal
        isOpen={modal.isOpen}
        message={modal.message}
        onClose={() => setModal(initialModalState)}
        title={modal.title}
        tone={modal.tone}
      />
    </>
  );
}

export default ExamTakingPage;
