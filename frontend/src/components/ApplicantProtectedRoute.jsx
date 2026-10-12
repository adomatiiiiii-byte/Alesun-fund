import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { clearApplicantSession, isTokenExpired } from "../utils/authSession";
import { getDashboardPathForRole } from "../utils/backoffice";

export function ApplicantProtectedRoute({ children, requireOnboardingComplete = false }) {
  const location = useLocation();
  const token = localStorage.getItem("alesun_applicant_token");
  const user = localStorage.getItem("alesun_applicant_user");
  const parsedUser = user ? JSON.parse(user) : null;
  const backofficeToken = localStorage.getItem("alesun_token");
  const backofficeUser = localStorage.getItem("alesun_user");
  const parsedBackofficeUser = backofficeUser ? JSON.parse(backofficeUser) : null;
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(requireOnboardingComplete);

  if (backofficeToken && !isTokenExpired(backofficeToken) && parsedBackofficeUser?.role) {
    return <Navigate to={getDashboardPathForRole(parsedBackofficeUser.role)} replace />;
  }

  if (!token || isTokenExpired(token)) {
    clearApplicantSession();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (parsedUser?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  useEffect(() => {
    if (!requireOnboardingComplete || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.getOnboardingStatus(token)
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setIsLoading(false));
  }, [requireOnboardingComplete, token]);

  if (requireOnboardingComplete) {
    if (isLoading) {
      return null;
    }

    if (!status?.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return children;
}
