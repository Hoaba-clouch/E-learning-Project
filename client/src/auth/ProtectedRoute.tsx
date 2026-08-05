import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "./auth.types";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
  loginPath?: string;
};

const roleHomePaths: Record<UserRole, string> = {
  ADMIN: "/admin",
  STUDENT: "/student",
  TEACHER: "/student",
};

function ProtectedRoute({
  allowedRoles,
  children,
  loginPath = "/student/login",
}: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return <div className="route-loading">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to={loginPath} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate replace to={roleHomePaths[user.role]} />;
  }

  return children;
}

export default ProtectedRoute;
