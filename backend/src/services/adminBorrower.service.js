const { buildMyAccount } = require("./myAccount.service");

function createEmptyBorrowerDetail() {
  return {
    lastOnline: null,
    summary: {
      activeLoanAmount: 0,
      nextPaymentDue: null,
      statusBadge: "NO_ACTIVE_LOAN",
      statusLabel: "No active loan",
      eligibilityStatus: "Not available"
    },
    activeLoan: null,
    repayments: {
      upcomingPayment: null
    },
    repaymentHistory: [],
    borrowerScore: {
      score: 0,
      label: "Unknown",
      positiveFactors: [],
      negativeFactors: []
    },
    eligibility: {
      eligible: false,
      statusText: "Not available",
      reasons: []
    },
    documents: {
      businessInfo: null,
      files: []
    },
    messages: [],
    notifications: [],
    applications: []
  };
}

async function buildAdminBorrowerDetail(prismaClient, userId) {
  const [accountResult, latestActivityResult, userProfileResult] = await Promise.allSettled([
    buildMyAccount(prismaClient, userId),
    prismaClient.auditLog.findFirst({
      where: {
        OR: [
          { userId },
          { performedBy: userId },
          {
            entityType: "USER",
            entityId: userId
          }
        ]
      },
      orderBy: { timestamp: "desc" }
    }),
    prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        country: true,
        region: true,
        subregion: true,
        district: true,
        county: true,
        subcounty: true,
        village: true,
        agentReferralId: true,
        assignedAgent: {
          select: {
            id: true,
            agentCode: true,
            fullName: true
          }
        }
      }
    })
  ]);

  const account = accountResult.status === "fulfilled"
    ? accountResult.value
    : createEmptyBorrowerDetail();
  const latestActivity = latestActivityResult.status === "fulfilled"
    ? latestActivityResult.value
    : null;
  const userProfile = userProfileResult.status === "fulfilled"
    ? userProfileResult.value
    : null;

  return {
    lastOnline: latestActivity
      ? {
          at: latestActivity.timestamp || latestActivity.createdAt,
          action: latestActivity.action,
          portal: latestActivity.metadata?.portal || null
        }
      : null,
    profile: userProfile
      ? {
          assignedAgent: userProfile.assignedAgent,
          agentReferralId: userProfile.agentReferralId,
          country: userProfile.country,
          region: userProfile.region,
          subregion: userProfile.subregion,
          district: userProfile.district,
          county: userProfile.county,
          subcounty: userProfile.subcounty,
          village: userProfile.village
        }
      : null,
    ...account
  };
}

module.exports = {
  buildAdminBorrowerDetail,
  createEmptyBorrowerDetail
};
