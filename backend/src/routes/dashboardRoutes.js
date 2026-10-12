const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { buildGeoAnalytics } = require("../services/agent.service");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN"));

router.get("/portfolio", async (_req, res, next) => {
  try {
    const [loans, payments, scores, geoView] = await Promise.all([
      prisma.loan.findMany({ include: { payments: true, repaymentSchedules: true, loanRepayments: true } }),
      prisma.loanRepayment.findMany(),
      prisma.riskScore.findMany(),
      buildGeoAnalytics(prisma)
    ]);

    const totalCapitalDeployed = loans
      .filter((loan) => loan.disbursedAt || loan.startDate)
      .reduce((sum, loan) => sum + Number(loan.principal), 0);
    const activeLoans = loans.filter((loan) => loan.status === "ACTIVE").length;
    const monthlyIncome = payments
      .filter((payment) => {
        const paidDate = payment.createdAt ? new Date(payment.createdAt) : null;
        const now = new Date();
        return (
          paidDate &&
          paidDate.getMonth() === now.getMonth() &&
          paidDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const defaulted = loans.filter((loan) => loan.status === "DEFAULTED").length;
    const defaultRate = loans.length ? Number(((defaulted / loans.length) * 100).toFixed(2)) : 0;
    const riskDistribution = {
      low: scores.filter((score) => score.label === "Low risk").length,
      medium: scores.filter((score) => score.label === "Medium risk").length,
      high: scores.filter((score) => score.label === "High risk").length
    };

    return res.json({
      totalCapitalDeployed,
      activeLoans,
      monthlyIncome,
      defaultRate,
      riskDistribution,
      geoKpis: {
        loansPerRegion: geoView.loanDistribution,
        revenuePerDistrict: geoView.repaymentsByDistrict,
        defaultRateByGeography: geoView.districtPerformance,
        agentProductivityRanking: (geoView.heatmap || [])
          .sort((left, right) => (right.trustScore || 0) - (left.trustScore || 0))
          .slice(0, 8),
        capitalDeploymentPerRegion: geoView.loanDistribution.map((entry) => ({
          region: entry.region,
          count: entry.count,
          totalValue: loans
            .filter((loan) => loan.region === entry.region)
            .reduce((sum, loan) => sum + Number(loan.disbursedAmount || loan.principalAmount || loan.principal || 0), 0)
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
