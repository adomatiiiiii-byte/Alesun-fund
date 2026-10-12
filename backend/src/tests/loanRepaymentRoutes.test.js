jest.mock("../prisma", () => ({
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
  loan: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  loanRepayment: {
    create: jest.fn()
  },
  repaymentSchedule: {
    update: jest.fn(),
    findMany: jest.fn()
  },
  paymentAllocation: {
    createMany: jest.fn()
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

function adminToken() {
  return jwt.sign({ sub: "admin-1" }, jwtSecret);
}

describe("POST /api/loans/:id/repay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects overpayment against remaining balance", async () => {
    prisma.loan.findUnique.mockResolvedValue({
      id: "loan-1",
      remainingBalance: "50000",
      repaymentSchedules: [
        {
          id: "schedule-1",
          dueDate: "2026-03-01T00:00:00.000Z",
          expectedAmount: "50000",
          paidAmount: "0",
          status: "PENDING"
        }
      ],
      user: null
    });

    const response = await request(app)
      .post("/api/loans/loan-1/repay")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ amount: 60000 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Payment exceeds remaining loan balance");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("closes the loan on exact payment and records chronological allocations", async () => {
    prisma.loan.findUnique.mockResolvedValue({
      id: "loan-1",
      status: "ACTIVE",
      remainingBalance: "50000",
      dueDate: "2026-03-02T00:00:00.000Z",
      userId: null,
      repaymentSchedules: [
        {
          id: "schedule-1",
          dueDate: "2026-03-01T00:00:00.000Z",
          expectedAmount: "20000",
          paidAmount: "0",
          status: "PENDING",
          updatedAt: "2026-03-01T00:00:00.000Z"
        },
        {
          id: "schedule-2",
          dueDate: "2026-03-02T00:00:00.000Z",
          expectedAmount: "30000",
          paidAmount: "0",
          status: "PENDING",
          updatedAt: "2026-03-02T00:00:00.000Z"
        }
      ],
      user: null
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        loanRepayment: {
          create: jest.fn(async ({ data }) => ({ id: "payment-1", ...data }))
        },
        repaymentSchedule: {
          update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })),
          findMany: jest.fn(async () => [
            {
              id: "schedule-1",
              dueDate: "2026-03-01T00:00:00.000Z",
              expectedAmount: "20000",
              paidAmount: "20000",
              status: "PAID",
              updatedAt: "2026-03-01T00:00:00.000Z"
            },
            {
              id: "schedule-2",
              dueDate: "2026-03-02T00:00:00.000Z",
              expectedAmount: "30000",
              paidAmount: "30000",
              status: "PAID",
              updatedAt: "2026-03-02T00:00:00.000Z"
            }
          ])
        },
        paymentAllocation: {
          createMany: jest.fn(async () => ({ count: 2 }))
        },
        loan: {
          update: jest.fn(async ({ data }) => ({
            id: "loan-1",
            status: data.status,
            remainingBalance: data.remainingBalance,
            fullyPaid: data.fullyPaid,
            daysLate: data.daysLate,
            dueDate: data.dueDate
          }))
        },
        auditLog: {
          create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
        }
      };

      return callback(tx);
    });

    const response = await request(app)
      .post("/api/loans/loan-1/repay")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ amount: 50000 });

    expect(response.status).toBe(201);
    expect(response.body.loan.remainingBalance).toBe(0);
    expect(response.body.loan.status).toBe("COMPLETED");
    expect(response.body.allocations).toEqual([
      { scheduleId: "schedule-1", amountAllocated: 20000 },
      { scheduleId: "schedule-2", amountAllocated: 30000 }
    ]);
  });
});
