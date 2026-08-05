import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import StudentExamCard from "../components/StudentExamCard";
import StudentExamResultRow from "../components/StudentExamResultRow";
import StudentExamSidebar from "../components/StudentExamSidebar";
import { getStudentExamDashboard } from "../services/studentExamsApi";
import type {
  StudentExam,
  StudentExamDashboard,
  StudentExamResult,
} from "../types/exam.types";
import {
  getExamTabItems,
  type StudentExamTab,
} from "../utils/examFormatters";
import "./ExamPage.css";

type ExamPageProps = {
  onOpenExam: (exam: StudentExam) => void;
  onOpenResult: (result: StudentExamResult) => void;
};

function ExamPage({ onOpenExam, onOpenResult }: ExamPageProps) {
  const { t } = useTranslation("student");
  const tabs: Array<{ key: StudentExamTab; label: string }> = [
    { key: "upcoming", label: t("exam.dashboard.upcoming") },
    { key: "completed", label: t("exam.dashboard.completed") },
    { key: "incomplete", label: t("exam.dashboard.incomplete") },
  ];
  const [dashboard, setDashboard] = useState<StudentExamDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<StudentExamTab>("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    getStudentExamDashboard()
      .then((data) => {
        if (isMounted) {
          setDashboard(data);
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t("exam.dashboard.loadError"),
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
  }, [t]);

  const filteredExams = useMemo(
    () => getExamTabItems(dashboard?.exams ?? [], activeTab),
    [activeTab, dashboard?.exams],
  );

  return (
    <main className="sp-exam-dashboard-page">
      <section className="sp-exam-dashboard-head">
        <div>
          <p className="sp-eyebrow">{t("exam.dashboard.eyebrow")}</p>
          <h1>{t("exam.dashboard.title")}</h1>
        </div>

        <div className="sp-exam-summary-grid">
          <article>
            <span>{t("exam.dashboard.total")}</span>
            <strong>{dashboard?.summary.total ?? 0}</strong>
          </article>
          <article>
            <span>{t("exam.dashboard.upcoming")}</span>
            <strong>{dashboard?.summary.upcoming ?? 0}</strong>
          </article>
          <article>
            <span>{t("exam.dashboard.completed")}</span>
            <strong>{dashboard?.summary.completed ?? 0}</strong>
          </article>
          <article>
            <span>{t("exam.dashboard.averageScore")}</span>
            <strong>{dashboard?.summary.averageScore ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="sp-exam-dashboard-layout">
        <div className="sp-exam-dashboard-main">
          <div className="sp-exam-filter-tabs" role="tablist" aria-label={t("exam.dashboard.filterLabel")}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="sp-state-line">{t("exam.dashboard.loading")}</p>
          ) : null}

          {error ? <p className="sp-state-line error">{error}</p> : null}

          {!isLoading && !error ? (
            <section className="sp-exam-list-section">
              <div className="sp-exam-section-head">
                <div>
                  <h2>
                    {activeTab === "upcoming"
                      ? t("exam.dashboard.sectionUpcoming")
                      : activeTab === "completed"
                        ? t("exam.dashboard.sectionCompleted")
                        : t("exam.dashboard.sectionIncomplete")}
                  </h2>
                  <p>{t("exam.dashboard.filteredCount", { count: filteredExams.length })}</p>
                </div>

                <span>
                  {activeTab === "upcoming"
                    ? t("exam.dashboard.openCount", { count: dashboard?.summary.upcoming ?? 0 })
                    : activeTab === "completed"
                      ? t("exam.dashboard.submittedCount", { count: dashboard?.summary.completed ?? 0 })
                      : t("exam.dashboard.inProgressCount", { count: dashboard?.summary.incomplete ?? 0 })}
                </span>
              </div>

              {filteredExams.length ? (
                <div className="sp-exam-card-grid">
                  {filteredExams.map((exam) => (
                    <StudentExamCard exam={exam} key={exam.id} onAction={onOpenExam} />
                  ))}
                </div>
              ) : (
                <div className="sp-empty-cart">
                  <h2>{t("exam.dashboard.emptyTitle")}</h2>
                  <p>{t("exam.dashboard.emptyDescription")}</p>
                </div>
              )}
            </section>
          ) : null}

          {!isLoading && !error ? (
            <section className="sp-exam-result-section">
              <div className="sp-exam-section-head">
                <div>
                  <h2>{t("exam.dashboard.recentResults")}</h2>
                  <p>{t("exam.dashboard.recentDescription")}</p>
                </div>
              </div>

              {dashboard?.recentResults.length ? (
                <div className="sp-exam-result-list">
                  {dashboard.recentResults.map((result) => (
                    <StudentExamResultRow
                      key={`${result.examId}-${result.attemptId ?? result.submittedAt}`}
                      onOpen={onOpenResult}
                      result={result}
                    />
                  ))}
                </div>
              ) : (
                <div className="sp-empty-cart">
                  <h2>{t("exam.dashboard.noResults")}</h2>
                  <p>{t("exam.dashboard.noResultsDescription")}</p>
                </div>
              )}
            </section>
          ) : null}
        </div>

        <StudentExamSidebar />
      </section>
    </main>
  );
}

export default ExamPage;
