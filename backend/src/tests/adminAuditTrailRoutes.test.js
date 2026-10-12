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
      if (where.id === "risk-1") {
        return {
          id: "risk-1",
          email: "risk@alesunfund.local",
          loginId: "risk",
          role: "RISK_ADMIN",
          fullName: "Risk Admin",
          isActive: true,
          status: "ACTIVE",
          lastLoginAt: null
        };
      }
      return null;
    }),
    findMany: jest.fn()
  },
  agent: {
    findUnique: jest.fn().mockResolvedValue(null)
  },
  investor: {
    findUnique: jest.fn().mockResolvedValue(null)
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(async ({ data }) => ({ id: "audit-created", ...data }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function tokenFor(id) {
  return jwt.sign({ sub: id }, jwtSecret);
}

describe("GET /api/admin/audit-trail", () => {
  beforeEach(() => {
    prisma.user.findMany.mockResolvedValue([
      { id: "super-1", fullName: "Super Admin", role: "SUPER_ADMIN" },
      { id: "risk-1", fullName: "Risk Admin", role: "RISK_ADMIN" }
    ]);
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        action: "LOAN_APPROVED_WITH_TERMS",
        entityType: "LOAN",
        entityId: "loan-1",
        performedBy: "super-1",
        role: "SUPER_ADMIN",
        metadata: { reason: "Risk reviewed", riskScore: 81 },
        newValue: { principalAmount: 120000, status: "APPROVED" },
        previousValue: null,
        ipAddress: "127.0.0.1",
        userAgent: "jest",
        timestamp: "2026-05-24T12:00:00.000Z",
        user: {
          id: "super-1",
          fullName: "Super Admin",
          email: "super@alesunfund.local",
          role: "SUPER_ADMIN"
        }
      }
    ]);
    prisma.auditLog.create.mockClear();
  });

  it("returns mapped admin trail records for super admin", async () => {
    const response = await request(app)
      .get("/api/admin/audit-trail")
      .set("Authorization", `Bearer ${tokenFor("super-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.records).toHaveLength(1);
    expect(response.body.records[0]).toMatchObject({
      adminName: "Super Admin",
      adminRole: "SUPER_ADMIN",
      actionType: "LOAN_APPROVED_WITH_TERMS",
      targetId: "loan-1",
      decision: "APPROVE",
      reason: "Risk reviewed",
      loanAmountAtTime: 120000,
      riskScoreAtTime: 81
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_TRAIL_ACCESSED"
        })
      })
    );
  });

  it("blocks non-super-admin access", async () => {
    const response = await request(app)
      .get("/api/admin/audit-trail")
      .set("Authorization", `Bearer ${tokenFor("risk-1")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });
});
