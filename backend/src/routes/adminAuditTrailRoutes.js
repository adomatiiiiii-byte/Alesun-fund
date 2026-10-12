const express = require("express");
const prisma = require("../prisma");
const { authenticate, requireRole } = require("../middlewares/auth");
const { normalizeRole } = require("../services/backofficeAuth.service");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");

const router = express.Router();

const DECISION_ACTIONS = {
  APPROVE: ["LOAN_APPROVED", "LOAN_APPROVED_WITH_TERMS", "LOAN_REQUEST_APPROVED", "AGENT_APPLICATION_APPROVED"],
  REJECT: ["LOAN_REQUEST_REJECTED", "AGENT_APPLICATION_REJECTED"],
  OVERRIDE: ["SUPER_ADMIN_AGENT_REASSIGNMENT"]
};

router.use(authenticate, requireRole("SUPER_ADMIN"));

function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function buildDecision(record) {
  const statusValue = record?.newValue?.status || record?.metadata?.decision || null;
  const action = String(record.action || "");

  if (DECISION_ACTIONS.APPROVE.includes(action) || statusValue === "APPROVED") {
    return "APPROVE";
  }
  if (DECISION_ACTIONS.REJECT.includes(action) || statusValue === "REJECTED") {
    return "REJECT";
  }
  if (DECISION_ACTIONS.OVERRIDE.includes(action)) {
    return "OVERRIDE";
  }

  return null;
}

function getReason(record) {
  return (
    record?.metadata?.reason ||
    record?.metadata?.notes ||
    record?.newValue?.decisionNotes ||
    record?.previousValue?.decisionNotes ||
    record?.metadata?.message ||
    ""
  );
}

function getLoanAmountAtTime(record) {
  return Number(
    record?.newValue?.principalAmount ||
      record?.newValue?.loanAmount ||
      record?.metadata?.amount ||
      record?.metadata?.loanAmount ||
      0
  );
}

function getRiskScoreAtTime(record) {
  return Number(
    record?.metadata?.riskScoreAtTime ||
      record?.newValue?.riskScore ||
      record?.metadata?.riskScore ||
      0
  );
}

function mapAuditRecord(record) {
  return {
    id: record.id,
    adminId: record.performedBy || null,
    adminName: record.user?.fullName || "System",
    adminRole: normalizeRole(record.role || record.user?.role || ""),
    actionType: record.action,
    targetId: record.entityId,
    targetEntityType: record.entityType,
    decision: buildDecision(record),
    reason: getReason(record),
    loanAmountAtTime: getLoanAmountAtTime(record),
    riskScoreAtTime: getRiskScoreAtTime(record),
    createdAt: record.timestamp,
    ipAddress: record.ipAddress || null,
    userAgent: record.userAgent || null,
    systemSnapshot: {
      previousValue: record.previousValue || null,
      newValue: record.newValue || null,
      metadata: record.metadata || null
    }
  };
}

function keywordMatches(record, keyword) {
  if (!keyword) {
    return true;
  }

  const haystack = [
    record.entityId,
    record.action,
    record.role,
    record.user?.fullName,
    record.user?.email,
    getReason(record),
    JSON.stringify(record.metadata || {}),
    JSON.stringify(record.newValue || {}),
    JSON.stringify(record.previousValue || {})
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword.toLowerCase());
}

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const decision = String(req.query.decision || "").trim().toUpperCase();
    const keyword = String(req.query.search || "").trim();
    const targetId = String(req.query.targetId || "").trim();
    const actionType = String(req.query.actionType || "").trim();
    const adminId = String(req.query.adminId || "").trim();
    const adminRole = String(req.query.adminRole || "").trim();

    const where = {
      ...(adminId ? { performedBy: adminId } : {}),
      ...(adminRole ? { role: adminRole } : {}),
      ...(actionType ? { action: actionType } : {}),
      ...(targetId ? { entityId: targetId } : {}),
      ...((startDate || endDate)
        ? {
            timestamp: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          }
        : {})
    };

    const [rawRecords, admins] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: "desc" },
        take: 1000
      }),
      prisma.user.findMany({
        where: {
          role: {
            in: ["SUPER_ADMIN", "ADMIN", "RISK_ADMIN", "FINANCE_ADMIN", "CREDIT_OFFICER"]
          }
        },
        select: {
          id: true,
          fullName: true,
          role: true
        },
        orderBy: { fullName: "asc" }
      })
    ]);

    let filtered = rawRecords;

    if (decision) {
      filtered = filtered.filter((record) => buildDecision(record) === decision);
    }

    if (keyword) {
      filtered = filtered.filter((record) => keywordMatches(record, keyword));
    }

    const total = filtered.length;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize).map(mapAuditRecord);

    await createAuditLog(prisma, {
      userId: req.user.id,
      action: "ADMIN_TRAIL_ACCESSED",
      entityType: AUDIT_ENTITY_TYPES.DASHBOARD,
      entityId: req.user.id,
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        page,
        pageSize,
        filters: {
          adminId,
          adminRole,
          actionType,
          targetId,
          startDate: req.query.startDate || "",
          endDate: req.query.endDate || "",
          decision,
          search: keyword
        }
      },
      ...extractRequestAuditContext(req)
    });

    return res.json({
      records: paged,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      },
      filterOptions: {
        admins: admins.map((admin) => ({
          id: admin.id,
          fullName: admin.fullName,
          role: normalizeRole(admin.role)
        })),
        roles: ["SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN"],
        decisions: ["APPROVE", "REJECT", "OVERRIDE"],
        actionTypes: Array.from(new Set(rawRecords.map((record) => record.action))).sort()
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
