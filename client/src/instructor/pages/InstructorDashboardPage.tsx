import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { instructorApiRequest } from "../api/instructorApi";
import { getInstructorAuthTeacherId } from "../auth/instructorAuth";
import InstructorLayout from "../components/InstructorLayout";
import {
  analyticsBars,
  coursePerformance,
  dashboardStats,
  studentSignals,
  teachingSchedule,
} from "../data/instructorMockData";

const DEFAULT_TEACHER_ID = getInstructorAuthTeacherId();

type DashboardStat = (typeof dashboardStats)[number];
type TeachingScheduleItem = (typeof teachingSchedule)[number];
type AnalyticsBar = (typeof analyticsBars)[number];
type CoursePerformanceItem = (typeof coursePerformance)[number] & {
  id?: number;
};
type StudentSignal = (typeof studentSignals)[number] & {
  id?: number;
};

type InstructorDashboardApiResponse = {
  success: boolean;
  data: {
    teacherId: number;
    profile: {
      name: string;
      role: string;
      avatar: string | null;
      workplace?: string | null;
    };
    dashboardStats: DashboardStat[];
    teachingSchedule: TeachingScheduleItem[];
    analyticsBars: AnalyticsBar[];
    coursePerformance: CoursePerformanceItem[];
    studentSignals: StudentSignal[];
    generatedAt: string;
  };
};

function InstructorDashboardPage() {
  const { t } = useTranslation("instructor");
  const [dashboard, setDashboard] =
    useState<InstructorDashboardApiResponse["data"] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const payload = await instructorApiRequest<InstructorDashboardApiResponse>(
          "/api/instructor/dashboard",
          {
            query: { teacherId: DEFAULT_TEACHER_ID },
            signal: controller.signal,
          },
        );

        if (!payload.success) {
          throw new Error("Instructor dashboard API returned unsuccessful response.");
        }

        setDashboard(payload.data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error(error);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, []);

  const displayedDashboardStats = dashboard?.dashboardStats ?? dashboardStats;
  const displayedTeachingSchedule = dashboard?.teachingSchedule ?? teachingSchedule;
  const displayedAnalyticsBars = dashboard?.analyticsBars ?? analyticsBars;
  const displayedCoursePerformance: CoursePerformanceItem[] =
    dashboard?.coursePerformance ?? coursePerformance;
  const displayedStudentSignals: StudentSignal[] = dashboard?.studentSignals ?? studentSignals;
  const instructorName = dashboard?.profile.name ?? "thầy Minh Anh";

  return (
    <InstructorLayout activePage="dashboard" profile={dashboard?.profile}>
      <section className="instructor-hero">
        <div>
          <p className="instructor-eyebrow">{t("dashboardPage.eyebrow")}</p>
          <h2>{t("dashboardPage.title", { name: instructorName })}</h2>
          <p>
            Theo dõi lịch dạy, tiến độ học viên, hiệu suất khóa học và các bài
            cần xử lý trong một không gian quản lý rõ ràng.
          </p>
        </div>
        <NavLink className="instructor-primary-button" to="/instructor/courses?importLessons=1">
          <span className="material-symbols-outlined">auto_stories</span>
          Chuẩn bị bài học hôm nay
        </NavLink>
      </section>

      <section className="instructor-stat-grid" aria-label={t("dashboardPage.statsLabel")}>
        {displayedDashboardStats.map((stat) => (
          <article className="instructor-stat-card" key={stat.label}>
            <div className={`instructor-stat-icon ${stat.tone}`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p>{stat.label}</p>
            <div>
              <strong>{stat.value}</strong>
              <span>{stat.change}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="instructor-dashboard-grid">
        <article className="instructor-panel instructor-schedule-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("dashboardPage.todayEyebrow")}</p>
              <h3>{t("dashboardPage.scheduleTitle")}</h3>
            </div>
            <span className="material-symbols-outlined">calendar_month</span>
          </div>

          <div className="instructor-schedule-list">
            {displayedTeachingSchedule.length === 0 ? (
              <p className="instructor-empty-state">Chưa có buổi học sắp tới.</p>
            ) : (
              displayedTeachingSchedule.map((item) => (
                <div className="instructor-schedule-item" key={`${item.time}-${item.title}`}>
                  <time>{item.time}</time>
                  <div>
                    <h4>{item.title}</h4>
                    <p>
                      {item.batch} · {item.mode}
                    </p>
                  </div>
                  <span>{item.status}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="instructor-panel instructor-analytics-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("dashboardPage.interactionEyebrow")}</p>
              <h3>{t("dashboardPage.weeklyActivityTitle")}</h3>
            </div>
            <strong>+14%</strong>
          </div>

          <div className="instructor-bar-chart">
            {displayedAnalyticsBars.map((bar) => (
              <div className="instructor-bar-column" key={bar.label}>
                <span style={{ height: `${bar.value}%` }} />
                <p>{bar.label}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="instructor-content-grid">
        <article className="instructor-panel instructor-course-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("dashboardPage.courseEyebrow")}</p>
              <h3>{t("dashboardPage.performanceTitle")}</h3>
            </div>
            <NavLink className="instructor-ghost-button" to="/instructor/courses">
              {t("commonActions.all")}
            </NavLink>
          </div>

          <div className="instructor-course-list">
            {displayedCoursePerformance.length === 0 ? (
              <p className="instructor-empty-state">Chưa có dữ liệu hiệu suất khóa học.</p>
            ) : (
              displayedCoursePerformance.map((course) => (
                <NavLink
                  className="instructor-course-row"
                  key={course.title}
                  to={course.id ? `/instructor/courses?courseId=${course.id}` : "/instructor/courses"}
                >
                  <div>
                    <h4>{course.title}</h4>
                    <p>{course.category}</p>
                  </div>
                  <div className="instructor-course-meta">
                    <span>{course.students} học viên</span>
                    <span>{course.rating} đánh giá</span>
                    <span>{course.revenue}</span>
                  </div>
                  <div className="instructor-progress-track">
                    <span style={{ width: `${course.completion}%` }} />
                  </div>
                  <strong>{course.completion}%</strong>
                  <em>{course.status}</em>
                </NavLink>
              ))
            )}
          </div>
        </article>

        <article className="instructor-panel instructor-student-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("dashboardPage.studentSignalsEyebrow")}</p>
              <h3>{t("dashboardPage.studentSignalsTitle")}</h3>
            </div>
            <span className="material-symbols-outlined">school</span>
          </div>

          <div className="instructor-student-list">
            {displayedStudentSignals.length === 0 ? (
              <p className="instructor-empty-state">Chưa có học viên cần theo dõi.</p>
            ) : (
              displayedStudentSignals.map((student) => {
                const studentDetailQuery = student.id
                  ? `studentId=${student.id}`
                  : `studentName=${encodeURIComponent(student.name)}`;

                return (
                <NavLink
                  className="instructor-student-item"
                  key={`${student.name}-${student.course}`}
                  to={`/instructor/students?${studentDetailQuery}`}
                >
                  <div className="instructor-student-avatar">
                    {student.name
                      .split(" ")
                      .slice(-2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <h4>{student.name}</h4>
                    <p>{student.course}</p>
                    <span>{student.note}</span>
                  </div>
                  <strong>{student.progress}%</strong>
                </NavLink>
                );
              })
            )}
          </div>
        </article>
      </section>
    </InstructorLayout>
  );
}

export default InstructorDashboardPage;
