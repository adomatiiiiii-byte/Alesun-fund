const { runReconciliation } = require("../services/reconciliationService");

function buildPrismaDouble(overrides = {}) {
  return {
    loan: {
      findMany: jest.fn(async () => []),
      ...overrides.loan
    },
    loanRepayment: {
      findMany: jest.fn(async () => []),
      ...overrides.loanRepayment
    },
    reconciliationLog: {
      create: jest.fn(async ({ data }) => ({ id: "recon-1", ...data })),
      ...overrides.reconciliationLog
    },
    systemAlert: {
      create: jest.fn(async ({ data }) => ({ id: "alert-1", ...data })),
      ...overrides.systemAlert
    }
  };
}

describe("reconciliation service", () => {
  it("passes clean financial records and stores a PASS log", async () => {
    const prismaClient = buildPrismaDouble({
      loan: {
        findMany: jest.fn(async () => [
          {
            id: "loan-1",
            userId: "user-1",
            remainingBalance: "60",
            status: "ACTIVE",
            repaymentSchedules: [
              { id: "schedule-1", expectedAmount: "100", paidAmount: "40" }
            ]
          }
        ])
      },
      loanRepayment: {
        findMany: jest.fn(async () => [
          {
            id: "repayment-1",
            loanId: "loan-1",
            amount: "40",
            allocations: [{ amountAllocated: "40" }]
          }
        ])
      }
    });

    const result = await runReconciliation(prismaClient, new Date("2026-05-12T00:00:00.000Z"));

    expect(result.status).toBe("PASS");
    expect(result.totalErrors).toBe(0);
    expect(prismaClient.reconciliationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalLoansChecked: 1,
          totalErrors: 0,
          status: "PASS"
        })
      })
    );
    expect(prismaClient.systemAlert.create).not.toHaveBeenCalled();
  });

  it("detects corrupted financial records and emits a critical alert", async () => {
    const prismaClient = buildPrismaDouble({
      loan: {
        findMany: jest.fn(async () => [
          {
            id: "loan-1",
            userId: "user-1",
            remainingBalance: "-10",
            status: "ACTIVE",
            repaymentSchedules: [
              { id: "schedule-1", expectedAmount: "100", paidAmount: "120" }
            ]
          },
          {
            id: "loan-2",
            userId: "user-1",
            remainingBalance: "50",
            status: "ACTIVE",
            repaymentSchedules: [
              { id: "schedule-2", expectedAmount: "50", paidAmount: "0" }
            ]
          }
        ])
      },
      loanRepayment: {
        findMany: jest.fn(async () => [
          {
            id: "repayment-1",
            loanId: "loan-1",
            amount: "90",
            allocations: [{ amountAllocated: "40" }]
          }
        ])
      }
    });

    const result = await runReconciliation(prismaClient, new Date("2026-05-12T00:00:00.000Z"));

    expect(result.status).toBe("FAIL");
    expect(result.totalErrors).toBeGreaterThan(0);
    expect(result.errorDetails.map((entry) => entry.type)).toEqual(
      expect.arrayContaining([
        "LOAN_BALANCE_MISMATCH",
        "NEGATIVE_BALANCE",
        "SCHEDULE_OVERPAID",
        "PAYMENT_ALLOCATION_MISMATCH",
        "DUPLICATE_ACTIVE_LOANS"
      ])
    );
    expect(prismaClient.systemAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "FINANCIAL_RECONCILIATION_FAILED",
          severity: "CRITICAL"
        })
      })
    );
  });
});
