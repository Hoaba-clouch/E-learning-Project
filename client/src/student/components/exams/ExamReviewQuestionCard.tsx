import { useTranslation } from "react-i18next";
import type { StudentExamReviewQuestion } from "../../types/exam.types";
import Icon from "../Icon";

type ExamReviewQuestionCardProps = {
  question: StudentExamReviewQuestion;
  questionIndex: number;
};

function ExamReviewQuestionCard({
  question,
  questionIndex,
}: ExamReviewQuestionCardProps) {
  const { t } = useTranslation("student");
  const reviewStatusClass =
    question.review.status === "CORRECT"
      ? "correct"
      : question.review.status === "INCORRECT"
        ? "incorrect"
        : "pending";

  return (
    <article className={`sp-exam-review-question ${reviewStatusClass}`}>
      <div className="sp-exam-review-question-head">
        <div>
          <span>
            {t("exam.workspace.question", { number: questionIndex + 1 })} •{" "}
            {question.type === "ESSAY"
              ? t("exam.workspace.essay")
              : t("exam.workspace.multipleChoice")}
          </span>
          <h3>{question.text}</h3>
        </div>

        <div className="sp-exam-review-badge">
          <Icon
            name={
              question.review.status === "CORRECT"
                ? "check_circle"
                : question.review.status === "INCORRECT"
                  ? "cancel"
                  : "hourglass_top"
            }
          />
          <strong>
            {question.review.status === "CORRECT"
              ? t("exam.review.correctStatus")
              : question.review.status === "INCORRECT"
                ? t("exam.review.incorrectStatus")
                : t("exam.review.pendingStatus")}
          </strong>
        </div>
      </div>

      {question.type === "SINGLE_CHOICE" ? (
        <div className="sp-exam-review-options">
          {question.options.map((option) => {
            const isSelected = question.answer.optionId === option.id;
            const isCorrect = question.review.correctOptionId === option.id;

            return (
              <div
                key={option.id}
                className={[
                  "sp-exam-review-option",
                  isSelected ? "selected" : "",
                  isCorrect ? "correct" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <strong>{option.text}</strong>
                <small>
                  {isCorrect
                    ? t("exam.review.correctAnswer")
                    : isSelected
                      ? t("exam.review.yourChoice")
                      : t("exam.review.notSelected")}
                </small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sp-exam-review-essay">
          <p>{question.answer.essayAnswer || t("exam.review.emptyEssay")}</p>
          <small>
            {question.review.status === "PENDING"
              ? t("exam.review.essayPending")
              : t("exam.review.earnedScore", {
                  earned: question.review.earnedScore ?? 0,
                  max: question.score,
                })}
          </small>
        </div>
      )}
    </article>
  );
}

export default ExamReviewQuestionCard;
