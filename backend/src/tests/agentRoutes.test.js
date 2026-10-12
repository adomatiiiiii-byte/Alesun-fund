const mockBuildAgentAccessStatus = jest.fn();
const mockBuildAgentDashboardForActor = jest.fn();

jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "applicant-1") {
        return {
          id: "applicant-1",
          email: "applicant@example.com",
          role: "APPLICANT",
          fullName: "Applicant User",
          isActive: true,
          status: "ACTIVE",
          mustChangePassword: false
        };
      }

      if (where.id === "agent-user-1") {
        return {
          id: "agent-user-1",
          email: "agent@example.com",
          loginId: "AGT-100001",
          role: "AGENT",
          fullName: "Field Agent",
          isActive: true,
          status: "ACTIVE",
          mustChangePassword: false
        };
      }

      return null;
    })
  },
  agent: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.userId === "agent-user-1") {
        return { id: "agent-1" };
      }

      if (where.id === "agent-1") {
        return {
          id: "agent-1",
          userId: "agent-user-1",
          status: "ACTIVE"
        };
      }

      return null;
    })
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
  }
}));

jest.mock("../services/agent.service", () => ({
  applyAgentTransaction: jest.fn(),
  buildAgentAccessStatus: (...args) => mockBuildAgentAccessStatus(...args),
  buildAgentDashboardForActor: (...args) => mockBuildAgentDashboardForActor(...args)
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { jwtSecret } = require("../config");

function tokenFor(id) {
  return jwt.sign({ sub: id }, jwtSecret);
}

describe("agent routes", () => {
  beforeEach(() => {
    mockBuildAgentAccessStatus.mockReset();
    mockBuildAgentDashboardForActor.mockReset();
  });

  it("blocks applicant self-registration and explains the admin-controlled flow", async () => {
    const response = await request(app)
      .post("/api/user/agent/register")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Applicant User",
        phoneNumber: "0700000001"
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/created by administrators only/i);
  });

  it("lets admin-created agents access status directly without borrower onboarding", async () => {
    mockBuildAgentAccessStatus.mockResolvedValue({
      status: "APPROVED",
      message: "Your agent account is active.",
      agent: { id: "agent-1" }
    });

    const response = await request(app)
      .get("/api/user/agent/status")
      .set("Authorization", `Bearer ${tokenFor("agent-user-1")}`);

    expect(response.status).toBe(200);
    expect(mockBuildAgentAccessStatus).toHaveBeenCalledWith(expect.anything(), {
      userId: null,
      agentId: "agent-1"
    });
    expect(response.body.status).toBe("APPROVED");
  });

  it("lets admin-created agents load the agent dashboard directly", async () => {
    mockBuildAgentDashboardForActor.mockResolvedValue({
      overview: {
        agentCode: "AGT-100001",
        totalUsersReferred: 1
      },
      users: [],
      alerts: [],
      earnings: [],
      penalties: []
    });

    const response = await request(app)
      .get("/api/user/agent/dashboard")
      .set("Authorization", `Bearer ${tokenFor("agent-user-1")}`);

    expect(response.status).toBe(200);
    expect(mockBuildAgentDashboardForActor).toHaveBeenCalledWith(expect.anything(), {
      agentId: "agent-1",
      userId: "agent-user-1"
    });
    expect(response.body.overview.agentCode).toBe("AGT-100001");
  });

  it("blocks applicants from hitting the protected agent dashboard endpoint", async () => {
    const response = await request(app)
      .get("/api/user/agent/dashboard")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Agent access required");
  });
});
