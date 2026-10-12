const {
  DEFAULT_BORROWER_SCORE,
  DEFAULT_MAX_LOAN_LIMIT,
  MINIMUM_MAX_LOAN_LIMIT,
  applyScoreRules,
  clampLoanLimit,
  clampScore,
  getLoanOutcome,
  updateUserScoreAndLimit
} = require("../services/creditScore.service");

describe("creditScore.service", () => {
  it("uses the expected defaults for a new borrower", () => {
    expect(DEFAULT_BORROWER_SCORE).toBe(100);
    expect(DEFAULT_MAX_LOAN_LIMIT).toBe(100000);
  });

  it("rewards perfect repayment", () => {
    const result = applyScoreRules({
      score: 90,
      maxLoanLimit: 100000,
      outcome: "PERFECT",
      daysLate: 0
    });

    expect(result.score).toBe(95);
    expect(result.maxLoanLimit).toBe(120000);
  });

  it("applies the correct late penalty tier", () => {
    const result = applyScoreRules({
      score: 80,
      maxLoanLimit: 200000,
      outcome: "LATE",
      daysLate: 6
    });

    expect(result.score).toBe(70);
    expect(result.maxLoanLimit).toBe(180000);
  });

  it("applies a strong default penalty", () => {
    const result = applyScoreRules({
      score: 75,
      maxLoanLimit: 100000,
      outcome: "DEFAULT",
      daysLate: 45
    });

    expect(result.score).toBe(35);
    expect(result.maxLoanLimit).toBe(50000);
  });

  it("keeps score and limit within boundaries", () => {
    expect(clampScore(120)).toBe(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampLoanLimit(10000)).toBe(MINIMUM_MAX_LOAN_LIMIT);
  });

  it("derives loan outcome from loan completion fields", () => {
    expect(getLoanOutcome({ fullyPaid: true, daysLate: 0 })).toBe("PERFECT");
    expect(getLoanOutcome({ fullyPaid: true, daysLate: 2 })).toBe("LATE");
    expect(getLoanOutcome({ fullyPaid: false, daysLate: 40 })).toBe("DEFAULT");
  });

  it("updates a borrower score and logs the change", async () => {
    const auditCreate = jest.fn(async ({ data }) => ({ id: "audit-1", ...data }));
    const userUpdate = jest.fn(async ({ data }) => ({ id: "user-1", ...data }));
    const prisma = {
      loan: {
        findFirst: jest.fn(async () => ({
          id: "loan-1",
          userId: "user-1",
          fullyPaid: true,
          daysLate: 0,
          status: "COMPLETED",
          user: {
            id: "user-1",
            score: 95,
            maxLoanLimit: 100000,
            totalLoansCompleted: 2
          }
        }))
      },
      user: {
        update: userUpdate
      },
      auditLog: {
        create: auditCreate
      }
    };

    const result = await updateUserScoreAndLimit(prisma, "user-1", {
      loanId: "loan-1",
      performedBy: "admin-1",
      role: "ADMIN"
    });

    expect(result.loanOutcome).toBe("PERFECT");
    expect(result.previousScore).toBe(95);
    expect(result.newScore).toBe(100);
    expect(result.previousLimit).toBe(100000);
    expect(result.newLimit).toBe(120000);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          score: 100,
          maxLoanLimit: 120000,
          lastLoanStatus: "PERFECT"
        })
      })
    );
    expect(auditCreate).toHaveBeenCalled();
  });
});
