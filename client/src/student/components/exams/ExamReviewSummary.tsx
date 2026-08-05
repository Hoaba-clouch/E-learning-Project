import { useTranslation } from "react-i18next";
import type { StudentExamReview } from "../../types/exam.types";
import { formatExamDateTime, formatScore } from "../../utils/examFormatters";

type ExamReviewSummaryProps = {
  review: StudentExamReview;
};

function ExamReviewSummary({ review }: ExamReviewSummaryProps) {
  const { t, i18n } = useTranslation("student");
  const score = review.attempt.score ?? review.summary.objectiveScore;

  return (
    <section className="sp-exam-review-summary">
      <article className="sp-exam-review-summary-card hero">
        <span>{t("exam.review.attemptStatus")}</span>
        <strong>
          {review.summary.pendingEssayReview
            ? t("exam.review.pendingEssay")
            : review.attempt.isPassed
              ? t("exam.review.passed")
              : t("exam.review.failed")}
        </strong>
        <p>
          {t("exam.review.submittedInfo", {
            date: formatExamDateTime(review.attempt.submittedAt, i18n.resolvedLanguage, t("exam.noData")),
            minutes: review.summary.completionMinutes,
          })}
        </p>
      </article>

      <article className="sp-exam-review-summary-card">
        <span>{t("exam.review.currentScore")}</span>
        <strong>{formatScore(score, review.exam.maxScore)}</strong>
        <p>{t("exam.review.passScore", { score: review.exam.passScore })}</p>
      </article>

      <article className="sp-exam-review-summary-card">
        <span>{t("exam.review.correct")}</span>
        <strong>{review.summary.correctCount}</strong>
        <p>{t("exam.review.incorrectCount", { count: review.summary.incorrectCount })}</p>
      </article>

      <article className="sp-exam-review-summary-card">
        <span>{t("exam.review.essayQuestions")}</span>
        <strong>{review.summary.essayCount}</strong>
        <p>
          {review.summary.pendingEssayReview
            ? t("exam.review.waitingFeedback")
            : t("exam.review.recorded")}
        </p>
      </article>
    </section>
  );
}

export default ExamReviewSummary;
