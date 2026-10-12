const APPLICATION_FEE_AMOUNT = 0;
const { buildSystemHealth } = require("./monitoringService");
const { buildOperationalLoanRequestWhere } = require("./loanRequestLifecycle.service");

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function buildGrowthBuckets(referenceDate, count = 6) {
  return Array.from({ length: count }).map((_, index) => {
    const bucketDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(bucketDate),
      label: monthLabel(bucketDate),
      start: bucketDate,
      end: new Date(bucketDate.getFullYear(), bucketDate.getMonth() + 1, 1)
    };
  });
}

function getInstallmentInterestShare(loan) {
  const principal = asNumber(loan.principal);
  const annualInterestRate = asNumber(loan.annualInterestRate);
  const termDays = asNumber(loan.termMonths);

  if (!termDays) {
    return 0;
  }

  return roundCurrency((principal * (annualInterestRate / 100)) / termDays);
}

function getPrincipalCollectedForPayment(payment, loan) {
  const amountPaid = asNumber(payment.paidAmount);
  if (!amountPaid) {
    return 0;
  }

  const interestShare = getInstallmentInterestShare(loan);
  return roundCurrency(Math.max(0, amountPaid - interestShare));
}

function buildLoanFacts(loan, now) {
  const payments = loan.repaymentSchedules?.length ? loan.repaymentSchedules : (loan.payments || []);
  const paidPayments = payments.filter((payment) => asNumber(payment.paidAmount) > 0);
  const duePayments = payments.filter((payment) => new Date(payment.dueDate) <= now);
  const delinquentPayments = payments.filter((payment) => {
    const remainingAmount = Math.max(0, asNumber(payment.expectedAmount) - asNumber(payment.paidAmount));
    return remainingAmount > 0 && new Date(payment.dueDate) < now;
  });
  const unpaidOverduePayments = payments.filter((payment) => {
    const dueDate = new Date(payment.dueDate);
    return dueDate < now && Math.max(0, asNumber(payment.expectedAmount) - asNumber(payment.paidAmount)) > 0;
  });

  const interestEarned = paidPayments.reduce(
    (sum, payment) => sum + Math.min(asNumber(payment.paidAmount), getInstallmentInterestShare(loan)),
    0
  );
  const principalCollected = paidPayments.reduce(
    (sum, payment) => sum + getPrincipalCollectedForPayment(payment, loan),
    0
  );
  const outstandingPrincipal = Math.max(0, roundCurrency(asNumber(loan.remainingBalance || loan.principal) - 0));
  const overdueAmount = unpaidOverduePayments.reduce(
    (sum, payment) => sum + Math.max(0, asNumber(payment.expectedAmount) - asNumber(payment.paidAmount)),
    0
  );
  const lateDaysValues = delinquentPayments
    .map((payment) => Math.max(0, Math.floor((now - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))))
    .filter((value) => value > 0);
  const expectedRepayments = duePayments.reduce((sum, payment) => sum + asNumber(payment.expectedAmount), 0);
  const actualCollected = duePayments.reduce((sum, payment) => sum + asNumber(payment.paidAmount), 0);

  return {
    interestEarned: roundCurrency(interestEarned),
    principalCollected: roundCurrency(principalCollected),
    outstandingPrincipal: roundCurrency(outstandingPrincipal),
    overdueAmount: roundCurrency(overdueAmount),
    latePaymentCount: delinquentPayments.length,
    averageDaysLate: lateDaysValues.length
      ? Number((lateDaysValues.reduce((sum, value) => sum + value, 0) / lateDaysValues.length).toFixed(2))
      : 0,
    expectedRepayments: roundCurrency(expectedRepayments),
    actualCollected: roundCurrency(actualCollected)
  };
}

