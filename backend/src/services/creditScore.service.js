const { createAuditLog } = require("./auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} = require("./auditLog.service");

const DEFAULT_BORROWER_SCORE = 100;
const DEFAULT_MAX_LOAN_LIMIT = 100000;
const MINIMUM_MAX_LOAN_LIMIT = 20000;
const MINIMUM_ELIGIBLE_SCORE = 60;

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(score) {
  return Math.min(100, Math.max(0, Math.round(asNumber(score, DEFAULT_BORROWER_SCORE))));
}

function clampLoanLimit(limit) {
  const rounded = Math.round(asNumber(limit, DEFAULT_MAX_LOAN_LIMIT) * 100) / 100;
  return Math.max(MINIMUM_MAX_LOAN_LIMIT, rounded);
}

function getLoanOutcome(loan) {
  const daysLate = Math.max(0, asNumber(loan?.daysLate));

  if (loan?.fullyPaid && daysLate === 0) {
    return "PERFECT";
  }

  if (loan?.fullyPaid && daysLate > 0) {
    return "LATE";
  }

  return "DEFAULT";
}

function applyScoreRules({ score, maxLoanLimit, outcome, daysLate = 0 }) {
  let nextScore = clampScore(score);
  let nextLoanLimit = clampLoanLimit(maxLoanLimit);

  if (outcome === "PERFECT") {
    nextScore = clampScore(nextScore + 5);
    nextLoanLimit = clampLoanLimit(nextLoanLimit * 1.2);
  } else if (outcome === "LATE") {
    if (daysLate <= 3) {
      nextScore = clampScore(nextScore - 5);
      nextLoanLimit = clampLoanLimit(nextLoanLimit * 0.95);
    } else if (daysLate <= 7) {
      nextScore = clampScore(nextScore - 10);
      nextLoanLimit = clampLoanLimit(nextLoanLimit * 0.9);
    } else {
      nextScore = clampScore(nextScore - 20);
      nextLoanLimit = clampLoanLimit(nextLoanLimit * 0.8);
    }
  } else {
    nextScore = clampScore(nextScore - 40);
    nextLoanLimit = clampLoanLimit(nextLoanLimit * 0.5);
  }

  return {
    score: nextScore,
    maxLoanLimit: nextLoanLimit
  };
}

async function updateUserScoreAndLimit(prismaClient, userId, {
  loanId,
  performedBy,
  role,
  ipAddress,
  userAgent
} = {}) {
  const loan = loanId
    ? await prismaClient.loan.findFirst({
        where: {
          id: loanId,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              score: true,
              maxLoanLimit: true,
              totalLoansCompleted: true
            }
          }
        }
      })
    : await prismaClient.loan.findFirst({
        where: {
          userId,
          status: {
            in: ["COMPLETED", "DEFAULTED"]
          }
        },
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              score: true,
              maxLoanLimit: true,
              totalLoansCompleted: true
            }
          }
        }
      });

  if (!loan || !loan.user) {
    const error = new Error("Completed loan for borrower was not found");
    error.statusCode = 404;
    throw error;
  }

  const outcome = getLoanOutcome(loan);
  const previousScore = clampScore(loan.user.score);
  const previousLimit = clampLoanLimit(loan.user.maxLoanLimit);
  const nextValues = applyScoreRules({
    score: previousScore,
    maxLoanLimit: previousLimit,
    outcome,
    daysLate: loan.daysLate
  });

  const updatedUser = await prismaClient.user.update({
    where: { id: userId },
    data: {
      score: nextValues.score,
      maxLoanLimit: nextValues.maxLoanLimit,
      lastLoanStatus: outcome,
      totalLoansCompleted: {
        increment: 1
      }
    }
  });

  await createAuditLog(prismaClient, {
    userId,
    action: AUDIT_ACTIONS.SCORE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: userId,
    performedBy: performedBy || userId,
    role: role || "SYSTEM",
    previousValue: {
      previousScore,
      previousLimit,
      totalLoansCompleted: loan.user.totalLoansCompleted
    },
    newValue: {
      newScore: nextValues.score,
      newLimit: nextValues.maxLoanLimit,
      totalLoansCompleted: loan.user.totalLoansCompleted + 1
    },
    metadata: {
      loanId: loan.id,
      loanOutcome: outcome,
      daysLate: loan.daysLate
    },
    ipAddress,
    userAgent
  });

  return {
    user: updatedUser,
    loanOutcome: outcome,
    previousScore,
    newScore: nextValues.score,
    previousLimit,
    newLimit: nextValues.maxLoanLimit
  };
}

module.exports = {
  DEFAULT_BORROWER_SCORE,
  DEFAULT_MAX_LOAN_LIMIT,
  MINIMUM_ELIGIBLE_SCORE,
  MINIMUM_MAX_LOAN_LIMIT,
  applyScoreRules,
  clampLoanLimit,
  clampScore,
  getLoanOutcome,
  updateUserScoreAndLimit
};
