jest.mock("../services/loanRequest.service", () => ({
  createLoanFromLoanRequest: jest.fn()
}));

jest.mock("../prisma", () => ({
  loanRequest: {
    findFirst: jest.fn(),
    findMany: jest.fn()
  },
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
const { createLoanFromLoanRequest } = require("../services/loanRequest.service");

function adminToken() {
  return jwt.sign({ sub: "admin-1" }, jwtSecret);
}

describe("admin loan request approval flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a request and keeps it available for borrower reapplication messaging", async () => {
    prisma.loanRequest.findFirst.mockResolvedValue({
      id: "loan-request-1",
      amount: "1500000",
      status: "PENDING",
      user: {
        id: "applicant-1",
        fullName: "Applicant User",
        email: "applicant@example.com"
      }
    });

    prisma.$transaction.mockImplementation(async (callback) => callback({
      loanRequest: {
        update: jest.fn(async ({ where, data, include }) => ({
          id: where.id,
          amount: "1500000",
          status: data.status,
          user: include.user.select ? {
            id: "applicant-1",
            fullName: "Applicant User",
            email: "applicant@example.com"
          } : undefined
        }))
      },
      auditLog: {
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    }));

    const response = await request(app)
      .post("/api/admin/loan-requests/loan-request-1/status")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "REJECTED" });

    expect(response.status).toBe(200);
    expect(response.body.loanRequest.status).toBe("REJECTED");
  });

  it("approves a request and creates a loan immediately", async () => {
    prisma.loanRequest.findFirst.mockResolvedValue({
      id: "loan-request-1",
      amount: "1500000",
      status: "PENDING",
      user: {
        id: "applicant-1",
        fullName: "Applicant User",
        email: "applicant@example.com"
      }
    });

    createLoanFromLoanRequest.mockImplementation(async (_tx, options) => ({
      application: { id: "application-1" },
      loan: {
        id: "loan-1",
        principal: options.principal,
        principalAmount: options.principal,
        processingFee: 30000,
        disbursedAmount: 1470000,
        interestAmount: 270000,
        totalRepayableAmount: 1770000,
        loanTerm: "1 month",
        status: "ACTIVE"
      },
      loanRequest: {
        id: options.loanRequestId,
        amount: "1500000",
        status: "APPROVED",
        user: {
          id: "applicant-1",
          fullName: "Applicant User",
          email: "applicant@example.com"
        }
      }
    }));

    prisma.$transaction.mockImplementation(async (callback) => callback({
      auditLog: {
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    }));

    const response = await request(app)
      .post("/api/admin/loan-requests/loan-request-1/status")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "APPROVED" });

    expect(response.status).toBe(200);
    expect(createLoanFromLoanRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        loanRequestId: "loan-request-1",
        principal: 1500000,
        annualInterestRate: 18,
        termDays: 30
      })
    );
    expect(response.body.loanRequest.status).toBe("APPROVED");
    expect(response.body.loan.id).toBe("loan-1");
  });

  it("lists only visible loan requests for the admin queue", async () => {
    prisma.loanRequest.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/admin/loan-requests")
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(response.status).toBe(200);
    expect(prisma.loanRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          archivedAt: null,
          isTestData: false,
          status: { in: ["PENDING", "APPROVED", "REJECTED"] }
        }
      })
    );
  });
});
