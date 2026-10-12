const { calculateAlesunRiskScore } = require("../services/riskScoring");

describe("calculateAlesunRiskScore", () => {
  it("returns a low-risk approval recommendation for strong businesses", () => {
    const result = calculateAlesunRiskScore({
      yearsInOperation: 7,
      monthlyRevenue: [12000000, 12500000, 11900000, 12300000, 12100000, 12400000],
      expenses: 7000000,
      loanRequestAmount: 16000000,
      loanPurpose: "Expand inventory and open a second distribution route for wholesale buyers.",
      ownerReliabilityScore: 90
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe("Low risk");
    expect(result.recommendation).toBe("Auto approve recommendation");
  });

  it("flags issues and rejects weak applications", () => {
    const result = calculateAlesunRiskScore({
      yearsInOperation: 0,
      monthlyRevenue: [1200000, 800000, 400000, 300000, 100000, 50000],
      expenses: 1500000,
      loanRequestAmount: 12000000,
      loanPurpose: "Restock",
      ownerReliabilityScore: 30
    });

    expect(result.score).toBeLessThan(65);
    expect(result.label).toBe("High risk");
    expect(result.status).toBe("REJECTED");
  });

  it("allows zero revenue entries and decimal years in operation", () => {
    const result = calculateAlesunRiskScore({
      yearsInOperation: 1.5,
      monthlyRevenue: [0, 2500000, 3000000, 2800000, 3200000, 3100000],
      expenses: 1800000,
      loanRequestAmount: 4000000,
      loanPurpose: "Purchase additional stock for a growing retail outlet with seasonal sales.",
      ownerReliabilityScore: 70
    });

    expect(result.breakdown.businessStability).toBeGreaterThan(0);
  });
});
