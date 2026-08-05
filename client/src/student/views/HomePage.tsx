import { useTranslation } from "react-i18next";
import CourseMiniCard from "../components/CourseMiniCard";
import Icon from "../components/Icon";
import { recommended } from "../data/courseData";
import type { StudentView } from "../types/student.types";

type HomePageProps = {
  onNavigate: (view: StudentView) => void;
};

function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useTranslation("student");

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
          <article className="sp-discipline large">
            <Icon name="code" />
            <h3>{t("home.technology")}</h3>
            <p>{t("home.technologyDescription")}</p>
            <small>{t("home.courseCount", { count: 142 })}</small>
            <button type="button" onClick={() => onNavigate("courses")}>
              <Icon name="north_east" />
            </button>
          </article>
          <article className="sp-discipline blue">
            <Icon name="palette" />
            <h3>{t("home.creativeDesign")}</h3>
            <small>{t("home.courseCount", { count: 84 })}</small>
          </article>
          <article className="sp-discipline muted">
            <Icon name="query_stats" />
            <h3>{t("home.business")}</h3>
            <small>{t("home.courseCount", { count: 56 })}</small>
          </article>
          <article className="sp-discipline wide">
            <Icon name="psychology" />
            <div>
              <h3>{t("home.humanities")}</h3>
              <p>{t("home.humanitiesDescription")}</p>
            </div>
            <Icon name="chevron_right" />
          </article>
        </div>
      </section>

      <section className="sp-content-section">
        <p className="sp-eyebrow">{t("home.featured")}</p>
        <h2>{t("home.recommended")}</h2>
        <div className="sp-card-row">
          {recommended.map((course) => (
            <CourseMiniCard key={course.title} course={course} />
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
