import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ExamReviewQuestionCard from "../components/exams/ExamReviewQuestionCard";
import ExamReviewSummary from "../components/exams/ExamReviewSummary";
import { getStudentExamReview } from "../services/studentExamsApi";
import type { StudentExamReview } from "../types/exam.types";
import "./ExamReviewPage.css";

type ExamReviewPageProps = {
  examId: number;
  attemptId?: number | null;
  onBack: () => void;
};

function ExamReviewPage({ examId, attemptId, onBack }: ExamReviewPageProps) {
  const { t } = useTranslation("student");
  const [review, setReview] = useState<StudentExamReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    getStudentExamReview(examId, attemptId)
      .then((data) => {
        if (isMounted) {
          setReview(data);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("exam.review.loadError"),
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
  }, [attemptId, examId, t]);

  if (isLoading) {
    return (
      <main className="sp-exam-review-page">
        <p className="sp-state-line">{t("exam.review.loading")}</p>
      </main>
    );
  }

  if (error || !review) {
    return (
      <main className="sp-exam-review-page">
        <div className="sp-empty-cart">
          <h2>{t("exam.review.openError")}</h2>
          <p>{error || t("exam.review.noData")}</p>
          <button onClick={onBack} type="button">
            {t("exam.taking.back")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="sp-exam-review-page">
      <section className="sp-exam-review-head">
        <div>
          <p className="sp-eyebrow">{t("exam.review.eyebrow")}</p>
          <h1>{review.exam.title}</h1>
          <p>
            {review.exam.course.name} • {review.exam.batch.name}
          </p>
        </div>

        <button onClick={onBack} type="button">
          {t("exam.review.back")}
        </button>
      </section>

      <ExamReviewSummary review={review} />

      <section className="sp-exam-review-list">
        <div className="sp-exam-review-list-head">
          <h2>{t("exam.review.details")}</h2>
          <p>{t("exam.review.essayNotice")}</p>
        </div>

        <div className="sp-exam-review-question-list">
          {review.questions.map((question, index) => (
            <ExamReviewQuestionCard
              key={question.id}
              question={question}
              questionIndex={index}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default ExamReviewPage;
