import { useTranslation } from "react-i18next";
import type { StudentExamResult } from "../types/exam.types";
import {
  formatExamDateTime,
  formatExamTitle,
  formatScore,
  getExamResultTone,
} from "../utils/examFormatters";
import Icon from "./Icon";

type StudentExamResultRowProps = {
  result: StudentExamResult;
  onOpen: (result: StudentExamResult) => void;
};

function StudentExamResultRow({ result, onOpen }: StudentExamResultRowProps) {
  const { t, i18n } = useTranslation("student");
  const tone = getExamResultTone(result);

  return (
    <article className="sp-exam-result-row">
      <div className={`sp-exam-result-icon ${tone}`}>
        <Icon name={tone === "success" ? "check_circle" : "cancel"} />
      </div>

      <div className="sp-exam-result-copy">
        <h4>{formatExamTitle(result.title, i18n.resolvedLanguage)}</h4>
        <p>
          {result.courseName} • {result.batchName}
        </p>
        <small>{t("exam.result.completedAt", { date: formatExamDateTime(result.submittedAt, i18n.resolvedLanguage, t("exam.noData")) })}</small>
      </div>

      <div className="sp-exam-result-score">
        <span>{t("exam.result.score")}</span>
        <strong>{formatScore(result.score, result.maxScore)}</strong>
      </div>

      <div className="sp-exam-result-status">
        <span>{t("exam.result.status")}</span>
        <b className={tone}>{result.status === "PASSED" ? t("exam.result.passed") : t("exam.result.failed")}</b>
      </div>

      <button onClick={() => onOpen(result)} type="button" aria-label={t("exam.result.viewDetails")}>
        <Icon name="visibility" />
      </button>
    </article>
  );
}

export default StudentExamResultRow;
