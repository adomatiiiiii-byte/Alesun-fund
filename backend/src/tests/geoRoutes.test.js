jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "super-1") {
        return {
          id: "super-1",
          email: "super@alesunfund.local",
          loginId: "super",
          role: "SUPER_ADMIN",
          fullName: "Super Admin",
          isActive: true,
          status: "ACTIVE",
          lastLoginAt: null
        };
      }

      if (where.id === "agent-1") {
        return {
          id: "agent-1",
          email: "agent@alesunfund.local",
          loginId: "agent",
          role: "AGENT",
          fullName: "Field Agent",
          isActive: true,
          status: "ACTIVE",
          lastLoginAt: null
        };
      }

      return null;
    })
  },
  agent: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([])
  },
  investor: {
    findUnique: jest.fn().mockResolvedValue(null)
  },
  loan: {
    findMany: jest.fn().mockResolvedValue([])
  },
  loanRepayment: {
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

function tokenFor(userId) {
  return jwt.sign({ sub: userId }, jwtSecret);
}

describe("GET /api/geo/heatmap-data", () => {
  beforeEach(() => {
    prisma.loan.findMany.mockResolvedValue([]);
    prisma.loanRepayment.findMany.mockResolvedValue([]);
    prisma.agent.findMany.mockResolvedValue([]);
  });

  it("allows super admin access", async () => {
    const response = await request(app)
      .get("/api/geo/heatmap-data")
      .set("Authorization", `Bearer ${tokenFor("super-1")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        districts: expect.any(Array),
        boundaries: expect.any(Object)
      })
    );
  });

  it("blocks agent access", async () => {
    const response = await request(app)
      .get("/api/geo/heatmap-data")
      .set("Authorization", `Bearer ${tokenFor("agent-1")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });
});
