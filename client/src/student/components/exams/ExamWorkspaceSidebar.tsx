import { useTranslation } from "react-i18next";
import type { StudentExamQuestion } from "../../types/exam.types";
import { formatRemainingTime } from "../../utils/examFormatters";
import { isQuestionAnswered } from "../../utils/examWorkspace";
import Icon from "../Icon";

type ExamWorkspaceSidebarProps = {
  answeredCount: number;
  currentIndex: number;
  questions: StudentExamQuestion[];
  remainingSeconds: number;
  onSelectQuestion: (index: number) => void;
};

function ExamWorkspaceSidebar({
  answeredCount,
  currentIndex,
  questions,
  remainingSeconds,
  onSelectQuestion,
}: ExamWorkspaceSidebarProps) {
  const { t } = useTranslation("student");
  return (
    <aside className="sp-exam-workspace-sidebar">
      <section className="sp-exam-workspace-timer">
        <span>{t("exam.taking.remainingTime")}</span>
        <strong>{formatRemainingTime(remainingSeconds)}</strong>
        <small>
          {t("exam.workspace.answeredCount", { answered: answeredCount, total: questions.length })}
        </small>
      </section>

      <section className="sp-exam-workspace-palette">
        <div className="sp-exam-workspace-section-head">
          <h3>{t("exam.workspace.questionList")}</h3>
          <span>{t("exam.workspace.questionCount", { count: questions.length })}</span>
        </div>

        <div className="sp-exam-workspace-grid">
          {questions.map((question, index) => {
            const answered = isQuestionAnswered(question);
            const stateClass = index === currentIndex ? "current" : answered ? "answered" : "";

            return (
              <button
                key={question.id}
                className={stateClass}
                onClick={() => onSelectQuestion(index)}
                type="button"
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="sp-exam-workspace-legend">
          <div>
            <span className="answered" />
            <small>{t("exam.workspace.answered")}</small>
          </div>
          <div>
            <span className="current" />
            <small>{t("exam.workspace.current")}</small>
          </div>
          <div>
            <span className="empty" />
            <small>{t("exam.workspace.unanswered")}</small>
          </div>
        </div>
      </section>

      <section className="sp-exam-workspace-help">
        <div className="sp-exam-workspace-section-head">
          <h3>{t("exam.workspace.needHelp")}</h3>
        </div>

        <p>{t("exam.workspace.helpDescription")}</p>
        <div>
          <Icon name="support_agent" />
          <span>{t("exam.workspace.officeHours")}</span>
        </div>
      </section>
    </aside>
  );
}

export default ExamWorkspaceSidebar;
