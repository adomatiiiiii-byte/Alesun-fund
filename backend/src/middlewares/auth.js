const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");
const { normalizeRole, resolveLinkedEntityId } = require("../services/backofficeAuth.service");
const { createAuditLog } = require("../services/auditService");
const { AUDIT_ENTITY_TYPES, extractRequestAuditContext } = require("../services/auditLog.service");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = jwt.verify(token, jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, loginId: true, role: true, fullName: true, isActive: true, status: true, lastLoginAt: true, mustChangePassword: true }
    });

    if (!user || !user.isActive || user.status !== "ACTIVE") {
      return res.status(401).json({ message: "Your account is not active. Please contact Alesun Fund." });
    }

    req.user = {
      ...user,
      role: normalizeRole(user.role),
      rawRole: user.role,
      linkedEntityId: await resolveLinkedEntityId(prisma, user)
    };

    if (["AGENT", "INVESTOR"].includes(req.user.role) && !req.user.linkedEntityId) {
      return res.status(401).json({ message: "Your account is not active. Please contact Alesun Fund." });
    }

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const allowedRoles = roles.map((role) => normalizeRole(role));
    if (req.user.mustChangePassword) {
      return res.status(403).json({ message: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      createAuditLog(prisma, {
        userId: req.user.id,
        action: "UNAUTHORIZED_DASHBOARD_ACCESS_ATTEMPT",
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: req.user.id,
        performedBy: req.user.id,
        role: req.user.role,
        metadata: {
          attemptedPath: req.originalUrl,
          method: req.method,
          allowedRoles
        },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

const requireRole = authorize;

module.exports = { authenticate, authorize, requireRole };
