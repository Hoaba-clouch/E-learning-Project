import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import StudentCourseCard from "../components/StudentCourseCard";
import { getCourseCategories, getCourses } from "../services/studentCoursesApi";
import type { StudentCourse, StudentCourseCategory } from "../types/course.types";

type CategoriesPageProps = {
  onOpenCourse: (courseId: number) => void;
};

function CategoriesPage({ onOpenCourse }: CategoriesPageProps) {
  const { t } = useTranslation("student");
  const [categories, setCategories] = useState<StudentCourseCategory[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");

    Promise.all([
      getCourseCategories(),
      getCourses({ categoryId: selectedCategoryId, search: searchText.trim() }),
    ])
      .then(([categoryData, courseData]) => {
        if (isMounted) {
          setCategories(categoryData);
          setCourses(courseData);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t("categories.loadError"));
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
  }, [selectedCategoryId, searchText, t]);

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <main className="sp-category-page">
      <section className="sp-category-hero">
        <h1>{t("categories.title")}</h1>
        <p>{t("categories.description")}</p>
        <div className="sp-hero-search">
          <Icon name="search" />
          <input
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("categories.searchPlaceholder")}
            value={searchText}
          />
          <button type="button">{t("categories.explore")}</button>
        </div>
      </section>

      <div className="sp-results-layout">
        <aside className="sp-filter-panel compact">
          <h2>
            <Icon name="filter_list" /> {t("categories.category")}
          </h2>
          <div className="sp-category-list">
            <button
              className={selectedCategoryId === null ? "active" : ""}
              onClick={() => setSelectedCategoryId(null)}
              type="button"
            >
              {t("categories.all")}
              <span>{categories.reduce((sum, item) => sum + item.courseCount, 0)}</span>
            </button>
            {categories.map((category) => (
              <button
                className={selectedCategoryId === category.id ? "active" : ""}
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.name}
                <span>{category.courseCount}</span>
              </button>
            ))}
          </div>
        </aside>

        <section>
          <div className="sp-results-head">
            <h2>
              {t("categories.result", { count: courses.length })}{" "}
              {selectedCategory
                ? t("categories.inCategory", { name: selectedCategory.name })
                : null}
            </h2>
          </div>
          {isLoading ? <p className="sp-state-line">{t("categories.loading")}</p> : null}
          {error ? <p className="sp-state-line error">{error}</p> : null}
          {!isLoading && !error ? (
            <div className="sp-course-grid">
              {courses.map((course) => (
                <StudentCourseCard
                  course={course}
                  key={`category-${course.id}`}
                  onOpen={onOpenCourse}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default CategoriesPage;
