jest.mock("../prisma", () => ({
  $transaction: jest.fn((callback) =>
    callback({
      business: {
        create: jest.fn(async ({ data }) => ({ id: "business-1", ...data }))
      },
      loanApplication: {
        create: jest.fn(async ({ data }) => ({ id: "application-1", ...data })),
        update: jest.fn(async ({ data }) => ({ id: "application-1", ...data }))
      },
      riskScore: {
        create: jest.fn(async ({ data }) => ({ id: "risk-1", ...data }))
      },
      auditLog: {
        create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
      }
    })
  ),
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.id === "applicant-1") {
        return {
          id: "applicant-1",
          email: "applicant@example.com",
          role: "APPLICANT",
          fullName: "Applicant User",
          isActive: true
        };
      }

      return {
        id: "admin-1",
        email: "admin@alesunfund.local",
        role: "ADMIN",
        fullName: "Admin User",
        isActive: true
      };
    }),
    create: jest.fn(async ({ data }) => ({ id: "applicant-1", ...data }))
  },
  loanApplication: {
    findMany: jest.fn(async ({ where }) => [
      {
        id: "application-1",
        source: "PUBLIC",
        status: "UNDER_REVIEW",
        decisionNotes: "Field review scheduled.",
        termsAccepted: true,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loanRequestAmount: "15000000",
        loanPurpose: "Expand warehouse capacity.",
        submittedById: where.submittedById,
        business: { name: "Kampala Agro Supplies", industry: "Agribusiness" }
      }
    ]),
    findUnique: jest.fn(async () => ({
      id: "application-1",
      source: "PUBLIC",
      status: "NEW",
      submittedAt: new Date().toISOString(),
      decisionNotes: null,
      business: { name: "Kampala Agro Supplies", industry: "Agribusiness" },
      riskScore: { score: 82.1, label: "Low risk", recommendation: "Auto approve recommendation" }
    }))
  }
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { jwtSecret } = require("../config");

function imageBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn6D3sAAAAASUVORK5CYII=",
    "base64"
  );
}

function attachRequiredFiles(requestBuilder, options = {}) {
  const {
    includePassport = true,
    includeIdFront = true,
    includeIdBack = true
  } = options;

  requestBuilder.attach("businessPhotos", imageBuffer(), {
    filename: "shop-front.png",
    contentType: "image/png"
  });
  requestBuilder.attach("financialRecords", imageBuffer(), {
    filename: "cashbook.png",
    contentType: "image/png"
  });

  if (includePassport) {
    requestBuilder.attach("passportPhoto", imageBuffer(), {
      filename: "passport.png",
      contentType: "image/png"
    });
  }

  if (includeIdFront) {
    requestBuilder.attach("idFrontImage", imageBuffer(), {
      filename: "id-front.png",
      contentType: "image/png"
    });
  }

  if (includeIdBack) {
    requestBuilder.attach("idBackImage", imageBuffer(), {
      filename: "id-back.png",
      contentType: "image/png"
    });
  }

  return requestBuilder;
}

function buildPublicApplicationRequest(token, fileOptions) {
  const requestBuilder = request(app)
    .post("/api/public/applications")
    .set("Authorization", `Bearer ${token}`)
    .field("businessName", "Kampala Agro Supplies")
    .field("industry", "Agribusiness")
    .field("location", "Kampala")
    .field("yearsInOperation", "5")
    .field(
      "monthlyRevenue",
      JSON.stringify([12000000, 12100000, 12200000, 12300000, 12400000, 12500000])
    )
    .field(
      "monthlyExpenses",
      JSON.stringify([7000000, 7050000, 7100000, 7150000, 7200000, 7250000])
    )
    .field("loanRequestAmount", "15000000")
    .field("loanPurpose", "Expand warehouse capacity and add more delivery inventory.")
    .field("ownerName", "Moses Mugisha")
    .field("ownerPhone", "+256700000000")
    .field("idNumber", "CM123456")
    .field("termsAccepted", "true")
    .field("financialInfo", JSON.stringify({ cashAtBank: 2000000, outstandingDebt: 0 }));

  return attachRequiredFiles(requestBuilder, fileOptions);
}

