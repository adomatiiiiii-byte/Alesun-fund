const {
  buildGeoFilters,
  DISTRICT_GEOMETRY,
  getGeoAgentOverlay,
  getGeoHeatmapData,
  getGeoRiskData,
  invalidateGeoIntelligenceCache
} = require("../services/geoIntelligence.service");

describe("geoIntelligence.service", () => {
  beforeEach(() => {
    invalidateGeoIntelligenceCache();
  });

  it("builds filtered district heatmap, agent overlay, and risk metrics", async () => {
    const prisma = {
      loan: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "loan-1",
            agentId: "agent-1",
            region: "Central",
            district: "Wakiso",
            status: "ACTIVE",
            principal: "100000",
            principalAmount: "100000",
            disbursedAmount: "98000",
            processingFee: "2000",
            totalRepayableAmount: "118000",
            remainingBalance: "50000",
            daysLate: 4,
            createdAt: "2026-05-24T08:00:00.000Z",
            disbursedAt: "2026-05-24T08:00:00.000Z"
          },
          {
            id: "loan-2",
            agentId: "agent-1",
            region: "Central",
            district: "Wakiso",
            status: "DEFAULTED",
            principal: "50000",
            principalAmount: "50000",
            disbursedAmount: "49000",
            processingFee: "1000",
            totalRepayableAmount: "59000",
            remainingBalance: "59000",
            daysLate: 20,
            createdAt: "2026-05-23T08:00:00.000Z",
            disbursedAt: "2026-05-23T08:00:00.000Z"
          },
          {
            id: "loan-3",
            agentId: "agent-2",
            region: "Western",
            district: "Hoima",
            status: "COMPLETED",
            principal: "75000",
            principalAmount: "75000",
            disbursedAmount: "73500",
            processingFee: "1500",
            totalRepayableAmount: "88500",
            remainingBalance: "0",
            daysLate: 0,
            createdAt: "2026-05-22T08:00:00.000Z",
            disbursedAt: "2026-05-22T08:00:00.000Z"
          }
        ])
      },
      loanRepayment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "repay-1",
            loanId: "loan-1",
            agentId: "agent-1",
            region: "Central",
            district: "Wakiso",
            amount: "40000",
            createdAt: "2026-05-24T11:00:00.000Z"
          },
          {
            id: "repay-2",
            loanId: "loan-3",
            agentId: "agent-2",
            region: "Western",
            district: "Hoima",
            amount: "88500",
            createdAt: "2026-05-24T11:00:00.000Z"
          }
        ])
      },
      agent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "agent-1",
            agentCode: "AG001",
            fullName: "Asha Agent",
            region: "Central",
            district: "Wakiso",
            status: "ACTIVE",
            score: {
              trustScore: 85,
              defaultRate: "12",
              repaymentRate: "76",
              activeLoans: 2,
              overdueLoans: 1
            }
          },
          {
            id: "agent-2",
            agentCode: "AG002",
            fullName: "Brian Agent",
            region: "Western",
            district: "Hoima",
            status: "ACTIVE",
            score: {
              trustScore: 58,
              defaultRate: "0",
              repaymentRate: "100",
              activeLoans: 0,
              overdueLoans: 0
            }
          }
        ])
      }
    };

    const filters = buildGeoFilters({ region: "Central" });
    const heatmap = await getGeoHeatmapData(prisma, filters);
    const agents = await getGeoAgentOverlay(prisma, filters);
    const risk = await getGeoRiskData(prisma, filters);

    expect(heatmap.districts).toHaveLength(1);
    expect(heatmap.districts[0]).toMatchObject({
      district: "Wakiso",
      totalLoans: 2,
      totalCapitalDeployed: 147000,
      totalRepaid: 40000,
      defaultRate: 50,
      topAgent: "Asha Agent"
    });
    expect(heatmap.topBar.totalActiveAgents).toBe(1);

    expect(agents.agents).toHaveLength(1);
    expect(agents.agents[0]).toMatchObject({
      agentName: "Asha Agent",
      performanceScore: 85,
      totalLoansHandled: 2,
      markerColor: "GREEN"
    });

    expect(risk.districts).toHaveLength(1);
    expect(risk.districts[0].district).toBe("Wakiso");
    expect(risk.districts[0].riskLevel).toBe("HIGH");
    expect(risk.districts[0].warning).toBe("Portfolio stress increasing in this region");
  });

  it("anchors district boxes inside their expected subregional map areas", () => {
    const wakiso = DISTRICT_GEOMETRY.districtLookup.get("central::wakiso");
    const hoima = DISTRICT_GEOMETRY.districtLookup.get("western::hoima");

    expect(wakiso).toBeTruthy();
    expect(hoima).toBeTruthy();

    expect(wakiso.centroid.lat).toBeGreaterThanOrEqual(-0.75);
    expect(wakiso.centroid.lat).toBeLessThanOrEqual(0.7);
    expect(wakiso.centroid.lng).toBeGreaterThanOrEqual(31.15);
    expect(wakiso.centroid.lng).toBeLessThanOrEqual(32.95);

    expect(hoima.centroid.lat).toBeGreaterThanOrEqual(0.82);
    expect(hoima.centroid.lat).toBeLessThanOrEqual(2.22);
    expect(hoima.centroid.lng).toBeGreaterThanOrEqual(30.45);
    expect(hoima.centroid.lng).toBeLessThanOrEqual(32.05);
  });
});
