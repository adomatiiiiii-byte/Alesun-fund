jest.mock("../prisma", () => {
  const bcrypt = require("bcryptjs");

  const users = {
    "11111111-1111-1111-1111-111111111111": {
      id: "11111111-1111-1111-1111-111111111111",
      fullName: "Applicant User",
      email: "applicant@alesunfund.local",
      loginId: null,
      role: "APPLICANT",
      isActive: true,
      status: "ACTIVE",
      mustChangePassword: false,
      passwordHash: bcrypt.hashSync("Password123!", 10)
    },
    "22222222-2222-2222-2222-222222222222": {
      id: "22222222-2222-2222-2222-222222222222",
      fullName: "Super Admin",
      email: "admin@alesunfund.local",
      loginId: "admin",
      role: "ADMIN",
      isActive: true,
      status: "ACTIVE",
      mustChangePassword: false,
      passwordHash: bcrypt.hashSync("Password123!", 10)
    },
    "33333333-3333-3333-3333-333333333333": {
      id: "33333333-3333-3333-3333-333333333333",
      fullName: "Agent User",
      email: "agent@alesunfund.local",
      loginId: "AGT-1001",
      role: "AGENT",
      isActive: true,
      status: "ACTIVE",
      mustChangePassword: false,
      passwordHash: bcrypt.hashSync("Agent1234", 10)
    }
  };

  const passwordResetTokens = [];
  const auditEntries = [];

  function cloneUser(user) {
    return user ? { ...user } : null;
  }

  function findUserById(id) {
    return users[id] || null;
  }

  return {
    __state: {
      users,
      passwordResetTokens,
      auditEntries
    },
    user: {
      findFirst: jest.fn(async ({ where, include }) => {
        const userList = Object.values(users);
        const direct = userList.find((user) =>
          (where?.OR || []).some((entry) =>
            (entry.email && user.email?.toLowerCase() === String(entry.email).toLowerCase()) ||
            (entry.loginId && String(user.loginId || "").toLowerCase() === String(entry.loginId).toLowerCase())
          )
        );

        if (!direct) {
          return null;
        }

        return include ? { ...direct, userProfile: null, agentProfile: null, investorProfile: null } : cloneUser(direct);
      }),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) {
          return cloneUser(findUserById(where.id));
        }
        if (where.email) {
          return cloneUser(Object.values(users).find((entry) => entry.email === where.email) || null);
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        const existing = findUserById(where.id);
        users[where.id] = { ...existing, ...data };
        return cloneUser(users[where.id]);
      }),
      create: jest.fn()
    },
    passwordResetToken: {
      create: jest.fn(async ({ data }) => {
        const created = { id: `prt-${passwordResetTokens.length + 1}`, createdAt: new Date(), usedAt: null, ...data };
        passwordResetTokens.push(created);
        return { ...created };
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        let count = 0;
        for (const token of passwordResetTokens) {
          const accountMatch = !where.accountId || token.accountId === where.accountId;
          const usedMatch = where.usedAt === null ? token.usedAt === null : true;
          const idMatch = where.id?.not ? token.id !== where.id.not : true;
          if (accountMatch && usedMatch && idMatch) {
            Object.assign(token, data);
            count += 1;
          }
        }
        return { count };
      }),
      findFirst: jest.fn(async ({ where, include }) => {
        const found = passwordResetTokens.find((entry) => entry.tokenHash === where.tokenHash) || null;
        if (!found) {
          return null;
        }
        if (include?.account) {
          return { ...found, account: cloneUser(findUserById(found.accountId)) };
        }
        return { ...found };
      }),
      update: jest.fn(async ({ where, data }) => {
        const token = passwordResetTokens.find((entry) => entry.id === where.id);
        Object.assign(token, data);
        return { ...token };
      })
    },
    auditLog: {
      create: jest.fn(async ({ data }) => {
        const created = { id: `audit-${auditEntries.length + 1}`, ...data };
        auditEntries.push(created);
        return created;
      })
    },
    agent: {
      findUnique: jest.fn(async ({ where, include }) => {
        if (where.id === "44444444-4444-4444-4444-444444444444") {
          return include?.user ? { id: "44444444-4444-4444-4444-444444444444", user: cloneUser(users["33333333-3333-3333-3333-333333333333"]) } : { id: "44444444-4444-4444-4444-444444444444" };
        }
        if (where.userId === "33333333-3333-3333-3333-333333333333") {
          return { id: "44444444-4444-4444-4444-444444444444" };
        }
        return null;
      })
    },
    investor: {
      findUnique: jest.fn(async () => null)
    },
    $transaction: jest.fn(async (callback) => callback(require("../prisma")))
  };
});

const crypto = require("crypto");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function adminToken() {
  return jwt.sign({ sub: "22222222-2222-2222-2222-222222222222" }, jwtSecret);
}

describe("password reset routes", () => {
  beforeEach(() => {
    prisma.__state.passwordResetTokens.length = 0;
    prisma.__state.auditEntries.length = 0;
    prisma.__state.users["11111111-1111-1111-1111-111111111111"].passwordHash = bcrypt.hashSync("Password123!", 10);
    prisma.__state.users["11111111-1111-1111-1111-111111111111"].mustChangePassword = false;
    prisma.__state.users["33333333-3333-3333-3333-333333333333"].passwordHash = bcrypt.hashSync("Agent1234", 10);
    prisma.__state.users["33333333-3333-3333-3333-333333333333"].mustChangePassword = false;
  });

  it("returns a generic response for an unknown identifier", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: "missing@alesunfund.local" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("If an account matches the details provided, password reset instructions will be sent.");
  });

  it("creates a reset token and updates the password successfully", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ identifier: "applicant@alesunfund.local" });

    expect(response.status).toBe(200);
    expect(prisma.__state.passwordResetTokens).toHaveLength(1);

    const rawToken = "known-reset-token-value-1234567890";
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    prisma.__state.passwordResetTokens[0].tokenHash = tokenHash;

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: rawToken,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123"
      });

    expect(resetResponse.status).toBe(200);
    expect(await bcrypt.compare("NewPassword123", prisma.__state.users["11111111-1111-1111-1111-111111111111"].passwordHash)).toBe(true);
    expect(prisma.__state.passwordResetTokens[0].usedAt).toBeTruthy();
  });

  it("rejects expired or used tokens", async () => {
    const rawToken = "expired-token-value-1234567890";
    prisma.__state.passwordResetTokens.push({
      id: "prt-expired",
      accountType: "USER",
      accountId: "11111111-1111-1111-1111-111111111111",
      tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null
    });

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: rawToken,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Reset token is invalid or expired");
  });

  it("lets super admin issue a temporary password and forces password change on next login", async () => {
    const resetResponse = await request(app)
      .post("/api/admin/manual-password-reset")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        accountType: "AGENT",
        accountId: "44444444-4444-4444-4444-444444444444",
        newTemporaryPassword: "TempPass123",
        reason: "Agent forgot password"
      });

    expect(resetResponse.status).toBe(200);
    expect(prisma.__state.users["33333333-3333-3333-3333-333333333333"].mustChangePassword).toBe(true);

    const loginResponse = await request(app)
      .post("/api/auth/admin/login")
      .send({
        loginId: "AGT-1001",
        password: "TempPass123"
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.mustChangePassword).toBe(true);

    const changeResponse = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({
        currentPassword: "TempPass123",
        newPassword: "AgentNew123",
        confirmPassword: "AgentNew123"
      });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.user.mustChangePassword).toBe(false);
  });
});
