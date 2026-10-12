const { parseApplicationBody } = require("../services/applicationService");

describe("parseApplicationBody", () => {
  const baseBody = {
    businessName: "Kampala Agro Supplies",
    industry: "Agribusiness",
    location: "Kampala",
    yearsInOperation: "1.5",
    monthlyRevenue: JSON.stringify(["0", "100000", "250000", "375000", "500000", "625000"]),
    monthlyExpenses: JSON.stringify(["0", "25000", "50000", "75000", "100000", "125000"]),
    loanRequestAmount: "15000000",
    loanPurpose: "Expand warehouse capacity and add more delivery inventory.",
    ownerName: "Moses Mugisha",
    ownerPhone: "+256700000000",
    idNumber: "CM123456",
    termsAccepted: "true",
    financialInfo: JSON.stringify({ cashAtBank: "0", outstandingDebt: "100000" })
  };

  it("accepts zero values and decimal years from raw string inputs", () => {
    const parsed = parseApplicationBody(baseBody);

    expect(parsed.yearsInOperation).toBe(1.5);
    expect(parsed.monthlyRevenue[0]).toBe(0);
    expect(parsed.monthlyExpenses[0]).toBe(0);
    expect(parsed.financialInfo.cashAtBank).toBe(0);
    expect(parsed.financialInfo.outstandingDebt).toBe(100000);
  });

  it("parses plain digit strings without changing magnitude", () => {
    const parsed = parseApplicationBody(baseBody);

    expect(parsed.monthlyRevenue[1]).toBe(100000);
  });

  it("rejects empty required numeric fields", () => {
    expect(() =>
      parseApplicationBody({
        ...baseBody,
        yearsInOperation: ""
      })
    ).toThrow();
  });
});
