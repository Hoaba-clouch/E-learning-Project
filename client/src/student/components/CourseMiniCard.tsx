import { useTranslation } from "react-i18next";
import { getIntlLocale } from "../../i18n/locale";
import type { StudentCourse } from "../types/course.types";
import Icon from "./Icon";

type CourseMiniCardProps = {
  course: StudentCourse;
  onOpen: () => void;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

function CourseMiniCard({ course, onOpen }: CourseMiniCardProps) {
  const { t, i18n } = useTranslation("student");
  const price = new Intl.NumberFormat(getIntlLocale(i18n.resolvedLanguage), {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(course.price);

  return (
    <article className="sp-mini-card">
      <img
        src={course.thumbnailUrl?.startsWith("http") ? course.thumbnailUrl : fallbackImage}
        alt={course.name}
      />
      <span>{course.category.name}</span>
      <div className="sp-stars">
        <small>
          {course.stats.averageRating.toFixed(1)} ({t("courseCard.reviews", {
            count: course.stats.reviewCount,
          })})
        </small>
      </div>
      <h3>{course.name}</h3>
      <p>{course.teacher.fullName}</p>
      <div>
        <strong>{price}</strong>
        <button type="button" onClick={onOpen}>
          {t("courseCard.enroll")} <Icon name="add" />
        </button>
      </div>
    </article>
  );
}

export default CourseMiniCard;