describe("public and admin application boundaries", () => {
  it("requires an applicant account for public application submission", async () => {
    const response = await request(app)
      .post("/api/public/applications")
      .field("businessName", "Kampala Agro Supplies");

    expect(response.status).toBe(401);
  });

  it("accepts applicant submission without returning risk score", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const response = await buildPublicApplicationRequest(token);

    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/under review/i);
    expect(response.body.riskScore).toBeUndefined();
  });

  it("accepts decimal years in operation and zero monthly entries", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const response = await attachRequiredFiles(
      request(app)
        .post("/api/public/applications")
        .set("Authorization", `Bearer ${token}`)
        .field("businessName", "Kampala Agro Supplies")
        .field("industry", "Agribusiness")
        .field("location", "Kampala")
        .field("yearsInOperation", "1.5")
        .field(
          "monthlyRevenue",
          JSON.stringify([0, 12100000, 12200000, 12300000, 12400000, 12500000])
        )
        .field(
          "monthlyExpenses",
          JSON.stringify([0, 7050000, 7100000, 7150000, 7200000, 7250000])
        )
        .field("loanRequestAmount", "15000000")
        .field("loanPurpose", "Expand warehouse capacity and add more delivery inventory.")
        .field("ownerName", "Moses Mugisha")
        .field("ownerPhone", "+256700000000")
        .field("idNumber", "CM123456")
        .field("termsAccepted", "true")
        .field("financialInfo", JSON.stringify({ cashAtBank: 2000000, outstandingDebt: 0 }))
    );

    expect(response.status).toBe(201);
  });

  it("rejects submission when passport photo is missing", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const response = await buildPublicApplicationRequest(token, { includePassport: false });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/passport/i);
  });

  it("rejects submission when ID front side is missing", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const requestBuilder = request(app)
      .post("/api/public/applications")
      .set("Authorization", `Bearer ${token}`)
      .field("businessName", "Kampala Agro Supplies")
      .field("industry", "Agribusiness")
      .field("location", "Kampala")
      .field("yearsInOperation", "5")
      .field(
        "monthlyRevenue",
        JSON.stringify([12000000, 12100000, 12200000, 12300000, 12400000, 12500000])
      )
      .field(
        "monthlyExpenses",
        JSON.stringify([7000000, 7050000, 7100000, 7150000, 7200000, 7250000])
      )
      .field("loanRequestAmount", "15000000")
      .field("loanPurpose", "Expand warehouse capacity and add more delivery inventory.")
      .field("ownerName", "Moses Mugisha")
      .field("ownerPhone", "+256700000000")
      .field("idNumber", "CM123456")
      .field("termsAccepted", "true")
      .field("financialInfo", JSON.stringify({ cashAtBank: 2000000, outstandingDebt: 0 }));

    const response = await attachRequiredFiles(requestBuilder, { includeIdFront: false });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/front/i);
  });

  it("rejects submission when ID back side is missing", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const requestBuilder = request(app)
      .post("/api/public/applications")
      .set("Authorization", `Bearer ${token}`)
      .field("businessName", "Kampala Agro Supplies")
      .field("industry", "Agribusiness")
      .field("location", "Kampala")
      .field("yearsInOperation", "5")
      .field(
        "monthlyRevenue",
        JSON.stringify([12000000, 12100000, 12200000, 12300000, 12400000, 12500000])
      )
      .field(
        "monthlyExpenses",
        JSON.stringify([7000000, 7050000, 7100000, 7150000, 7200000, 7250000])
      )
      .field("loanRequestAmount", "15000000")
      .field("loanPurpose", "Expand warehouse capacity and add more delivery inventory.")
      .field("ownerName", "Moses Mugisha")
      .field("ownerPhone", "+256700000000")
      .field("idNumber", "CM123456")
      .field("termsAccepted", "true")
      .field("financialInfo", JSON.stringify({ cashAtBank: 2000000, outstandingDebt: 0 }));

    const response = await attachRequiredFiles(requestBuilder, { includeIdBack: false });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/back/i);
  });

  it("rejects submission when terms are not accepted", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);
    const response = await attachRequiredFiles(
      request(app)
        .post("/api/public/applications")
        .set("Authorization", `Bearer ${token}`)
        .field("businessName", "Kampala Agro Supplies")
        .field("industry", "Agribusiness")
        .field("location", "Kampala")
        .field("yearsInOperation", "5")
        .field(
          "monthlyRevenue",
          JSON.stringify([12000000, 12100000, 12200000, 12300000, 12400000, 12500000])
        )
        .field(
          "monthlyExpenses",
          JSON.stringify([7000000, 7050000, 7100000, 7150000, 7200000, 7250000])
        )
        .field("loanRequestAmount", "15000000")
        .field("loanPurpose", "Expand warehouse capacity and add more delivery inventory.")
        .field("ownerName", "Moses Mugisha")
        .field("ownerPhone", "+256700000000")
        .field("idNumber", "CM123456")
        .field("termsAccepted", "false")
        .field("financialInfo", JSON.stringify({ cashAtBank: 2000000, outstandingDebt: 0 }))
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/validation failed/i);
    expect(response.body.issues[0].message).toMatch(/terms/i);
  });

  it("lets applicants view their own decisions without exposing risk score", async () => {
    const token = jwt.sign({ sub: "applicant-1" }, jwtSecret);

    const response = await request(app)
      .get("/api/public/applications/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.applications[0].decisionNotes).toBeDefined();
    expect(response.body.applications[0].riskScore).toBeUndefined();
  });

  it("allows admins to view internal risk scores", async () => {
    const token = jwt.sign({ sub: "admin-1" }, jwtSecret);

    const response = await request(app)
      .get("/api/admin/applications/application-1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.application.riskScore.score).toBeDefined();
    expect(response.body.application.riskScore.label).toBe("Low risk");
  });

  it("blocks unauthenticated access to admin application list", async () => {
    const response = await request(app).get("/api/admin/applications");

    expect(response.status).toBe(401);
  });
});
