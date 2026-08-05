import { useTranslation } from "react-i18next";
import logo from "../../assets/logo-learnX.png";
import AdminDataState from "../components/AdminDataState";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import { useAdminData } from "../hooks/useAdminData";
import type { AdminPage } from "../adminNavigation";
import "../../index.css";

type AdminDashboardPageProps = {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
};

const growthToneMap = {
  admin: "primary",
  instructor: "amber",
  student: "slate",
};

const activityToneMap = {
  order_paid: "amber",
  course_created: "primary",
  user_joined: "primary",
  review_added: "danger",
};

const activityIconMap = {
  order_paid: "shopping_cart",
  course_created: "library_books",
  user_joined: "person_add",
  review_added: "rate_review",
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function formatRoleLabel(value: string) {
  if (value === "admin") return "Quản trị viên";
  if (value === "instructor") return "Giảng viên";
  if (value === "student") return "Học viên";

  return value;
}

function normalizeBars(items: { label: string; revenue: number }[]) {
  const maxRevenue = Math.max(...items.map((item) => item.revenue), 1);

  return items.map((item, index) => ({
    ...item,
    height:
      item.revenue === 0
        ? 0
        : Math.max(8, Math.round((item.revenue / maxRevenue) * 100)),
    isZero: item.revenue === 0,
    active: index === items.length - 1,
    tooltip: formatCurrency(item.revenue),
  }));
}

type Trend = {
  value: string;
  direction: "up" | "down" | "neutral";
};

type DashboardApiResponse = {
  success: boolean;
  data: {
    summary: {
      totalUsers: { value: number; trend: Trend };
      totalStudents?: { value: number; trend: Trend };
      totalRevenue: { value: number; trend: Trend };
      activeCourses: { value: number; trend: Trend };
      completionRate: { value: number; trend: Trend };
      unresolvedAlerts?: { value: number; trend: Trend };
    };
    revenueTrajectory: { label: string; revenue: number }[];
    userGrowth: { label: string; total: number; percentage: number }[];
    topCourses: {
      id: number;
      title: string;
      thumbnail: string | null;
      instructorName: string;
      students: number;
      revenue: number;
      rating: number;
      badge: string;
    }[];
    recentActivity: {
      id: string;
      type: string;
      title: string;
      description: string;
      createdAt: string;
    }[];
    generatedAt: string;
  };
};

function AdminDashboardPage({
  activePage,
  onNavigate,
}: AdminDashboardPageProps) {
  const { t } = useTranslation("admin");
  const {
    data: dashboard,
    error,
    isLoading,
  } = useAdminData<DashboardApiResponse["data"]>("/dashboard");

  if (!dashboard) {
    return <AdminDataState error={error} isLoading={isLoading} />;
  }

  const stats = [
        {
          title: "Tổng người dùng",
          value: formatCompactNumber(dashboard.summary.totalUsers.value),
          trend: dashboard.summary.totalUsers.trend.value,
          trendType: dashboard.summary.totalUsers.trend.direction,
          accent: "blue",
          icon: "group",
        },
        {
          title: "Tổng doanh thu",
          value: formatCurrency(dashboard.summary.totalRevenue.value),
          trend: dashboard.summary.totalRevenue.trend.value,
          trendType: dashboard.summary.totalRevenue.trend.direction,
          accent: "amber",
          icon: "payments",
        },
        {
          title: "Tổng học viên",
          value: formatCompactNumber(
            dashboard.summary.totalStudents?.value ??
              dashboard.userGrowth.find((item) => item.label === "STUDENT")?.total ??
              0,
          ),
          trend: dashboard.summary.totalStudents?.trend.value ?? "",
          trendType:
            dashboard.summary.totalStudents?.trend.direction ?? "neutral",
          accent: "blue",
          icon: "school",
        },
        {
          title: "Tổng khóa học",
          value: String(dashboard.summary.activeCourses.value),
          trend: dashboard.summary.activeCourses.trend.value,
          trendType: dashboard.summary.activeCourses.trend.direction,
          accent: "slate",
          icon: "library_books",
        },
        {
          title: "Tỷ lệ hoàn thành",
          value: `${dashboard.summary.completionRate.value}%`,
          trend: dashboard.summary.completionRate.trend.value,
          trendType: dashboard.summary.completionRate.trend.direction,
          accent: "gold",
          icon: "star",
        },
        {
          title: "Cảnh báo chưa xử lý",
          value: String(dashboard.summary.unresolvedAlerts?.value ?? 0),
          trend: dashboard.summary.unresolvedAlerts?.trend.value ?? "",
          trendType:
            dashboard.summary.unresolvedAlerts?.trend.direction ?? "neutral",
          accent: "amber",
          icon: "warning",
        },
      ];

  const revenueBars = normalizeBars(dashboard.revenueTrajectory);

  const growthChannels = dashboard.userGrowth.map((item) => ({
        name: formatRoleLabel(item.label),
        value: `${item.percentage}%`,
        width: `${Math.max(item.percentage, 6)}%`,
        tone:
          growthToneMap[item.label as keyof typeof growthToneMap] ?? "soft",
      }));

  const courses = dashboard.topCourses.map((course) => ({
        title: course.title,
        meta: `bởi ${course.instructorName} - ${formatCompactNumber(course.students)} học viên`,
        revenue: formatCurrency(course.revenue),
        badge:
          course.badge === "Top Earner"
            ? "Doanh thu cao nhất"
            : course.badge === "Highly Rated"
              ? "Đánh giá cao"
              : "Xu hướng",
        badgeTone:
          course.badge === "Top Earner"
            ? "success"
            : course.badge === "Highly Rated"
              ? "primary"
              : "muted",
        image: course.thumbnail || logo,
      }));

  const activities = dashboard.recentActivity.map((activity) => ({
        title: activity.title,
        body: activity.description,
        time: formatRelativeTime(activity.createdAt),
        icon:
          activityIconMap[activity.type as keyof typeof activityIconMap] ??
          "notifications",
        tone:
          activityToneMap[activity.type as keyof typeof activityToneMap] ??
          "primary",
      }));

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        description={t("descriptions.dashboard")}
        onNavigate={onNavigate}
      />

      <main className="main-panel">
        <AdminTopbar searchPlaceholder={t("search.dashboard")} />

        <section className="content">
          <div className="hero">
            <p className="eyebrow">Báo cáo tháng</p>
            <h1>Tổng quan nền tảng</h1>
            <p className="hero-copy">
              Theo dõi nhanh hiệu suất vận hành của hệ thống e-learning trong
              tháng này.
            </p>
          </div>

          <section className="stats-grid">
            {stats.map((stat) => (
              <article key={stat.title} className="panel stat-card">
                <div className="stat-top">
                  <div className={`icon-tile ${stat.accent}`}>
                    <span className="material-symbols-outlined">
                      {stat.icon}
                    </span>
                  </div>
                  <span className={`trend ${stat.trendType}`}>
                    {stat.trendType === "up" && (
                      <span className="material-symbols-outlined">
                        trending_up
                      </span>
                    )}
                    {stat.trendType === "down" && (
                      <span className="material-symbols-outlined">
                        trending_down
                      </span>
                    )}
                    {stat.trend}
                  </span>
                </div>
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">{stat.value}</h2>
              </article>
            ))}
          </section>

          <section className="charts-grid">
            <article className="panel revenue-panel">
              <div className="panel-header">
                <div>
                  <h3>Biến động doanh thu</h3>
                  <p>Doanh thu theo tháng lấy từ các đơn hàng đã thanh toán</p>
                </div>
                <div className="segmented">
                  <button className="active" type="button">
                    Doanh thu
                  </button>
                  <button type="button" disabled>
                    Người dùng
                  </button>
                </div>
              </div>

              <div className="bar-chart">
                {revenueBars.map((bar) => (
                  <div key={bar.label} className="bar-column">
                    <div
                      className={`bar${bar.active ? " active" : ""}${bar.isZero ? " zero" : ""}`}
                      style={{ height: `${bar.height}%` }}
                      tabIndex={0}
                      aria-label={`${bar.label}: ${bar.tooltip}`}
                    >
                      <span className="tooltip">{bar.tooltip}</span>
                    </div>
                    <span className={`bar-label${bar.active ? " active" : ""}`}>
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel growth-panel">
              <div className="panel-header compact">
                <div>
                  <h3>Tăng trưởng người dùng</h3>
                  <p>Phân bố tài khoản theo vai trò</p>
                </div>
              </div>

              <div className="progress-list">
                {growthChannels.map((channel) => (
                  <div key={channel.name} className="progress-item">
                    <div className="progress-row">
                      <span>{channel.name}</span>
                      <span>{channel.value}</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${channel.tone}`}
                        style={{ width: channel.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel list-panel">
              <div className="panel-header">
                <div>
                  <h3>Khóa học nổi bật</h3>
                </div>
                <a href="#">Xem tất cả</a>
              </div>

              <div className="course-list">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course.title} className="course-item">
                      <img src={course.image} alt={course.title} />
                      <div className="course-copy">
                        <h4>{course.title}</h4>
                        <p>{course.meta}</p>
                      </div>
                      <div className="course-metric">
                        <strong>{course.revenue}</strong>
                        <span className={course.badgeTone}>{course.badge}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Chưa có dữ liệu khóa học nổi bật.</p>
                )}
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <h3>Hoạt động hệ thống</h3>
                </div>
                <span className="live-pill">
                  <span className="live-dot" />
                  Trực tiếp
                </span>
              </div>

              <div className="timeline">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={`${activity.title}-${activity.time}`} className="timeline-item">
                      <div className={`timeline-icon ${activity.tone}`}>
                        <span className="material-symbols-outlined">
                          {activity.icon}
                        </span>
                      </div>
                      <div className="timeline-copy">
                        <h4>{activity.title}</h4>
                        <p>{activity.body}</p>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Chưa có hoạt động gần đây.</p>
                )}
              </div>
            </article>
          </section>
        </section>
      </main>

      <button className="fab" type="button" aria-label="Tạo mới">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}

export default AdminDashboardPage;
