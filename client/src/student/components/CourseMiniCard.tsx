import { useTranslation } from "react-i18next";
import type { RecommendedCourse } from "../types/student.types";
import Icon from "./Icon";

type CourseMiniCardProps = {
  course: RecommendedCourse;
};

function CourseMiniCard({ course }: CourseMiniCardProps) {
  const { t } = useTranslation("student");

  return (
    <article className="sp-mini-card">
      <img src={course.image} alt={course.title} />
      <span>{course.category}</span>
      <div className="sp-stars">
        <small>({t("courseCard.reviews", { count: 1209 })})</small>
      </div>
      <h3>{course.title}</h3>
      <p>{course.author}</p>
      <div>
        <strong>{course.price}</strong>
        <button type="button">
          {t("courseCard.enroll")} <Icon name="add" />
        </button>
      </div>
    </article>
  );
}

export default CourseMiniCard;
