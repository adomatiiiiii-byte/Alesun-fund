function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scoreBand(value, maxPoints) {
  const normalized = Math.max(0, Math.min(1, value));
  return Number((normalized * maxPoints).toFixed(2));
}

function calculateAlesunRiskScore(input) {
  const monthlyRevenue = input.monthlyRevenue || [];
  const averageRevenue = average(monthlyRevenue);
  const revenueDeviation = standardDeviation(monthlyRevenue);
  const revenueConsistencyRatio =
    averageRevenue > 0 ? 1 - revenueDeviation / averageRevenue : 0;
  const expenses = Number(input.expenses || 0);
  const profitMargin = averageRevenue > 0 ? (averageRevenue - expenses) / averageRevenue : 0;
  const normalizedProfitability = Math.max(0, Math.min(1, profitMargin / 0.35));
  const yearsInOperation = Number(input.yearsInOperation || 0);
  const ownerReliabilityScore = Number(input.ownerReliabilityScore || 0) / 100;
  const activityLevelRatio = Math.min(1, averageRevenue / 12000000);
  const purposeText = (input.loanPurpose || "").trim();
  const purposeClarityRatio = Math.min(1, purposeText.length / 50);

  const breakdown = {
    financialConsistency: scoreBand(revenueConsistencyRatio, 25),
    profitability: scoreBand(normalizedProfitability, 20),
    businessStability: scoreBand(Math.min(1, yearsInOperation / 8), 15),
    ownerReliability: scoreBand(ownerReliabilityScore, 15),
    activityLevel: scoreBand(activityLevelRatio, 15),
    loanPurposeClarity: scoreBand(purposeClarityRatio, 10)
  };

  const score = Number(
    Object.values(breakdown)
      .reduce((sum, value) => sum + value, 0)
      .toFixed(2)
  );

  let label = "High risk";
  let recommendation = "Reject recommendation";
  let status = "REJECTED";

  if (score >= 80) {
    label = "Low risk";
    recommendation = "Auto approve recommendation";
    status = "APPROVED";
  } else if (score >= 65) {
    label = "Medium risk";
    recommendation = "Review required";
    status = "UNDER_REVIEW";
  }

  return {
    score,
    label,
    recommendation,
    status,
    breakdown
  };
}

module.exports = { calculateAlesunRiskScore };
