import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import StudentCourseCard from "../components/StudentCourseCard";
import { getCourseCategories, getCourses } from "../services/studentCoursesApi";
import type { StudentCourse, StudentCourseCategory } from "../types/course.types";

type CoursesPageProps = {
  onOpenCourse: (courseId: number) => void;
};

function CoursesPage({ onOpenCourse }: CoursesPageProps) {
  const { t } = useTranslation("student");
  const [categories, setCategories] = useState<StudentCourseCategory[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const levels = [
    { label: t("courses.levels.all"), value: "" },
    { label: t("courses.levels.BEGINNER"), value: "BEGINNER" },
    { label: t("courses.levels.INTERMEDIATE"), value: "INTERMEDIATE" },
    { label: t("courses.levels.ADVANCED"), value: "ADVANCED" },
  ];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    Promise.all([
      getCourseCategories(),
      getCourses({
        categoryId: selectedCategoryId,
        level: selectedLevel,
        search: submittedSearch,
      }),
    ])
      .then(([categoryData, courseData]) => {
        if (isMounted) {
          setCategories(categoryData);
          setCourses(courseData);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t("courses.loadError"));
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
  }, [selectedCategoryId, selectedLevel, submittedSearch, t]);

  const totalLessons = useMemo(
    () => courses.reduce((total, course) => total + course.stats.lessonCount, 0),
    [courses],
  );

  function handleSearchSubmit() {
    setSubmittedSearch(searchText.trim());
  }

  return (
    <main className="sp-catalog-layout">
      <aside className="sp-filter-panel">
        <div className="sp-filter-group">
          <h3>{t("courses.category")}</h3>
          <label>
            <input
              checked={selectedCategoryId === null}
              onChange={() => setSelectedCategoryId(null)}
              type="radio"
            />
            {t("courses.allCategories")}
          </label>
          {categories.map((category) => (
            <label key={category.id}>
              <input
                checked={selectedCategoryId === category.id}
                onChange={() => setSelectedCategoryId(category.id)}
                type="radio"
              />
              {category.name} ({category.courseCount})
            </label>
          ))}
        </div>

        <div className="sp-filter-group">
          <h3>{t("courses.level")}</h3>
          {levels.map((level) => (
            <label key={level.value}>
              <input
                checked={selectedLevel === level.value}
                onChange={() => setSelectedLevel(level.value)}
                type="radio"
              />
              {level.label}
            </label>
          ))}
        </div>

        <div className="sp-premium-card">
          <h3>{t("courses.systemDataTitle")}</h3>
          <p>{t("courses.systemDataDescription")}</p>
        </div>
      </aside>

      <section className="sp-catalog-main">
        <div className="sp-catalog-head">
          <div>
            <p className="sp-eyebrow">{t("courses.eyebrow")}</p>
            <h1>{t("courses.title")}</h1>
            <p>
              {t("courses.summary", {
                courses: courses.length,
                categories: categories.length,
                lessons: totalLessons,
              })}
            </p>
          </div>
          <div className="sp-course-search">
            <Icon name="search" />
            <input
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              placeholder={t("courses.searchPlaceholder")}
              value={searchText}
            />
            <button onClick={handleSearchSubmit} type="button">
              {t("courses.search")}
            </button>
          </div>
        </div>

        {isLoading ? <p className="sp-state-line">{t("courses.loading")}</p> : null}
        {error ? <p className="sp-state-line error">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="sp-course-grid">
            {courses.map((course) => (
              <StudentCourseCard course={course} key={course.id} onOpen={onOpenCourse} />
            ))}
          </div>
        ) : null}
        {!isLoading && !error && courses.length === 0 ? (
          <p className="sp-state-line">{t("courses.notFound")}</p>
        ) : null}
      </section>
    </main>
  );
}

export default CoursesPage;
