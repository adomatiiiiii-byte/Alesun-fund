const { createApplication } = require("../services/applicationService");

describe("application persistence guarantees", () => {
  const basePayload = {
    businessName: "Prime Tech Electronics",
    industry: "Retail",
    location: "Kampala",
    yearsInOperation: 3,
    monthlyRevenue: [6100000, 6200000, 6500000, 6700000, 7100000, 7300000],
    monthlyExpenses: [4100000, 4200000, 4300000, 4400000, 4500000, 4600000],
    loanRequestAmount: 15000000,
    loanPurpose: "Expand inventory and restock ahead of peak sales periods.",
    ownerName: "Owner Name",
    ownerPhone: "+256700000000",
    idNumber: "CM123456",
    termsAccepted: true,
    financialInfo: { cashAtBank: 2000000, outstandingDebt: 0 }
  };

  function buildPrisma(monthlyExpenses = basePayload.monthlyExpenses) {
    return {
      user: {
        findUnique: jest.fn(async () => ({
          fullName: "Applicant User",
          email: "applicant@example.com"
        }))
      },
      $transaction: async (callback) =>
        callback({
          business: {
            create: jest.fn(async ({ data }) => ({ id: "business-1", ...data }))
          },
          loanApplication: {
            create: jest.fn(async ({ data }) => ({
              id: "application-1",
              ...data,
              monthlyRevenue: data.monthlyRevenue,
              monthlyExpenses
            }))
          },
          riskScore: {
            create: jest.fn(async ({ data }) => ({ id: "risk-1", ...data }))
          },
          auditLog: {
            create: jest.fn(async ({ data }) => ({ id: "audit-1", ...data }))
          }
        })
    };
  }

  it("accepts applications when six monthly expense values persist", async () => {
    const created = await createApplication({
      prisma: buildPrisma(),
      payload: basePayload,
      source: "PUBLIC",
      submittedById: "applicant-1",
      files: {},
      auditUserId: "applicant-1"
    });

    expect(created.application.monthlyExpenses).toEqual(basePayload.monthlyExpenses);
  });

  it("fails if monthly expense history is not persisted", async () => {
    await expect(
      createApplication({
        prisma: buildPrisma(null),
        payload: basePayload,
        source: "PUBLIC",
        submittedById: "applicant-1",
        files: {},
        auditUserId: "applicant-1"
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Monthly expense history could not be saved"
    });
  });
});
