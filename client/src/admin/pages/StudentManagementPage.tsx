import { useTranslation } from "react-i18next";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import { useAdminData } from "../hooks/useAdminData";
import { getAdminData, mutateAdminData } from "../services/adminApi";
import type { AdminPage } from "../adminNavigation";
import { useEffect, useState } from "react";
import "../../index.css";

type StudentManagementPageProps = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

type StudentApiCourse = {
  id: number;
  title: string;
  shortLabel: string;
};

type StudentApiRow = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  courses: StudentApiCourse[];
  progressPercentage: number;
  status: string;
  selected?: boolean;
};

type StudentDetailApi = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  enrolledCourses: Array<{
    id: number;
    title: string;
    progressPercentage: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    activityTime: string;
  }>;
};

type StudentsApiResponse = {
  success: boolean;
  data: {
    summary: {
      totalStudents: { value: number; trend: string };
      activeStudents: { value: number; trend: string };
      newRegistrations: { value: number; trend: string };
      averageProgress: { value: number; trend: string };
    };
    students: StudentApiRow[];
    selectedStudent: StudentDetailApi | null;
    pagination: { total: number };
  };
};

type StudentFilter = "all" | "active" | "suspended" | "inactive";

const studentFilters: Array<{ key: StudentFilter; label: string }> = [
  { key: "all", label: "Tất cả học viên" },
  { key: "active", label: "Đang học" },
  { key: "suspended", label: "Tạm khóa" },
  { key: "inactive", label: "Không hoạt động" },
];

function getStatusMeta(status: string) {
  if (status === "active") {
    return { label: "Đang học", tone: "active" };
  }

  if (status === "suspended") {
    return { label: "Tạm khóa", tone: "suspended" };
  }

  return { label: "Không hoạt động", tone: "inactive" };
}

function getCourseTone(index: number) {
  const tones = ["blue", "purple", "emerald", "amber", "rose", "cyan", "indigo"];
  return tones[index % tones.length];
}

