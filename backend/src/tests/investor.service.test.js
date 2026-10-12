const { buildInvestorGeoSummary } = require("../services/investor.service");

describe("buildInvestorGeoSummary", () => {
  it("builds safe four-region investor aggregates with risk and growth classifications", async () => {
    const prisma = {
      loan: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "loan-central-1",
            region: "Central",
            status: "ACTIVE",
            principal: "100000",
            principalAmount: "100000",
            processingFee: "2000",
            interestAmount: "18000",
            disbursedAmount: "98000",
            totalRepayableAmount: "118000",
            remainingBalance: "30000",
            createdAt: "2026-05-10T00:00:00.000Z",
            disbursedAt: "2026-05-10T00:00:00.000Z",
            startDate: "2026-05-10T00:00:00.000Z"
          },
          {
            id: "loan-western-1",
            region: "Western",
            status: "DEFAULTED",
            principal: "50000",
            principalAmount: "50000",
            processingFee: "1000",
            interestAmount: "9000",
            disbursedAmount: "49000",
            totalRepayableAmount: "59000",
            remainingBalance: "40000",
            createdAt: "2026-04-05T00:00:00.000Z",
            disbursedAt: "2026-04-05T00:00:00.000Z",
            startDate: "2026-04-05T00:00:00.000Z"
          },
          {
            id: "loan-northern-1",
            region: "Northern",
            status: "COMPLETED",
            principal: "80000",
            principalAmount: "80000",
            processingFee: "1600",
            interestAmount: "14400",
            disbursedAmount: "78400",
            totalRepayableAmount: "94400",
            remainingBalance: "0",
            createdAt: "2026-03-15T00:00:00.000Z",
            disbursedAt: "2026-03-15T00:00:00.000Z",
            startDate: "2026-03-15T00:00:00.000Z"
          }
        ])
      },
      loanRepayment: {
        findMany: jest.fn().mockResolvedValue([
          { region: "Central", amount: "70000" },
          { region: "Western", amount: "5000" },
          { region: "Northern", amount: "94400" }
        ])
      },
      agent: {
        findMany: jest.fn().mockResolvedValue([
          { id: "agent-c-1", region: "Central", status: "ACTIVE" },
          { id: "agent-c-2", region: "Central", status: "ACTIVE" },
          { id: "agent-w-1", region: "Western", status: "ACTIVE" },
          { id: "agent-n-1", region: "Northern", status: "ACTIVE" }
        ])
      }
    };

    const summary = await buildInvestorGeoSummary(prisma, new Date("2026-05-24T00:00:00.000Z"));

    expect(summary).toHaveLength(4);
    expect(summary.map((entry) => entry.region)).toEqual(["Central", "Eastern", "Northern", "Western"]);

    const central = summary.find((entry) => entry.region === "Central");
    const eastern = summary.find((entry) => entry.region === "Eastern");
    const northern = summary.find((entry) => entry.region === "Northern");
    const western = summary.find((entry) => entry.region === "Western");

    expect(central.totalCapitalDeployed).toBe(98000);
    expect(central.totalRepaid).toBe(70000);
    expect(central.repaymentRate).toBeCloseTo(59.32, 2);
    expect(central.growthTrend).toBe("UP");

    expect(eastern.totalCapitalDeployed).toBe(0);
    expect(eastern.agentCoverage).toBe("WEAK");
    expect(eastern.riskLevel).toBe("MEDIUM");

    expect(northern.totalRepaid).toBe(94400);
    expect(northern.riskLevel).toBe("LOW");

    expect(western.defaultRate).toBe(100);
    expect(western.riskLevel).toBe("HIGH");
    expect(western.warning).toBe("Portfolio stress increasing in this region");
  });
});
