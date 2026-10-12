export function getDashboardPathForRole(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin/super";
    case "RISK_ADMIN":
      return "/admin/risk";
    case "FINANCE_ADMIN":
      return "/admin/finance";
    case "AGENT":
      return "/admin/agent";
    case "INVESTOR":
      return "/admin/investor";
    default:
      return "/";
  }
}
