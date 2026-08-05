import { useNavigate, useParams } from "react-router-dom";
import GuestLayout from "../components/GuestLayout";
import CourseDetailPage from "../../student/views/CourseDetailPage";
import CoursesPage from "../../student/views/CoursesPage";

function GuestCatalogPage() {
  const navigate = useNavigate();
  const parsedCourseId = Number(useParams().courseId);
  const hasCourseId = Number.isInteger(parsedCourseId) && parsedCourseId > 0;

  return (
    <GuestLayout activeView="courses">
      {hasCourseId ? (
        <CourseDetailPage
          courseId={parsedCourseId}
          isPublic
          onBack={() => navigate("/courses")}
          onOpenInstructor={(id) => navigate(`/instructors/${id}`)}
          onRequireLogin={() => navigate("/student/login")}
        />
      ) : (
        <CoursesPage onOpenCourse={(id) => navigate(`/courses/${id}`)} />
      )}
    </GuestLayout>
  );
}

export default GuestCatalogPage;
