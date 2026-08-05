import { useTranslation } from "react-i18next";
import Icon from "./Icon";

function CourseContent() {
  const { t } = useTranslation("student");

  return (
    <div className="sp-course-content">
      <h2>
        {t("courseContent.title")} <span>{t("courseContent.completed")}</span>
      </h2>
      <div className="sp-chapter">
        <p>{t("courseContent.chapter", { number: "01" })}</p>
        <h3>
          {t("courseContent.chapter1")} <Icon name="expand_more" />
        </h3>
        <span className="done">
          <Icon name="check_circle" /> {t("courseContent.lesson1")}
          <small>14:20</small>
        </span>
        <span>
          <Icon name="check_circle" /> {t("courseContent.lesson2")}
          <small>08:45</small>
        </span>
      </div>
      <div className="sp-chapter active">
        <p>{t("courseContent.chapter", { number: "02" })}</p>
        <h3>
          {t("courseContent.chapter2")} <Icon name="expand_less" />
        </h3>
        <span>
          <Icon name="check_circle" /> {t("courseContent.lesson3")}
          <small>12:30</small>
        </span>
        <span className="current">
          <Icon name="play_circle" /> {t("courseContent.lesson4")}
          <small>42:00</small>
        </span>
        <span>
          <Icon name="lock" /> {t("courseContent.lesson5")}
          <small>15:10</small>
        </span>
      </div>
      <div className="sp-chapter locked">
        <p>{t("courseContent.chapter", { number: "03" })}</p>
        <h3>
          {t("courseContent.chapter3")} <Icon name="lock" />
        </h3>
      </div>
    </div>
  );
}

export default CourseContent;
