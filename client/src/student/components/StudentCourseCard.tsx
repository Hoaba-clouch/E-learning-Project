import { useTranslation } from "react-i18next";
import { getIntlLocale } from "../../i18n/locale";
import type { StudentCourse } from "../types/course.types";
import Icon from "./Icon";

type StudentCourseCardProps = {
  course: StudentCourse;
  onOpen: (courseId: number) => void;
};

const fallbackImages = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df0852?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
];

function formatCurrency(value: number, language: string | undefined) {
  return new Intl.NumberFormat(getIntlLocale(language), {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getCourseImage(course: StudentCourse) {
  if (course.thumbnailUrl?.startsWith("http")) {
    return course.thumbnailUrl;
  }

  return fallbackImages[course.id % fallbackImages.length];
}

function StudentCourseCard({ course, onOpen }: StudentCourseCardProps) {
  const { t, i18n } = useTranslation("student");
  return (
    <article className="sp-course-card sp-db-course-card">
      <button
        className="sp-course-card-button"
        onClick={() => onOpen(course.id)}
        type="button"
      >
        <div className="sp-course-media">
          <img src={getCourseImage(course)} alt={course.name} />
          <span>{course.category.name}</span>
        </div>
        <div className="sp-course-body">
          <h3>{course.name}</h3>
          <p className="sp-author">
            <img
              src={
                course.teacher.avatarUrl ??
                `https://api.dicebear.com/9.x/personas/svg?seed=${course.teacher.email}`
              }
              alt=""
            />{" "}
            {course.teacher.fullName}
          </p>
          <p className="sp-course-description">{course.description}</p>
          <div className="sp-course-meta-row">
            <span>{course.level}</span>
            <span>
              <Icon name="menu_book" />{" "}
              {t("courseCard.lessons", { count: course.stats.lessonCount })}
            </span>
          </div>
          <div className="sp-course-footer">
            <div>
              <p>
                {course.stats.averageRating.toFixed(1)}{" "}
                <small>
                  ({t("courseCard.reviews", { count: course.stats.reviewCount })})
                </small>
              </p>
              <strong>{formatCurrency(course.price, i18n.resolvedLanguage)}</strong>
            </div>
            <span className="sp-card-open">
              {t("courseCard.details")} <Icon name="chevron_right" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

export default StudentCourseCard;
