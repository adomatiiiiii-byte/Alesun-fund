const {
  getScreeningIssues,
  getFraudFlags
} = require("../services/applicationAnalysis");

function buildApplication(overrides = {}) {
  return {
    businessName: "Kampala Agro Supplies",
    industry: "Retail",
    location: "Kampala",
    yearsInOperation: 4,
    monthlyRevenue: [12000000, 11800000, 12100000, 11900000, 12200000, 12050000],
    monthlyExpenses: [8200000, 8100000, 8250000, 8150000, 8300000, 8180000],
    loanRequestAmount: 4000000,
    loanPurpose: "Expand inventory for the next trading season.",
    ownerName: "Moses Mugisha",
    ownerPhone: "+256700000000",
    idNumber: "CM123456",
    financialInfo: {
      cashAtBank: 1800000,
      outstandingDebt: 0
    },
    documents: {
      passportPhoto: { storedName: "passport.png" },
      idFrontImage: { storedName: "id-front.png" },
      idBackImage: { storedName: "id-back.png" },
      paymentProofFile: { storedName: "payment.png" },
      businessPhotos: [{ storedName: "shop.png" }],
      financialRecords: [{ storedName: "books.png" }]
    },
    ...overrides
  };
}

describe("application analysis", () => {
  it("returns screening issues only for missing or weak application data", () => {
    const application = buildApplication({
      yearsInOperation: 1,
      monthlyRevenue: [0, 0, 0, 0, 0, 0],
      monthlyExpenses: [100000, 100000, 100000, 100000, 100000, 100000],
      loanRequestAmount: 2000000
    });

    const screeningIssues = getScreeningIssues(application);
    const fraudFlags = getFraudFlags(application);

    expect(screeningIssues).toContain("Business does not meet minimum operating years");
    expect(screeningIssues).toContain("Zero revenue reported across all recent months");
    expect(screeningIssues).toContain("Loan request exceeds acceptable threshold");
    expect(fraudFlags).toHaveLength(0);
  });

  it("returns fraud flags only for suspicious but otherwise valid data", () => {
    const application = buildApplication({
      monthlyRevenue: [9500000, 9500000, 9500000, 9500000, 9500000, 9500000],
      monthlyExpenses: [500000, 500000, 500000, 500000, 500000, 500000],
      financialInfo: { cashAtBank: 100000, outstandingDebt: 0 },
      loanPurpose: "Launch a nationwide franchise rollout for our retail business."
    });

    const screeningIssues = getScreeningIssues(application);
    const fraudFlags = getFraudFlags(application);

    expect(screeningIssues).toHaveLength(0);
    expect(fraudFlags).toContain("Suspicious financial uniformity across months");
    expect(fraudFlags).toContain("Unrealistic profit margins");
  });

  it("returns both screening issues and fraud flags when data is weak and suspicious", () => {
    const application = buildApplication({
      yearsInOperation: 1,
      monthlyRevenue: [4000000, 4000000, 4000000, 4000000, 4000000, 4000000],
      monthlyExpenses: [200000, 200000, 200000, 200000, 200000, 200000],
      loanRequestAmount: 3000000,
      documents: {
        passportPhoto: { storedName: "same-file.png" },
        idFrontImage: { storedName: "same-file.png" },
        idBackImage: null,
        paymentProofFile: { storedName: "payment.png" },
        businessPhotos: [],
        financialRecords: []
      }
    });

    const screeningIssues = getScreeningIssues(application);
    const fraudFlags = getFraudFlags(application);

    expect(screeningIssues).toContain("Business does not meet minimum operating years");
    expect(screeningIssues).toContain("Loan request exceeds acceptable threshold");
    expect(fraudFlags).toContain("Potential document manipulation");
    expect(fraudFlags).toContain("Suspicious financial uniformity across months");
  });

  it("returns neither screening issues nor fraud flags for clean applications", () => {
    const application = buildApplication();

    expect(getScreeningIssues(application)).toEqual([]);
    expect(getFraudFlags(application)).toEqual([]);
  });
});
