const {
  allocateRepaymentAmount,
  calculateInstallment,
  determineLoanLifecycle,
  evaluatePaymentStatus,
  generateRepaymentSchedule,
  summarizeLoanPerformance
} = require("../services/loanService");
const { calculateTransparentLoanPricing } = require("../services/loanPricing.service");

function buildSchedule(id, expectedAmount, paidAmount = 0, dueDate = "2026-03-01T00:00:00.000Z") {
  return {
    id,
    dueDate,
    expectedAmount,
    paidAmount,
    status: paidAmount >= expectedAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
    updatedAt: dueDate
  };
}

describe("loanService", () => {
  it("calculates transparent loan pricing for the standard case", () => {
    expect(calculateTransparentLoanPricing(100000)).toEqual({
      principalAmount: 100000,
      processingFee: 2000,
      disbursedAmount: 98000,
      interestAmount: 18000,
      totalRepayableAmount: 118000,
      loanTerm: "1 month",
      annualInterestRate: 18,
      termDays: 30
    });
  });

  it("calculates transparent loan pricing for a small loan", () => {
    expect(calculateTransparentLoanPricing(10000)).toEqual({
      principalAmount: 10000,
      processingFee: 200,
      disbursedAmount: 9800,
      interestAmount: 1800,
      totalRepayableAmount: 11800,
      loanTerm: "1 month",
      annualInterestRate: 18,
      termDays: 30
    });
  });

  it("rounds pricing values to integers", () => {
    expect(calculateTransparentLoanPricing(10555)).toEqual(
      expect.objectContaining({
        principalAmount: 10555,
        processingFee: 211,
        interestAmount: 1900,
        disbursedAmount: 10344,
        totalRepayableAmount: 12455
      })
    );
  });

  it("calculates base installment amounts across the term days", () => {
    expect(calculateInstallment(118000, 30)).toBe(3933);
  });

  it("splits schedule amounts into integers that sum to the full repayable total", () => {
    const schedule = generateRepaymentSchedule({
      totalRepayableAmount: 118000,
      termDays: 30,
      disbursedAt: new Date("2026-03-01T00:00:00.000Z")
    });

    expect(schedule).toHaveLength(30);
    expect(schedule.filter((item) => item.expectedAmount === 3934)).toHaveLength(10);
    expect(schedule.filter((item) => item.expectedAmount === 3933)).toHaveLength(20);
    expect(schedule.reduce((sum, item) => sum + item.expectedAmount, 0)).toBe(118000);
  });

  it("marks overdue schedules as pending with overdue days", () => {
    const status = evaluatePaymentStatus(
      buildSchedule("schedule-1", 10000, 0, "2026-03-01T00:00:00.000Z"),
      new Date("2026-03-15T00:00:00.000Z")
    );

    expect(status.status).toBe("PENDING");
    expect(status.lateDays).toBe(14);
    expect(status.isOverdue).toBe(true);
  });

  it("flags loan performance as warning when any schedule is overdue", () => {
    const summary = summarizeLoanPerformance(
      [
        buildSchedule("schedule-1", 10000, 0, "2026-03-01T00:00:00.000Z"),
        buildSchedule("schedule-2", 10000, 0, "2026-05-01T00:00:00.000Z")
      ],
      new Date("2026-03-15T00:00:00.000Z")
    );

    expect(summary.status).toBe("WARNING");
  });

  it("marks a loan as completed when all schedules are paid", () => {
    const lifecycle = determineLoanLifecycle(
      [
        buildSchedule("schedule-1", 10000, 10000, "2026-03-01T00:00:00.000Z"),
        {
          ...buildSchedule("schedule-2", 10000, 10000, "2026-04-01T00:00:00.000Z"),
          updatedAt: "2026-04-03T00:00:00.000Z"
        }
      ],
      new Date("2026-04-03T00:00:00.000Z")
    );

    expect(lifecycle.status).toBe("COMPLETED");
    expect(lifecycle.fullyPaid).toBe(true);
    expect(lifecycle.daysLate).toBe(2);
  });

  it("allocates partial payments to the oldest schedule only", () => {
    const result = allocateRepaymentAmount(
      [
        buildSchedule("schedule-1", 10000, 0, "2026-03-01T00:00:00.000Z"),
        buildSchedule("schedule-2", 10000, 0, "2026-03-02T00:00:00.000Z")
      ],
      4000
    );

    expect(result.remainingPayment).toBe(0);
    expect(result.allocations).toEqual([
      { scheduleId: "schedule-1", amountAllocated: 4000 }
    ]);
    expect(result.updatedSchedules).toEqual([
      { id: "schedule-1", paidAmount: 4000, status: "PARTIAL" }
    ]);
  });

  it("allocates multiple payments chronologically across unpaid schedules", () => {
    const result = allocateRepaymentAmount(
      [
        buildSchedule("schedule-1", 10000, 4000, "2026-03-01T00:00:00.000Z"),
        buildSchedule("schedule-2", 10000, 0, "2026-03-02T00:00:00.000Z")
      ],
      10000
    );

    expect(result.remainingPayment).toBe(0);
    expect(result.allocations).toEqual([
      { scheduleId: "schedule-1", amountAllocated: 6000 },
      { scheduleId: "schedule-2", amountAllocated: 4000 }
    ]);
    expect(result.updatedSchedules).toEqual([
      { id: "schedule-1", paidAmount: 10000, status: "PAID" },
      { id: "schedule-2", paidAmount: 4000, status: "PARTIAL" }
    ]);
  });

  it("pays oldest missed schedules first and leaves later schedules pending when funds run out", () => {
    const result = allocateRepaymentAmount(
      [
        buildSchedule("schedule-1", 10000, 0, "2026-03-01T00:00:00.000Z"),
        buildSchedule("schedule-2", 10000, 0, "2026-03-02T00:00:00.000Z"),
        buildSchedule("schedule-3", 10000, 0, "2026-03-03T00:00:00.000Z")
      ],
      20000
    );

    expect(result.remainingPayment).toBe(0);
    expect(result.allocations).toEqual([
      { scheduleId: "schedule-1", amountAllocated: 10000 },
      { scheduleId: "schedule-2", amountAllocated: 10000 }
    ]);
    expect(result.updatedSchedules).toEqual([
      { id: "schedule-1", paidAmount: 10000, status: "PAID" },
      { id: "schedule-2", paidAmount: 10000, status: "PAID" }
    ]);
  });
});
