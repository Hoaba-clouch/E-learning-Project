import { useTranslation } from "react-i18next";
import CourseContent from "../components/CourseContent";
import Icon from "../components/Icon";

function LessonPage() {
  const { t } = useTranslation("student");
  const learnItems = [1, 2, 3, 4].map((number) =>
    t(`lessonDemo.outcome${number}`),
  );

  return (
    <main className="sp-lesson-page">
      <section className="sp-lesson-main">
        <div className="sp-video">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
            alt={t("lessonDemo.videoAlt")}
          />
          <button type="button">
            <Icon name="play_arrow" />
          </button>
        </div>

        <div className="sp-lesson-title">
          <div>
            <span>{t("lessonDemo.chapter", { number: "04" })}</span>
            <span>{t("lessonDemo.lesson", { number: 12 })}</span>
          </div>
          <button type="button">
            <Icon name="share" /> {t("lessonDemo.share")}
          </button>
        </div>

        <h1>{t("lessonDemo.title")}</h1>
        <nav className="sp-tabs">
          <button className="active" type="button">
            {t("lessonDemo.overview")}
          </button>
          <button type="button">{t("lessonDemo.resources")}</button>
          <button type="button">{t("lessonDemo.reviews")}</button>
        </nav>

        <div className="sp-lesson-info">
          <div>
            <p>{t("lessonDemo.description")}</p>
            <div className="sp-learn-list">
              <h3>{t("lessonDemo.outcomes")}</h3>
              {learnItems.map((item) => (
                <span key={item}>
                  <Icon name="check_circle" /> {item}
                </span>
              ))}
            </div>
          </div>
          <aside className="sp-instructor">
            <h3>{t("lessonDemo.instructor")}</h3>
            <p>
              <img
                src="https://api.dicebear.com/9.x/personas/svg?seed=Julian"
                alt=""
              />
              <strong>Julian Vane</strong>
              <small>{t("lessonDemo.instructorRole")}</small>
            </p>
          </aside>
        </div>
      </section>
      <aside className="sp-lesson-side">
        <CourseContent />
      </aside>
    </main>
  );
}

export default LessonPage;
