import { useNavigate } from "react-router-dom";
import GuestLayout from "../components/GuestLayout";
import HomePage from "../../student/views/HomePage";
import type { StudentView } from "../../student/types/student.types";

function GuestHomePage() {
  const navigate = useNavigate();

  function handleNavigate(view: StudentView) {
    if (view === "courses") return navigate("/courses");
    if (view === "categories") return navigate("/categories");
    navigate("/");
  }

  return (
    <GuestLayout activeView="home">
      <HomePage onNavigate={handleNavigate} />
    </GuestLayout>
  );
}

export default GuestHomePage;
