const { createAuditLog } = require("./auditService");
const { refreshAccountingMetrics } = require("./accountingOverview.service");
const { runReconciliation } = require("./reconciliationService");
const { invalidateGeoIntelligenceCache } = require("./geoIntelligence.service");

const CLEANUP_CONFIRMATION = "DELETE_UNASSIGNED_AGENT_USERS";

function normalizeValue(value) {
  return String(value || "").trim();
}

function uniqueIds(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function asCount(result) {
  return Number(result?.count || 0);
}

function buildInvalidReasons(user) {
  const reasons = [];
  const assignedAgentId = normalizeValue(user.assignedAgentId);
  const assignedAgent = user.assignedAgent || null;
  const referral = user.referral || null;
  const referralAgent = referral?.agent || null;

  if (!assignedAgentId) {
    reasons.push("ASSIGNED_AGENT_MISSING");
  } else if (!assignedAgent) {
    reasons.push("ASSIGNED_AGENT_NOT_FOUND");
  } else if (assignedAgent.status !== "ACTIVE") {
    reasons.push("ASSIGNED_AGENT_INACTIVE");
  }

  if (!referral) {
    reasons.push("REFERRAL_LINK_MISSING");
  } else if (!referralAgent) {
    reasons.push("REFERRAL_AGENT_NOT_FOUND");
  } else if (referralAgent.status !== "ACTIVE") {
    reasons.push("REFERRAL_AGENT_INACTIVE");
  }

  if (referral?.agentId && assignedAgentId && referral.agentId !== assignedAgentId) {
    reasons.push("REFERRAL_AGENT_MISMATCH");
  }

  return uniqueIds(reasons);
}

function buildUserSummary(user, reasons) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.userProfile?.phone || null,
    assignedAgentId: user.assignedAgentId || null,
    referralAgentId: user.referral?.agentId || null,
    reasons
  };
}

async function collectCleanupDependencies(prismaClient, userIds) {
  if (!userIds.length) {
    return {
      businessIds: [],
      applicationIds: [],
      loanIds: [],
      repaymentIds: [],
      scheduleIds: [],
      allocationIds: [],
      counts: {
        users: 0,
        userProfiles: 0,
        businesses: 0,
        documents: 0,
        verificationStatuses: 0,
        referrals: 0,
        passwordResetTokens: 0,
        loanRequests: 0,
        loanApplications: 0,
        verificationReports: 0,
        riskScores: 0,
        loans: 0,
        payments: 0,
        repayments: 0,
        repaymentSchedules: 0,
        paymentAllocations: 0,
        agentApplications: 0,
        auditLogsToDetach: 0
      }
    };
  }

  const [
    businesses,
    userProfiles,
    documents,
    verificationStatuses,
    referrals,
    passwordResetTokens,
    loanRequests,
    agentApplications,
    auditLogs
  ] = await Promise.all([
    prismaClient.business.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.document.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.verificationStatus.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.referral.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.passwordResetToken.findMany({
      where: { accountId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.loanRequest.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.agentApplication.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    }),
    prismaClient.auditLog.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    })
  ]);

  const businessIds = businesses.map((record) => record.id);
  const loanApplications = await prismaClient.loanApplication.findMany({
    where: {
      OR: [
        { submittedById: { in: userIds } },
        businessIds.length ? { businessId: { in: businessIds } } : { id: { in: [] } }
      ]
    },
    select: { id: true }
  });
  const applicationIds = loanApplications.map((record) => record.id);

  const loans = await prismaClient.loan.findMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        applicationIds.length ? { applicationId: { in: applicationIds } } : { id: { in: [] } }
      ]
    },
    select: { id: true }
  });
  const loanIds = loans.map((record) => record.id);

  const [payments, repayments, repaymentSchedules, riskScores, verificationReports] = await Promise.all([
    prismaClient.payment.findMany({
      where: { loanId: { in: loanIds.length ? loanIds : ["__none__"] } },
      select: { id: true }
    }),
    prismaClient.loanRepayment.findMany({
      where: { loanId: { in: loanIds.length ? loanIds : ["__none__"] } },
      select: { id: true }
    }),
    prismaClient.repaymentSchedule.findMany({
      where: { loanId: { in: loanIds.length ? loanIds : ["__none__"] } },
      select: { id: true }
    }),
    prismaClient.riskScore.findMany({
      where: { applicationId: { in: applicationIds.length ? applicationIds : ["__none__"] } },
      select: { id: true }
    }),
    prismaClient.verificationReport.findMany({
      where: { applicationId: { in: applicationIds.length ? applicationIds : ["__none__"] } },
      select: { id: true }
    })
  ]);

  const repaymentIds = repayments.map((record) => record.id);
  const scheduleIds = repaymentSchedules.map((record) => record.id);
  const paymentAllocations = await prismaClient.paymentAllocation.findMany({
    where: {
      OR: [
        repaymentIds.length ? { repaymentId: { in: repaymentIds } } : { id: { in: [] } },
        scheduleIds.length ? { scheduleId: { in: scheduleIds } } : { id: { in: [] } }
      ]
    },
    select: { id: true }
  });

  return {
    businessIds,
    applicationIds,
    loanIds,
    repaymentIds,
    scheduleIds,
    allocationIds: paymentAllocations.map((record) => record.id),
    counts: {
      users: userIds.length,
      userProfiles: userProfiles.length,
      businesses: businesses.length,
      documents: documents.length,
      verificationStatuses: verificationStatuses.length,
      referrals: referrals.length,
      passwordResetTokens: passwordResetTokens.length,
      loanRequests: loanRequests.length,
      loanApplications: loanApplications.length,
      verificationReports: verificationReports.length,
      riskScores: riskScores.length,
      loans: loans.length,
      payments: payments.length,
      repayments: repayments.length,
      repaymentSchedules: repaymentSchedules.length,
      paymentAllocations: paymentAllocations.length,
      agentApplications: agentApplications.length,
      auditLogsToDetach: auditLogs.length
    }
  };
}

