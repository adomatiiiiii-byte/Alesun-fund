const jwt = require("jsonwebtoken");

const mockState = {
  users: [],
  agents: [],
  referrals: new Map(),
  profiles: new Map(),
  businesses: new Map(),
  documents: new Map(),
  verificationStatuses: new Map(),
  auditEntries: []
};

function mockClone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function mockBuildUserRecord(user) {
  return {
    ...user,
    userProfile: mockClone(mockState.profiles.get(user.id)) || null,
    businessProfile: mockClone(mockState.businesses.get(user.id)) || null,
    documents: mockClone(mockState.documents.get(user.id)) || null,
    verificationStatus: mockClone(mockState.verificationStatuses.get(user.id)) || null
  };
}

function resetState() {
  mockState.users = [
    {
      id: "applicant-1",
      fullName: "Applicant One",
      email: "applicant1@example.com",
      role: "APPLICANT",
      isActive: true
    },
    {
      id: "applicant-2",
      fullName: "Applicant Two",
      email: "applicant2@example.com",
      role: "APPLICANT",
      isActive: true
    },
    {
      id: "admin-1",
      fullName: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      isActive: true
    }
  ];
  mockState.agents = [
    {
      id: "agent-1",
      userId: "agent-user-1",
      agentCode: "AGT-111111",
      fullName: "Agent One",
      status: "ACTIVE",
      region: "Central",
      subregion: "Buganda North",
      district: "Luwero",
      administrativeUnit: "Bamunanika County",
      subUnit: "Bamunanika Subcounty",
      county: "Bamunanika County",
      subcounty: "Bamunanika Subcounty"
    },
    {
      id: "agent-2",
      userId: "agent-user-2",
      agentCode: "AGT-222222",
      fullName: "Agent Two",
      status: "SUSPENDED",
      region: "Central",
      subregion: "Buganda North",
      district: "Luwero",
      administrativeUnit: "Katikamu County",
      subUnit: "Bombo Town Council",
      county: "Katikamu County",
      subcounty: "Bombo Town Council"
    }
  ];
  mockState.referrals = new Map();
  mockState.profiles = new Map();
  mockState.businesses = new Map();
  mockState.documents = new Map();
  mockState.verificationStatuses = new Map();
  mockState.auditEntries = [];
}

