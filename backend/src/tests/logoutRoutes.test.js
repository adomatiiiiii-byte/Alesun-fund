jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "applicant-1") {
        return {
          id: "applicant-1",
          fullName: "Applicant User",
          email: "applicant@example.com",
          role: "APPLICANT",
          isActive: true
        };
      }

      return {
        id: where.id,
        fullName: "Admin User",
        email: "admin@example.com",
        role: "ADMIN",
        isActive: true
      };
    })
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({
      id: "audit-logout-1",
      timestamp: new Date().toISOString(),
      ...data
    }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function tokenFor(userId, role) {
  return jwt.sign({ sub: userId, role }, jwtSecret);
}

describe("logout routes", () => {
  beforeEach(() => {
    prisma.auditLog.create.mockClear();
  });

  it("logs applicant logout", async () => {
    const response = await request(app)
      .post("/api/public/auth/logout")
      .set("Authorization", `Bearer ${tokenFor("applicant-1", "APPLICANT")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/logged out successfully/i);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("logs internal user logout", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${tokenFor("admin-1", "ADMIN")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/logged out successfully/i);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
