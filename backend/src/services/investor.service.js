const bcrypt = require("bcryptjs");
const { buildAccountingOverview } = require("./accountingOverview.service");
const INVESTOR_REGIONS = ["Central", "Eastern", "Northern", "Western"];

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

function normalizeRegion(region) {
  const normalized = String(region || "").trim();
  return INVESTOR_REGIONS.includes(normalized) ? normalized : null;
}

function classifyRiskLevel({ defaultRate, repaymentRate, netYield }) {
  if (defaultRate === 0 && repaymentRate === 0 && netYield === 0) {
    return "MEDIUM";
  }

  if (defaultRate >= 15 || repaymentRate < 65 || netYield < 8) {
    return "HIGH";
  }

  if (defaultRate >= 7 || repaymentRate < 82 || netYield < 14) {
    return "MEDIUM";
  }

  return "LOW";
}

function classifyGrowthTrend(currentWindowCapital, previousWindowCapital) {
  if (!currentWindowCapital && !previousWindowCapital) {
    return "STABLE";
  }

  if (!previousWindowCapital && currentWindowCapital > 0) {
    return "UP";
  }

  const changeRatio = previousWindowCapital
    ? ((currentWindowCapital - previousWindowCapital) / previousWindowCapital) * 100
    : 0;

  if (changeRatio > 10) {
    return "UP";
  }

  if (changeRatio < -10) {
    return "DOWN";
  }

  return "STABLE";
}

function classifyAgentCoverage(agentCount, activeLoans) {
  if (!agentCount) {
    return "WEAK";
  }

  const loansPerAgent = activeLoans / agentCount;
  if (agentCount >= 3 && loansPerAgent <= 10) {
    return "STRONG";
  }

  if (loansPerAgent <= 18) {
    return "MODERATE";
  }

  return "WEAK";
}

async function createInvestorByAdmin(tx, adminUser, payload) {
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const user = await tx.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email || `${payload.loginId.toLowerCase()}@investors.alesunfund.local`,
      loginId: payload.loginId,
      passwordHash,
      role: "INVESTOR",
      status: "ACTIVE"
    }
  });

  const investor = await tx.investor.create({
    data: {
      userId: user.id,
      createdByAdminId: adminUser.id,
      investorName: payload.investorName || payload.fullName,
      organization: payload.organization || null,
      email: payload.email || null,
      phone: payload.phone || null
    }
  });

  return { user, investor };
}

async function buildInvestorGeoSummary(prismaClient, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const currentWindowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const previousWindowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);

  const [loans, repayments, agents] = await Promise.all([
    prismaClient.loan.findMany({
      select: {
        id: true,
        region: true,
        status: true,
        principal: true,
        principalAmount: true,
        processingFee: true,
        interestAmount: true,
        disbursedAmount: true,
        totalRepayableAmount: true,
        remainingBalance: true,
        createdAt: true,
        disbursedAt: true,
        startDate: true
      }
    }),
    prismaClient.loanRepayment.findMany({
      select: {
        region: true,
        amount: true
      }
    }),
    prismaClient.agent.findMany({
      select: {
        id: true,
        region: true,
        status: true
      }
    })
  ]);

  const regionMap = new Map(
    INVESTOR_REGIONS.map((region) => [
      region,
      {
        region,
        loanCount: 0,
        activeLoans: 0,
        totalCapitalDeployed: 0,
        totalRepaid: 0,
        totalRepayableExpected: 0,
        revenuePotential: 0,
        defaultedLoans: 0,
        defaultLossEstimate: 0,
        currentWindowCapital: 0,
        previousWindowCapital: 0,
        activeAgentCount: 0
      }
    ])
  );

  for (const loan of loans) {
    const region = normalizeRegion(loan.region);
    if (!region) {
      continue;
    }

    const bucket = regionMap.get(region);
    const deployedCapital = asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal);
    const expectedRepayable = asNumber(loan.totalRepayableAmount || loan.principalAmount || loan.principal);
    const revenuePotential = asNumber(loan.processingFee) + asNumber(loan.interestAmount);

    bucket.loanCount += 1;
    bucket.totalCapitalDeployed += deployedCapital;
    bucket.totalRepayableExpected += expectedRepayable;
    bucket.revenuePotential += revenuePotential;

    if (loan.status === "ACTIVE") {
      bucket.activeLoans += 1;
    }

    if (loan.status === "DEFAULTED") {
      bucket.defaultedLoans += 1;
      bucket.defaultLossEstimate += asNumber(loan.remainingBalance);
    }

    const activityDate = new Date(loan.disbursedAt || loan.startDate || loan.createdAt);
    if (activityDate >= currentWindowStart) {
      bucket.currentWindowCapital += deployedCapital;
    } else if (activityDate >= previousWindowStart && activityDate < currentWindowStart) {
      bucket.previousWindowCapital += deployedCapital;
    }
  }

  for (const repayment of repayments) {
    const region = normalizeRegion(repayment.region);
    if (!region) {
      continue;
    }

    regionMap.get(region).totalRepaid += asNumber(repayment.amount);
  }

  for (const agent of agents) {
    const region = normalizeRegion(agent.region);
    if (!region || agent.status !== "ACTIVE") {
      continue;
    }

    regionMap.get(region).activeAgentCount += 1;
  }

  return Array.from(regionMap.values()).map((bucket) => {
    const totalCapitalDeployed = roundCurrency(bucket.totalCapitalDeployed);
    const totalRepaid = roundCurrency(bucket.totalRepaid);
    const defaultRate = percentage(bucket.defaultedLoans, bucket.loanCount);
    const repaymentRate = percentage(totalRepaid, bucket.totalRepayableExpected);
    const netYield = percentage(
      roundCurrency(bucket.revenuePotential - bucket.defaultLossEstimate),
      totalCapitalDeployed
    );
    const riskLevel = classifyRiskLevel({ defaultRate, repaymentRate, netYield });

    return {
      region: bucket.region,
      loanCount: bucket.loanCount,
      totalCapitalDeployed,
      totalRepaid,
      repaymentRate,
      defaultRate,
      netYield,
      riskLevel,
      growthTrend: classifyGrowthTrend(bucket.currentWindowCapital, bucket.previousWindowCapital),
      agentCoverage: classifyAgentCoverage(bucket.activeAgentCount, bucket.activeLoans),
      riskSignal: riskLevel === "HIGH" ? "High Risk Zone" : riskLevel === "MEDIUM" ? "Watch Zone" : "Stable Zone",
      warning: riskLevel === "HIGH" ? "Portfolio stress increasing in this region" : null
    };
  });
}

async function buildInvestorDashboard(prismaClient) {
  const [accounting, geoSummary] = await Promise.all([
    buildAccountingOverview(prismaClient),
    buildInvestorGeoSummary(prismaClient)
  ]);

  return {
    executive: {
      totalPortfolioValue: accounting.summary.totalPortfolioValue,
      activeLoansCount: accounting.summary.activeLoansCount,
      cashAvailable: accounting.summary.cashAvailable,
      defaultRate: accounting.summary.defaultRate
    },
    portfolio: accounting.portfolio,
    cashFlow: accounting.cashFlow,
    incomeStatement: accounting.incomeStatement,
    collections: accounting.collections,
    riskMetrics: accounting.riskMetrics,
    growth: accounting.growth,
    geoSummary
  };
}

module.exports = {
  buildInvestorGeoSummary,
  buildInvestorDashboard,
  createInvestorByAdmin
};
