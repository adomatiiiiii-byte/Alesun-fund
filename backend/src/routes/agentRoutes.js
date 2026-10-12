const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { withdrawalSchema } = require("../validators");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const { createAuditLog } = require("../services/auditService");
const {
  applyAgentTransaction,
  buildAgentAccessStatus,
  buildAgentDashboardForActor
} = require("../services/agent.service");

const router = express.Router();

router.use(authenticate);

router.get("/status", async (req, res, next) => {
  try {
    if (!["APPLICANT", "AGENT"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const status = await buildAgentAccessStatus(prisma, {
      userId: req.user.role === "APPLICANT" ? req.user.id : null,
      agentId: req.user.role === "AGENT" ? req.user.linkedEntityId : null
    });
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    if (req.user.role !== "APPLICANT") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await createAuditLog(prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.AGENT_APPLICATION_CREATED,
      entityType: AUDIT_ENTITY_TYPES.AGENT_APPLICATION,
      entityId: req.user.id,
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        blockedReason: "ADMIN_CONTROLLED_ONBOARDING"
      },
      ...extractRequestAuditContext(req)
    });

    return res.status(403).json({
      message: "Agent accounts are created by administrators only."
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    if (req.user.role !== "AGENT") {
      await createAuditLog(prisma, {
        userId: req.user.id,
        action: "UNAUTHORIZED_AGENT_ROUTE_ATTEMPT",
        entityType: AUDIT_ENTITY_TYPES.AGENT,
        entityId: req.user.linkedEntityId || req.user.id,
        performedBy: req.user.id,
        role: req.user.role,
        metadata: {
          attemptedPath: req.originalUrl,
          method: req.method
        },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(403).json({ message: "Agent access required" });
    }

    const dashboard = await buildAgentDashboardForActor(prisma, {
      agentId: req.user.linkedEntityId,
      userId: req.user.id
    });
    return res.json(dashboard);
  } catch (error) {
    return next(error);
  }
});

router.post("/withdraw", async (req, res, next) => {
  try {
    if (req.user.role !== "AGENT") {
      await createAuditLog(prisma, {
        userId: req.user.id,
        action: "UNAUTHORIZED_AGENT_ROUTE_ATTEMPT",
        entityType: AUDIT_ENTITY_TYPES.AGENT,
        entityId: req.user.linkedEntityId || req.user.id,
        performedBy: req.user.id,
        role: req.user.role,
        metadata: {
          attemptedPath: req.originalUrl,
          method: req.method
        },
        ...extractRequestAuditContext(req)
      }).catch(() => {});
      return res.status(403).json({ message: "Agent access required" });
    }

    const payload = withdrawalSchema.parse(req.body);
    const agent = await prisma.agent.findUnique({
      where: { id: req.user.linkedEntityId },
      include: {
        wallet: true
      }
    });

    if (!agent || agent.status !== "ACTIVE") {
      return res.status(403).json({ message: "Active agent account required" });
    }

    if (payload.amount > Number(agent.wallet?.availableBalance || 0)) {
      return res.status(400).json({ message: "Withdrawal amount exceeds available balance" });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await applyAgentTransaction(tx, {
        agentId: agent.id,
        type: "WITHDRAWAL",
        bucket: "AVAILABLE",
        amount: -Number(payload.amount),
        description: "Agent withdrawal processed",
        relatedUserId: req.user.id
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.AGENT_WITHDRAWAL_CREATED,
        entityType: AUDIT_ENTITY_TYPES.AGENT_TRANSACTION,
        entityId: created.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          amount: created.amount
        },
        ...extractRequestAuditContext(req)
      });

      return created;
    });

    return res.status(201).json({
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        type: transaction.type
      },
      message: "Withdrawal processed successfully."
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
