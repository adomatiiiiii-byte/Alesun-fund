import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ApplicantProtectedRoute } from "./components/ApplicantProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoansPage } from "./pages/LoansPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { SmeProfilePage } from "./pages/SmeProfilePage";
import { ApplicantPortalPage } from "./pages/ApplicantPortalPage";
import { MyAccountPage } from "./pages/MyAccountPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { UsersPage } from "./pages/UsersPage";
import { AccountingPage } from "./pages/AccountingPage";
import { AdminMessagesPage } from "./pages/AdminMessagesPage";
import { AgentRegistrationPage } from "./pages/AgentRegistrationPage";
import { AgentDashboardPage } from "./pages/AgentDashboardPage";
import { AdminAgentsPage } from "./pages/AdminAgentsPage";
import { InvestorDashboardPage } from "./pages/InvestorDashboardPage";
import { CreateAccountPage } from "./pages/CreateAccountPage";
import { AdminGeoIntelligencePage } from "./pages/AdminGeoIntelligencePage";
import { AdminTrailPage } from "./pages/AdminTrailPage";
import { getDashboardPathForRole } from "./utils/backoffice";

function BackofficeHome() {
  const storedUser = localStorage.getItem("alesun_user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  return <Navigate to={user ? getDashboardPathForRole(user.role) : "/admin/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage portal="applicant" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/staff/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage portal="admin" />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/apply"
        element={
          <ApplicantProtectedRoute requireOnboardingComplete>
            <ApplicantPortalPage />
          </ApplicantProtectedRoute>
        }
      />
      <Route
        path="/my-account"
        element={
          <ApplicantProtectedRoute requireOnboardingComplete>
            <MyAccountPage />
          </ApplicantProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ApplicantProtectedRoute>
            <OnboardingPage />
          </ApplicantProtectedRoute>
        }
      />
      <Route
        path="/agent/register"
        element={
          <ApplicantProtectedRoute requireOnboardingComplete>
            <AgentRegistrationPage />
          </ApplicantProtectedRoute>
        }
      />
      <Route
        path="/agent/dashboard"
        element={
          <Navigate to="/admin/agent" replace />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<BackofficeHome />} />
        <Route path="/admin/super" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin/risk" element={<ProtectedRoute allowedRoles={["RISK_ADMIN", "SUPER_ADMIN"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={["FINANCE_ADMIN", "SUPER_ADMIN"]}><AccountingPage /></ProtectedRoute>} />
        <Route path="/admin/agent" element={<ProtectedRoute allowedRoles={["AGENT"]}><AgentDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/investor" element={<ProtectedRoute allowedRoles={["INVESTOR", "SUPER_ADMIN"]}><InvestorDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/create-account" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><CreateAccountPage /></ProtectedRoute>} />
        <Route path="/admin/super/trail" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} redirectUnauthorizedTo="/admin/login"><AdminTrailPage /></ProtectedRoute>} />
        <Route path="/admin/accounting" element={<ProtectedRoute allowedRoles={["FINANCE_ADMIN", "SUPER_ADMIN"]}><AccountingPage /></ProtectedRoute>} />
        <Route path="/admin/geo-intelligence" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN"]}><AdminGeoIntelligencePage /></ProtectedRoute>} />
        <Route path="/admin/agents" element={<ProtectedRoute allowedRoles={["RISK_ADMIN", "SUPER_ADMIN"]}><AdminAgentsPage /></ProtectedRoute>} />
        <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AdminMessagesPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={["RISK_ADMIN", "SUPER_ADMIN"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/loans" element={<ProtectedRoute allowedRoles={["RISK_ADMIN", "FINANCE_ADMIN", "SUPER_ADMIN"]}><LoansPage /></ProtectedRoute>} />
        <Route path="/businesses/:businessId" element={<ProtectedRoute allowedRoles={["RISK_ADMIN", "SUPER_ADMIN"]}><SmeProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