function StudentManagementPage({
  activePage,
  onNavigate,
}: StudentManagementPageProps) {
  const { t } = useTranslation("admin");
  const [activeFilter, setActiveFilter] = useState<StudentFilter>("all");
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const {
    data: pageData,
    error,
    isLoading,
  } = useAdminData<StudentsApiResponse["data"]>("/students");
  const filteredStudentIds =
    pageData?.students
      .map((student) => ({
        ...student,
        status: statusOverrides[student.id] ?? student.status,
      }))
      .filter(
        (student) =>
          activeFilter === "all" || student.status === activeFilter,
      )
      .map((student) => student.id) ?? [];
  const effectiveSelectedStudentId =
    (selectedStudentId !== null && filteredStudentIds.includes(selectedStudentId)
      ? selectedStudentId
      : null) ??
    (pageData?.selectedStudent &&
    filteredStudentIds.includes(pageData.selectedStudent.id)
      ? pageData.selectedStudent.id
      : null) ??
    filteredStudentIds[0] ??
    null;
  const [detailRequest, setDetailRequest] = useState<{
    studentId: number | null;
    data: StudentDetailApi | null;
    error: string;
  }>({ studentId: null, data: null, error: "" });

  useEffect(() => {
    if (!effectiveSelectedStudentId) return;

    const controller = new AbortController();

    getAdminData<StudentDetailApi>(
      `/students/${effectiveSelectedStudentId}`,
      controller.signal,
    )
      .then((data) => {
        setDetailRequest({
          studentId: effectiveSelectedStudentId,
          data,
          error: "",
        });
      })
      .catch((detailRequestError: unknown) => {
        if (
          detailRequestError instanceof Error &&
          detailRequestError.name === "AbortError"
        ) {
          return;
        }

        setDetailRequest({
          studentId: effectiveSelectedStudentId,
          data: null,
          error:
            detailRequestError instanceof Error
              ? detailRequestError.message
              : "Không thể tải thông tin học viên.",
        });
      });

    return () => controller.abort();
  }, [effectiveSelectedStudentId]);

  if (!pageData) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  const displayedStats = [
    {
      title: "Tổng học viên",
      value: String(pageData.summary.totalStudents.value),
      trend: pageData.summary.totalStudents.trend,
      tone: "blue",
      icon: "groups",
    },
    {
      title: "Học viên đang hoạt động",
      value: String(pageData.summary.activeStudents.value),
      trend: pageData.summary.activeStudents.trend,
      tone: "amber",
      icon: "person_play",
    },
    {
      title: "Đăng ký mới",
      value: pageData.summary.newRegistrations.trend,
      trend: "",
      tone: "primary-strong",
      icon: "person_add",
    },
    {
      title: "Tiến độ trung bình",
      value: `${pageData.summary.averageProgress.value}%`,
      trend: pageData.summary.averageProgress.trend,
      tone: "slate",
      icon: "trending_up",
    },
  ];
  const displayedStudents = pageData.students
    .map((student) => ({
      ...student,
      status: statusOverrides[student.id] ?? student.status,
    }))
    .filter(
      (student) =>
        activeFilter === "all" || student.status === activeFilter,
    )
    .map((student) => ({
      ...student,
      avatar:
        student.avatar ||
        `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(student.email)}`,
    }));
  const selectedStudent =
    (detailRequest.studentId === effectiveSelectedStudentId
      ? detailRequest.data
      : null) ??
    (pageData.selectedStudent?.id === effectiveSelectedStudentId
      ? pageData.selectedStudent
      : null);
  const detailError =
    detailRequest.studentId === effectiveSelectedStudentId
      ? detailRequest.error
      : "";
  const isDetailLoading =
    effectiveSelectedStudentId !== null &&
    !selectedStudent &&
    !detailError;

  const selectStudent = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  async function toggleStudentLock(student: StudentApiRow) {
    const nextStatus = student.status === "suspended" ? "active" : "suspended";
    try {
      await mutateAdminData(`/students/${student.id}/status`, "PATCH", {
        status: nextStatus,
      });
      setStatusOverrides((current) => ({
        ...current,
        [student.id]: nextStatus,
      }));
    } catch (updateError) {
      setDetailRequest((current) => ({
        ...current,
        error:
          updateError instanceof Error
            ? updateError.message
            : "Không thể cập nhật trạng thái học viên.",
      }));
    }
  }

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.students")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.students")} />

        <section className="content student-page">
          <div className="hero">
            <p className="eyebrow">Quản trị học viên</p>
            <h1>Danh sách học viên</h1>
            <p className="hero-copy">
              Theo dõi tiến độ học tập, kiểm soát ghi danh và quản lý mức độ
              tương tác của người học trên toàn bộ hệ thống.
            </p>
          </div>

          <section className="stats-grid student-stats-grid">
            {displayedStats.map((stat) => (
              <article key={stat.title} className="panel stat-card student-stat-card">
                <div className="stat-top">
                  <div className={`icon-tile ${stat.tone}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  {stat.trend ? <span className="student-trend">{stat.trend}</span> : null}
                </div>
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">{stat.value}</h2>
              </article>
            ))}
          </section>

          <section className="student-toolbar">
            <div className="student-toolbar-left">
              <div className="student-segments">
                {studentFilters.map((filter) => (
                  <button
                    key={filter.key}
                    className={activeFilter === filter.key ? "active" : ""}
                    type="button"
                    aria-pressed={activeFilter === filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="student-toolbar-divider" />

              <button className="student-filter-button" type="button">
                <span className="material-symbols-outlined">filter_list</span>
                Bộ lọc nâng cao
              </button>
            </div>

            <button className="student-export-button" type="button">
              Xuất danh sách
            </button>
          </section>

          <section className="student-layout">
            <div className="panel student-table-panel">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Hồ sơ học viên</th>
                    <th>Khóa học</th>
                    <th>Tiến độ</th>
                    <th>Trạng thái</th>
                    <th className="right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.length > 0 ? displayedStudents.map((student) => {
                    const statusMeta = getStatusMeta(student.status);

                    return (
                      <tr
                        key={student.email}
                        className={
                          student.id === effectiveSelectedStudentId ? "selected" : ""
                        }
                        tabIndex={0}
                        aria-selected={student.id === effectiveSelectedStudentId}
                        onClick={() => selectStudent(student.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectStudent(student.id);
                          }
                        }}
                      >
                        <td>
                          <div className="student-profile">
                            <img src={student.avatar} alt={student.name} />
                            <div>
                              <p className="student-name">{student.name}</p>
                              <p className="student-email">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="student-course-badges">
                            {student.courses.map((course, index) => (
                              <span
                                key={`${student.email}-${course.id}-${index}`}
                                className={`student-course-badge ${getCourseTone(index)}`}
                              >
                                {course.shortLabel}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="student-progress">
                            <div className="student-progress-meta">
                              <span>{student.progressPercentage}% hoàn thành</span>
                            </div>
                            <div className="student-progress-track">
                              <div
                                className="student-progress-fill"
                                style={{ width: `${student.progressPercentage}%` }}
                              />
                            </div>
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
                              type="button"
                              title="Xem chi tiết"
                              onClick={() => selectStudent(student.id)}
                            >
                              <span className="material-symbols-outlined">
                                visibility
                              </span>
                            </button>
                            <button type="button" title="Chỉnh sửa">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              onClick={() => void toggleStudentLock(student)}
                              type="button"
                              title={student.status === "suspended" ? "Mở khóa" : "Khóa"}
                            >
                              <span className="material-symbols-outlined">
                                {student.status === "suspended" ? "lock_open" : "block"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr className="student-empty-row">
                      <td colSpan={5}>Không có học viên thuộc nhóm này.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="student-table-footer">
                <p>
                  Hiển thị {displayedStudents.length} trong tổng số{" "}
                  {pageData.pagination.total} học viên
                </p>
                <div className="student-pagination">
                  <button type="button">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button type="button">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {isDrawerOpen ? (
            <aside className="panel student-drawer">
              {selectedStudent ? (
              <>
              <div className="student-drawer-header">
                <div className="student-drawer-profile">
                  <img
                    src={
                      selectedStudent.avatar ||
                      `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(selectedStudent.email)}`
                    }
                    alt={selectedStudent.name}
                  />
                  <div>
                    <h3>{selectedStudent.name}</h3>
                    <p>{selectedStudent.email}</p>
                    <span>Học viên đã xác minh</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="student-drawer-close"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="student-drawer-tabs">
                <button className="active" type="button">
                  Tổng quan
                </button>
                <button type="button">Lộ trình</button>
                <button type="button">Nhật ký</button>
              </div>

              <div className="student-drawer-body">
                <section>
                  <h4>Thông tin định danh</h4>
                  <div className="student-info-grid">
                    <div className="student-info-card">
                      <p>Email cá nhân</p>
                      <strong>{selectedStudent.email}</strong>
                    </div>
                    <div className="student-info-card">
                      <p>Ngày ghi danh</p>
                      <strong>
                        {new Date(selectedStudent.createdAt).toLocaleDateString(
                          "vi-VN",
                        )}
                      </strong>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="student-section-header">
                    <h4>Lộ trình đang học</h4>
                    <span>Báo cáo đầy đủ</span>
                  </div>

                  <div className="student-course-progress-list">
                    {selectedStudent.enrolledCourses.map((course) => (
                      <div key={course.title} className="student-course-progress-card">
                        <div className="student-course-progress-head">
                          <p>{course.title}</p>
                          <span>{course.progressPercentage}%</span>
                        </div>
                        <div className="student-progress-track">
                          <div
                            className="student-progress-fill"
                            style={{
                              width: `${course.progressPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4>Hoạt động gần đây</h4>
                  <div className="student-activity-list">
                    {selectedStudent.recentActivity.map((activity) => (
                      <div key={activity.title} className="student-activity-item">
                        <span className="student-activity-icon primary">
                          <span className="material-symbols-outlined">
                            task
                          </span>
                        </span>
                        <div>
                          <p>{activity.title}</p>
                          <small>{new Date(activity.activityTime).toLocaleString("vi-VN")}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="student-drawer-footer">
                <button type="button" className="student-secondary-button">
                  Tạm khóa truy cập
                </button>
                <button type="button" className="student-primary-button">
                  Gửi tin nhắn
                </button>
              </div>
              </>
              ) : (
                <div className={`student-drawer-state${detailError ? " error" : ""}`}>
                  {detailError ||
                    (isDetailLoading
                      ? "Đang tải thông tin học viên..."
                      : "Chưa có thông tin học viên.")}
                </div>
              )}
            </aside>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}

export default StudentManagementPage;
