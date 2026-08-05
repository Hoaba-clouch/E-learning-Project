import { useTranslation } from "react-i18next";
import type { StudentExam } from "../types/exam.types";
import {
  formatExamDate,
  formatExamTitle,
  getExamStateTone,
} from "../utils/examFormatters";
import Icon from "./Icon";

type StudentExamCardProps = {
  exam: StudentExam;
  onAction: (exam: StudentExam) => void;
};

function StudentExamCard({ exam, onAction }: StudentExamCardProps) {
  const { t, i18n } = useTranslation("student");
  const tone = getExamStateTone(exam.state);
  const latestAttempt = exam.attempts.latest;
  const actionLabel =
    exam.state === "COMPLETED"
      ? t("exam.action.results")
      : exam.state === "IN_PROGRESS"
        ? t("exam.action.continue")
        : exam.state === "LOCKED"
          ? t(exam.enrollment ? "exam.action.waiting" : "exam.action.enrollRequired")
          : t("exam.action.start");
  const isDisabled = exam.state === "LOCKED";

  return (
    <article className={`sp-exam-card sp-exam-card--${tone}`}>
      <div className="sp-exam-card-top">
        <div className="sp-exam-card-icon">
          <Icon name={exam.state === "COMPLETED" ? "task_alt" : "quiz"} />
        </div>

        <span className={`sp-exam-pill sp-exam-pill--${tone}`}>
          {t(`exam.state.${exam.state}`)}
        </span>
      </div>

      <div className="sp-exam-card-copy">
        <h3>{formatExamTitle(exam.title, i18n.resolvedLanguage)}</h3>
        <p>{exam.course.name}</p>
      </div>

      <div className="sp-exam-card-meta">
        <span>
          <Icon name="calendar_month" />
          {formatExamDate(exam.batch.startDate, i18n.resolvedLanguage, t("exam.noData"))}
        </span>
        <span>
          <Icon name="schedule" />
          {t("exam.card.minutes", { count: exam.durationMinutes })}
        </span>
        <span>
          <Icon name="checklist" />
          {t("exam.card.questions", { count: exam.questionCount })}
        </span>
      </div>

      <div className="sp-exam-card-stats">
        <span>{exam.batch.name}</span>
        <span>{exam.lesson?.title ?? t("exam.card.general")}</span>
        <span>
          {t("exam.card.attempts", { count: exam.attempts.count, limit: exam.attemptLimit })}
        </span>
      </div>

      <div className="sp-exam-card-footer">
        <div>
          <strong>{exam.teacher.fullName}</strong>
          <small>
            {latestAttempt?.score !== null && latestAttempt?.score !== undefined
              ? t("exam.card.latestScore", { score: latestAttempt.score, maxScore: exam.maxScore })
              : exam.enrollment
                ? t("exam.card.courseProgress", { progress: exam.enrollment.progressPercent })
                : t("exam.card.notEnrolled")}
          </small>
        </div>

        <button disabled={isDisabled} onClick={() => onAction(exam)} type="button">
          {actionLabel}
          <Icon name={isDisabled ? "lock" : "arrow_forward"} />
        </button>
      </div>
    </article>
  );
}

export default StudentExamCard;
