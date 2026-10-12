jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where, include }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      assignedAgentId: "agent-1",
      agentReferralId: "AGT-111111",
      country: "UGANDA",
      region: "Central",
      district: "Kampala",
      county: "Kawempe",
      subcounty: "Kalerwe",
      village: "Kazo",
      assignedAgent: include?.assignedAgent
        ? {
            id: "agent-1",
            agentCode: "AGT-111111",
            fullName: "Agent One",
            status: "ACTIVE"
          }
        : undefined
    }))
  },
  loanApplication: {
    findMany: jest.fn()
  },
  loanRequest: {
    create: jest.fn(async ({ data }) => ({
      id: "loan-request-1",
      amount: data.amount,
      status: data.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: data.user.connect.id,
        fullName: "Applicant User",
        email: "applicant@example.com"
      }
    })),
    findFirst: jest.fn()
  },
  referral: {
    findUnique: jest.fn()
  },
  loan: {
    findFirst: jest.fn()
  },
  auditLog: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async ({ data }) => ({ id: "audit-1", createdAt: new Date().toISOString(), timestamp: new Date().toISOString(), ...data }))
  },
  verificationStatus: {
    findUnique: jest.fn(async () => ({
      status: "VERIFIED"
    }))
  },
  $transaction: jest.fn(async (callback) => callback({
    loanRequest: {
      create: jest.fn(async ({ data }) => ({
        id: "loan-request-1",
        amount: data.amount,
        status: data.status,
        agentId: data.agentId,
        country: data.country,
        region: data.region,
        district: data.district,
        county: data.county,
        subcounty: data.subcounty,
        village: data.village,
        geoSnapshot: data.geoSnapshot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: data.user.connect.id,
          fullName: "Applicant User",
          email: "applicant@example.com"
        }
      }))
    },
    referral: {
      findUnique: jest.fn(async () => ({ id: "referral-1", userId: "applicant-1", agentId: "agent-1" }))
    },
    auditLog: {
      create: jest.fn(async ({ data }) => ({ id: "audit-1", createdAt: new Date().toISOString(), timestamp: new Date().toISOString(), ...data }))
    },
    agent: {
      findFirst: jest.fn(async () => null)
    }
  }))
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");

function applicantToken() {
  return jwt.sign({ sub: "applicant-1" }, jwtSecret);
}

function buildApplication(overrides = {}) {
  const paidDate = new Date();
  paidDate.setDate(paidDate.getDate() - 30);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - 32);

  return {
    id: "application-1",
    submittedById: "applicant-1",
    source: "PUBLIC",
    status: "APPROVED",
    loanRequestAmount: "2000000",
    submittedAt: new Date().toISOString(),
    business: {
      name: "Kampala Agro Supplies",
      averageMonthlyRevenue: "6000000"
    },
    loan: {
      id: "loan-closed-1",
      status: "COMPLETED",
      repaymentSchedules: [
        {
          id: "payment-1",
          dueDate: dueDate.toISOString(),
          expectedAmount: "500000",
          paidAmount: "500000",
          updatedAt: paidDate.toISOString(),
          status: "PAID"
        }
      ]
    },
    ...overrides
  };
}

