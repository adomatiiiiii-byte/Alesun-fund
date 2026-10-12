const {
  checkAnomalies,
  recordApiResult,
  resetMonitoringStateForTests,
  getApiHealthSnapshot
} = require("../services/monitoringService");

function buildAlertStore() {
  const alerts = [];
  return {
    alerts,
    systemAlert: {
      create: jest.fn(async ({ data }) => {
        const created = { id: `alert-${alerts.length + 1}`, createdAt: new Date().toISOString(), ...data };
        alerts.push(created);
        return created;
      }),
      findMany: jest.fn(async () => alerts),
      count: jest.fn(async ({ where }) => {
        return alerts.filter((alert) => {
          if (where?.resolved !== undefined && alert.resolved !== where.resolved) {
            return false;
          }
          if (where?.severity && alert.severity !== where.severity) {
            return false;
          }
          return true;
        }).length;
      })
    },
    reconciliationLog: {
      findFirst: jest.fn(async () => null)
    }
  };
}

describe("monitoring service", () => {
  beforeEach(() => {
    resetMonitoringStateForTests();
  });

  it("detects core financial anomalies and stores alerts", async () => {
    const store = buildAlertStore();
    const prismaClient = {
      ...store,
      loan: {
        findUnique: jest.fn(async () => ({
          id: "loan-1",
          userId: "user-1",
          remainingBalance: "-500",
          repaymentSchedules: [
            {
              id: "schedule-1",
              expectedAmount: "1000",
              paidAmount: "1200"
            }
          ]
        })),
        count: jest.fn(async () => 2)
      },
      loanRequest: {
        count: jest.fn(async () => 2)
      },
      loanRepayment: {
        findUnique: jest.fn(async () => ({
          id: "repayment-1",
          loanId: "loan-1",
          amount: "1000",
          allocations: [
            { amountAllocated: "600" }
          ]
        })),
        findMany: jest.fn(async () => [{}, {}, {}, {}])
      }
    };

    const alerts = await checkAnomalies(
      {
        event: "repayment_processed",
        loanId: "loan-1",
        userId: "user-1",
        repaymentId: "repayment-1",
        remainingBalanceBeforePayment: 800
      },
      prismaClient
    );

    expect(alerts.map((alert) => alert.type)).toEqual(
      expect.arrayContaining([
        "NEGATIVE_BALANCE",
        "OVERPAYMENT_DETECTED",
        "PAYMENT_ALLOCATION_MISMATCH",
        "MULTIPLE_ACTIVE_LOANS",
        "DUPLICATE_PENDING_REQUESTS",
        "UNUSUAL_PAYMENT_SIZE",
        "RAPID_REPEATED_PAYMENTS"
      ])
    );
    expect(store.systemAlert.create).toHaveBeenCalled();
  });

  it("tracks rolling API error rate and raises an alert above threshold", async () => {
    const store = buildAlertStore();
    for (let index = 0; index < 19; index += 1) {
      recordApiResult(
        {
          path: "/api/health",
          method: "GET",
          statusCode: 200,
          durationMs: 5,
          timestamp: 1000 + index
        },
        store
      );
    }

    recordApiResult(
      {
        path: "/api/loans/loan-1/repay",
        method: "POST",
        statusCode: 500,
        durationMs: 25,
        timestamp: 2000
      },
      store
    );

    await new Promise((resolve) => setImmediate(resolve));

    const snapshot = getApiHealthSnapshot(2000);
    expect(snapshot.requestCount).toBe(20);
    expect(snapshot.errorRate).toBe(5);

    recordApiResult(
      {
        path: "/api/loans/loan-1/repay",
        method: "POST",
        statusCode: 500,
        durationMs: 25,
        timestamp: 3000
      },
      store
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(store.alerts.some((alert) => alert.type === "SYSTEM_ERROR_RATE")).toBe(true);
  });
});
