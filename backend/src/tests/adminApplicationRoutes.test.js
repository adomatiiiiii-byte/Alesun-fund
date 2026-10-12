jest.mock("../prisma", () => ({
  loanApplication: {
    findMany: jest.fn(async ({ where }) => {
      const applications = [
        {
          id: "application-new",
          status: "NEW",
          submittedAt: "2026-04-15T09:00:00.000Z",
          loanRequestAmount: "15000000",
          business: { name: "Fresh Harvest", industry: "Agribusiness" },
          riskScore: { score: 79.2, label: "Medium risk" }
        },
        {
          id: "application-review",
          status: "UNDER_REVIEW",
          submittedAt: "2026-04-14T09:00:00.000Z",
          loanRequestAmount: "9000000",
          business: { name: "City Retail", industry: "Retail" },
          riskScore: { score: 66.1, label: "Medium risk" }
        }
      ];

      if (!where?.status) {
        return applications;
      }

      return applications.filter((application) => application.status === where.status);
    }),
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "missing") {
        return null;
      }

      return {
        id: where.id,
        status: "NEW",
        applicantName: "Sarah",
        phoneNumber: "+256700000000",
        email: "sarah@example.com",
        submittedAt: "2026-04-15T09:00:00.000Z",
        decisionNotes: null,
        business: {
          name: "Fresh Harvest",
          industry: "Agribusiness",
          location: "Kampala",
          ownerName: "Sarah",
          ownerPhone: "+256700000000",
          idNumber: "CM123456",
          yearsInOperation: "2.5"
        },
        submittedBy: {
          id: "applicant-1",
          fullName: "Sarah",
          email: "sarah@example.com",
          role: "APPLICANT"
        },
        financialInfo: { cashAtBank: 500000, outstandingDebt: 100000 },
        monthlyRevenue: [12000000, 11800000, 12100000, 12200000, 12300000, 12400000],
        loanRequestAmount: "15000000",
        loanPurpose: "Expand storage capacity.",
        documentPaths: {
          businessPhotos: [{ originalName: "shop.png", storedName: "shop.png" }]
        },
        riskScore: {
          score: 79.2,
          label: "Medium risk",
          recommendation: "Review required",
          breakdown: { financialConsistency: 20.5 }
        },
        fraudFlags: [],
        screeningIssues: []
      };
    })
  },
  $transaction: jest.fn(async (callback) =>
    callback({
      loanApplication: {
        update: jest.fn(async ({ where, data }) => ({
          id: where.id,
          status: data.status,
          decisionNotes: data.decisionNotes || null,
          applicantName: "Sarah",
          phoneNumber: "+256700000000",
          email: "sarah@example.com",
          business: { name: "Fresh Harvest", industry: "Agribusiness" },
          riskScore: { score: 79.2, label: "Medium risk" },
          submittedBy: {
            id: "applicant-1",
            fullName: "Sarah",
            email: "sarah@example.com",
            role: "APPLICANT"
          }
        }))
      },
      auditLog: {
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    })
  ),
  auditLog: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
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
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { jwtSecret } = require("../config");

describe("admin application workflow routes", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns only new applications when the NEW tab is requested", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .get("/api/admin/applications?status=NEW")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.applications).toHaveLength(1);
    expect(response.body.applications[0].status).toBe("NEW");
  });

  it("moves an application to a new workflow stage", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/admin/applications/application-new/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "UNDER_REVIEW" });

    expect(response.status).toBe(200);
    expect(response.body.application.status).toBe("UNDER_REVIEW");
    expect(response.body.application.decisionNotes).toContain("currently under review");
  });

  it("sends the approved notification message automatically", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/admin/applications/application-new/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "APPROVED" });

    expect(response.status).toBe(200);
    expect(response.body.application.decisionNotes).toContain("has been approved");
  });

  it("sends the rejected notification message automatically", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/admin/applications/application-new/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "REJECTED" });

    expect(response.status).toBe(200);
    expect(response.body.application.decisionNotes).toContain("was not approved");
  });

  it("does not resend when the same status is submitted twice", async () => {
    const prisma = require("../prisma");
    prisma.loanApplication.findUnique.mockImplementationOnce(async ({ where }) => ({
      id: where.id,
      status: "UNDER_REVIEW",
      applicantName: "Sarah",
      phoneNumber: "+256700000000",
      email: "sarah@example.com",
      submittedAt: "2026-04-15T09:00:00.000Z",
      decisionNotes: "Already under review",
      business: {
        name: "Fresh Harvest",
        industry: "Agribusiness",
        location: "Kampala",
        ownerName: "Sarah",
        ownerPhone: "+256700000000",
        idNumber: "CM123456",
        yearsInOperation: "2.5"
      },
      submittedBy: {
        id: "applicant-1",
        fullName: "Sarah",
        email: "sarah@example.com",
        role: "APPLICANT"
      },
      financialInfo: { cashAtBank: 500000, outstandingDebt: 100000 },
      monthlyRevenue: [12000000, 11800000, 12100000, 12200000, 12300000, 12400000],
      monthlyExpenses: [6000000, 5900000, 6100000, 6200000, 6300000, 6400000],
      loanRequestAmount: "15000000",
      loanPurpose: "Expand storage capacity.",
      documentPaths: {},
      riskScore: {
        score: 79.2,
        label: "Medium risk",
        recommendation: "Review required",
        breakdown: { financialConsistency: 20.5 }
      },
      fraudFlags: [],
      screeningIssues: [],
      verificationReports: [],
      loan: null,
      fieldOfficer: null
    }));

    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);
    const response = await request(app)
      .post("/api/admin/applications/application-new/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "UNDER_REVIEW" });

    expect(response.status).toBe(200);
    expect(response.body.application.status).toBe("UNDER_REVIEW");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("returns 404 when updating a missing application", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .post("/api/admin/applications/missing/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "APPROVED" });

    expect(response.status).toBe(404);
  });
});
