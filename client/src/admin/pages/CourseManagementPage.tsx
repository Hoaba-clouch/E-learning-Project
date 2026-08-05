import { useTranslation } from "react-i18next";
import logo from "../../assets/logo-learnX.png";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import { useAdminData } from "../hooks/useAdminData";
import { mutateAdminData } from "../services/adminApi";
import type { AdminPage } from "../adminNavigation";
import { useState } from "react";
import "../../index.css";

type CourseManagementPageProps = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

type CourseApiRow = {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail: string | null;
  category: string;
  instructorName: string;
  instructorAvatar: string | null;
  rating: number;
  enrolledStudents: number;
  reviewCount: number;
  totalRevenue: number;
  status: string;
  statusLabel: string;
};

type CoursesApiResponse = {
  success: boolean;
  data: {
    summary: {
      totalCourses: { value: number; note: string };
      pendingReview: { value: number; note: string };
      activeStudents: { value: string; note: string };
      monthlyRevenue: { value: number; note: string };
    };
    categories: Array<{ key: string; label: string; active: boolean }>;
    courses: CourseApiRow[];
    pagination: { total: number };
  };
};

function CourseManagementPage({
  activePage,
  onNavigate,
}: CourseManagementPageProps) {
  const { t } = useTranslation("admin");
  const [activeCategory, setActiveCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, { status: string; statusLabel: string }>
  >({});
  const [actionError, setActionError] = useState("");
  const [selectedReport, setSelectedReport] = useState<{
    title: string;
    instructor: string;
    enrolledStudents: number;
    reviewCount: number;
    totalRevenue: number;
    rating: string;
    status: string;
  } | null>(null);
  const {
    data: pageData,
    error,
    isLoading,
  } = useAdminData<CoursesApiResponse["data"]>("/courses");

  if (!pageData) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  const displayedStats = [
    {
      title: "Tổng khóa học",
      value: String(pageData.summary.totalCourses.value),
      note: pageData.summary.totalCourses.note,
      noteTone: "success",
      accent: "blue",
    },
    {
      title: "Chờ duyệt",
      value: String(pageData.summary.pendingReview.value),
      note: pageData.summary.pendingReview.note,
      noteTone: "muted",
      accent: "amber",
    },
    {
      title: "Học viên đang hoạt động",
      value: pageData.summary.activeStudents.value,
      note: pageData.summary.activeStudents.note,
      noteTone: "success",
      accent: "slate",
    },
    {
      title: "Doanh thu tháng",
      value: new Intl.NumberFormat("vi-VN").format(
        pageData.summary.monthlyRevenue.value,
      ),
      note: pageData.summary.monthlyRevenue.note,
      noteTone: "muted",
      accent: "primary-outline",
    },
  ];
  const displayedCourses =
    pageData.courses
      .map((course) => ({ ...course, ...statusOverrides[course.id] }))
      .filter(
        (course) =>
          (activeCategory === "all" || course.category === activeCategory) &&
          (statusFilter === "all" || course.status === statusFilter) &&
          (!search.trim() ||
            course.title.toLowerCase().includes(search.trim().toLowerCase()) ||
            course.instructorName
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      )
      .map((course) => ({
      id: course.id,
      category: course.category,
      enrolledStudents: course.enrolledStudents,
      reviewCount: course.reviewCount,
      totalRevenue: course.totalRevenue,
      rating: course.rating > 0 ? String(course.rating) : "Mới",
      title: course.title,
      description: course.description,
      instructor: course.instructorName,
      price: new Intl.NumberFormat("vi-VN").format(course.price),
      status: course.statusLabel,
      statusTone: course.status,
      image: course.thumbnail || logo,
      avatar:
        course.instructorAvatar ||
        `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(course.instructorName)}`,
      actions:
        course.status === "pending"
          ? ["approve", "reject", "edit"]
          : course.status === "hidden"
            ? ["show", "analytics", "edit"]
            : course.status === "rejected"
              ? ["approve", "analytics", "edit"]
              : ["hide", "analytics", "edit"],
    }));

  async function updateCourseStatus(
    courseId: number,
    status: "approved" | "rejected" | "hidden",
  ) {
    try {
      const result = await mutateAdminData<{
        id: number;
        status: string;
        statusLabel: string;
      }>(`/courses/${courseId}/review`, "PATCH", { status });
      setStatusOverrides((current) => ({
        ...current,
        [courseId]: {
          status: result.status,
          statusLabel: result.statusLabel,
        },
      }));
      setActionError("");
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Không thể cập nhật khóa học.",
      );
    }
  }

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.courses")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.courses")} />

        <section className="content course-page">
          <div className="course-header">
            <div>
              <h1>Quản lý khóa học</h1>
              <p>
                Biên tập, theo dõi và đánh giá các tài sản tri thức trong toàn
                bộ hệ sinh thái học tập.
              </p>
            </div>

            <div className="course-header-actions">
              <input
                className="course-search-input"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm khóa học hoặc giảng viên"
                value={search}
              />
              <select
                className="course-status-filter"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
                <option value="hidden">Đã ẩn</option>
              </select>
              <button className="course-primary-btn" type="button">
                <span className="material-symbols-outlined">add</span>
                Khóa học mới
              </button>
            </div>
          </div>

          <section className="course-stats-grid">
            {displayedStats.map((stat) => (
              <article
                key={stat.title}
                className={`panel course-stat-card ${stat.accent}`}
              >
                <p>{stat.title}</p>
                <h2>{stat.value}</h2>
                <span className={stat.noteTone}>{stat.note}</span>
              </article>
            ))}
          </section>

          <div className="course-category-row">
            {pageData.categories.map((category) => {
              const categoryValue =
                category.key === "all" ? "all" : category.label;

              return (
                <button
                  key={category.key}
                  className={activeCategory === categoryValue ? "active" : ""}
                  type="button"
                  aria-pressed={activeCategory === categoryValue}
                  onClick={() => setActiveCategory(categoryValue)}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {actionError ? <p className="user-error">{actionError}</p> : null}

          <section className="course-grid">
            {displayedCourses.length > 0 ? displayedCourses.map((course) => (
              <article key={course.id} className="panel course-card">
                <div className="course-card-media">
                  <img src={course.image} alt={course.title} />
                  <div className="course-card-overlay">
                    <span className="material-symbols-outlined">visibility</span>
                  </div>
                </div>

                <div className="course-card-body">
                  <div className="course-card-top">
                    <span className={`course-category-tag ${course.statusTone}`}>
                      {course.category}
                    </span>
                    <div className="course-rating">
                      <span className="material-symbols-outlined">star</span>
                      <span>{course.rating}</span>
                    </div>
                  </div>

                  <h3>{course.title}</h3>
                  <p>{course.description}</p>

                  <div className="course-instructor-row">
                    <img src={course.avatar} alt={course.instructor} />
                    <span>{course.instructor}</span>
                    <span className="dot-separator">•</span>
                    <strong>{course.price}</strong>
                  </div>

                  <div className="course-card-footer">
                    <div className={`course-status ${course.statusTone}`}>
                      <span className="dot" />
                      {course.status}
                    </div>

                    <div className="course-card-actions">
                      {course.actions.includes("approve") ? (
                        <button
                          onClick={() => void updateCourseStatus(course.id, "approved")}
                          type="button"
                          title="Duyệt"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                        </button>
                      ) : null}
                      {course.actions.includes("reject") ? (
                        <button
                          onClick={() => void updateCourseStatus(course.id, "rejected")}
                          type="button"
                          title="Từ chối"
                        >
                          <span className="material-symbols-outlined">cancel</span>
                        </button>
                      ) : null}
                      {course.actions.includes("analytics") ? (
                        <button
                          onClick={() =>
                            setSelectedReport({
                              title: course.title,
                              instructor: course.instructor,
                              enrolledStudents: course.enrolledStudents,
                              reviewCount: course.reviewCount,
                              totalRevenue: course.totalRevenue,
                              rating: course.rating,
                              status: course.status,
                            })
                          }
                          type="button"
                          title="Phân tích"
                        >
                          <span className="material-symbols-outlined">bar_chart</span>
                        </button>
                      ) : null}
                      {course.actions.includes("hide") ? (
                        <button
                          onClick={() => void updateCourseStatus(course.id, "hidden")}
                          type="button"
                          title="Ẩn khóa học"
                        >
                          <span className="material-symbols-outlined">visibility_off</span>
                        </button>
                      ) : null}
                      {course.actions.includes("show") ? (
                        <button
                          onClick={() => void updateCourseStatus(course.id, "approved")}
                          type="button"
                          title="Hiển thị khóa học"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      ) : null}
                      {course.actions.includes("feedback") ? (
                        <button type="button" className="course-feedback-btn" title="Xem phản hồi">
                          Xem phản hồi
                        </button>
                      ) : null}
                      {course.actions.includes("edit") ? (
                        <button type="button" title="Chỉnh sửa">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )) : (
              <div className="panel admin-filter-empty">
                Không có khóa học trong danh mục này.
              </div>
            )}
          </section>

          {selectedReport ? (
            <section className="panel course-report-panel">
              <div className="panel-header">
                <div>
                  <h3>Báo cáo khóa học</h3>
                  <p>{selectedReport.title} · {selectedReport.instructor}</p>
                </div>
                <button
                  className="student-drawer-close"
                  onClick={() => setSelectedReport(null)}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="course-report-grid">
                <div><span>Học viên</span><strong>{selectedReport.enrolledStudents}</strong></div>
                <div><span>Doanh thu</span><strong>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(selectedReport.totalRevenue)}</strong></div>
                <div><span>Đánh giá</span><strong>{selectedReport.rating}</strong></div>
                <div><span>Lượt đánh giá</span><strong>{selectedReport.reviewCount}</strong></div>
                <div><span>Trạng thái</span><strong>{selectedReport.status}</strong></div>
              </div>
            </section>
          ) : null}

          <div className="course-pagination">
            <p>
              Hiển thị {displayedCourses.length} trong tổng số{" "}
              {pageData.pagination.total} khóa học
            </p>
            <div className="course-pagination-controls">
              <button type="button">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button type="button" className="active">
                1
              </button>
              <button type="button">2</button>
              <button type="button">3</button>
              <span>...</span>
              <button type="button">321</button>
              <button type="button">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CourseManagementPage;
