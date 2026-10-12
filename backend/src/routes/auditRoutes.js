const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { AUDIT_ACTIONS } = require("../services/auditLog.service");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN"));

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date = new Date()) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

router.get("/logs", async (req, res, next) => {
  try {
    const where = {
      ...(req.query.action ? { action: req.query.action } : {}),
      ...(req.query.entityType ? { entityType: req.query.entityType } : {}),
      ...(req.query.user ? { performedBy: req.query.user } : {}),
      ...((req.query.dateFrom || req.query.dateTo)
        ? {
            timestamp: {
              ...(req.query.dateFrom ? { gte: new Date(req.query.dateFrom) } : {}),
              ...(req.query.dateTo ? { lte: new Date(req.query.dateTo) } : {})
            }
          }
        : {})
    };

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { timestamp: "desc" },
      take: 500
    });

    return res.json({ logs });
  } catch (error) {
    return next(error);
  }
});

router.get("/summary", async (_req, res, next) => {
  try {
    const today = startOfDay();
    const week = startOfWeek();

    const [
      applicationsToday,
      applicationsWeek,
      approvalsCount,
      rejectionsCount,
      underReviewCount,
      totalLoansDisbursed,
      totalPaymentsReceived,
      activeUserLogs,
      recentActions
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
          timestamp: { gte: today }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
          timestamp: { gte: week }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
          timestamp: { gte: today },
          newValue: { path: ["status"], equals: "APPROVED" }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
          timestamp: { gte: today },
          newValue: { path: ["status"], equals: "REJECTED" }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
          timestamp: { gte: today },
          newValue: { path: ["status"], equals: "UNDER_REVIEW" }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.LOAN_DISBURSED,
          timestamp: { gte: today }
        }
      }),
      prisma.auditLog.count({
        where: {
          action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
          timestamp: { gte: today }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          performedBy: { not: "SYSTEM" },
          timestamp: { gte: week }
        },
        distinct: ["performedBy"],
        select: {
          performedBy: true,
          role: true,
          user: { select: { fullName: true, email: true } }
        }
      }),
      prisma.auditLog.findMany({
        include: {
          user: { select: { fullName: true, email: true, role: true } }
        },
        orderBy: { timestamp: "desc" },
        take: 20
      })
    ]);

    return res.json({
      summary: {
        totalApplicationsSubmitted: {
          today: applicationsToday,
          weekly: applicationsWeek
        },
        approvalsCount,
        rejectionsCount,
        underReviewCount,
        totalLoansDisbursed,
        totalPaymentsReceived,
        activeUsers: activeUserLogs.map((entry) => ({
          id: entry.performedBy,
          role: entry.role,
          fullName: entry.user?.fullName || "Unknown user",
          email: entry.user?.email || null
        }))
      },
      recentActions
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
