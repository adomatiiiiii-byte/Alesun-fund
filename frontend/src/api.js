export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "http://localhost:4001/api";

async function request(path, { token, headers, body, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validationMessage = Array.isArray(data.issues) && data.issues.length
      ? data.issues.map((issue) => issue.message).join(". ")
      : "";
    const error = new Error(validationMessage || data.message || "Request failed");
    if (Array.isArray(data.issues)) {
      error.issues = data.issues;
    }
    throw error;
  }
  return data;
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body }),
  adminLogin: (body) => request("/auth/admin/login", { method: "POST", body }),
  forgotPassword: (body) => request("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body) => request("/auth/reset-password", { method: "POST", body }),
  changePassword: (token, body) => request("/auth/change-password", { method: "POST", token, body }),
  logout: (token, body) => request("/auth/logout", { method: "POST", token, body }),
  register: (body) => request("/auth/register", { method: "POST", body }),
  me: (token) => request("/auth/me", { token }),
  applicantRegister: (body) => request("/public/auth/register", { method: "POST", body }),
  applicantLogin: (body) => request("/public/auth/login", { method: "POST", body }),
  applicantLogout: (token, body) => request("/public/auth/logout", { method: "POST", token, body }),
  applicantMe: (token) => request("/public/auth/me", { token }),
  getOnboardingStatus: (token) => request("/onboarding/status", { token }),
  saveOnboardingStep1: (token, body) => request("/onboarding/step1", { method: "POST", token, body }),
  saveOnboardingStep2: (token, body) => request("/onboarding/step2", { method: "POST", token, body }),
  submitOnboardingStep3: (token, body) => request("/onboarding/step3", { method: "POST", token, body }),
  getMyAccount: (token) => request("/user/my-account", { token }),
  getLoanEligibility: (token) => request("/user/loan-eligibility", { token }),
  getLoanPricing: (token, amount) => request(`/user/loan-pricing?amount=${encodeURIComponent(amount)}`, { token }),
  getLoanRequestStatus: (token) => request("/user/loan-request/status", { token }),
  submitLoanRequest: (token, body) => request("/user/loan-request", { method: "POST", token, body }),
  getAgentStatus: (token) => request("/user/agent/status", { token }),
  registerAsAgent: (token, body) => request("/user/agent/register", { method: "POST", token, body }),
  getAgentDashboard: (token) => request("/user/agent/dashboard", { token }),
  withdrawAgentFunds: (token, body) => request("/user/agent/withdraw", { method: "POST", token, body }),
  sendMyAccountMessage: (token, body) => request("/user/my-account/messages", { method: "POST", token, body }),
  submitPublicApplication: (token, formData) =>
    request("/public/applications", { method: "POST", token, body: formData }),
  getMyPublicApplications: (token) => request("/public/applications/mine", { token }),
  getPortfolio: (token) => request("/dashboard/portfolio", { token }),
  getAccountingOverview: (token) => request("/admin/accounting/overview", { token }),
  getGeoHeatmapData: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/geo/heatmap-data${suffix}`, { token });
  },
  getGeoAgents: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/geo/agents${suffix}`, { token });
  },
  getGeoRisk: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/geo/risk${suffix}`, { token });
  },
  getInvestorOverview: (token) => request("/admin/investor/overview", { token }),
  getInvestorGeoSummary: (token) => request("/investor/geo-summary", { token }),
  createBackofficeAccount: (token, body) => request("/auth/backoffice/accounts", { method: "POST", token, body }),
  manualPasswordReset: (token, body) => request("/admin/manual-password-reset", { method: "POST", token, body }),
  getAdminApplications: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/admin/applications${suffix}`, { token });
  },
  getAdminLoanRequests: (token) => request("/admin/loan-requests", { token }),
  updateAdminLoanRequestStatus: (token, id, body) =>
    request(`/admin/loan-requests/${id}/status`, { method: "POST", token, body }),
  getAdminUsers: (token) => request("/admin/users", { token }),
  getAdminAgents: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/admin/agents${suffix}`, { token });
  },
  createAdminAgent: (token, body) => request("/admin/agents/create", { method: "POST", token, body }),
  getAdminAgentDetail: (token, id) => request(`/admin/agents/${id}`, { token }),
  updateAdminAgentApplication: (token, id, body) =>
    request(`/admin/agents/applications/${id}/status`, { method: "POST", token, body }),
  updateAdminAgentStatus: (token, id, body) =>
    request(`/admin/agents/${id}/status`, { method: "POST", token, body }),
  getAdminUserDetail: (token, id) => request(`/admin/users/${id}/details`, { token }),
  sendAdminUserMessage: (token, id, body) =>
    request(`/admin/users/${id}/messages`, { method: "POST", token, body }),
  updateAdminUserVerification: (token, id, body) =>
    request(`/admin/users/${id}/verification`, { method: "POST", token, body }),
  reassignAdminUserAgent: (token, id, body) =>
    request(`/admin/users/${id}/assigned-agent`, { method: "POST", token, body }),
  submitAdminDecision: (token, body) =>
    request("/admin/decision", { method: "POST", token, body }),
  getBusiness: (token, id) => request(`/businesses/${id}`, { token }),
  getAuditSummary: (token) => request("/audit-logs/summary", { token }),
  getAuditLogs: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/audit-logs/logs${suffix}`, { token });
  },
  getAdminAuditTrail: (token, filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
    );
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/admin/audit-trail${suffix}`, { token });
  },
  getLoans: (token) => request("/loans", { token }),
  createLoan: (token, body) => request("/loans", { method: "POST", token, body }),
  disburseLoan: (token, id) => request(`/loans/${id}/disburse`, { method: "PATCH", token }),
  recordPayment: (token, id, body) =>
    request(`/loans/${id}/payments`, { method: "POST", token, body }),
  getAssignedVerifications: (token) => request("/verification-reports/assigned", { token }),
  submitVerification: (token, formData) =>
    request("/verification-reports", { method: "POST", token, body: formData })
};
