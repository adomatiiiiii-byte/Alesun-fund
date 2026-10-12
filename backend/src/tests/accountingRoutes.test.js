jest.mock("../prisma", () => ({
  loan: {
    findMany: jest.fn()
  },
  loanApplication: {
    findMany: jest.fn()
  },
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "admin-1") {
        return {
          id: "admin-1",
          email: "admin@alesunfund.local",
          role: "ADMIN",
          fullName: "Admin User",
          isActive: true,
          status: "ACTIVE"
        };
      }

      return null;
    }),
    findMany: jest.fn()
  },
  loanRequest: {
    findMany: jest.fn()
  },
  systemAlert: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  reconciliationLog: {
    findFirst: jest.fn()
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function adminToken() {
  return jwt.sign({ sub: "admin-1" }, jwtSecret);
}

describe("GET /api/admin/accounting/overview", () => {
  beforeEach(() => {
    prisma.loan.findMany.mockResolvedValue([
      {
        id: "loan-active-1",
        principal: "100000",
        remainingBalance: "56000",
        annualInterestRate: "12",
        termMonths: 2,
        status: "ACTIVE",
        createdAt: "2026-03-03T00:00:00.000Z",
        startDate: "2026-03-03T00:00:00.000Z",
        disbursedAt: "2026-03-03T00:00:00.000Z",
        repaymentSchedules: [
          {
            id: "payment-1",
            dueDate: "2026-03-20T00:00:00.000Z",
            expectedAmount: "56000",
            paidAmount: "56000",
            status: "PAID",
            updatedAt: "2026-03-20T00:00:00.000Z"
          },
          {
            id: "payment-2",
            dueDate: "2026-04-05T00:00:00.000Z",
            expectedAmount: "56000",
            paidAmount: "0",
            status: "PENDING",
            updatedAt: "2026-04-05T00:00:00.000Z"
          }
        ],
        payments: []
      },
      {
        id: "loan-defaulted-1",
        principal: "50000",
        remainingBalance: "56000",
        annualInterestRate: "12",
        termMonths: 1,
        status: "DEFAULTED",
        createdAt: "2026-02-01T00:00:00.000Z",
        startDate: "2026-02-01T00:00:00.000Z",
        disbursedAt: "2026-02-01T00:00:00.000Z",
        repaymentSchedules: [
          {
            id: "payment-3",
            dueDate: "2026-02-28T00:00:00.000Z",
            expectedAmount: "56000",
            paidAmount: "0",
            status: "PENDING",
            updatedAt: "2026-02-28T00:00:00.000Z"
          }
        ],
        payments: []
      },
      {
        id: "loan-completed-1",
        principal: "200000",
        remainingBalance: "0",
        annualInterestRate: "10",
        termMonths: 2,
        status: "COMPLETED",
        createdAt: "2026-01-10T00:00:00.000Z",
        startDate: "2026-01-10T00:00:00.000Z",
        disbursedAt: "2026-01-10T00:00:00.000Z",
        repaymentSchedules: [
          {
            id: "payment-4",
            dueDate: "2026-02-10T00:00:00.000Z",
            expectedAmount: "110000",
            paidAmount: "110000",
            status: "PAID",
            updatedAt: "2026-02-10T00:00:00.000Z"
          },
          {
            id: "payment-5",
            dueDate: "2026-03-10T00:00:00.000Z",
            expectedAmount: "110000",
            paidAmount: "110000",
            status: "PAID",
            updatedAt: "2026-03-12T00:00:00.000Z"
          }
        ],
        payments: []
      }
    ]);
    prisma.loanApplication.findMany.mockResolvedValue([
      { id: "app-1", submittedAt: "2026-03-01T00:00:00.000Z" },
      { id: "app-2", submittedAt: "2026-04-01T00:00:00.000Z" }
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", score: 88, role: "APPLICANT" },
      { id: "u2", score: 72, role: "APPLICANT" },
      { id: "u3", score: 54, role: "APPLICANT" }
    ]);
    prisma.loanRequest.findMany.mockResolvedValue([
      { id: "lr-1", status: "PENDING", createdAt: "2026-04-01T00:00:00.000Z" }
    ]);
    prisma.systemAlert.findMany.mockResolvedValue([
      {
        id: "alert-1",
        type: "NEGATIVE_BALANCE",
        severity: "CRITICAL",
        message: "Loan remaining balance is negative.",
        createdAt: "2026-04-10T10:00:00.000Z"
      }
    ]);
    prisma.systemAlert.count.mockImplementation(async ({ where }) => {
      if (where?.severity === "CRITICAL") {
        return 1;
      }
      if (where?.severity === "WARNING" || where?.severity === "INFO") {
        return 0;
      }
      return 1;
    });
    prisma.reconciliationLog.findFirst.mockResolvedValue({
      id: "recon-1",
      runDate: "2026-04-10T09:00:00.000Z",
      totalLoansChecked: 3,
      totalErrors: 2,
      status: "FAIL"
    });
    prisma.auditLog.create.mockClear();
  });

  it("returns dynamic accounting metrics and logs the view", async () => {
    const response = await request(app)
      .get("/api/admin/accounting/overview")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.summary.totalPortfolioValue).toBe(100000);
    expect(response.body.summary.activeLoansCount).toBe(1);
    expect(response.body.summary.defaultRate).toBeCloseTo(33.33, 2);
    expect(response.body.cashFlow.inflows.applicationFees).toBe(0);
    expect(response.body.portfolio.completedLoans).toBe(1);
    expect(response.body.portfolio.defaultedLoans).toBe(1);
    expect(response.body.riskMetrics.totalOverdueAmount).toBe(112000);
    expect(response.body.collections.expectedRepayments).toBe(388000);
    expect(response.body.userSegments).toEqual({ good: 1, average: 1, risky: 1 });
    expect(response.body.growth).toHaveLength(6);
    expect(prisma.loanRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          archivedAt: null,
          isTestData: false,
          status: { in: ["PENDING", "APPROVED", "REJECTED"] }
        }
      })
    );
    expect(response.body.systemHealth.activeAlerts).toBe(1);
    expect(response.body.systemHealth.criticalAlerts).toBe(1);
    expect(response.body.systemHealth.lastStatus).toBe("CRITICAL");
    expect(response.body.systemHealth.reconciliation).toEqual({
      lastRunTime: "2026-04-10T09:00:00.000Z",
      lastStatus: "FAIL",
      totalErrors: 2,
      totalLoansChecked: 3
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_DASHBOARD_VIEWED"
        })
      })
    );
  });

  it("handles empty data gracefully", async () => {
    prisma.loan.findMany.mockResolvedValue([]);
    prisma.loanApplication.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.loanRequest.findMany.mockResolvedValue([]);
    prisma.systemAlert.findMany.mockResolvedValue([]);
    prisma.systemAlert.count.mockResolvedValue(0);
    prisma.reconciliationLog.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/admin/accounting/overview")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.summary.totalPortfolioValue).toBe(0);
    expect(response.body.summary.activeLoansCount).toBe(0);
    expect(response.body.summary.defaultRate).toBe(0);
    expect(response.body.collections.collectionEfficiency).toBe(0);
    expect(response.body.systemHealth.lastStatus).toBe("PASS");
    expect(response.body.systemHealth.reconciliation.lastStatus).toBe("NOT_RUN");
    expect(response.body.userSegments).toEqual({ good: 0, average: 0, risky: 0 });
  });
});
