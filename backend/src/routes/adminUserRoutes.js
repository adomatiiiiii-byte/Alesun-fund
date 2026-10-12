const express = require("express");
const fs = require("fs");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { resolveStoredFile } = require("../utils/fileSecurity");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const { createAuditLog } = require("../services/auditService");
const {
  listOnboardingUsers,
  updateVerificationDecision
} = require("../services/onboarding.service");
const { ensureActiveAgentByCode, refreshAgentScore } = require("../services/agent.service");
const { buildAdminBorrowerDetail } = require("../services/adminBorrower.service");
const { onboardingVerificationDecisionSchema, superAdminAgentReassignmentSchema } = require("../validators");
const { httpError } = require("../utils/httpError");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "RISK_ADMIN"));

router.get("/", async (req, res, next) => {
  try {
    const users = await listOnboardingUsers(prisma);
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.get("/:userId/details", async (req, res, next) => {
  try {
    const detail = await buildAdminBorrowerDetail(prisma, req.params.userId);
    return res.json({ detail });
  } catch (error) {
    return next(error);
  }
});

router.post("/:userId/messages", async (req, res, next) => {
  try {
    const body = String(req.body?.body || "").trim();

    if (!body) {
      return res.status(400).json({ message: "Message body is required" });
    }

    if (body.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or less" });
    }

    const borrower = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, role: true }
    });

    if (!borrower || borrower.role !== "APPLICANT") {
      return res.status(404).json({ message: "Borrower not found" });
    }

    const entry = await createAuditLog(prisma, {
      userId: req.params.userId,
      action: AUDIT_ACTIONS.ADMIN_MESSAGE_SENT,
      entityType: AUDIT_ENTITY_TYPES.MESSAGE,
      entityId: req.params.userId,
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        body,
        senderName: req.user.fullName,
        senderRole: req.user.role
      },
      ...extractRequestAuditContext(req)
    });

    return res.status(201).json({
      message: {
        id: entry.id,
        senderRole: req.user.role,
        senderName: req.user.fullName,
        body,
        createdAt: entry.timestamp
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:userId/verification", async (req, res, next) => {
  try {
    const payload = onboardingVerificationDecisionSchema.parse(req.body);
    const verificationStatus = await updateVerificationDecision({
      prismaClient: prisma,
      userId: req.params.userId,
      status: payload.status,
      performedBy: req.user.id,
      role: req.user.role,
      auditContext: extractRequestAuditContext(req)
    });

    return res.json({ verificationStatus });
  } catch (error) {
    return next(error);
  }
});

router.post("/:userId/assigned-agent", async (req, res, next) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Super Admin access required" });
    }

    const payload = superAdminAgentReassignmentSchema.parse(req.body);
    const borrower = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        role: true,
        assignedAgentId: true,
        agentReferralId: true
      }
    });

    if (!borrower || borrower.role !== "APPLICANT") {
      return res.status(404).json({ message: "Borrower not found" });
    }

    const agent = await ensureActiveAgentByCode(prisma, payload.agentCode);
    const previousAgent = borrower.assignedAgentId
      ? await prisma.agent.findUnique({
          where: { id: borrower.assignedAgentId },
          select: { id: true, agentCode: true, fullName: true }
        })
      : null;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { userId: borrower.id }
      });

      if (referral) {
        await tx.referral.update({
          where: { userId: borrower.id },
          data: { agentId: agent.id }
        });
      } else {
        await tx.referral.create({
          data: {
            userId: borrower.id,
            agentId: agent.id
          }
        });
      }

      const updated = await tx.user.update({
        where: { id: borrower.id },
        data: {
          assignedAgentId: agent.id,
          agentReferralId: agent.agentCode
        }
      });

      if (previousAgent?.id) {
        await refreshAgentScore(tx, previousAgent.id);
      }
      await refreshAgentScore(tx, agent.id);

      await createAuditLog(tx, {
        userId: borrower.id,
        action: AUDIT_ACTIONS.SUPER_ADMIN_AGENT_REASSIGNMENT,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: borrower.id,
        performedBy: req.user.id,
        role: req.user.role,
        previousValue: previousAgent,
        newValue: {
          id: agent.id,
          agentCode: agent.agentCode,
          fullName: agent.fullName
        },
        metadata: {
          reason: payload.reason
        },
        ...extractRequestAuditContext(req)
      });

      return updated;
    });

    return res.json({
      user: {
        id: updatedUser.id,
        assignedAgentId: updatedUser.assignedAgentId,
        agentReferralId: updatedUser.agentReferralId
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:userId/files/:field", async (req, res, next) => {
  try {
    const documents = await prisma.document.findUnique({
      where: { userId: req.params.userId }
    });

    if (!documents) {
      throw httpError(404, "Documents not found");
    }

    const storedName = {
      idFrontImage: documents.idFrontUrl,
      idBackImage: documents.idBackUrl,
      tradingLicense: documents.tradingLicenseUrl
    }[req.params.field];

    if (!storedName) {
      throw httpError(404, "Requested file not found");
    }

    const absolutePath = resolveStoredFile(storedName);
    if (!fs.existsSync(absolutePath)) {
      throw httpError(404, "Stored file not found");
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
