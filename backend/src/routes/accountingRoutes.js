const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const { buildAccountingOverview } = require("../services/accountingOverview.service");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "FINANCE_ADMIN", "ADMIN"));

router.get("/overview", async (req, res, next) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    });

    const overview = await buildAccountingOverview(prisma);

    await createAuditLog(prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.ACCOUNTING_DASHBOARD_VIEWED,
      entityType: AUDIT_ENTITY_TYPES.DASHBOARD,
      entityId: "accounting-overview",
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        scope: "ADMIN_ACCOUNTING_OVERVIEW"
      },
      ...extractRequestAuditContext(req)
    });

    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
