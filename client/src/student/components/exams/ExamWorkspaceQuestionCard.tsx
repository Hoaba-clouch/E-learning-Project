import { useTranslation } from "react-i18next";
import type { StudentExamQuestion } from "../../types/exam.types";
import Icon from "../Icon";

type ExamWorkspaceQuestionCardProps = {
  question: StudentExamQuestion;
  questionIndex: number;
  onSelectOption: (questionId: number, optionId: number) => void;
  onEssayChange: (questionId: number, essayAnswer: string) => void;
};

function ExamWorkspaceQuestionCard({
  question,
  questionIndex,
  onSelectOption,
  onEssayChange,
}: ExamWorkspaceQuestionCardProps) {
  const { t } = useTranslation("student");
  return (
    <section className="sp-exam-workspace-card">
      <div className="sp-exam-workspace-card-head">
        <div>
          <span className="sp-exam-question-tag">
            {t("exam.workspace.question", { number: questionIndex + 1 })} •{" "}
            {question.type === "ESSAY"
              ? t("exam.workspace.essay")
              : t("exam.workspace.multipleChoice")}
          </span>
          <h2>{question.text}</h2>
        </div>

        <strong>{t("exam.workspace.points", { count: question.score })}</strong>
      </div>

      {question.type === "SINGLE_CHOICE" ? (
        <div className="sp-exam-option-list">
          {question.options.map((option, optionIndex) => {
            const isSelected = question.answer.optionId === option.id;

            return (
              <button
                key={option.id}
                className={isSelected ? "selected" : ""}
                onClick={() => onSelectOption(question.id, option.id)}
                type="button"
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                <div>
                  <strong>{option.text}</strong>
                  <small>{t("exam.workspace.option", { number: optionIndex + 1 })}</small>
                </div>
                <Icon name={isSelected ? "radio_button_checked" : "radio_button_unchecked"} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="sp-exam-essay-wrap">
          <textarea
            maxLength={4000}
            onChange={(event) => onEssayChange(question.id, event.target.value)}
            placeholder={t("exam.workspace.essayPlaceholder")}
            value={question.answer.essayAnswer}
          />
          <div className="sp-exam-essay-meta">
            <span>{t("exam.workspace.essayHint")}</span>
            <strong>{t("exam.workspace.characters", { count: question.answer.essayAnswer.length })}</strong>
          </div>
        </div>
      )}
    </section>
  );
}

export default ExamWorkspaceQuestionCard;
