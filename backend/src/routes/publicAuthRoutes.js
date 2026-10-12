const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { applicantRegisterSchema, loginSchema } = require("../validators");
const { signToken } = require("../utils/tokens");
const { authenticate, authorize } = require("../middlewares/auth");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");

const router = express.Router();

function serializeApplicantUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const payload = applicantRegisterSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: "APPLICANT"
      }
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: serializeApplicantUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user || user.role !== "APPLICANT" || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid applicant credentials" });
    }

    if (!user.isActive || user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is not active. Please contact Alesun Fund." });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: serializeApplicantUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, authorize("APPLICANT"), async (req, res) => {
  return res.json({ user: req.user });
});

router.post("/logout", authenticate, authorize("APPLICANT"), async (req, res, next) => {
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
        portal: "applicant",
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
