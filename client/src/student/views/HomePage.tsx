import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CourseMiniCard from "../components/CourseMiniCard";
import Icon from "../components/Icon";
import { getCourseCategories, getCourses } from "../services/studentCoursesApi";
import type { StudentCourse, StudentCourseCategory } from "../types/course.types";
import type { StudentView } from "../types/student.types";

type HomePageProps = {
  onNavigate: (view: StudentView) => void;
};

function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation("student");
  const [categories, setCategories] = useState<StudentCourseCategory[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<StudentCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const categoryStyles = ["large", "blue", "muted", "wide"];
  const categoryIcons = ["code", "palette", "query_stats", "psychology"];

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCourseCategories(), getCourses()])
      .then(([nextCategories, nextCourses]) => {
        if (!isMounted) return;
        setCategories(nextCategories);
        setFeaturedCourses(nextCourses.slice(0, 3));
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Không thể tải dữ liệu khóa học từ hệ thống.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalCourseCount = useMemo(
    () => categories.reduce((total, category) => total + category.courseCount, 0),
    [categories],
  );

  return (
    <>
      <section className="sp-hero">
        <div className="sp-hero-copy">
          <h1>
            {t("home.title")} <span>{t("home.titleAccent")}</span>
          </h1>
          <p>{t("home.description")}</p>
          <div className="sp-actions">
            <button type="button" onClick={() => onNavigate("courses")}>
              {t("home.startLearning")}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => onNavigate("categories")}
            >
              {t("home.viewCategories")}
            </button>
          </div>
          <div className="sp-social-proof">
            <span />
            <span />
            <span />
            <small>{t("home.socialProof")}</small>
          </div>
        </div>

        <div className="sp-hero-visual">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
            alt={t("home.heroImageAlt")}
          />
          <div className="sp-certificate">
            <Icon name="workspace_premium" />
            <strong>{t("home.certificateTitle")}</strong>
            <p>{t("home.certificateDescription")}</p>
          </div>
        </div>
      </section>

      <section className="sp-band">
        <div className="sp-section-head">
          <div>
            <h2>{t("home.exploreTitle")}</h2>
            <p>{t("home.exploreDescription")}</p>
          </div>
          <button type="button" onClick={() => onNavigate("categories")}>
            {t("home.viewCategories")} <Icon name="arrow_forward" />
          </button>
        </div>

        <div className="sp-discipline-grid">
          {categories.slice(0, 4).map((category, index) => (
            <article
              className={`sp-discipline ${categoryStyles[index]}`}
              key={category.id}
            >
              <Icon name={categoryIcons[index]} />
              <div>
                <h3>{category.name}</h3>
                {category.description ? <p>{category.description}</p> : null}
                <small>{t("home.courseCount", { count: category.courseCount })}</small>
              </div>
              <button type="button" onClick={() => onNavigate("courses")}>
                <Icon name={index === 3 ? "chevron_right" : "north_east"} />
              </button>
            </article>
          ))}
          {!isLoading && categories.length === 0 ? (
            <p className="sp-state-line">Chưa có danh mục đang hoạt động.</p>
          ) : null}
        </div>
      </section>

      <section className="sp-content-section">
        <p className="sp-eyebrow">{t("home.featured")}</p>
        <h2>{t("home.recommended")}</h2>
        {isLoading ? <p className="sp-state-line">Đang tải dữ liệu khóa học...</p> : null}
        {loadError ? <p className="sp-state-line error">{loadError}</p> : null}
        {!isLoading && !loadError && featuredCourses.length === 0 ? (
          <p className="sp-state-line">
            Hiện chưa có lớp đang mở đăng ký trong {totalCourseCount} khóa học của hệ thống.
          </p>
        ) : null}
        <div className="sp-card-row">
          {featuredCourses.map((course) => (
            <CourseMiniCard
              key={course.id}
              course={course}
              onOpen={() => onNavigate("courses")}
            />
          ))}
        </div>
      </section>

      <section className="sp-newsletter">
        <h2>{t("home.newsletterTitle")}</h2>
        <p>{t("home.newsletterDescription")}</p>
        <form>
          <input placeholder={t("home.emailPlaceholder")} />
          <button type="button">{t("home.subscribe")}</button>
        </form>
        <Icon name="mark_email_read" />
      </section>
    </>
  );
}

export default HomePage;
