import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../student/components/Footer";
import StudentHeader from "../../student/components/StudentHeader";
import type { StudentView } from "../../student/types/student.types";
import "../../student/pages/StudentPortalPage.css";

type GuestLayoutProps = {
  activeView: StudentView;
  children: ReactNode;
};

function GuestLayout({ activeView, children }: GuestLayoutProps) {
  const navigate = useNavigate();

  function handleNavigate(view: StudentView) {
    if (view === "home") return navigate("/");
    if (view === "courses") return navigate("/courses");
    if (view === "categories") return navigate("/categories");
    navigate("/student/login");
  }

  return (
    <div className="student-portal public-catalog guest-portal">
      <StudentHeader
        activeView={activeView}
        isGuest
        onNavigate={handleNavigate}
        onOpenAccountDrawer={() => navigate("/student/login")}
        user={null}
      />
      {children}
      <Footer />
    </div>
  );
}

export default GuestLayout;
