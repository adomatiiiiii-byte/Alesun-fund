const prisma = require("../prisma");
const { sendAlert } = require("./alertService");

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

function buildError(type, details) {
  return {
    type,
    ...details
  };
}

function compareCurrency(left, right) {
  return roundCurrency(left) === roundCurrency(right);
}

async function runReconciliation(prismaClient = prisma, runDate = new Date()) {
  const [loans, repayments] = await Promise.all([
    prismaClient.loan.findMany({
      include: {
        repaymentSchedules: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prismaClient.loanRepayment.findMany({
      include: {
        allocations: true
      },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const errors = [];
  let totalExpected = 0;
  let totalPaid = 0;

  for (const loan of loans) {
    const schedules = loan.repaymentSchedules || [];
    const expectedForLoan = schedules.reduce((sum, schedule) => sum + asNumber(schedule.expectedAmount), 0);
    const paidForLoan = schedules.reduce((sum, schedule) => sum + asNumber(schedule.paidAmount), 0);
    const expectedRemaining = roundCurrency(expectedForLoan - paidForLoan);
    const actualRemaining = roundCurrency(loan.remainingBalance);

    totalExpected += expectedForLoan;
    totalPaid += paidForLoan;

    if (!compareCurrency(expectedRemaining, actualRemaining)) {
      errors.push(
        buildError("LOAN_BALANCE_MISMATCH", {
          loanId: loan.id,
          userId: loan.userId,
          expectedRemaining,
          actualRemaining
        })
      );
    }

    if (actualRemaining < 0) {
      errors.push(
        buildError("NEGATIVE_BALANCE", {
          loanId: loan.id,
          userId: loan.userId,
          actualRemaining
        })
      );
    }

    for (const schedule of schedules) {
      const expectedAmount = roundCurrency(schedule.expectedAmount);
      const paidAmount = roundCurrency(schedule.paidAmount);
      if (paidAmount > expectedAmount) {
        errors.push(
          buildError("SCHEDULE_OVERPAID", {
            loanId: loan.id,
            scheduleId: schedule.id,
            expectedAmount,
            paidAmount
          })
        );
      }
    }
  }

  for (const repayment of repayments) {
    const allocationTotal = roundCurrency(
      (repayment.allocations || []).reduce((sum, allocation) => sum + asNumber(allocation.amountAllocated), 0)
    );
    const repaymentAmount = roundCurrency(repayment.amount);

    if (!compareCurrency(allocationTotal, repaymentAmount)) {
      errors.push(
        buildError("PAYMENT_ALLOCATION_MISMATCH", {
          loanId: repayment.loanId,
          repaymentId: repayment.id,
          expectedAllocatedAmount: repaymentAmount,
          actualAllocatedAmount: allocationTotal
        })
      );
    }
  }

  const totalOutstanding = roundCurrency(totalExpected - totalPaid);
  if (!compareCurrency(totalExpected, totalPaid + totalOutstanding)) {
    errors.push(
      buildError("SYSTEM_TOTALS_MISMATCH", {
        expectedTotal: roundCurrency(totalExpected),
        paidTotal: roundCurrency(totalPaid),
        outstandingTotal: totalOutstanding
      })
    );
  }

  const activeLoanCounts = loans.reduce((accumulator, loan) => {
    if (loan.status !== "ACTIVE" || !loan.userId) {
      return accumulator;
    }

    accumulator[loan.userId] = (accumulator[loan.userId] || 0) + 1;
    return accumulator;
  }, {});

  Object.entries(activeLoanCounts).forEach(([userId, activeLoanCount]) => {
    if (activeLoanCount > 1) {
      errors.push(
        buildError("DUPLICATE_ACTIVE_LOANS", {
          userId,
          activeLoanCount
        })
      );
    }
  });

  const summary = {
    runDate,
    totalLoansChecked: loans.length,
    totalErrors: errors.length,
    errorDetails: errors,
    status: errors.length ? "FAIL" : "PASS"
  };

  const logEntry = prismaClient.reconciliationLog?.create
    ? await prismaClient.reconciliationLog.create({
        data: summary
      })
    : { id: null, ...summary };

  if (errors.length > 0) {
    console.error("[RECONCILIATION] Financial inconsistency detected. Immediate review required.", {
      runDate: runDate.toISOString(),
      totalErrors: errors.length
    });

    await sendAlert(
      "FINANCIAL_RECONCILIATION_FAILED",
      "CRITICAL",
      "Financial inconsistency detected. Immediate review required.",
      {
        reconciliationLogId: logEntry.id,
        runDate: runDate.toISOString(),
        totalLoansChecked: loans.length,
        totalErrors: errors.length
      },
      prismaClient
    );
  } else {
    console.log("[RECONCILIATION] Daily reconciliation passed.", {
      runDate: runDate.toISOString(),
      totalLoansChecked: loans.length
    });
  }

  return logEntry;
}

module.exports = {
  asNumber,
  roundCurrency,
  runReconciliation
};
