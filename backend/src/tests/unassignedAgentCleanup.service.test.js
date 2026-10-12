jest.mock("../services/accountingOverview.service", () => ({
  refreshAccountingMetrics: jest.fn(async () => ({
    summary: {
      pendingLoanRequests: 0,
      totalPortfolioValue: 0,
      activeLoansCount: 0
    }
  }))
}));

jest.mock("../services/reconciliationService", () => ({
  runReconciliation: jest.fn(async () => ({
    id: "recon-1",
    status: "PASS",
    totalErrors: 0,
    runDate: new Date("2026-05-24T00:00:00.000Z")
  }))
}));

jest.mock("../services/geoIntelligence.service", () => ({
  invalidateGeoIntelligenceCache: jest.fn()
}));

const {
  buildUnassignedAgentCleanupPlan,
  executeUnassignedAgentCleanup,
  CLEANUP_CONFIRMATION
} = require("../services/unassignedAgentCleanup.service");

function createPrismaMock() {
  const tx = {
    auditLog: {
      updateMany: jest.fn(async () => ({ count: 3 }))
    },
    passwordResetToken: {
      deleteMany: jest.fn(async () => ({ count: 2 }))
    },
    paymentAllocation: {
      deleteMany: jest.fn(async () => ({ count: 2 }))
    },
    loanRepayment: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    repaymentSchedule: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    payment: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    loan: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    verificationReport: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    riskScore: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    loanApplication: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    loanRequest: {
      deleteMany: jest.fn(async () => ({ count: 2 }))
    },
    document: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    verificationStatus: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    business: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    userProfile: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    agentApplication: {
      deleteMany: jest.fn(async () => ({ count: 0 }))
    },
    referral: {
      deleteMany: jest.fn(async () => ({ count: 1 }))
    },
    user: {
      deleteMany: jest.fn(async () => ({ count: 3 }))
    }
  };

  return {
    user: {
      findMany: jest.fn(async () => ([
        {
          id: "user-a",
          fullName: "Valid User",
          email: "valid@example.com",
          assignedAgentId: "agent-1",
          assignedAgent: { id: "agent-1", status: "ACTIVE" },
          referral: {
            id: "ref-a",
            agentId: "agent-1",
            agent: { id: "agent-1", status: "ACTIVE" }
          },
          userProfile: { phone: "0700000001" }
        },
        {
          id: "user-b",
          fullName: "Missing Agent",
          email: "missing@example.com",
          assignedAgentId: null,
          assignedAgent: null,
          referral: null,
          userProfile: { phone: "0700000002" }
        },
        {
          id: "user-c",
          fullName: "Broken Agent",
          email: "broken@example.com",
          assignedAgentId: "agent-x",
          assignedAgent: null,
          referral: null,
          userProfile: { phone: "0700000003" }
        },
        {
          id: "user-d",
          fullName: "Suspended Agent",
          email: "suspended@example.com",
          assignedAgentId: "agent-2",
          assignedAgent: { id: "agent-2", status: "SUSPENDED" },
          referral: {
            id: "ref-d",
            agentId: "agent-2",
            agent: { id: "agent-2", status: "SUSPENDED" }
          },
          userProfile: { phone: "0700000004" }
        }
      ]))
    },
    business: {
      findMany: jest.fn(async () => [{ id: "business-1" }])
    },
    userProfile: {
      findMany: jest.fn(async () => [{ id: "profile-1" }])
    },
    document: {
      findMany: jest.fn(async () => [{ id: "document-1" }])
    },
    verificationStatus: {
      findMany: jest.fn(async () => [{ id: "verify-1" }])
    },
    referral: {
      findMany: jest.fn(async () => [{ id: "ref-1" }])
    },
    passwordResetToken: {
      findMany: jest.fn(async () => [{ id: "token-1" }, { id: "token-2" }])
    },
    loanRequest: {
      findMany: jest.fn(async () => [{ id: "request-1" }, { id: "request-2" }])
    },
    agentApplication: {
      findMany: jest.fn(async () => [])
    },
    auditLog: {
      findMany: jest.fn(async () => [{ id: "audit-1" }, { id: "audit-2" }, { id: "audit-3" }]),
      create: jest.fn(async ({ data }) => ({ id: "audit-new", ...data }))
    },
    loanApplication: {
      findMany: jest.fn(async () => [{ id: "application-1" }])
    },
    loan: {
      findMany: jest.fn(async () => [{ id: "loan-1" }])
    },
    payment: {
      findMany: jest.fn(async () => [{ id: "payment-1" }])
    },
    loanRepayment: {
      findMany: jest.fn(async () => [{ id: "repayment-1" }])
    },
    repaymentSchedule: {
      findMany: jest.fn(async () => [{ id: "schedule-1" }])
    },
    riskScore: {
      findMany: jest.fn(async () => [{ id: "risk-1" }])
    },
    verificationReport: {
      findMany: jest.fn(async () => [{ id: "report-1" }])
    },
    paymentAllocation: {
      findMany: jest.fn(async () => [{ id: "allocation-1" }, { id: "allocation-2" }])
    },
    $transaction: jest.fn(async (callback) => callback(tx))
  };
}

describe("unassignedAgentCleanup.service", () => {
  it("identifies only users without valid active agent relationships", async () => {
    const prisma = createPrismaMock();

    const plan = await buildUnassignedAgentCleanupPlan(prisma);

    expect(plan.invalidUsers.map((user) => user.id)).toEqual(["user-b", "user-c", "user-d"]);
    expect(plan.summary.counts.users).toBe(3);
    expect(plan.summary.counts.loans).toBe(1);
    expect(plan.invalidUsers.find((user) => user.id === "user-d").reasons).toContain("ASSIGNED_AGENT_INACTIVE");
  });

  it("hard-deletes dependent records in a transaction and refreshes reporting hooks", async () => {
    const prisma = createPrismaMock();

    const result = await executeUnassignedAgentCleanup(prisma, {
      confirmation: CLEANUP_CONFIRMATION,
      environment: "development",
      executedBy: "qa-test"
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.deletedCounts.users).toBe(3);
    expect(result.deletedCounts.loans).toBe(1);
    expect(result.deletedCounts.loanRequests).toBe(2);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
  });
});
