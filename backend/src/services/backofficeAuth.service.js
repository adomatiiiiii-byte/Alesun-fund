const BACKOFFICE_ROLES = ["SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN", "AGENT", "INVESTOR"];

function normalizeRole(role) {
  if (role === "ADMIN") {
    return "SUPER_ADMIN";
  }

  if (role === "CREDIT_OFFICER") {
    return "RISK_ADMIN";
  }

  return role;
}

function isBackofficeRole(role) {
  return BACKOFFICE_ROLES.includes(normalizeRole(role));
}

function getDashboardPathForRole(role) {
  switch (normalizeRole(role)) {
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

async function resolveLinkedEntityId(prismaClient, user) {
  const normalizedRole = normalizeRole(user.role);

  if (normalizedRole === "AGENT") {
    const agent = await prismaClient.agent.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    return agent?.id || null;
  }

  if (normalizedRole === "INVESTOR") {
    const investor = await prismaClient.investor.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    return investor?.id || null;
  }

  return null;
}

module.exports = {
  BACKOFFICE_ROLES,
  normalizeRole,
  isBackofficeRole,
  getDashboardPathForRole,
  resolveLinkedEntityId
};
