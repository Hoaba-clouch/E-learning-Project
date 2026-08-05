import type {
  StudentExam,
  StudentExamResult,
  StudentExamReviewQuestion,
  StudentExamState,
} from "../types/exam.types";
import { getIntlLocale, normalizeLanguage } from "../../i18n/locale";

export type StudentExamTab = "upcoming" | "completed" | "incomplete";

export function formatExamDate(value: string | null, language?: string, emptyValue = "") {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatExamDateTime(value: string | null, language?: string, emptyValue = "") {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRemainingTime(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getExamStateTone(state: StudentExamState) {
  if (state === "COMPLETED") {
    return "success";
  }

  if (state === "IN_PROGRESS") {
    return "warning";
  }

  if (state === "LOCKED") {
    return "muted";
  }

  return "primary";
}

export function getExamTabItems(exams: StudentExam[], tab: StudentExamTab) {
  if (tab === "completed") {
    return exams.filter((exam) => exam.state === "COMPLETED");
  }

  if (tab === "incomplete") {
    return exams.filter((exam) => exam.state === "IN_PROGRESS");
  }

  return exams.filter(
    (exam) => exam.state === "UPCOMING" || exam.state === "LOCKED",
  );
}

export function getExamResultTone(result: StudentExamResult) {
  return result.status === "PASSED" ? "success" : "error";
}

export function formatScore(score: number | null, maxScore: number) {
  if (score === null) {
    return `--/${maxScore}`;
  }

  return `${score}/${maxScore}`;
}

export function formatExamTitle(title: string, language?: string) {
  const normalizedTitle = title.trim();
  const prefix = normalizeLanguage(language) === "en" ? "Exam" : "Bài kiểm tra";

  if (/^trắc nghiệm\s*:/i.test(normalizedTitle)) {
    return normalizedTitle.replace(/^trắc nghiệm\s*:/i, `${prefix}:`);
  }

  if (/^quiz\s*:/i.test(normalizedTitle)) {
    return normalizedTitle.replace(/^quiz\s*:/i, `${prefix}:`);
  }

  if (/^quiz\b/i.test(normalizedTitle)) {
    return normalizedTitle.replace(/^quiz\b/i, prefix);
  }

  return normalizedTitle;
}

export function isReviewQuestionAnswered(question: StudentExamReviewQuestion) {
  if (question.type === "ESSAY") {
    return question.answer.essayAnswer.trim().length > 0;
  }

  return question.answer.optionId !== null;
}
