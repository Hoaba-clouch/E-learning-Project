import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import { hasInstructorAuthSession } from "../instructor/auth/instructorAuth";
import InstructorAnalyticsPage from "../instructor/pages/InstructorAnalyticsPage";
import InstructorAuthPage from "../instructor/pages/InstructorAuthPage";
import InstructorCourseManagementPage from "../instructor/pages/InstructorCourseManagementPage";
import InstructorDashboardPage from "../instructor/pages/InstructorDashboardPage";
import InstructorInteractionPage from "../instructor/pages/InstructorInteractionPage";
import InstructorProfilePage from "../instructor/pages/InstructorProfilePage";
import InstructorQuizTestsPage from "../instructor/pages/InstructorQuizTestsPage";
import InstructorStudentsPage from "../instructor/pages/InstructorStudentsPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import CourseManagementPage from "../admin/pages/CourseManagementPage";
import GeneralContentPage from "../admin/pages/GeneralContentPage";
import StudentManagementPage from "../admin/pages/StudentManagementPage";
import SystemConfigurationPage from "../admin/pages/SystemConfigurationPage";
import InstructorManagementPage from "../admin/pages/InstructorManagementPage";
import {
  adminPagePaths,
  getAdminPageFromPath,
  type AdminPage,
} from "../admin/adminNavigation";
import AdminLoginPage from "../admin/pages/AdminLoginPage";
import GuestCatalogPage from "../guest/pages/GuestCatalogPage";
import GuestCategoriesPage from "../guest/pages/GuestCategoriesPage";
import GuestHomePage from "../guest/pages/GuestHomePage";
import GuestInstructorPage from "../guest/pages/GuestInstructorPage";
import StudentLoginPage from "../student/pages/StudentLoginPage";
import StudentPortalPage from "../student/pages/StudentPortalPage";
import StudentRegisterPage from "../student/pages/StudentRegisterPage";
import PaymentReturnPage from "../student/views/PaymentReturnPage";

function AdminPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = getAdminPageFromPath(location.pathname);

  if (!activePage) {
    return <Navigate replace to="/admin" />;
  }

  const onNavigate = (page: AdminPage) => {
    navigate(adminPagePaths[page]);
  };
  const pageProps = { activePage, onNavigate };

  if (activePage === "teachers") {
    return <InstructorManagementPage {...pageProps} />;
  }
  if (activePage === "students") {
    return <StudentManagementPage {...pageProps} />;
  }
  if (activePage === "courses") {
    return <CourseManagementPage {...pageProps} />;
  }
  if (activePage === "system") {
    return <SystemConfigurationPage {...pageProps} />;
  }
  if (activePage === "content") {
    return <GeneralContentPage {...pageProps} />;
  }

  return <AdminDashboardPage {...pageProps} />;
}

function StudentRoutes() {
  return (
    <>
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route path="/student/register" element={<StudentRegisterPage />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentPortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/payment-return"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <PaymentReturnPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}

function InstructorPrivateRoute() {
  return hasInstructorAuthSession() ? <Outlet /> : <Navigate to="/instructor/login" replace />;
}

function InstructorRoutes() {
  return (
    <>
      <Route path="/instructor/login" element={<InstructorAuthPage mode="login" />} />
      <Route path="/instructor/register" element={<InstructorAuthPage mode="register" />} />
      <Route element={<InstructorPrivateRoute />}>
        <Route path="/instructor" element={<InstructorDashboardPage />} />
        <Route path="/instructor/courses" element={<InstructorCourseManagementPage />} />
        <Route path="/instructor/quizzes" element={<InstructorQuizTestsPage />} />
        <Route path="/instructor/students" element={<InstructorStudentsPage />} />
        <Route path="/instructor/interaction" element={<InstructorInteractionPage />} />
        <Route path="/instructor/analytics" element={<InstructorAnalyticsPage />} />
        <Route path="/instructor/profile" element={<InstructorProfilePage />} />
      </Route>
    </>
  );
}

function AdminRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]} loginPath="/admin/login">
            <AdminPortal />
          </ProtectedRoute>
        }
      />
    </>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<GuestHomePage />} />
      <Route path="/courses" element={<GuestCatalogPage />} />
      <Route path="/courses/:courseId" element={<GuestCatalogPage />} />
      <Route path="/categories" element={<GuestCategoriesPage />} />
      <Route
        path="/instructors/:teacherId"
        element={<GuestInstructorPage />}
      />
      {StudentRoutes()}
      {InstructorRoutes()}
      {AdminRoutes()}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
