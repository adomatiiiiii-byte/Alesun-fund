jest.mock("../prisma", () => {
  const bcryptLocal = require("bcryptjs");

  const users = {
    "admin@alesunfund.local": {
      id: "admin-1",
      fullName: "Admin User",
      email: "admin@alesunfund.local",
      loginId: "admin",
      role: "ADMIN",
      isActive: true,
      status: "ACTIVE",
      passwordHash: bcryptLocal.hashSync("Password123!", 10)
    },
    "credit@alesunfund.local": {
      id: "credit-1",
      fullName: "Credit Officer",
      email: "credit@alesunfund.local",
      loginId: "credit",
      role: "CREDIT_OFFICER",
      isActive: true,
      status: "ACTIVE",
      passwordHash: bcryptLocal.hashSync("Password123!", 10)
    },
    "agent@alesunfund.local": {
      id: "agent-user-1",
      fullName: "Suspended Agent",
      email: "agent@alesunfund.local",
      loginId: "agent1",
      role: "AGENT",
      isActive: true,
      status: "SUSPENDED",
      passwordHash: bcryptLocal.hashSync("Password123!", 10)
    },
    "agent.active@alesunfund.local": {
      id: "agent-user-2",
      fullName: "Active Agent",
      email: "agent.active@alesunfund.local",
      loginId: "AGT-491379",
      role: "AGENT",
      isActive: true,
      status: "ACTIVE",
      passwordHash: bcryptLocal.hashSync("Password123!", 10)
    },
    "investor@alesunfund.local": {
      id: "investor-user-1",
      fullName: "Portfolio Investor",
      email: "investor@alesunfund.local",
      loginId: "investor1",
      role: "INVESTOR",
      isActive: true,
      status: "ACTIVE",
      passwordHash: bcryptLocal.hashSync("Password123!", 10)
    }
  };

  const findUserById = (id) => Object.values(users).find((user) => user.id === id) || null;

  return {
    user: {
      findFirst: jest.fn(async ({ where }) => {
        const candidates = (where?.OR || []).map((entry) => ({
          loginId: entry.loginId,
          email: entry.email
        }));
        return Object.values(users).find((user) =>
          candidates.some((candidate) =>
            (candidate.loginId && String(user.loginId || "").toLowerCase() === String(candidate.loginId).toLowerCase()) ||
            (candidate.email && String(user.email || "").toLowerCase() === String(candidate.email).toLowerCase())
          )
        ) || null;
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) {
          const user = findUserById(where.id);
          return user ? { ...user } : null;
        }

        if (where.email) {
          return users[where.email] ? { ...users[where.email] } : null;
        }

        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = findUserById(where.id);
        return { ...user, ...data };
      }),
      create: jest.fn(async ({ data }) => ({
        id: "created-user-1",
        ...data,
        passwordHash: undefined
      }))
    },
    agent: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.userId === "agent-user-1") {
          return { id: "agent-1" };
        }
        if (where.userId === "agent-user-2") {
          return { id: "agent-2" };
        }
        return null;
      })
    },
    investor: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.userId === "investor-user-1") {
          return { id: "investor-1" };
        }
        return null;
      })
    }
  };
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { jwtSecret } = require("../config");

describe("auth routes", () => {
  it("allows legacy admins to sign in through the unified admin portal", async () => {
    const response = await request(app)
      .post("/api/auth/admin/login")
      .send({ loginId: "admin", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("SUPER_ADMIN");
    expect(response.body.user.dashboardPath).toBe("/admin/super");
    expect(response.body.token).toBeTruthy();
  });

  it("allows legacy credit officers through the unified admin portal as risk admins", async () => {
    const response = await request(app)
      .post("/api/auth/admin/login")
      .send({ loginId: "credit", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("RISK_ADMIN");
    expect(response.body.user.dashboardPath).toBe("/admin/risk");
  });

  it("rejects suspended backoffice accounts", async () => {
    const response = await request(app)
      .post("/api/auth/admin/login")
      .send({ loginId: "agent1", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Your account is not active. Please contact Alesun Fund.");
  });

  it("allows active agents to sign in through the shared admin login", async () => {
    const response = await request(app)
      .post("/api/auth/admin/login")
      .send({ loginId: "agt-491379", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("AGENT");
    expect(response.body.user.dashboardPath).toBe("/admin/agent");
    expect(response.body.user.linkedEntityId).toBe("agent-2");
  });

  it("allows investors to sign in through the shared admin login", async () => {
    const response = await request(app)
      .post("/api/auth/admin/login")
      .send({ loginId: "investor1", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("INVESTOR");
    expect(response.body.user.dashboardPath).toBe("/admin/investor");
    expect(response.body.user.linkedEntityId).toBe("investor-1");
  });

  it("requires an authenticated admin to create internal users", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "New User",
      email: "new.user@alesunfund.local",
      password: "Password123!",
      role: "FIELD_OFFICER"
    });

    expect(response.status).toBe(401);
  });

  it("lets a super admin create risk and finance admin accounts only", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "New User",
        email: "new.user@alesunfund.local",
        password: "Password123!",
        role: "RISK_ADMIN"
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("new.user@alesunfund.local");
    expect(response.body.user.role).toBe("RISK_ADMIN");
  });

  it("rejects unsupported internal role creation through the admin register route", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "Field Officer",
        email: "field.officer@alesunfund.local",
        password: "Password123!",
        role: "FIELD_OFFICER"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only Risk Admin and Finance Admin accounts can be created here");
  });
});
