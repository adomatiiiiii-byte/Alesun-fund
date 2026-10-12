const {
  DEFAULT_BORROWER_SCORE,
  DEFAULT_MAX_LOAN_LIMIT,
  MINIMUM_ELIGIBLE_SCORE,
  clampLoanLimit,
  clampScore
} = require("./creditScore.service");

function getActiveApplication(applications) {
  return (
    applications.find(
      (application) => application.loan && application.loan.status === "ACTIVE"
    ) || null
  );
}

async function getApplicantApplications(prismaClient, userId) {
  return prismaClient.loanApplication.findMany({
    where: {
      submittedById: userId,
      source: "PUBLIC"
    },
    include: {
      business: true,
      loan: {
        include: {
          payments: {
            orderBy: { dueDate: "asc" }
          },
          repaymentSchedules: {
            orderBy: { dueDate: "asc" }
          }
        }
      }
    },
    orderBy: { submittedAt: "desc" }
  });
}

function calculateBorrowerScore(userLike) {
  return clampScore(userLike?.score ?? DEFAULT_BORROWER_SCORE);
}

async function checkLoanEligibility(prismaClient, userId) {
  const [applications, verificationStatus, user] = await Promise.all([
    getApplicantApplications(prismaClient, userId),
    prismaClient.verificationStatus.findUnique({
      where: { userId },
      select: { status: true }
    }),
    prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        assignedAgentId: true,
        assignedAgent: {
          select: {
            id: true,
            status: true
          }
        },
        country: true,
        region: true,
        subregion: true,
        district: true,
        county: true,
        subcounty: true,
        score: true,
        maxLoanLimit: true
      }
    })
  ]);

  const reasons = [];
  const activeApplication = getActiveApplication(applications);
  const score = calculateBorrowerScore(user);
  const maxLoanLimit = clampLoanLimit(user?.maxLoanLimit ?? DEFAULT_MAX_LOAN_LIMIT);

  if (verificationStatus?.status !== "VERIFIED") {
    reasons.push("Complete onboarding and wait for verification approval");
  }

  const hasStoredLocation = ["country", "region", "subregion", "district", "subcounty"].every((field) => {
    const value = field === "subregion"
      ? (user?.subregion || user?.county)
      : user?.[field];
    return value && value !== "UNASSIGNED";
  });

  const hasActiveAssignedAgent = Boolean(
    user?.assignedAgentId
    && user?.assignedAgent
    && user.assignedAgent.status === "ACTIVE"
  );

  if (!hasActiveAssignedAgent || !hasStoredLocation) {
    reasons.push("Complete onboarding and wait for verification approval");
  }

  if (activeApplication) {
    reasons.push("You have an active loan");
  }

  if (score < MINIMUM_ELIGIBLE_SCORE) {
    reasons.push("Your score is below required threshold");
  }

  return {
    eligible: reasons.length === 0,
    maxLoanLimit,
    reasons,
    score
  };
}

async function buildLoanEligibility(prismaClient, userId) {
  return checkLoanEligibility(prismaClient, userId);
}

module.exports = {
  MINIMUM_BORROWER_SCORE: MINIMUM_ELIGIBLE_SCORE,
  buildLoanEligibility,
  calculateBorrowerScore,
  checkLoanEligibility,
  getApplicantApplications
};
