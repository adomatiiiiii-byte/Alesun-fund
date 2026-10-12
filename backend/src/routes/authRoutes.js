const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const {
  registerSchema,
  loginSchema,
  createBackofficeAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require("../validators");
const { signToken } = require("../utils/tokens");
const { authenticate, authorize } = require("../middlewares/auth");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const {
  BACKOFFICE_ROLES,
  normalizeRole,
  isBackofficeRole,
  getDashboardPathForRole,
  resolveLinkedEntityId
} = require("../services/backofficeAuth.service");
const {
  requestPasswordReset,
  consumePasswordResetToken,
  changePassword
} = require("../services/passwordReset.service");

const router = express.Router();

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    loginId: user.loginId || user.email,
    role: normalizeRole(user.role),
    rawRole: user.role,
    linkedEntityId: user.linkedEntityId || null,
    dashboardPath: getDashboardPathForRole(user.role),
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

async function loginUser(req, res, next, { requiredRole } = {}) {
  try {
    const payload = loginSchema.parse(req.body);
    const submittedIdentifier = (payload.loginId || payload.email || "").trim();
    const normalizedIdentifier = submittedIdentifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: submittedIdentifier },
          { loginId: normalizedIdentifier },
          { email: submittedIdentifier },
          { email: normalizedIdentifier }
        ]
      }
    });

    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      await createAuditLog(prisma, {
        action: "BACKOFFICE_LOGIN_FAILED",
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: normalizedIdentifier || "UNKNOWN",
        performedBy: "SYSTEM",
        role: null,
        metadata: { loginId: submittedIdentifier },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive || user.status !== "ACTIVE") {
      await createAuditLog(prisma, {
        userId: user.id,
        action: "BACKOFFICE_LOGIN_FAILED",
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        performedBy: user.id,
        role: normalizeRole(user.role),
        metadata: { loginId: submittedIdentifier, reason: "INACTIVE_ACCOUNT" },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(403).json({ message: "Your account is not active. Please contact Alesun Fund." });
    }

    const normalizedRole = normalizeRole(user.role);

    if (requiredRole && ![].concat(requiredRole).map((role) => normalizeRole(role)).includes(normalizedRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const linkedEntityId = await resolveLinkedEntityId(prisma, user);
    if ((normalizedRole === "AGENT" || normalizedRole === "INVESTOR") && !linkedEntityId) {
      await createAuditLog(prisma, {
        userId: user.id,
        action: normalizedRole === "AGENT" ? "AGENT_LOGIN_FAILED" : "BACKOFFICE_LOGIN_FAILED",
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        performedBy: user.id,
        role: normalizedRole,
        metadata: {
          loginId: submittedIdentifier,
          reason: "LINKED_ENTITY_MISSING"
        },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(403).json({ message: "Your account is not active. Please contact Alesun Fund." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    await createAuditLog(prisma, {
      userId: user.id,
      action: normalizedRole === "AGENT"
        ? "AGENT_LOGIN_SUCCESS"
        : normalizedRole === "INVESTOR"
          ? "INVESTOR_LOGIN_SUCCESS"
          : "BACKOFFICE_LOGIN_SUCCESS",
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      performedBy: user.id,
      role: normalizedRole,
        metadata: { loginId: submittedIdentifier, linkedEntityId },
        ...extractRequestAuditContext(req)
      }).catch(() => {});

    const token = signToken({ ...user, linkedEntityId });
    return res.json({
      token,
      user: serializeUser({ ...user, linkedEntityId })
    });
  } catch (error) {
    return next(error);
  }
}

router.post("/register", authenticate, authorize("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    if (!["RISK_ADMIN", "FINANCE_ADMIN"].includes(payload.role)) {
      return res.status(400).json({ message: "Only Risk Admin and Finance Admin accounts can be created here" });
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role
      }
    });

    return res.status(201).json({
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", (req, res, next) => loginUser(req, res, next));

router.post("/admin/login", (req, res, next) =>
  loginUser(req, res, next, { requiredRole: BACKOFFICE_ROLES.concat(["ADMIN", "CREDIT_OFFICER"]) })
);

router.post("/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    const result = await requestPasswordReset(prisma, payload.identifier, extractRequestAuditContext(req));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const result = await consumePasswordResetToken(
      prisma,
      payload.token,
      payload.newPassword,
      extractRequestAuditContext(req)
    );
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const updatedUser = await changePassword(
      prisma,
      req.user,
      payload.currentPassword,
      payload.newPassword,
      extractRequestAuditContext(req)
    );
    const linkedEntityId = await resolveLinkedEntityId(prisma, updatedUser);
    const token = signToken({ ...updatedUser, linkedEntityId });
    return res.json({
      message: "Password changed successfully",
      token,
      user: serializeUser({ ...updatedUser, linkedEntityId })
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/backoffice/accounts", authenticate, authorize("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const payload = createBackofficeAccountSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: {
          OR: [
            { loginId: payload.loginId.toLowerCase() },
            ...(payload.email ? [{ email: payload.email.toLowerCase() }] : [])
          ]
        }
      });

      if (existing) {
        const conflict = new Error("Login ID is already in use");
        conflict.statusCode = 409;
        throw conflict;
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const user = await tx.user.create({
        data: {
          fullName: payload.fullName,
          email: payload.email?.toLowerCase() || `${payload.loginId.toLowerCase()}@alesunfund.local`,
          loginId: payload.loginId.toLowerCase(),
          passwordHash,
          role: payload.role,
          status: "ACTIVE",
          isActive: true
        }
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: "ACCOUNT_CREATED",
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        performedBy: req.user.id,
        role: req.user.role,
        metadata: { role: payload.role, loginId: payload.loginId.toLowerCase() },
        ...extractRequestAuditContext(req)
      });

      return { role: payload.role, user };
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (req, res) => res.json({ user: req.user }));

router.post("/logout", authenticate, async (req, res, next) => {
  try {
    const reason = req.body?.reason === "timeout" ? "timeout" : "manual";
    await createAuditLog(prisma, {
      userId: req.user.id,
      action: reason === "timeout" ? AUDIT_ACTIONS.SESSION_TIMEOUT_LOGOUT : AUDIT_ACTIONS.USER_LOGOUT,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: req.user.id,
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        portal: "internal",
        reason
      },
      ...extractRequestAuditContext(req)
    });

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
