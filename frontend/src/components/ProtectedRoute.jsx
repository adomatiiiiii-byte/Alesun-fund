import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { isTokenExpired } from "../utils/authSession";
import { getDashboardPathForRole } from "../utils/backoffice";

export function ProtectedRoute({ children, allowedRoles = [], redirectUnauthorizedTo = null }) {
  const { token, user } = useAuth();
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("alesun_token");
    localStorage.removeItem("alesun_user");
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={redirectUnauthorizedTo || getDashboardPathForRole(user?.role)} replace />;
  }

  return children;
}
