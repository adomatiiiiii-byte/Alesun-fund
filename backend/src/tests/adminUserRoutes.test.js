jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "admin-1") {
        return {
          id: "admin-1",
          fullName: "Admin User",
          email: "admin@alesunfund.local",
          role: "ADMIN",
          isActive: true
        };
      }

      return {
        id: where.id,
        fullName: "Borrower User",
        email: "borrower@example.com",
        role: "APPLICANT",
        isActive: true,
        score: 82,
        maxLoanLimit: 3000000,
        totalLoansTaken: 2,
        totalLoansCompleted: 1,
        lastLoanStatus: "PERFECT"
      };
    })
  },
  loanApplication: {
    findMany: jest.fn(async () => {
      const dueDate = new Date("2026-04-30T09:00:00.000Z");
      const paidDate = new Date("2026-04-05T09:00:00.000Z");

      return [
        {
          id: "application-1",
          submittedById: "applicant-1",
          status: "APPROVED",
          decisionNotes: "Approved for disbursement.",
          submittedAt: "2026-04-01T09:00:00.000Z",
          updatedAt: "2026-04-10T09:00:00.000Z",
          loanRequestAmount: "2500000",
          business: {
            name: "Kampala Traders",
            industry: "Retail",
            location: "Kampala",
            ownerName: "Borrower User",
            ownerPhone: "+256700000000"
          },
          documentPaths: {},
          loan: {
            id: "loan-1",
            principal: "2500000",
            remainingBalance: "600000",
            annualInterestRate: "18",
            createdAt: "2026-04-02T09:00:00.000Z",
            disbursedAt: "2026-04-03T09:00:00.000Z",
            status: "ACTIVE",
            repaymentSchedules: [
              {
                id: "payment-1",
                dueDate: "2026-04-04T09:00:00.000Z",
                expectedAmount: "600000",
                paidAmount: "600000",
                updatedAt: paidDate.toISOString(),
                status: "PAID"
              },
              {
                id: "payment-2",
                dueDate: dueDate.toISOString(),
                expectedAmount: "600000",
                paidAmount: "0",
                updatedAt: dueDate.toISOString(),
                status: "PENDING"
              }
            ]
          }
        }
      ];
    })
  },
  verificationStatus: {
    findUnique: jest.fn(async () => ({
      status: "VERIFIED"
    }))
  },
  auditLog: {
    findMany: jest.fn(async ({ where }) => {
      if (where?.entityType === "MESSAGE") {
        return [
          {
            id: "message-1",
            role: "APPLICANT",
            metadata: {
              body: "Please confirm my repayment schedule.",
              senderName: "Borrower User",
              senderRole: "APPLICANT"
            },
            timestamp: "2026-04-20T12:00:00.000Z"
          }
        ];
      }

      return [];
    }),
    create: jest.fn(async ({ data }) => ({
      id: "audit-admin-message-1",
      timestamp: "2026-04-27T12:00:00.000Z",
      ...data
    })),
    findFirst: jest.fn(async () => ({
      id: "activity-1",
      action: "USER_LOGOUT",
      timestamp: "2026-04-21T15:30:00.000Z",
      metadata: {
        portal: "applicant"
      }
    }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { jwtSecret } = require("../config");

describe("admin user detail routes", () => {
  it("returns the borrower overview for the selected applicant", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .get("/api/admin/users/applicant-1/details")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.detail.lastOnline.action).toBe("USER_LOGOUT");
    expect(response.body.detail.activeLoan.principalAmount).toBe(2500000);
    expect(response.body.detail.repaymentHistory).toHaveLength(2);
    expect(response.body.detail.repaymentHistory[0]).toEqual(
      expect.objectContaining({
        expectedAmount: 600000,
        paidAmount: 600000,
        remainingAmount: 0
      })
    );
    expect(response.body.detail.borrowerScore.score).toBe(82);
    expect(response.body.detail.eligibility.eligible).toBe(false);
    expect(response.body.detail.messages[0].body).toMatch(/repayment schedule/i);
    expect(response.body.detail.applications[0].businessName).toBe("Kampala Traders");
  });

  it("allows an admin to send a message to the selected borrower", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/admin/users/applicant-1/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Please upload your latest business records." });

    expect(response.status).toBe(201);
    expect(response.body.message.senderRole).toBe("ADMIN");
    expect(response.body.message.body).toMatch(/business records/i);
  });
});
