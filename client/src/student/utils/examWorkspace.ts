import type {
  StudentExamAnswerDraft,
  StudentExamQuestion,
} from "../types/exam.types";

export function isQuestionAnswered(question: StudentExamQuestion) {
  if (question.type === "ESSAY") {
    return question.answer.essayAnswer.trim().length > 0;
  }

  return question.answer.optionId !== null;
}

export function buildDraftAnswers(questions: StudentExamQuestion[]): StudentExamAnswerDraft[] {
  return questions.map((question) => ({
    questionId: question.id,
    optionId: question.answer.optionId,
    essayAnswer: question.answer.essayAnswer,
  }));
}

export function updateQuestionOption(
  questions: StudentExamQuestion[],
  questionId: number,
  optionId: number,
) {
  return questions.map((question) =>
    question.id === questionId
      ? {
          ...question,
          answer: {
            ...question.answer,
            optionId,
          },
        }
      : question,
  );
}

export function updateQuestionEssay(
  questions: StudentExamQuestion[],
  questionId: number,
  essayAnswer: string,
) {
  return questions.map((question) =>
    question.id === questionId
      ? {
          ...question,
          answer: {
            ...question.answer,
            essayAnswer,
          },
        }
      : question,
  );
}