describe("loan request controls", () => {
  beforeEach(() => {
    prisma.loanApplication.findMany.mockReset();
    prisma.loanRequest.create.mockClear();
    prisma.loanRequest.findFirst.mockReset();
    prisma.loan.findFirst.mockReset();
    prisma.referral.findUnique.mockReset();
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "VERIFIED" });
    prisma.loanRequest.findFirst.mockResolvedValue(null);
    prisma.loan.findFirst.mockResolvedValue(null);
    prisma.referral.findUnique.mockResolvedValue({ id: "referral-1", userId: "applicant-1", agentId: "agent-1" });
  });

  it("allows an eligible applicant to see a limit and submit", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);

    const eligibilityResponse = await request(app)
      .get("/api/user/loan-eligibility")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(eligibilityResponse.status).toBe(200);
    expect(eligibilityResponse.body.eligible).toBe(true);
    expect(eligibilityResponse.body.score).toBe(100);
    expect(eligibilityResponse.body.maxLoanLimit).toBeGreaterThan(0);

    const submitResponse = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1500000, pricingAccepted: true });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.loanRequest.status).toBe("PENDING");
    expect(submitResponse.body.loanRequest.agentId).toBe("agent-1");
    expect(submitResponse.body.message).toMatch(/awaiting admin approval/i);
  });

  it("rejects a second request when one is already pending", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);
    prisma.loanRequest.findFirst.mockResolvedValueOnce({
      id: "loan-request-pending-1",
      amount: "1500000",
      status: "PENDING"
    });

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: true });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already have a loan request awaiting approval/i);
    expect(prisma.loanRequest.create).not.toHaveBeenCalled();
  });

  it("returns pending request status and lock message", async () => {
    prisma.loanRequest.findFirst.mockResolvedValueOnce({
      id: "loan-request-pending-1",
      amount: "1200000",
      status: "PENDING",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: "2026-04-25T10:00:00.000Z"
    });

    const response = await request(app)
      .get("/api/user/loan-request/status")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("PENDING");
    expect(response.body.amount).toBe(1200000);
    expect(response.body.message).toMatch(/awaiting admin approval/i);
  });

  it("returns backend-calculated pricing preview", async () => {
    const response = await request(app)
      .get("/api/user/loan-pricing?amount=100000")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.pricing).toEqual({
      principalAmount: 100000,
      processingFee: 2000,
      disbursedAmount: 98000,
      interestAmount: 18000,
      totalRepayableAmount: 118000,
      loanTerm: "1 month",
      annualInterestRate: 18,
      termDays: 30
    });
  });

  it("returns rejected status and allows reapplication messaging", async () => {
    prisma.loanRequest.findFirst.mockResolvedValueOnce({
      id: "loan-request-rejected-1",
      amount: "1200000",
      status: "REJECTED",
      createdAt: "2026-04-20T10:00:00.000Z",
      updatedAt: "2026-04-21T10:00:00.000Z"
    });

    const response = await request(app)
      .get("/api/user/loan-request/status")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("REJECTED");
    expect(response.body.message).toMatch(/may submit a new request/i);
  });

  it("returns approved status when the borrower has an active loan", async () => {
    prisma.loan.findFirst.mockResolvedValueOnce({
      id: "loan-active-1",
      status: "ACTIVE"
    });

    const response = await request(app)
      .get("/api/user/loan-request/status")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("APPROVED");
    expect(response.body.message).toMatch(/loan has been approved/i);
  });

  it("blocks non-eligible users from submitting", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([
      buildApplication({
        loan: {
          id: "loan-1",
          status: "ACTIVE",
          repaymentSchedules: []
        }
      })
    ]);
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "VERIFIED" });

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: true });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/not eligible|active loan/i);
    expect(prisma.loanRequest.create).not.toHaveBeenCalled();
  });

  it("rejects amounts above the maximum limit", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "VERIFIED" });

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 9000000, pricingAccepted: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cannot exceed/i);
    expect(prisma.loanRequest.create).not.toHaveBeenCalled();
  });

  it("blocks loan requests until the user is verified", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "PENDING" });

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: true });

    expect(response.status).toBe(403);
    expect(response.body.reasons).toContain("Complete onboarding and wait for verification approval");
    expect(prisma.loanRequest.create).not.toHaveBeenCalled();
  });

  it("blocks loan requests when no onboarded agent is stored", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);
    prisma.user.findUnique.mockImplementation(async ({ where }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      assignedAgentId: null,
      country: "UGANDA",
      region: "Central",
      district: "Kampala",
      county: "Kawempe",
      subcounty: "Kalerwe",
      village: "Kazo",
      assignedAgent: null
    }));

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: true });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/location details/i);

    prisma.user.findUnique.mockImplementation(async ({ where, include }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      assignedAgentId: "agent-1",
      agentReferralId: "AGT-111111",
      country: "UGANDA",
      region: "Central",
      district: "Kampala",
      county: "Kawempe",
      subcounty: "Kalerwe",
      village: "Kazo",
      assignedAgent: include?.assignedAgent
        ? {
            id: "agent-1",
            agentCode: "AGT-111111",
            fullName: "Agent One",
            status: "ACTIVE"
          }
        : undefined
    }));
  });

  it("blocks loan requests when the stored assigned agent is suspended", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);
    prisma.user.findUnique.mockImplementation(async ({ where, include }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      assignedAgentId: "agent-1",
      agentReferralId: "AGT-111111",
      country: "UGANDA",
      region: "Central",
      district: "Kampala",
      county: "Kawempe",
      subcounty: "Kalerwe",
      village: "Kazo",
      assignedAgent: include?.assignedAgent
        ? {
            id: "agent-1",
            agentCode: "AGT-111111",
            fullName: "Agent One",
            status: "SUSPENDED"
          }
        : undefined
    }));

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: true });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/location details/i);

    prisma.user.findUnique.mockImplementation(async ({ where, include }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      assignedAgentId: "agent-1",
      agentReferralId: "AGT-111111",
      country: "UGANDA",
      region: "Central",
      district: "Kampala",
      county: "Kawempe",
      subcounty: "Kalerwe",
      village: "Kazo",
      assignedAgent: include?.assignedAgent
        ? {
            id: "agent-1",
            agentCode: "AGT-111111",
            fullName: "Agent One",
            status: "ACTIVE"
          }
        : undefined
    }));
  });

  it("requires explicit pricing acceptance before submitting", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);

    const response = await request(app)
      .post("/api/user/loan-request")
      .set("Authorization", `Bearer ${applicantToken()}`)
      .send({ amount: 1000000, pricingAccepted: false });

    expect(response.status).toBe(400);
    expect(response.body.issues?.[0]?.message || response.body.message).toMatch(/accept the 1-month loan pricing terms/i);
    expect(prisma.loanRequest.create).not.toHaveBeenCalled();
  });
});