jest.mock("../prisma", () => {
  const prisma = {
    $transaction: jest.fn(async (callback) => callback(prisma)),
    user: {
      findUnique: jest.fn(async ({ where, select, include }) => {
        const user = mockState.users.find((entry) => entry.id === where.id) || null;
        if (!user) {
          return null;
        }

        if (select) {
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            isActive: user.isActive
          };
        }

        if (include) {
          return mockBuildUserRecord(user);
        }

        return mockClone(user);
      }),
      update: jest.fn(async ({ where, data }) => {
        const index = mockState.users.findIndex((entry) => entry.id === where.id);
        mockState.users[index] = { ...mockState.users[index], ...data };
        return mockClone(mockState.users[index]);
      }),
      findMany: jest.fn(async () =>
        mockState.users
          .filter((entry) => entry.role === "APPLICANT")
          .map((entry) => mockBuildUserRecord(entry))
      )
    },
    userProfile: {
      findFirst: jest.fn(async ({ where }) => {
        for (const profile of mockState.profiles.values()) {
          const excludedUserId = where.NOT?.userId || where.userId?.not;
          const ninMatch = where.nin ? profile.nin === where.nin : false;
          const phoneMatch = where.phone ? profile.phone === where.phone : false;
          const orMatch = Array.isArray(where.OR)
            ? where.OR.some((condition) => {
                if (condition.nin) {
                  return profile.nin === condition.nin;
                }
                if (condition.phone) {
                  return profile.phone === condition.phone;
                }
                return false;
              })
            : false;

          if ((ninMatch || phoneMatch || orMatch) && profile.userId !== excludedUserId) {
            return mockClone(profile);
          }
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, select }) => {
        const excludedUserId = where?.NOT?.userId || where?.userId?.not;
        return Array.from(mockState.profiles.values())
          .filter((profile) => profile.userId !== excludedUserId)
          .map((profile) => {
            if (!select) {
              return mockClone(profile);
            }

            return Object.fromEntries(
              Object.entries(select)
                .filter(([, enabled]) => enabled)
                .map(([key]) => [key, profile[key]])
            );
          });
      }),
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.profiles.get(where.userId)) || null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const current = mockState.profiles.get(where.userId);
        const next = current
          ? { ...current, ...update, updatedAt: new Date().toISOString() }
          : {
              id: `profile-${where.userId}`,
              ...create,
              updatedAt: new Date().toISOString()
            };
        mockState.profiles.set(where.userId, next);
        return mockClone(next);
      })
    },
    business: {
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.businesses.get(where.userId)) || null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const current = mockState.businesses.get(where.userId);
        const next = current
          ? { ...current, ...update, updatedAt: new Date().toISOString() }
          : {
              id: `business-${where.userId}`,
              ...create,
              updatedAt: new Date().toISOString()
            };
        mockState.businesses.set(where.userId, next);
        return mockClone(next);
      })
    },
    document: {
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.documents.get(where.userId)) || null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const current = mockState.documents.get(where.userId);
        const next = current
          ? { ...current, ...update, updatedAt: new Date().toISOString() }
          : {
              id: `document-${where.userId}`,
              ...create,
              updatedAt: new Date().toISOString()
            };
        mockState.documents.set(where.userId, next);
        return mockClone(next);
      })
    },
    verificationStatus: {
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.verificationStatuses.get(where.userId)) || null),
      create: jest.fn(async ({ data }) => {
        const userId = data.user.connect.id;
        const next = {
          id: `verification-${userId}`,
          userId,
          status: data.status,
          completedSteps: data.completedSteps,
          submittedAt: null,
          reviewedAt: null
        };
        mockState.verificationStatuses.set(userId, next);
        return mockClone(next);
      }),
      update: jest.fn(async ({ where, data }) => {
        const current = mockState.verificationStatuses.get(where.userId);
        const next = { ...current, ...data };
        mockState.verificationStatuses.set(where.userId, next);
        return mockClone(next);
      })
    },
    agent: {
      findFirst: jest.fn(async ({ where }) => mockClone(mockState.agents.find((agent) => {
        return (!where.agentCode || agent.agentCode === where.agentCode) &&
          (!where.status || agent.status === where.status);
      })) || null),
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.agents.find((agent) => agent.id === where.id || agent.agentCode === where.agentCode)) || null)
    },
    agentScore: {
      findUnique: jest.fn(async () => ({ id: "score-1", agentId: "agent-1", trustScore: 50 })),
      create: jest.fn(async ({ data }) => ({ id: "score-1", ...data })),
      update: jest.fn(async ({ data }) => ({ id: "score-1", ...data }))
    },
    agentWallet: {
      findUnique: jest.fn(async () => ({ id: "wallet-1", agentId: "agent-1", pendingBalance: 0, availableBalance: 0 })),
      create: jest.fn(async ({ data }) => ({ id: "wallet-1", ...data })),
      update: jest.fn(async ({ data }) => ({ id: "wallet-1", ...data }))
    },
    referral: {
      findUnique: jest.fn(async ({ where }) => mockClone(mockState.referrals.get(where.userId)) || null),
      create: jest.fn(async ({ data }) => {
        const next = { id: `referral-${data.userId}`, ...data, createdAt: new Date().toISOString() };
        mockState.referrals.set(data.userId, next);
        return mockClone(next);
      }),
      update: jest.fn(async ({ where, data }) => {
        const current = mockState.referrals.get(where.userId);
        const next = { ...current, ...data };
        mockState.referrals.set(where.userId, next);
        return mockClone(next);
      }),
      findMany: jest.fn(async () => [])
    },
    auditLog: {
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }) => {
        const entry = {
          id: `audit-${mockState.auditEntries.length + 1}`,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          ...data
        };
        mockState.auditEntries.push(entry);
        return mockClone(entry);
      })
    },
    loanApplication: {
      findMany: jest.fn(async () => [])
    },
    loanRequest: {
      create: jest.fn()
    },
    loan: {
      findMany: jest.fn(async () => [])
    }
  };

  return prisma;
});

const request = require("supertest");
const app = require("../app");
const { jwtSecret } = require("../config");

function tokenFor(userId, role = "APPLICANT") {
  return jwt.sign({ sub: userId, role }, jwtSecret);
}

