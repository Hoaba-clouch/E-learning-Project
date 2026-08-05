import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import type { AdminPage } from "../adminNavigation";
import { getAdminData, mutateAdminData } from "../services/adminApi";
import "../../index.css";

type TeacherStatus = "active" | "suspended" | "inactive";

type TeacherCourseBadge = {
  id: number;
  title: string;
  shortLabel: string;
};

type TeacherRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  specialization: string;
  experienceYears: number;
  qualification: string | null;
  workplace: string | null;
  createdAt: string;
  courseCount: number;
  studentCount: number;
  averageRating: number;
  status: TeacherStatus;
  courses: TeacherCourseBadge[];
};

type TeacherDetail = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: TeacherStatus;
  createdAt: string;
  bio: string | null;
  specialization: string;
  experienceYears: number;
  qualification: string | null;
  workplace: string | null;
  courses: Array<{
    id: number;
    title: string;
    status: string;
    studentCount: number;
    rating: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    activityTime: string;
  }>;
};

type TeachersPageData = {
  summary: {
    totalTeachers: number;
    activeTeachers: number;
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
  };
  teachers: TeacherRow[];
  pagination: { total: number };
};

type TeacherFilter = "all" | TeacherStatus;

const teacherFilters: Array<{ key: TeacherFilter; label: string }> = [
  { key: "all", label: "Tất cả giảng viên" },
  { key: "active", label: "Đang hoạt động" },
  { key: "suspended", label: "Tạm khóa" },
  { key: "inactive", label: "Không hoạt động" },
];

function getStatusMeta(status: TeacherStatus) {
  if (status === "active") {
    return { label: "Đang hoạt động", tone: "active" };
  }
  if (status === "suspended") {
    return { label: "Tạm khóa", tone: "suspended" };
  }
  return { label: "Không hoạt động", tone: "inactive" };
}

function getCourseTone(index: number) {
  const tones = ["blue", "purple", "emerald", "amber", "rose", "cyan"];
  return tones[index % tones.length];
}

type Props = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

