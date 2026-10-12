const prisma = require("../prisma");
const { sendAlert } = require("./alertService");
const {
  asNumber,
  checkAllocationMismatch,
  checkDuplicatePendingRequests,
  checkMultipleActiveLoans,
  checkNegativeBalance,
  checkRapidRepeatedPayments,
  checkScheduleOverpayment,
  checkSystemErrorRate,
  checkUnusualPaymentSize
} = require("./anomalyRules");

const API_WINDOW_MS = 60 * 1000;
const RAPID_PAYMENT_WINDOW_MS = 10 * 1000;
const apiEvents = [];

function pruneApiEvents(referenceTime = Date.now()) {
  while (apiEvents.length && apiEvents[0].timestamp < referenceTime - API_WINDOW_MS) {
    apiEvents.shift();
  }
}

function getApiHealthSnapshot(referenceTime = Date.now()) {
  pruneApiEvents(referenceTime);
  const requestCount = apiEvents.length;
  const errorCount = apiEvents.filter((entry) => entry.statusCode >= 500).length;
  const errorRate = requestCount ? Number(((errorCount / requestCount) * 100).toFixed(2)) : 0;

  return {
    requestCount,
    errorCount,
    errorRate,
    windowMs: API_WINDOW_MS
  };
}

async function emitAlerts(alerts, prismaClient = prisma) {
  await Promise.all(
    alerts.map((alert) => sendAlert(alert.type, alert.severity, alert.message, alert.metadata, prismaClient))
  );
}

async function checkAnomalies(contextData = {}, prismaClient = prisma) {
  if (!prismaClient?.loan?.findUnique) {
    return [];
  }

  const alerts = [];
  const loanId = contextData.loanId || null;
  const userId = contextData.userId || null;
  const repaymentId = contextData.repaymentId || null;

  let loan = null;
  if (loanId) {
    loan = await prismaClient.loan.findUnique({
      where: { id: loanId },
      include: {
        repaymentSchedules: {
          orderBy: { dueDate: "asc" }
        }
      }
    });

    alerts.push(...checkNegativeBalance(loan));
    alerts.push(...checkScheduleOverpayment(loan, loan?.repaymentSchedules || []));
  }

  const effectiveUserId = userId || loan?.userId || null;

  if (repaymentId && prismaClient.loanRepayment?.findUnique) {
    const repayment = await prismaClient.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: {
        allocations: true
      }
    });

    const allocatedAmount = (repayment?.allocations || []).reduce(
      (sum, allocation) => sum + asNumber(allocation.amountAllocated),
      0
    );

    alerts.push(...checkAllocationMismatch(repayment, allocatedAmount));
    alerts.push(
      ...checkUnusualPaymentSize(
        repayment?.amount,
        contextData.remainingBalanceBeforePayment,
        { loanId: repayment?.loanId || loanId, repaymentId }
      )
    );

    if (prismaClient.loanRepayment?.findMany) {
      const recentPayments = await prismaClient.loanRepayment.findMany({
        where: {
          loanId: repayment?.loanId || loanId,
          createdAt: {
            gte: new Date(Date.now() - RAPID_PAYMENT_WINDOW_MS)
          }
        }
      });

      alerts.push(...checkRapidRepeatedPayments(repayment?.loanId || loanId, recentPayments.length));
    }
  }

  if (effectiveUserId) {
    if (prismaClient.loan?.count) {
      const activeLoanCount = await prismaClient.loan.count({
        where: {
          userId: effectiveUserId,
          status: "ACTIVE"
        }
      });
      alerts.push(...checkMultipleActiveLoans(effectiveUserId, activeLoanCount));
    }

    if (prismaClient.loanRequest?.count) {
      const pendingRequestCount = await prismaClient.loanRequest.count({
        where: {
          userId: effectiveUserId,
          status: "PENDING"
        }
      });
      alerts.push(...checkDuplicatePendingRequests(effectiveUserId, pendingRequestCount));
    }
  }

  if (alerts.length) {
    await emitAlerts(alerts, prismaClient);
  }

  return alerts;
}

function scheduleMonitoringCheck(contextData = {}, prismaClient = prisma) {
  setImmediate(() => {
    checkAnomalies(contextData, prismaClient).catch((error) => {
      console.error("[MONITORING] failed to check anomalies", error);
    });
  });
}

function recordApiResult({ path, method, statusCode, durationMs, timestamp = Date.now() }, prismaClient = prisma) {
  apiEvents.push({ path, method, statusCode, durationMs, timestamp });
  pruneApiEvents(timestamp);

  const snapshot = getApiHealthSnapshot(timestamp);
  const alerts = checkSystemErrorRate(snapshot.errorRate, snapshot.requestCount);
  if (!alerts.length) {
    return snapshot;
  }

  setImmediate(() => {
    emitAlerts(
      alerts.map((alert) => ({
        ...alert,
        metadata: {
          ...alert.metadata,
          path,
          method,
          statusCode,
          durationMs
        }
      })),
      prismaClient
    ).catch((error) => {
      console.error("[MONITORING] failed to send API error-rate alert", error);
    });
  });

  return snapshot;
}

async function buildSystemHealth(prismaClient = prisma) {
  const snapshot = getApiHealthSnapshot();
  const latestAlerts = prismaClient?.systemAlert?.findMany
    ? await prismaClient.systemAlert.findMany({
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    : [];
  const [activeAlerts, criticalAlerts, warningAlerts, infoAlerts] = prismaClient?.systemAlert?.count
    ? await Promise.all([
        prismaClient.systemAlert.count({ where: { resolved: false } }),
        prismaClient.systemAlert.count({ where: { resolved: false, severity: "CRITICAL" } }),
        prismaClient.systemAlert.count({ where: { resolved: false, severity: "WARNING" } }),
        prismaClient.systemAlert.count({ where: { resolved: false, severity: "INFO" } })
      ])
    : [latestAlerts.length, latestAlerts.filter((entry) => entry.severity === "CRITICAL").length, latestAlerts.filter((entry) => entry.severity === "WARNING").length, latestAlerts.filter((entry) => entry.severity === "INFO").length];
  const latestReconciliation = prismaClient?.reconciliationLog?.findFirst
    ? await prismaClient.reconciliationLog.findFirst({
        orderBy: { runDate: "desc" }
      })
    : null;

  return {
    lastRunTime: latestAlerts[0]?.createdAt || null,
    lastStatus: criticalAlerts > 0 ? "CRITICAL" : warningAlerts > 0 ? "WARNING" : "PASS",
    apiHealth: snapshot,
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    alerts: latestAlerts,
    reconciliation: latestReconciliation
      ? {
          lastRunTime: latestReconciliation.runDate,
          lastStatus: latestReconciliation.status,
          totalErrors: latestReconciliation.totalErrors,
          totalLoansChecked: latestReconciliation.totalLoansChecked
        }
      : {
          lastRunTime: null,
          lastStatus: "NOT_RUN",
          totalErrors: 0,
          totalLoansChecked: 0
        }
  };
}

function resetMonitoringStateForTests() {
  apiEvents.length = 0;
}

module.exports = {
  buildSystemHealth,
  checkAnomalies,
  getApiHealthSnapshot,
  recordApiResult,
  resetMonitoringStateForTests,
  scheduleMonitoringCheck
};
