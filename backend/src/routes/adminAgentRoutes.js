const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { adminAgentCreateSchema, agentApplicationDecisionSchema, agentGeoFilterSchema } = require("../validators");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const {
  approveAgentApplication,
  buildAdminAgentDetail,
  buildAdminAgentSummary,
  createAgentByAdmin,
  rejectAgentApplication,
  updateAgentStatus
} = require("../services/agent.service");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "RISK_ADMIN"));

router.get("/", async (req, res, next) => {
  try {
    const filters = agentGeoFilterSchema.parse(req.query);
    const summary = await buildAdminAgentSummary(prisma, filters);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

router.post("/create", async (req, res, next) => {
  try {
    const payload = adminAgentCreateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const created = await createAgentByAdmin(tx, req.user, payload);
      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.AGENT_CREATED_BY_ADMIN,
        entityType: AUDIT_ENTITY_TYPES.AGENT,
        entityId: created.agent.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          agentCode: created.agent.agentCode,
          fullName: created.agent.fullName,
          phoneNumber: created.agent.phoneNumber,
          geography: {
            country: created.agent.country,
            region: created.agent.region,
            subregion: created.agent.subregion,
            district: created.agent.district,
            administrativeUnit: created.agent.administrativeUnit,
            subUnit: created.agent.subUnit,
            county: created.agent.subregion,
            subcounty: created.agent.subcounty
          }
        },
        metadata: {
          createdByAdminId: req.user.id,
          loginEmail: created.credentials.email
        },
        ...extractRequestAuditContext(req)
      });

      return created;
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/applications/:id/status", async (req, res, next) => {
  try {
    const payload = agentApplicationDecisionSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      if (payload.status === "APPROVED") {
        const approved = await approveAgentApplication(tx, req.params.id, {
          country: payload.geography.country,
          region: payload.geography.region,
          subregion: payload.geography.subregion,
          district: payload.geography.district,
          administrativeUnit: payload.geography.administrativeUnit,
          subUnit: payload.geography.subUnit,
          county: payload.geography.county || payload.geography.subregion,
          subcounty: payload.geography.subcounty || payload.geography.subUnit
        }, req.user);
        await createAuditLog(tx, {
          userId: req.user.id,
          action: AUDIT_ACTIONS.AGENT_APPLICATION_APPROVED,
          entityType: AUDIT_ENTITY_TYPES.AGENT_APPLICATION,
          entityId: approved.application.id,
          performedBy: req.user.id,
          role: req.user.role,
          metadata: {
            agentId: approved.agent.id,
            agentCode: approved.agent.agentCode,
            geography: payload.geography
          },
          ...extractRequestAuditContext(req)
        });

        return approved;
      }

      const rejected = await rejectAgentApplication(tx, req.params.id, payload.adminNotes);
      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.AGENT_APPLICATION_REJECTED,
        entityType: AUDIT_ENTITY_TYPES.AGENT_APPLICATION,
        entityId: rejected.id,
        performedBy: req.user.id,
        role: req.user.role,
        metadata: {
          adminNotes: payload.adminNotes || null
        },
        ...extractRequestAuditContext(req)
      });

      return {
        application: rejected,
        agent: null
      };
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const detail = await buildAdminAgentDetail(prisma, req.params.id);
    return res.json({ detail });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/status", async (req, res, next) => {
  try {
    const status = req.body?.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    const agent = await prisma.$transaction(async (tx) => {
      const updated = await updateAgentStatus(tx, req.params.id, status);
      await createAuditLog(tx, {
        userId: req.user.id,
        action: status === "SUSPENDED" ? AUDIT_ACTIONS.AGENT_SUSPENDED : AUDIT_ACTIONS.AGENT_APPLICATION_APPROVED,
        entityType: AUDIT_ENTITY_TYPES.AGENT,
        entityId: updated.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          status: updated.status
        },
        ...extractRequestAuditContext(req)
      });
      return updated;
    });

    return res.json({ agent });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