async function buildAccountingOverview(prismaClient, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const buckets = buildGrowthBuckets(now);

  const [loans, applications, users, loanRequests] = await Promise.all([
    prismaClient.loan.findMany({
      include: {
        repaymentSchedules: {
          orderBy: { dueDate: "asc" }
        },
        payments: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prismaClient.loanApplication.findMany({
      select: {
        id: true,
        submittedAt: true
      }
    }),
    prismaClient.user.findMany({
      select: {
        id: true,
        score: true,
        role: true
      }
    }),
    prismaClient.loanRequest.findMany({
      where: buildOperationalLoanRequestWhere(["PENDING", "APPROVED", "REJECTED"]),
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    })
  ]);
  const systemHealth = await buildSystemHealth(prismaClient);

  const activeLoans = loans.filter((loan) => loan.status === "ACTIVE");
  const completedLoans = loans.filter((loan) => loan.status === "COMPLETED");
  const defaultedLoans = loans.filter((loan) => loan.status === "DEFAULTED");
  const loanFacts = loans.map((loan) => ({
    loan,
    facts: buildLoanFacts(loan, now)
  }));

  const totalPortfolioValue = roundCurrency(
    activeLoans.reduce((sum, loan) => sum + asNumber(loan.principal), 0)
  );
  const totalLoansOutstanding = roundCurrency(
    loanFacts
      .filter(({ loan }) => loan.status === "ACTIVE")
      .reduce((sum, entry) => sum + entry.facts.outstandingPrincipal, 0)
  );
  const principalCollections = roundCurrency(
    loanFacts.reduce((sum, entry) => sum + entry.facts.principalCollected, 0)
  );
  const interestIncome = roundCurrency(
    loanFacts.reduce((sum, entry) => sum + entry.facts.interestEarned, 0)
  );
  const applicationFees = roundCurrency(applications.length * APPLICATION_FEE_AMOUNT);
  const disbursements = roundCurrency(
    loans
      .filter((loan) => loan.disbursedAt || loan.startDate)
      .reduce((sum, loan) => sum + asNumber(loan.principal), 0)
  );
  const totalInflows = roundCurrency(principalCollections + interestIncome + applicationFees);
  const netCashFlow = roundCurrency(totalInflows - disbursements);
  const cashAvailable = netCashFlow;
  const defaultRate = percentage(defaultedLoans.length, loans.length);
  const latePaymentCount = loanFacts.reduce((sum, entry) => sum + entry.facts.latePaymentCount, 0);
  const totalPaymentCount = loans.reduce(
    (sum, loan) => sum + ((loan.repaymentSchedules?.length ? loan.repaymentSchedules.length : loan.payments?.length) || 0),
    0
  );
  const latePaymentRate = percentage(latePaymentCount, totalPaymentCount);
  const totalOverdueAmount = roundCurrency(
    loanFacts.reduce((sum, entry) => sum + entry.facts.overdueAmount, 0)
  );
  const averageDaysLateValues = loanFacts
    .map((entry) => entry.facts.averageDaysLate)
    .filter((value) => value > 0);
  const averageDaysLate = averageDaysLateValues.length
    ? Number(
        (
          averageDaysLateValues.reduce((sum, value) => sum + value, 0) /
          averageDaysLateValues.length
        ).toFixed(2)
      )
    : 0;
  const expectedRepayments = roundCurrency(
    loanFacts.reduce((sum, entry) => sum + entry.facts.expectedRepayments, 0)
  );
  const actualCollected = roundCurrency(
    loanFacts.reduce((sum, entry) => sum + entry.facts.actualCollected, 0)
  );
  const collectionEfficiency = percentage(actualCollected, expectedRepayments);
  const pendingLoanRequests = loanRequests.filter((request) => request.status === "PENDING").length;

  const cumulativeGrowth = { value: 0 };
  const growth = buckets.map((bucket) => {
    const loansIssued = loans.filter((loan) => {
      const createdAt = new Date(loan.createdAt);
      return createdAt >= bucket.start && createdAt < bucket.end;
    });
    const portfolioAdded = loansIssued.reduce((sum, loan) => sum + asNumber(loan.principal), 0);
    cumulativeGrowth.value += portfolioAdded;

    return {
      period: bucket.label,
      loansIssued: loansIssued.length,
      portfolioValue: roundCurrency(cumulativeGrowth.value)
    };
  });

  const userSegments = users.reduce(
    (segments, user) => {
      const score = asNumber(user.score, 100);
      if (score >= 80) {
        segments.good += 1;
      } else if (score >= 60) {
        segments.average += 1;
      } else {
        segments.risky += 1;
      }
      return segments;
    },
    { good: 0, average: 0, risky: 0 }
  );

  return {
    summary: {
      totalPortfolioValue,
      activeLoansCount: activeLoans.length,
      cashAvailable: roundCurrency(cashAvailable),
      defaultRate,
      pendingLoanRequests
    },
    systemHealth,
    cashFlow: {
      inflows: {
        loanRepaymentsReceived: principalCollections,
        interestIncome,
        applicationFees,
        totalInflows
      },
      outflows: {
        loanDisbursements: disbursements
      },
      netCashFlow
    },
    incomeStatement: {
      revenue: {
        interestEarned: interestIncome,
        applicationFees
      },
      expenses: {
        operationalCosts: 0
      },
      netProfit: roundCurrency(interestIncome + applicationFees)
    },
    balanceSheet: {
      assets: {
        totalLoansOutstanding,
        cashAvailable: roundCurrency(cashAvailable)
      },
      liabilities: {
        externalFunding: 0
      }
    },
    portfolio: {
      totalLoansIssued: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: completedLoans.length,
      defaultedLoans: defaultedLoans.length
    },
    riskMetrics: {
      defaultRate,
      latePaymentRate,
      totalOverdueAmount,
      averageDaysLate
    },
    collections: {
      expectedRepayments,
      actualCollectedAmount: actualCollected,
      collectionEfficiency
    },
    growth,
    userSegments
  };
}

async function refreshAccountingMetrics(prismaClient, referenceDate = new Date()) {
  return buildAccountingOverview(prismaClient, referenceDate);
}

module.exports = {
  APPLICATION_FEE_AMOUNT,
  buildAccountingOverview,
  refreshAccountingMetrics
};
