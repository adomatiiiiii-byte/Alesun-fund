jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => ({
      id: where.id,
      fullName: "Applicant User",
      email: "applicant@example.com",
      role: "APPLICANT",
      isActive: true,
      score: 100,
      maxLoanLimit: 3000000,
      totalLoansTaken: 1,
      totalLoansCompleted: 0,
      lastLoanStatus: null
    }))
  },
  loanApplication: {
    findMany: jest.fn()
  },
  verificationStatus: {
    findUnique: jest.fn(async () => ({
      status: "VERIFIED"
    }))
  },
  auditLog: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async ({ data }) => ({ id: "audit-1", timestamp: new Date().toISOString(), ...data }))
  }
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
  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 2);
  const paidDate = new Date();
  paidDate.setDate(paidDate.getDate() - 28);
  const previousDue = new Date();
  previousDue.setDate(previousDue.getDate() - 30);

  return {
    id: "application-1",
    submittedById: "applicant-1",
    status: "APPROVED",
    decisionNotes: "Your application is approved.",
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    loanRequestAmount: "3000000",
    business: {
      name: "Kampala Agro Supplies",
      industry: "Agribusiness",
      location: "Kampala",
      ownerName: "Moses Mugisha",
      ownerPhone: "+256700000000",
      averageMonthlyRevenue: "8000000"
    },
    documentPaths: {
      passportPhoto: { storedName: "passport.png", originalName: "passport.png" },
      paymentProofFile: { storedName: "payment.pdf", originalName: "payment.pdf" }
    },
    loan: {
      id: "loan-1",
      principal: "2500000",
      remainingBalance: "500000",
      annualInterestRate: "18",
      createdAt: new Date().toISOString(),
      disbursedAt: new Date().toISOString(),
      status: "ACTIVE",
      repaymentSchedules: [
        {
          id: "payment-1",
          dueDate: previousDue.toISOString(),
          expectedAmount: "500000",
          paidAmount: "500000",
          updatedAt: paidDate.toISOString(),
          status: "PAID"
        },
        {
          id: "payment-2",
          dueDate: dueSoon.toISOString(),
          expectedAmount: "500000",
          paidAmount: "0",
          updatedAt: dueSoon.toISOString(),
          status: "PENDING"
        }
      ]
    },
    ...overrides
  };
}

describe("GET /api/user/my-account", () => {
  beforeEach(() => {
    prisma.loanApplication.findMany.mockReset();
    prisma.verificationStatus.findUnique.mockReset();
    prisma.auditLog.findMany.mockClear();
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "VERIFIED" });
  });

  it("returns only the authenticated applicant account snapshot", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);

    const response = await request(app)
      .get("/api/user/my-account")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(prisma.loanApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ submittedById: "applicant-1", source: "PUBLIC" })
      })
    );
    expect(response.body.applications).toHaveLength(1);
    expect(response.body.applications[0].businessName).toBe("Kampala Agro Supplies");
  });

  it("calculates due soon status and hides internal scoring details", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([buildApplication()]);

    const response = await request(app)
      .get("/api/user/my-account")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.summary.statusBadge).toBe("DUE_SOON");
    expect(response.body.repayments.upcomingPayment.amount).toBe(500000);
    expect(response.body.borrowerScore.score).toBeGreaterThanOrEqual(0);
    expect(response.body.borrowerScore.score).toBeLessThanOrEqual(100);
    expect(response.body.borrowerScore.internalBreakdown).toBeUndefined();
    expect(response.body.applications[0].riskScore).toBeUndefined();
    expect(response.body.summary.eligibilityStatus).toBe("Improve repayment to qualify");
  });

  it("returns clean empty states when the applicant has no loan history", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([]);
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "PENDING" });

    const response = await request(app)
      .get("/api/user/my-account")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.summary.statusBadge).toBe("NO_ACTIVE_LOAN");
    expect(response.body.activeLoan).toBeNull();
    expect(response.body.repaymentHistory).toEqual([]);
    expect(response.body.applications).toEqual([]);
  });

  it("keeps the overview eligibility in sync with verification status", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([]);
    prisma.verificationStatus.findUnique.mockResolvedValue({ status: "PENDING" });

    const response = await request(app)
      .get("/api/user/my-account")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.summary.eligibilityStatus).toBe("Improve repayment to qualify");
    expect(response.body.eligibility.message).toMatch(/onboarding/i);
  });

  it("derives remaining balance from scheduled total minus paid total", async () => {
    prisma.loanApplication.findMany.mockResolvedValue([
      buildApplication({
        loan: {
          id: "loan-1",
          principal: "17999998",
          remainingBalance: "9469997.8",
          annualInterestRate: "18",
          createdAt: new Date().toISOString(),
          disbursedAt: new Date().toISOString(),
          status: "ACTIVE",
          repaymentSchedules: [
            {
              id: "payment-1",
              dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              expectedAmount: "10000000",
              paidAmount: "10000000",
              updatedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
              status: "PAID"
            },
            {
              id: "payment-2",
              dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
              expectedAmount: "9469997.8",
              paidAmount: "0",
              updatedAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
              status: "PENDING"
            }
          ]
        }
      })
    ]);

    const response = await request(app)
      .get("/api/user/my-account")
      .set("Authorization", `Bearer ${applicantToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.activeLoan.totalPaid).toBe(10000000);
    expect(response.body.activeLoan.remainingBalance).toBe(9469997.8);
    expect(response.body.activeLoan.progressPercent).toBe(51);
  });
});
