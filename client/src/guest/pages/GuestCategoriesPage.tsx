import { useNavigate } from "react-router-dom";
import GuestLayout from "../components/GuestLayout";
import CategoriesPage from "../../student/views/CategoriesPage";

function GuestCategoriesPage() {
  const navigate = useNavigate();

  return (
    <GuestLayout activeView="categories">
      <CategoriesPage onOpenCourse={(id) => navigate(`/courses/${id}`)} />
    </GuestLayout>
  );
}

export default GuestCategoriesPage;
