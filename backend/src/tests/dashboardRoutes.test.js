jest.mock("../prisma", () => ({
  loan: {
    findMany: jest.fn()
  },
  loanRepayment: {
    findMany: jest.fn()
  },
  riskScore: {
    findMany: jest.fn()
  },
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "admin-1") {
        return {
          id: "admin-1",
          email: "admin@alesunfund.local",
          loginId: "admin",
          role: "SUPER_ADMIN",
          fullName: "Admin User",
          isActive: true,
          status: "ACTIVE",
          lastLoginAt: null
        };
      }
      return null;
    }),
    findMany: jest.fn().mockResolvedValue([])
  },
  agent: {
    findMany: jest.fn().mockResolvedValue([])
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function adminToken() {
  return jwt.sign({ sub: "admin-1" }, jwtSecret);
}

describe("GET /api/dashboard/portfolio", () => {
  beforeEach(() => {
    prisma.loan.findMany.mockResolvedValue([
      {
        id: "loan-1",
        region: "Central",
        district: "Wakiso",
        disbursedAmount: "98000",
        principalAmount: "100000",
        principal: "100000",
        status: "ACTIVE",
        createdAt: "2026-05-24T00:00:00.000Z",
        disbursedAt: "2026-05-24T00:00:00.000Z",
        startDate: "2026-05-24T00:00:00.000Z",
        loanRepayments: [],
        repaymentSchedules: [],
        payments: []
      }
    ]);
    prisma.loanRepayment.findMany.mockResolvedValue([
      { district: "Wakiso", amount: "5000", createdAt: "2026-05-24T00:00:00.000Z" }
    ]);
    prisma.riskScore.findMany.mockResolvedValue([{ label: "Low risk" }]);
    prisma.agent.findMany.mockResolvedValue([
      {
        id: "agent-1",
        fullName: "Asha Agent",
        agentCode: "AG001",
        country: "UGANDA",
        region: "Central",
        subregion: "Buganda South",
        district: "Wakiso",
        administrativeUnit: "Busiro County",
        subUnit: "Kakiri Town Council",
        subcounty: "Kakiri Town Council",
        score: { trustScore: 88, defaultRate: "4", activeLoans: 1 }
      }
    ]);
  });

  it("returns executive geospatial KPIs", async () => {
    const response = await request(app)
      .get("/api/dashboard/portfolio")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.geoKpis.loansPerRegion).toEqual([{ region: "Central", count: 1 }]);
    expect(response.body.geoKpis.revenuePerDistrict).toEqual([{ district: "Wakiso", amount: 5000 }]);
    expect(response.body.geoKpis.agentProductivityRanking[0]).toMatchObject({
      name: "Asha Agent",
      trustScore: 88
    });
  });
});
