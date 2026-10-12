jest.mock("../services/agent.service", () => ({
  approveAgentApplication: jest.fn(),
  buildAdminAgentDetail: jest.fn(),
  buildAdminAgentSummary: jest.fn(),
  createAgentByAdmin: jest.fn(),
  rejectAgentApplication: jest.fn(),
  updateAgentStatus: jest.fn()
}));

jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "admin-1") {
        return {
          id: "admin-1",
          email: "admin@alesunfund.local",
          role: "ADMIN",
          fullName: "Admin User",
          isActive: true
        };
      }

      return null;
    })
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
  },
  $transaction: jest.fn()
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");
const {
  approveAgentApplication,
  buildAdminAgentSummary,
  createAgentByAdmin
} = require("../services/agent.service");

function adminToken() {
  return jwt.sign({ sub: "admin-1" }, jwtSecret);
}

describe("admin agent geography routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the geo analytics summary with filters", async () => {
    buildAdminAgentSummary.mockResolvedValue({
      pendingApplications: [],
      approvedAgents: [],
      adminAccountability: [],
      geoView: {
        agentsPerRegion: [{ region: "Central", count: 2 }],
        loanDistribution: [{ region: "Central", count: 4 }],
        districtPerformance: [{ district: "Kampala", region: "Central", loanCount: 4, defaultRate: 25 }],
        heatmap: [],
        filterOptions: { geoCatalog: [], agents: [] },
        filters: { region: "Central", district: "", agentId: "" }
      }
    });

    const response = await request(app)
      .get("/api/admin/agents?region=Central")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(buildAdminAgentSummary).toHaveBeenCalledWith(expect.anything(), {
      region: "Central"
    });
    expect(response.body.geoView.agentsPerRegion[0].count).toBe(2);
  });

  it("creates an agent directly under the admin with generated credentials", async () => {
    createAgentByAdmin.mockResolvedValue({
      agent: {
        id: "agent-1",
        fullName: "Agent One",
        agentCode: "AGT-123456",
        phoneNumber: "0700000001",
        region: "Central",
        district: "Kampala",
        county: "Kawempe",
        subcounty: "Kalerwe"
      },
      credentials: {
        email: "agt-123456@agents.alesunfund.local",
        temporaryPassword: "Alesun!ABC123"
      }
    });

    prisma.$transaction.mockImplementation(async (callback) => callback({
      auditLog: {
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    }));

    const response = await request(app)
      .post("/api/admin/agents/create")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        fullName: "Agent One",
        phoneNumber: "0700000001",
        nationalId: "CM12345",
        kycDetails: {
          address: "Kampala",
          notes: "Verified by admin"
        },
        geography: {
          region: "Central",
          district: "Kampala",
          county: "Kawempe",
          subcounty: "Kalerwe"
        }
      });

    expect(response.status).toBe(201);
    expect(createAgentByAdmin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "admin-1" }),
      expect.objectContaining({
        fullName: "Agent One",
        phoneNumber: "0700000001"
      })
    );
    expect(response.body.credentials.email).toBe("agt-123456@agents.alesunfund.local");
  });

  it("requires geography when approving an agent application", async () => {
    const response = await request(app)
      .post("/api/admin/agents/applications/application-1/status")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "APPROVED" });

    expect(response.status).toBe(400);
    expect(response.body.issues?.[0]?.message || response.body.message).toMatch(/geography is required/i);
  });

  it("passes approved geography into the existing approval flow", async () => {
    approveAgentApplication.mockResolvedValue({
      application: { id: "application-1", status: "APPROVED" },
      agent: { id: "agent-1", agentCode: "AGT-123456" }
    });

    prisma.$transaction.mockImplementation(async (callback) => callback({
      auditLog: {
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    }));

    const response = await request(app)
      .post("/api/admin/agents/applications/application-1/status")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        status: "APPROVED",
        geography: {
          region: "Central",
          district: "Kampala",
          county: "Kawempe",
          subcounty: "Kalerwe"
        }
      });

    expect(response.status).toBe(200);
    expect(approveAgentApplication).toHaveBeenCalledWith(
      expect.anything(),
      "application-1",
      {
        country: "Uganda",
        region: "Central",
        subregion: "Kawempe",
        district: "Kampala",
        administrativeUnit: "Kawempe",
        subUnit: "Kalerwe",
        county: "Kawempe",
        subcounty: "Kalerwe"
      },
      expect.objectContaining({ id: "admin-1" })
    );
    expect(response.body.agent.agentCode).toBe("AGT-123456");
  });
});
