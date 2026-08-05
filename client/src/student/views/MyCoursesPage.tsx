import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getIntlLocale } from "../../i18n/locale";
import Icon from "../components/Icon";
import { getMyCourses } from "../services/studentCoursesApi";
import type { StudentEnrolledCourse } from "../types/course.types";

type MyCoursesPageProps = {
  onReviewCourse: (courseId: number) => void;
  onStartLearning: (courseId: number) => void;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

function getCourseImage(thumbnailUrl: string | null) {
  return thumbnailUrl?.startsWith("http") ? thumbnailUrl : fallbackImage;
}

function formatDate(value: string, language: string | undefined) {
  return new Intl.DateTimeFormat(getIntlLocale(language)).format(new Date(value));
}

function MyCoursesPage({
  onReviewCourse,
  onStartLearning,
}: MyCoursesPageProps) {
  const { t, i18n } = useTranslation("student");
  const language = i18n.resolvedLanguage;
  const [courses, setCourses] = useState<StudentEnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyCourses()
      .then((data) => {
        if (isMounted) {
          setCourses(data);
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t("myCourses.loadError"),
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

  return (
    <main className="sp-my-courses-page">
      <section className="sp-my-courses-hero">
        <p className="sp-eyebrow">{t("myCourses.eyebrow")}</p>
        <h1>{t("myCourses.title")}</h1>
        <p>{t("myCourses.description")}</p>
      </section>

      {isLoading ? <p className="sp-state-line">{t("myCourses.loading")}</p> : null}
      {error ? <p className="sp-state-line error">{error}</p> : null}

      {!isLoading && !error && courses.length === 0 ? (
        <div className="sp-empty-cart">
          <Icon name="school" />
          <h2>{t("myCourses.emptyTitle")}</h2>
          <p>{t("myCourses.emptyDescription")}</p>
        </div>
      ) : null}

      <div className="sp-my-course-grid">
        {courses.map((item) => {
          const canStudy =
            item.enrollment.status === "ACTIVE" ||
            item.enrollment.status === "COMPLETED";
          const progressPercent = Math.min(
            100,
            Math.max(0, item.enrollment.progressPercent),
          );
          const progressLabel = new Intl.NumberFormat(
            getIntlLocale(language),
            { maximumFractionDigits: 2 },
          ).format(progressPercent);

          return (
            <article className="sp-my-course-card" key={item.enrollment.id}>
              <img
                src={getCourseImage(item.course.thumbnailUrl)}
                alt={item.course.name}
              />
              <div>
                <span>{item.course.category.name}</span>
                <h2>{item.course.name}</h2>
                <p>
                  {t("myCourses.teacher")}: {item.course.teacher.fullName} •{" "}
                  {t("myCourses.class")}:{" "}
                  {item.batch.name}
                </p>
                <p>
                  {t("myCourses.duration")}: {formatDate(item.batch.startDate, language)} -{" "}
                  {formatDate(item.batch.endDate, language)}
                </p>
                <div className="sp-progress-shell">
                  <span
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
                <small>
                  {t("myCourses.progress")} {progressLabel}% •{" "}
                  {item.enrollment.status}
                </small>
              </div>
              <div className="sp-my-course-actions">
                <button
                  disabled={!canStudy}
                  onClick={() => onStartLearning(item.course.id)}
                  type="button"
                >
                  <Icon name={canStudy ? "play_circle" : "hourglass_top"} />
                  {canStudy ? t("myCourses.start") : t("myCourses.waiting")}
                </button>
                <button
                  className="secondary"
                  disabled={!canStudy || progressPercent < 30}
                  onClick={() => onReviewCourse(item.course.id)}
                  title={
                    progressPercent < 30
                      ? t("myCourses.reviewLockedTitle")
                      : t("myCourses.reviewTitle")
                  }
                  type="button"
                >
                  <Icon name="rate_review" />
                  {progressPercent < 30
                    ? t("myCourses.reviewAtProgress")
                    : t("myCourses.review")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

export default MyCoursesPage;