async function buildUnassignedAgentCleanupPlan(prismaClient) {
  const users = await prismaClient.user.findMany({
    where: {
      role: "APPLICANT"
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      assignedAgentId: true,
      assignedAgent: {
        select: {
          id: true,
          status: true
        }
      },
      referral: {
        select: {
          id: true,
          agentId: true,
          agent: {
            select: {
              id: true,
              status: true
            }
          }
        }
      },
      userProfile: {
        select: {
          phone: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const invalidUsers = users
    .map((user) => {
      const reasons = buildInvalidReasons(user);
      return reasons.length ? buildUserSummary(user, reasons) : null;
    })
    .filter(Boolean);

  const userIds = invalidUsers.map((user) => user.id);
  const dependencies = await collectCleanupDependencies(prismaClient, userIds);

  return {
    generatedAt: new Date().toISOString(),
    invalidUsers,
    userIds,
    ...dependencies,
    summary: {
      invalidUsersFound: invalidUsers.length,
      userIds,
      counts: dependencies.counts
    }
  };
}

function assertExecutionAllowed({ environment, allowProductionCleanup, confirmation }) {
  if (environment === "production" && !allowProductionCleanup) {
    throw new Error("Production cleanup is blocked. Set ALLOW_PRODUCTION_CLEANUP=true and retry.");
  }

  if (confirmation !== CLEANUP_CONFIRMATION) {
    throw new Error(`Cleanup confirmation mismatch. Expected "${CLEANUP_CONFIRMATION}".`);
  }
}

async function executeUnassignedAgentCleanup(prismaClient, options = {}) {
  const environment = options.environment || process.env.NODE_ENV || "development";
  const allowProductionCleanup = String(options.allowProductionCleanup || process.env.ALLOW_PRODUCTION_CLEANUP || "") === "true";
  assertExecutionAllowed({
    environment,
    allowProductionCleanup,
    confirmation: options.confirmation
  });

  const plan = await buildUnassignedAgentCleanupPlan(prismaClient);
  const executedBy = options.executedBy || process.env.CLEANUP_EXECUTED_BY || "SYSTEM";
  const requestContext = {
    ipAddress: options.ipAddress || null,
    userAgent: options.userAgent || "deleteUsersWithoutAgents.js"
  };

  await createAuditLog(prismaClient, {
    action: "UNASSIGNED_AGENT_USERS_CLEANUP_STARTED",
    entityType: "USER",
    entityId: "UNASSIGNED_AGENT_USERS_CLEANUP",
    performedBy: executedBy,
    role: "SYSTEM",
    metadata: {
      deletedUsersCount: plan.summary.counts.users,
      deletedLoansCount: plan.summary.counts.loans,
      deletedLoanRequestsCount: plan.summary.counts.loanRequests,
      deletedPaymentsCount: plan.summary.counts.repayments,
      deletedDocumentsCount: plan.summary.counts.documents,
      environment,
      targetUserIds: plan.userIds
    },
    ...requestContext
  });

  const result = await prismaClient.$transaction(async (tx) => {
    if (!plan.userIds.length) {
      return {
        deletedCounts: {
          users: 0,
          userProfiles: 0,
          businesses: 0,
          documents: 0,
          verificationStatuses: 0,
          referrals: 0,
          passwordResetTokens: 0,
          loanRequests: 0,
          loanApplications: 0,
          verificationReports: 0,
          riskScores: 0,
          loans: 0,
          payments: 0,
          repayments: 0,
          repaymentSchedules: 0,
          paymentAllocations: 0,
          agentApplications: 0,
          auditLogsDetached: 0
        }
      };
    }

    const deletedCounts = {};

    deletedCounts.auditLogsDetached = asCount(await tx.auditLog.updateMany({
      where: { userId: { in: plan.userIds } },
      data: { userId: null }
    }));
    deletedCounts.passwordResetTokens = asCount(await tx.passwordResetToken.deleteMany({
      where: { accountId: { in: plan.userIds } }
    }));
    deletedCounts.paymentAllocations = asCount(await tx.paymentAllocation.deleteMany({
      where: {
        OR: [
          plan.repaymentIds.length ? { repaymentId: { in: plan.repaymentIds } } : { id: { in: [] } },
          plan.scheduleIds.length ? { scheduleId: { in: plan.scheduleIds } } : { id: { in: [] } }
        ]
      }
    }));
    deletedCounts.repayments = asCount(await tx.loanRepayment.deleteMany({
      where: { loanId: { in: plan.loanIds.length ? plan.loanIds : ["__none__"] } }
    }));
    deletedCounts.repaymentSchedules = asCount(await tx.repaymentSchedule.deleteMany({
      where: { loanId: { in: plan.loanIds.length ? plan.loanIds : ["__none__"] } }
    }));
    deletedCounts.payments = asCount(await tx.payment.deleteMany({
      where: { loanId: { in: plan.loanIds.length ? plan.loanIds : ["__none__"] } }
    }));
    deletedCounts.loans = asCount(await tx.loan.deleteMany({
      where: { id: { in: plan.loanIds.length ? plan.loanIds : ["__none__"] } }
    }));
    deletedCounts.verificationReports = asCount(await tx.verificationReport.deleteMany({
      where: { applicationId: { in: plan.applicationIds.length ? plan.applicationIds : ["__none__"] } }
    }));
    deletedCounts.riskScores = asCount(await tx.riskScore.deleteMany({
      where: { applicationId: { in: plan.applicationIds.length ? plan.applicationIds : ["__none__"] } }
    }));
    deletedCounts.loanApplications = asCount(await tx.loanApplication.deleteMany({
      where: { id: { in: plan.applicationIds.length ? plan.applicationIds : ["__none__"] } }
    }));
    deletedCounts.loanRequests = asCount(await tx.loanRequest.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.documents = asCount(await tx.document.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.verificationStatuses = asCount(await tx.verificationStatus.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.businesses = asCount(await tx.business.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.userProfiles = asCount(await tx.userProfile.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.agentApplications = asCount(await tx.agentApplication.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.referrals = asCount(await tx.referral.deleteMany({
      where: { userId: { in: plan.userIds } }
    }));
    deletedCounts.users = asCount(await tx.user.deleteMany({
      where: { id: { in: plan.userIds } }
    }));

    return { deletedCounts };
  });

  invalidateGeoIntelligenceCache();
  const [accounting, reconciliation] = await Promise.all([
    refreshAccountingMetrics(prismaClient),
    runReconciliation(prismaClient)
  ]);

  await createAuditLog(prismaClient, {
    action: "UNASSIGNED_AGENT_USERS_CLEANUP_COMPLETED",
    entityType: "USER",
    entityId: "UNASSIGNED_AGENT_USERS_CLEANUP",
    performedBy: executedBy,
    role: "SYSTEM",
    metadata: {
      deletedUsersCount: result.deletedCounts.users,
      deletedLoansCount: result.deletedCounts.loans,
      deletedLoanRequestsCount: result.deletedCounts.loanRequests,
      deletedPaymentsCount: result.deletedCounts.repayments,
      deletedDocumentsCount: result.deletedCounts.documents,
      environment,
      accountingSummary: accounting.summary,
      reconciliationStatus: reconciliation.status
    },
    ...requestContext
  });

  return {
    ...plan,
    deletedCounts: result.deletedCounts,
    accountingSummary: accounting.summary,
    reconciliation: {
      id: reconciliation.id,
      status: reconciliation.status,
      totalErrors: reconciliation.totalErrors,
      runDate: reconciliation.runDate
    }
  };
}

module.exports = {
  CLEANUP_CONFIRMATION,
  buildUnassignedAgentCleanupPlan,
  executeUnassignedAgentCleanup
};