describe("onboarding routes", () => {
  beforeEach(() => {
    resetState();
  });

  it("does not allow step 2 before step 1", async () => {
    const response = await request(app)
      .post("/api/onboarding/step2")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        businessName: "Green Traders",
        location: "Kampala",
        industry: "Retail",
        yearsInOperation: 1.5,
        weeklyRevenue: 500000,
        weeklyExpenses: 250000
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/owner information/i);
  });

  it("blocks duplicate NIN values", async () => {
    mockState.profiles.set("applicant-2", {
      id: "profile-applicant-2",
      userId: "applicant-2",
      fullName: "Applicant Two",
      nin: "CM12345",
      dateOfBirth: "1990-01-01T00:00:00.000Z",
      phone: "0700000000",
      email: "applicant2@example.com",
      address: "Kampala",
      position: "Owner"
    });

    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Applicant One",
        nin: "CM12345",
        dateOfBirth: "1994-05-02",
        phone: "0701000000",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-111111",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("An account with this National ID already exists.");
    expect(mockState.auditEntries.some((entry) => entry.action === "DUPLICATE_CHECK_TRIGGERED" && entry.metadata?.type === "NIN" && entry.metadata?.result === "BLOCKED")).toBe(true);
  });

  it("blocks duplicate phone values", async () => {
    mockState.profiles.set("applicant-2", {
      id: "profile-applicant-2",
      userId: "applicant-2",
      fullName: "Applicant Two",
      nin: "CM77777",
      dateOfBirth: "1990-01-01T00:00:00.000Z",
      phone: "0700000000",
      email: "applicant2@example.com",
      address: "Kampala",
      position: "Owner"
    });

    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Applicant One",
        nin: "CM12345",
        dateOfBirth: "1994-05-02",
        phone: "0700000000",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-111111",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("This phone number is already registered.");
    expect(mockState.auditEntries.some((entry) => entry.action === "DUPLICATE_CHECK_TRIGGERED" && entry.metadata?.type === "PHONE" && entry.metadata?.result === "BLOCKED")).toBe(true);
  });

  it("allows matching full names but flags them as potential duplicates", async () => {
    mockState.profiles.set("applicant-2", {
      id: "profile-applicant-2",
      userId: "applicant-2",
      fullName: "Applicant One",
      nin: "CM77777",
      dateOfBirth: "1990-01-01T00:00:00.000Z",
      phone: "0700000000",
      email: "applicant2@example.com",
      address: "Kampala",
      position: "Owner"
    });

    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: " Applicant   One ",
        nin: "CM12345",
        dateOfBirth: "1994-05-02",
        phone: "0701000000",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-111111",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(200);
    expect(response.body.step1Complete).toBe(true);
    expect(mockState.profiles.get("applicant-1")?.nin).toBe("CM12345");
    expect(mockState.auditEntries.some((entry) => entry.action === "DUPLICATE_CHECK_TRIGGERED" && entry.metadata?.type === "NAME" && entry.metadata?.result === "FLAGGED")).toBe(true);
  });

  it("allows a completely new owner profile", async () => {
    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Fresh Applicant",
        nin: "CM99999",
        dateOfBirth: "1994-05-02",
        phone: "0701999999",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-111111",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(200);
    expect(response.body.step1Complete).toBe(true);
    expect(mockState.profiles.get("applicant-1")?.phone).toBe("0701999999");
  });

  it("blocks onboarding when Agent ID is missing", async () => {
    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Missing Agent User",
        nin: "CM00001",
        dateOfBirth: "1994-05-02",
        phone: "0701222222",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toMatch(/agent id is required/i);
  });

  it("blocks onboarding when the agent code is invalid", async () => {
    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Invalid Agent User",
        nin: "CM11111",
        dateOfBirth: "1994-05-02",
        phone: "0701555555",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "BAD-CODE",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/invalid agent id/i);
  });

  it("blocks onboarding when the agent is suspended", async () => {
    const response = await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Suspended Agent User",
        nin: "CM22222",
        dateOfBirth: "1994-05-02",
        phone: "0701666666",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-222222",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/invalid agent id/i);
  });

  it("submitting step 3 marks onboarding as pending", async () => {
    await request(app)
      .post("/api/onboarding/step1")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        fullName: "Applicant One",
        nin: "NIN-100",
        dateOfBirth: "1994-05-02",
        phone: "0701000000",
        email: "applicant1@example.com",
        address: "Jinja Road",
        position: "Director",
        agentReferralId: "AGT-111111",
        country: "Uganda",
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty",
        county: "Bamunanika County",
        subcounty: "Bamunanika Subcounty",
        village: "Kazo"
      });

    await request(app)
      .post("/api/onboarding/step2")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .send({
        businessName: "Green Traders",
        location: "Kampala",
        industry: "Retail",
        yearsInOperation: 1.5,
        weeklyRevenue: 500000,
        weeklyExpenses: 250000
      });

    const response = await request(app)
      .post("/api/onboarding/step3")
      .set("Authorization", `Bearer ${tokenFor("applicant-1")}`)
      .attach("idFrontImage", Buffer.from("front"), "front.png")
      .attach("idBackImage", Buffer.from("back"), "back.png")
      .attach("tradingLicense", Buffer.from("license"), "license.pdf");

    expect(response.status).toBe(200);
    expect(response.body.verificationStatus).toBe("PENDING");
    expect(response.body.onboardingComplete).toBe(true);
  });

  it("allows admin approval of a submitted onboarding record", async () => {
    mockState.verificationStatuses.set("applicant-1", {
      id: "verification-applicant-1",
      userId: "applicant-1",
      status: "PENDING",
      completedSteps: 3,
      submittedAt: new Date().toISOString(),
      reviewedAt: null
    });

    const response = await request(app)
      .post("/api/admin/users/applicant-1/verification")
      .set("Authorization", `Bearer ${tokenFor("admin-1", "ADMIN")}`)
      .send({ status: "VERIFIED" });

    expect(response.status).toBe(200);
    expect(response.body.verificationStatus.status).toBe("VERIFIED");
  });

  it("allows admin rejection of a submitted onboarding record", async () => {
    mockState.verificationStatuses.set("applicant-1", {
      id: "verification-applicant-1",
      userId: "applicant-1",
      status: "PENDING",
      completedSteps: 3,
      submittedAt: new Date().toISOString(),
      reviewedAt: null
    });

    const response = await request(app)
      .post("/api/admin/users/applicant-1/verification")
      .set("Authorization", `Bearer ${tokenFor("admin-1", "ADMIN")}`)
      .send({ status: "REJECTED" });

    expect(response.status).toBe(200);
    expect(response.body.verificationStatus.status).toBe("REJECTED");
  });
});