function InstructorManagementPage({ activePage, onNavigate }: Props) {
  const { t } = useTranslation("admin");
  const [pageData, setPageData] = useState<TeachersPageData | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherDetail | null>(null);
  const [activeFilter, setActiveFilter] = useState<TeacherFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const loadTeachers = useCallback(async () => {
    try {
      const data = await getAdminData<TeachersPageData>("/teachers");
      setPageData(data);
      setError("");
      return data;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách giảng viên.",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (teacherId: number) => {
    try {
      setSelectedTeacher(
        await getAdminData<TeacherDetail>(`/teachers/${teacherId}`),
      );
      setIsDrawerOpen(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải hồ sơ giảng viên.",
      );
    }
  }, []);

  useEffect(() => {
    void loadTeachers().then((data) => {
      if (data?.teachers[0]) void loadDetail(data.teachers[0].id);
    });
  }, [loadDetail, loadTeachers]);

  const displayedTeachers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return (pageData?.teachers ?? []).filter(
      (teacher) =>
        (activeFilter === "all" || teacher.status === activeFilter) &&
        (!keyword ||
          teacher.name.toLocaleLowerCase("vi").includes(keyword) ||
          teacher.email.toLocaleLowerCase("vi").includes(keyword) ||
          teacher.specialization.toLocaleLowerCase("vi").includes(keyword)),
    );
  }, [activeFilter, pageData, search]);

  async function toggleTeacherLock(teacher: TeacherRow | TeacherDetail) {
    const nextStatus: TeacherStatus =
      teacher.status === "suspended" ? "active" : "suspended";
    setIsSaving(true);
    try {
      await mutateAdminData(`/teachers/${teacher.id}/status`, "PATCH", {
        status: nextStatus,
      });
      setSelectedTeacher((current) =>
        current?.id === teacher.id ? { ...current, status: nextStatus } : current,
      );
      await loadTeachers();
      setError("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Không thể cập nhật trạng thái giảng viên.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!pageData) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  const stats = [
    {
      title: "Tổng giảng viên",
      value: pageData.summary.totalTeachers,
      icon: "co_present",
      tone: "blue",
    },
    {
      title: "Đang hoạt động",
      value: pageData.summary.activeTeachers,
      icon: "verified_user",
      tone: "amber",
    },
    {
      title: "Khóa học phụ trách",
      value: pageData.summary.totalCourses,
      icon: "library_books",
      tone: "primary-strong",
    },
    {
      title: "Học viên đang dạy",
      value: pageData.summary.totalStudents,
      icon: "groups",
      tone: "slate",
    },
  ];

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.teachers")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.teachers")} />

        <section className="content student-page">
          <div className="hero">
            <p className="eyebrow">Quản trị đội ngũ đào tạo</p>
            <h1>Danh sách giảng viên</h1>
            <p className="hero-copy">
              Theo dõi hồ sơ chuyên môn, khóa học phụ trách, số học viên và hoạt
              động giảng dạy trên toàn hệ thống.
            </p>
          </div>

          <section className="stats-grid student-stats-grid">
            {stats.map((stat) => (
              <article className="panel stat-card student-stat-card" key={stat.title}>
                <div className="stat-top">
                  <div className={`icon-tile ${stat.tone}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                </div>
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">{stat.value}</h2>
              </article>
            ))}
          </section>

          <section className="student-toolbar">
            <div className="student-toolbar-left">
              <div className="student-segments">
                {teacherFilters.map((filter) => (
                  <button
                    aria-pressed={activeFilter === filter.key}
                    className={activeFilter === filter.key ? "active" : ""}
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="student-toolbar-divider" />
              <label className="teacher-search">
                <span className="material-symbols-outlined">search</span>
                <input
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên, email, chuyên môn"
                  value={search}
                />
              </label>
            </div>
          </section>

          {error ? <p className="user-error">{error}</p> : null}

          <section className="student-layout">
            <div className="panel student-table-panel">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Hồ sơ giảng viên</th>
                    <th>Khóa học</th>
                    <th>Chuyên môn</th>
                    <th>Trạng thái</th>
                    <th className="right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTeachers.length ? (
                    displayedTeachers.map((teacher) => {
                      const statusMeta = getStatusMeta(teacher.status);
                      return (
                        <tr
                          aria-selected={selectedTeacher?.id === teacher.id}
                          className={
                            selectedTeacher?.id === teacher.id ? "selected" : ""
                          }
                          key={teacher.id}
                          onClick={() => void loadDetail(teacher.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void loadDetail(teacher.id);
                            }
                          }}
                          tabIndex={0}
                        >
                          <td>
                            <div className="student-profile">
                              <img
                                alt={teacher.name}
                                src={
                                  teacher.avatar ||
                                  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(teacher.email)}`
                                }
                              />
                              <div>
                                <p className="student-name">{teacher.name}</p>
                                <p className="student-email">{teacher.email}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="student-course-badges">
                              {teacher.courses.map((course, index) => (
                                <span
                                  className={`student-course-badge ${getCourseTone(index)}`}
                                  key={course.id}
                                  title={course.title}
                                >
                                  {course.shortLabel}
                                </span>
                              ))}
                              {!teacher.courses.length ? (
                                <span className="teacher-course-empty">Chưa có</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className="teacher-specialization">
                              <strong>{teacher.specialization}</strong>
                              <span>{teacher.experienceYears} năm kinh nghiệm</span>
                            </div>
                          </td>
                          <td>
                            <span className={`student-status ${statusMeta.tone}`}>
                              <span className="dot" />
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="right">
                            <div
                              className="student-actions"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                onClick={() => void loadDetail(teacher.id)}
                                title="Xem chi tiết"
                                type="button"
                              >
                                <span className="material-symbols-outlined">
                                  visibility
                                </span>
                              </button>
                              <button
                                disabled={isSaving}
                                onClick={() => void toggleTeacherLock(teacher)}
                                title={
                                  teacher.status === "suspended"
                                    ? "Mở khóa"
                                    : "Tạm khóa"
                                }
                                type="button"
                              >
                                <span className="material-symbols-outlined">
                                  {teacher.status === "suspended"
                                    ? "lock_open"
                                    : "block"}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="student-empty-row">
                      <td colSpan={5}>Không có giảng viên phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="student-table-footer">
                <p>
                  Hiển thị {displayedTeachers.length} trong tổng số{" "}
                  {pageData.pagination.total} giảng viên
                </p>
              </div>
            </div>

            {isDrawerOpen ? (
              <aside className="panel student-drawer">
                {selectedTeacher ? (
                  <>
                    <div className="student-drawer-header">
                      <div className="student-drawer-profile">
                        <img
                          alt={selectedTeacher.name}
                          src={
                            selectedTeacher.avatar ||
                            `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(selectedTeacher.email)}`
                          }
                        />
                        <div>
                          <h3>{selectedTeacher.name}</h3>
                          <p>{selectedTeacher.email}</p>
                          <span>{selectedTeacher.specialization}</span>
                        </div>
                      </div>
                      <button
                        className="student-drawer-close"
                        onClick={() => setIsDrawerOpen(false)}
                        type="button"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="student-drawer-tabs">
                      <button className="active" type="button">
                        Tổng quan
                      </button>
                      <button type="button">Khóa học</button>
                      <button type="button">Hoạt động</button>
                    </div>

                    <div className="student-drawer-body">
                      <section>
                        <h4>Thông tin chuyên môn</h4>
                        <div className="student-info-grid">
                          <div className="student-info-card">
                            <p>Kinh nghiệm</p>
                            <strong>{selectedTeacher.experienceYears} năm</strong>
                          </div>
                          <div className="student-info-card">
                            <p>Đơn vị công tác</p>
                            <strong>{selectedTeacher.workplace || "Chưa cập nhật"}</strong>
                          </div>
                          <div className="student-info-card">
                            <p>Trình độ</p>
                            <strong>{selectedTeacher.qualification || "Chưa cập nhật"}</strong>
                          </div>
                          <div className="student-info-card">
                            <p>Ngày tham gia</p>
                            <strong>
                              {new Date(selectedTeacher.createdAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </strong>
                          </div>
                        </div>
                        {selectedTeacher.bio ? (
                          <p className="teacher-bio">{selectedTeacher.bio}</p>
                        ) : null}
                      </section>

                      <section>
                        <div className="student-section-header">
                          <h4>Khóa học phụ trách</h4>
                          <span>{selectedTeacher.courses.length} khóa học</span>
                        </div>
                        <div className="student-course-progress-list">
                          {selectedTeacher.courses.map((course) => (
                            <div className="student-course-progress-card" key={course.id}>
                              <div className="student-course-progress-head">
                                <p>{course.title}</p>
                                <span>{course.studentCount} học viên</span>
                              </div>
                              <small>
                                {course.status} · {course.rating || 0} điểm
                              </small>
                            </div>
                          ))}
                          {!selectedTeacher.courses.length ? (
                            <p className="user-muted">Chưa có khóa học phụ trách.</p>
                          ) : null}
                        </div>
                      </section>

                      <section>
                        <h4>Hoạt động gần đây</h4>
                        <div className="student-activity-list">
                          {selectedTeacher.recentActivity.map((activity, index) => (
                            <div
                              className="student-activity-item"
                              key={`${activity.type}-${index}`}
                            >
                              <span className="student-activity-icon primary">
                                <span className="material-symbols-outlined">
                                  {activity.type === "session" ? "event" : "school"}
                                </span>
                              </span>
                              <div>
                                <p>{activity.title}</p>
                                <small>
                                  {new Date(activity.activityTime).toLocaleString(
                                    "vi-VN",
                                  )}
                                </small>
                              </div>
                            </div>
                          ))}
                          {!selectedTeacher.recentActivity.length ? (
                            <p className="user-muted">Chưa có hoạt động gần đây.</p>
                          ) : null}
                        </div>
                      </section>
                    </div>

                    <div className="student-drawer-footer">
                      <button
                        className="student-secondary-button teacher-lock-button"
                        disabled={isSaving}
                        onClick={() => void toggleTeacherLock(selectedTeacher)}
                        type="button"
                      >
                        {selectedTeacher.status === "suspended"
                          ? "Mở khóa truy cập"
                          : "Tạm khóa truy cập"}
                      </button>
                    </div>
                  </>
                ) : null}
              </aside>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}

export default InstructorManagementPage;
