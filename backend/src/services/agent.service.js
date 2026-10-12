const bcrypt = require("bcryptjs");
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("./auditLog.service");
const { createAuditLog } = require("./auditService");
const {
  buildLoanGeoSnapshot,
  buildStoredUserLocation,
  buildUserGeoFromAgent,
  getGeoCatalog,
  validateAgentGeography
} = require("./geography.service");

const SIGNUP_REWARD_AMOUNT = 2500;
const PENALTY_AMOUNT = 10000;
const DEFAULT_RATE_THRESHOLD = 25;

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
  return Number(asNumber(value).toFixed(2));
}

function percentage(part, whole) {
  return whole ? roundCurrency((part / whole) * 100) : 0;
}

function generateAgentCode() {
  const value = Math.floor(100000 + Math.random() * 900000);
  return `AGT-${value}`;
}

function generateTemporaryPassword() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Alesun!${suffix}`;
}

function buildAgentLoginEmail(agentCode) {
  return `${String(agentCode || "").toLowerCase()}@agents.alesunfund.local`;
}

async function createUniqueAgentCode(tx) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const agentCode = generateAgentCode();
    const existing = await tx.agent.findUnique({ where: { agentCode } });
    if (!existing) {
      return agentCode;
    }
  }

  const error = new Error("Unable to generate a unique agent code");
  error.statusCode = 500;
  throw error;
}

async function ensureUniqueAgentPhone(tx, phoneNumber) {
  const [existingAgent, existingProfile] = await Promise.all([
    tx.agent.findFirst({
      where: {
        phoneNumber
      }
    }),
    tx.userProfile.findUnique({
      where: {
        phone: phoneNumber
      }
    })
  ]);

  if (existingAgent || existingProfile) {
    const error = new Error("Phone number is already in use");
    error.statusCode = 409;
    throw error;
  }
}

async function ensureAgentWallet(tx, agentId) {
  const existing = await tx.agentWallet.findUnique({ where: { agentId } });
  if (existing) {
    return existing;
  }

  return tx.agentWallet.create({
    data: {
      agentId,
      pendingBalance: 0,
      availableBalance: 0
    }
  });
}

async function ensureAgentScore(tx, agentId) {
  const existing = await tx.agentScore.findUnique({ where: { agentId } });
  if (existing) {
    return existing;
  }

  return tx.agentScore.create({
    data: {
      agentId,
      trustScore: 50
    }
  });
}

function determineTrustScore({ repaymentRate, defaultRate, loanVolumeScore = 0, dataAccuracy = 100 }) {
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        repaymentRate * 0.4 + (100 - defaultRate) * 0.3 + loanVolumeScore * 0.2 + dataAccuracy * 0.1
      )
    )
  );

  return score;
}

async function calculateDistrictPerformance(tx, district) {
  if (!district || district === "UNASSIGNED") {
    return {
      loanCount: 0,
      defaultRate: 0,
      repaymentRate: 0,
      geographyFactor: 50
    };
  }

  const loans = await tx.loan.findMany({
    where: { district },
    select: {
      status: true
    }
  });

  const loanCount = loans.length;
  const defaultedLoans = loans.filter((loan) => loan.status === "DEFAULTED").length;
  const completedLoans = loans.filter((loan) => loan.status === "COMPLETED").length;
  const defaultRate = percentage(defaultedLoans, loanCount);
  const repaymentRate = percentage(completedLoans, loanCount);
  const geographyFactor = Math.max(0, Math.min(100, Math.round((100 - defaultRate) * 0.6 + repaymentRate * 0.4)));

  return {
    loanCount,
    defaultRate,
    repaymentRate,
    geographyFactor
  };
}

async function refreshAgentScore(tx, agentId) {
  const agent = await tx.agent.findUnique({
    where: { id: agentId },
    select: {
      district: true
    }
  });

  const referrals = await tx.referral.findMany({
    where: { agentId },
    include: {
      user: {
        include: {
          loans: {
            include: {
              repaymentSchedules: true,
              payments: true
            }
          }
        }
      }
    }
  });

  const referredUsers = referrals.map((referral) => referral.user);
  const totalUsersReferred = referredUsers.length;
  const allLoans = referredUsers.flatMap((user) => user.loans || []);
  const defaultedUsers = referredUsers.filter((user) =>
    (user.loans || []).some((loan) => loan.status === "DEFAULTED")
  ).length;
  const activeLoans = allLoans.filter((loan) => loan.status === "ACTIVE").length;
  const overdueLoans = allLoans.filter((loan) => loan.status === "ACTIVE" && asNumber(loan.daysLate) > 0).length;
  const completedLoans = allLoans.filter((loan) => loan.status === "COMPLETED").length;
  const totalLoans = allLoans.length;
  const totalDisbursedAmount = roundCurrency(
    allLoans.reduce((sum, loan) => sum + asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal), 0)
  );
  const defaultRate = totalUsersReferred ? roundCurrency((defaultedUsers / totalUsersReferred) * 100) : 0;
  const repaymentRate = totalLoans ? roundCurrency((completedLoans / totalLoans) * 100) : 0;
  const districtPerformance = await calculateDistrictPerformance(tx, agent?.district);
  const loanVolumeScore = Math.min(100, totalLoans * 10);
  const completeGeoLoans = allLoans.filter(
    (loan) => loan.region && loan.region !== "UNASSIGNED" && loan.district && loan.district !== "UNASSIGNED" && loan.agentId
  ).length;
  const dataAccuracy = totalLoans ? percentage(completeGeoLoans, totalLoans) : 100;
  const trustScore = determineTrustScore({
    repaymentRate,
    defaultRate,
    loanVolumeScore,
    dataAccuracy
  });

  await ensureAgentScore(tx, agentId);

  const scoreRecord = await tx.agentScore.update({
    where: { agentId },
    data: {
      trustScore,
      totalUsersReferred,
      defaultRate,
      repaymentRate,
      geographyFactor: districtPerformance.geographyFactor,
      activityLevel: totalUsersReferred,
      activeLoans,
      overdueLoans
    }
  });

  await tx.agent.update({
    where: { id: agentId },
    data: {
      activeUsersCount: totalUsersReferred,
      totalLoansHandled: totalLoans,
      totalDisbursedAmount,
      performanceScore: trustScore
    }
  });

  return scoreRecord;
}

async function applyAgentTransaction(tx, {
  agentId,
  type,
  bucket,
  amount,
  description,
  relatedLoanId = null,
  relatedUserId = null,
  metadata = null
}) {
  const wallet = await ensureAgentWallet(tx, agentId);
  const safeAmount = roundCurrency(amount);
  let nextPending = asNumber(wallet.pendingBalance);
  let nextAvailable = asNumber(wallet.availableBalance);

  if (bucket === "PENDING") {
    nextPending = Math.max(0, roundCurrency(nextPending + safeAmount));
  } else {
    nextAvailable = Math.max(0, roundCurrency(nextAvailable + safeAmount));
  }

  await tx.agentWallet.update({
    where: { agentId },
    data: {
      pendingBalance: nextPending,
      availableBalance: nextAvailable
    }
  });

  return tx.agentTransaction.create({
    data: {
      agentId,
      type,
      bucket,
      amount: safeAmount,
      description,
      relatedLoanId,
      relatedUserId,
      metadata: metadata || undefined
    }
  });
}

async function findApprovedAgentByCode(prismaClient, agentCode) {
  if (!agentCode) {
    return null;
  }

  return prismaClient.agent.findFirst({
    where: {
      agentCode,
      status: "ACTIVE"
    }
  });
}

async function ensureActiveAgentByCode(prismaClient, agentCode) {
  const normalizedAgentCode = String(agentCode || "").trim().toUpperCase();
  const agent = await findApprovedAgentByCode(prismaClient, normalizedAgentCode);

  if (!agent) {
    const error = new Error("Invalid Agent ID. Please confirm with your agent.");
    error.statusCode = 400;
    throw error;
  }

  return agent;
}

async function assignAgent(prismaClient, userLocation = {}) {
  const normalizedLocation = buildStoredUserLocation(userLocation);
  const subUnit = normalizedLocation.subUnit || normalizedLocation.subcounty || "";
  const administrativeUnit = normalizedLocation.administrativeUnit || "";

  const strategies = [
    {
      label: "SUBCOUNTY_MATCH",
      where: {
        status: "ACTIVE",
        region: normalizedLocation.region,
        district: normalizedLocation.district,
        ...(administrativeUnit ? { administrativeUnit } : {}),
        ...(subUnit
          ? {
              OR: [{ subUnit }, { subcounty: subUnit }]
            }
          : {})
      }
    },
    {
      label: "DISTRICT_MATCH",
      where: {
        status: "ACTIVE",
        region: normalizedLocation.region,
        district: normalizedLocation.district
      }
    },
    {
      label: "REGION_MATCH",
      where: {
        status: "ACTIVE",
        region: normalizedLocation.region
      }
    },
    {
      label: "DEFAULT_REGIONAL_POOL",
      where: {
        status: "ACTIVE",
        country: normalizedLocation.country || "UGANDA"
      }
    }
  ];

  for (const strategy of strategies) {
    const agent = await prismaClient.agent.findFirst({
      where: strategy.where,
      orderBy: [
        { performanceScore: "desc" },
        { activeUsersCount: "asc" },
        { approvedAt: "asc" }
      ]
    });

    if (agent) {
      return { agent, strategy: strategy.label };
    }
  }

  const error = new Error("No active agent is available for the selected location");
  error.statusCode = 400;
  throw error;
}

async function upsertReferralLink(tx, userId, agentId) {
  const existingReferral = await tx.referral.findUnique({ where: { userId } });
  if (existingReferral) {
    if (existingReferral.agentId === agentId) {
      return existingReferral;
    }

    return tx.referral.update({
      where: { userId },
      data: { agentId }
    });
  }

  return tx.referral.create({
    data: {
      userId,
      agentId
    }
  });
}

async function linkUserToAgentOnboarding(tx, {
  userId,
  agentCode,
  userLocation,
  performedBy,
  role,
  requestContext = {}
}) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      assignedAgentId: true,
      agentReferralId: true
    }
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!String(agentCode || "").trim()) {
    const error = new Error("Agent ID is required");
    error.statusCode = 400;
    throw error;
  }

  const assignment = {
    agent: await ensureActiveAgentByCode(tx, agentCode),
    strategy: "MANUAL_AGENT_CODE"
  };
  const agent = assignment.agent;
  if (agent.userId === userId) {
    const error = new Error("You cannot assign yourself as your own agent");
    error.statusCode = 400;
    throw error;
  }

  if (user.assignedAgentId && user.assignedAgentId !== agent.id) {
    const error = new Error("Assigned agent cannot be changed after onboarding starts");
    error.statusCode = 403;
    throw error;
  }

  const normalizedLocation = buildStoredUserLocation(userLocation);
  await tx.user.update({
    where: { id: userId },
    data: {
      assignedAgentId: agent.id,
      agentReferralId: agent.agentCode,
      ...normalizedLocation
    }
  });

  const referral = await upsertReferralLink(tx, userId, agent.id);
  await refreshAgentScore(tx, agent.id);
  await createAuditLog(tx, {
    userId: performedBy || userId,
    action: AUDIT_ACTIONS.AGENT_LINKED_DURING_ONBOARDING,
    entityType: AUDIT_ENTITY_TYPES.AGENT,
    entityId: agent.id,
    performedBy: performedBy || userId,
    role: role || null,
    metadata: {
      referredUserId: userId,
      agentCode: agent.agentCode,
      assignmentStrategy: assignment.strategy,
      autoAssigned: false
    },
    ...requestContext
  });

  return {
    agent,
    referral,
    assignmentStrategy: assignment.strategy
  };
}

async function captureReferral(tx, {
  userId,
  agentCode,
  loanRequestId = null,
  performedBy,
  role,
  requestContext = {}
}) {
  if (!agentCode) {
    return null;
  }

  const existingReferral = await tx.referral.findUnique({ where: { userId } });
  if (existingReferral) {
    const existingAgent = await tx.agent.findUnique({ where: { id: existingReferral.agentId } });
    if (existingAgent) {
      await tx.user.update({
        where: { id: userId },
        data: {
          assignedAgentId: existingAgent.id,
          ...buildUserGeoFromAgent(existingAgent)
        }
      });
    }
    return existingReferral;
  }

  const agent = await tx.agent.findFirst({
    where: {
      agentCode,
      status: "ACTIVE"
    }
  });

  if (!agent) {
    const error = new Error("Agent Referral ID is invalid");
    error.statusCode = 400;
    throw error;
  }

  if (agent.userId === userId) {
    const error = new Error("You cannot refer yourself");
    error.statusCode = 400;
    throw error;
  }

  const referral = await tx.referral.create({
    data: {
      userId,
      agentId: agent.id
    }
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      assignedAgentId: agent.id,
      agentReferralId: agent.agentCode,
      ...buildUserGeoFromAgent(agent)
    }
  });

  if (loanRequestId) {
    await tx.loanRequest.update({
      where: { id: loanRequestId },
      data: { referralId: referral.id }
    });
  }

  await refreshAgentScore(tx, agent.id);
  await createAuditLog(tx, {
    userId: performedBy || userId,
    action: AUDIT_ACTIONS.AGENT_REFERRAL_CAPTURED,
    entityType: AUDIT_ENTITY_TYPES.AGENT,
    entityId: agent.id,
    performedBy: performedBy || userId,
    role: role || null,
    metadata: {
      referredUserId: userId,
      agentCode
    },
    ...requestContext
  });

  return referral;
}

async function submitAgentApplication(tx, userId, payload) {
  const existingAgent = await tx.agent.findUnique({ where: { userId } });
  if (existingAgent) {
    const error = new Error("You already have an agent account");
    error.statusCode = 400;
    throw error;
  }

  const existingApplication = await tx.agentApplication.findUnique({ where: { userId } });
  if (existingApplication?.status === "PENDING") {
    const error = new Error("Your agent registration is already awaiting approval");
    error.statusCode = 409;
    throw error;
  }

  if (existingApplication) {
    return tx.agentApplication.update({
      where: { userId },
      data: {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        nationalId: payload.nationalId,
        kycDetails: payload.kycDetails,
        status: "PENDING",
        adminNotes: null,
        reviewedAt: null
      }
    });
  }

  return tx.agentApplication.create({
    data: {
      userId,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      nationalId: payload.nationalId,
      kycDetails: payload.kycDetails,
      status: "PENDING"
    }
  });
}

async function createAgentByAdmin(tx, adminUser, payload) {
  const geoValidation = validateAgentGeography(payload.geography || {});
  if (!geoValidation.valid) {
    const error = new Error(geoValidation.message);
    error.statusCode = 400;
    throw error;
  }

  await ensureUniqueAgentPhone(tx, payload.phoneNumber);

  const agentCode = await createUniqueAgentCode(tx);
  const loginEmail = payload.email || buildAgentLoginEmail(agentCode);
  const temporaryPassword = payload.password || generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await tx.user.create({
    data: {
      fullName: payload.fullName,
      email: loginEmail,
      loginId: payload.loginId || agentCode,
      passwordHash,
      role: "AGENT",
      status: "ACTIVE",
      mustChangePassword: !payload.password,
      country: payload.geography.country,
      region: payload.geography.region,
      subregion: payload.geography.subregion,
      district: payload.geography.district,
      administrativeUnit: payload.geography.administrativeUnit,
      subUnit: payload.geography.subUnit,
      county: payload.geography.subregion,
      subcounty: payload.geography.subcounty || payload.geography.subUnit
    }
  });

  const agent = await tx.agent.create({
    data: {
      userId: user.id,
      createdByAdminId: adminUser.id,
      agentCode,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      nationalId: payload.nationalId,
      country: payload.geography.country,
      region: payload.geography.region,
      subregion: payload.geography.subregion,
      district: payload.geography.district,
      administrativeUnit: payload.geography.administrativeUnit,
      subUnit: payload.geography.subUnit,
      county: payload.geography.subregion,
      subcounty: payload.geography.subcounty || payload.geography.subUnit,
      status: "ACTIVE"
    },
    include: {
      createdByAdmin: {
        select: {
          id: true,
          fullName: true
        }
      },
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  await ensureAgentWallet(tx, agent.id);
  await ensureAgentScore(tx, agent.id);
  await refreshAgentScore(tx, agent.id);

  return {
    agent,
    credentials: {
      email: loginEmail,
      loginId: payload.loginId || agentCode,
      temporaryPassword
    }
  };
}

async function approveAgentApplication(tx, applicationId, geography, adminUser) {
  const application = await tx.agentApplication.findUnique({
    where: { id: applicationId }
  });

  if (!application) {
    const error = new Error("Agent application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.status !== "PENDING") {
    return {
      application,
      agent: await tx.agent.findUnique({ where: { userId: application.userId } })
    };
  }

  const geoValidation = validateAgentGeography(geography || {});
  if (!geoValidation.valid) {
    const error = new Error(geoValidation.message);
    error.statusCode = 400;
    throw error;
  }

  const agentCode = await createUniqueAgentCode(tx);
  const updatedApplication = await tx.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date()
    }
  });

  const agent = await tx.agent.create({
    data: {
      userId: updatedApplication.userId,
      agentApplicationId: updatedApplication.id,
      createdByAdminId: adminUser.id,
      agentCode,
      fullName: updatedApplication.fullName,
      phoneNumber: updatedApplication.phoneNumber,
      nationalId: updatedApplication.nationalId,
      country: geography.country,
      region: geography.region,
      subregion: geography.subregion,
      district: geography.district,
      administrativeUnit: geography.administrativeUnit,
      subUnit: geography.subUnit,
      county: geography.subregion,
      subcounty: geography.subcounty || geography.subUnit,
      status: "ACTIVE"
    }
  });

  await ensureAgentWallet(tx, agent.id);
  await ensureAgentScore(tx, agent.id);
  await refreshAgentScore(tx, agent.id);

  return { application: updatedApplication, agent };
}

async function getAssignedAgentGeoContext(tx, userId) {
    const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      country: true,
      region: true,
      subregion: true,
      district: true,
      administrativeUnit: true,
      subUnit: true,
      county: true,
      subcounty: true,
      village: true,
      agentReferralId: true,
      assignedAgent: {
        select: {
          id: true,
          agentCode: true,
          fullName: true,
          status: true,
          country: true,
          region: true,
          subregion: true,
          district: true,
          administrativeUnit: true,
          subUnit: true,
          county: true,
          subcounty: true
        }
      }
    }
  });

  let assignedAgent = user?.assignedAgent?.status === "ACTIVE" ? user.assignedAgent : null;

  if (!assignedAgent) {
    const referral = await tx.referral.findUnique({
      where: { userId },
      include: {
        agent: true
      }
    });

    if (referral?.agent?.status === "ACTIVE") {
      assignedAgent = referral.agent;
      await tx.user.update({
        where: { id: userId },
        data: {
          assignedAgentId: assignedAgent.id,
          agentReferralId: assignedAgent.agentCode,
          ...buildUserGeoFromAgent(assignedAgent, {
            administrativeUnit: user?.administrativeUnit || undefined,
            subUnit: user?.subUnit || (user?.subcounty && user.subcounty !== "UNASSIGNED" ? user.subcounty : undefined)
          })
        }
      });
    }
  }

  if (!assignedAgent) {
    const error = new Error("Borrower must be assigned to an agent with a verified Uganda location before a loan can be created");
    error.statusCode = 400;
    throw error;
  }

  return {
    agent: assignedAgent,
    userLocation: {
      country: user.country && user.country !== "UNASSIGNED" ? user.country : "UGANDA",
      region: user.region && user.region !== "UNASSIGNED" ? user.region : assignedAgent.region,
      subregion: user.subregion && user.subregion !== "UNASSIGNED" ? user.subregion : assignedAgent.subregion,
      district: user.district && user.district !== "UNASSIGNED" ? user.district : assignedAgent.district,
      administrativeUnit: user.administrativeUnit || assignedAgent.administrativeUnit || "",
      subUnit: user.subUnit || user.subcounty || assignedAgent.subUnit || assignedAgent.subcounty || "",
      county: user.county && user.county !== "UNASSIGNED" ? user.county : assignedAgent.subregion,
      subcounty: user.subcounty && user.subcounty !== "UNASSIGNED"
        ? user.subcounty
        : (user.subUnit || assignedAgent.subUnit || assignedAgent.subcounty),
      village: user.village || ""
    }
  };
}

async function rejectAgentApplication(tx, applicationId, adminNotes) {
  const application = await tx.agentApplication.findUnique({
    where: { id: applicationId }
  });

  if (!application) {
    const error = new Error("Agent application not found");
    error.statusCode = 404;
    throw error;
  }

  return tx.agentApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      adminNotes: adminNotes || null
    }
  });
}

async function updateAgentStatus(tx, agentId, status) {
  return tx.agent.update({
    where: { id: agentId },
    data: {
      status,
      suspendedAt: status === "SUSPENDED" ? new Date() : null
    }
  });
}

async function applyDefaultRatePenaltyIfNeeded(tx, agentId, relatedLoanId = null) {
  const score = await refreshAgentScore(tx, agentId);
  const existingPenalty = relatedLoanId
    ? await tx.penalty.findFirst({
        where: {
          agentId,
          relatedLoanId,
          reason: "Default rate exceeded threshold"
        }
      })
    : null;

  if (asNumber(score.defaultRate) <= DEFAULT_RATE_THRESHOLD || existingPenalty) {
    return null;
  }

  const wallet = await ensureAgentWallet(tx, agentId);
  const deduction = Math.min(PENALTY_AMOUNT, asNumber(wallet.pendingBalance));
  if (deduction <= 0) {
    return null;
  }

  const penalty = await tx.penalty.create({
    data: {
      agentId,
      amount: deduction,
      reason: "Default rate exceeded threshold",
      relatedLoanId
    }
  });

  await applyAgentTransaction(tx, {
    agentId,
    type: "PENALTY",
    bucket: "PENDING",
    amount: -deduction,
    description: "Penalty applied due to default rate above 25%",
    relatedLoanId,
    metadata: {
      threshold: DEFAULT_RATE_THRESHOLD
    }
  });

  await refreshAgentScore(tx, agentId);
  return penalty;
}

async function processAgentRewardsForRepayment(tx, loan, updatedLoan, paymentAmount) {
  if (!loan?.userId) {
    return null;
  }

  const referral = await tx.referral.findUnique({
    where: { userId: loan.userId },
    include: { agent: true }
  });

  if (!referral?.agent || referral.agent.status !== "ACTIVE") {
    return null;
  }

  const events = [];
  const agentId = referral.agent.id;

  const priorReward = await tx.agentTransaction.findFirst({
    where: {
      agentId,
      type: "SIGNUP_REWARD",
      relatedUserId: loan.userId
    }
  });

  if (!priorReward && asNumber(paymentAmount) > 0) {
    const transaction = await applyAgentTransaction(tx, {
      agentId,
      type: "SIGNUP_REWARD",
      bucket: "PENDING",
      amount: SIGNUP_REWARD_AMOUNT,
      description: "Signup reward unlocked on first borrower repayment",
      relatedLoanId: loan.id,
      relatedUserId: loan.userId
    });
    events.push(transaction);
  }

  const priorCommission = await tx.agentTransaction.findFirst({
    where: {
      agentId,
      type: "LOAN_COMMISSION",
      relatedLoanId: loan.id
    }
  });

  if (!priorCommission && updatedLoan?.status === "COMPLETED") {
    const interestEarned = roundCurrency(asNumber(loan.interestAmount) || (asNumber(loan.principal) * (asNumber(loan.annualInterestRate) / 100)));
    const commissionAmount = roundCurrency(interestEarned * 0.1);
    if (commissionAmount > 0) {
      const transaction = await applyAgentTransaction(tx, {
        agentId,
        type: "LOAN_COMMISSION",
        bucket: "AVAILABLE",
        amount: commissionAmount,
        description: "10% commission on fully repaid loan interest",
        relatedLoanId: loan.id,
        relatedUserId: loan.userId,
        metadata: {
          interestEarned
        }
      });
      events.push(transaction);
    }
  }

  if (updatedLoan?.status === "DEFAULTED") {
    await applyDefaultRatePenaltyIfNeeded(tx, agentId, loan.id);
  } else {
    await refreshAgentScore(tx, agentId);
  }

  return {
    agentId,
    events
  };
}

async function buildAgentApplicationStatus(prismaClient, userId) {
  const agent = await prismaClient.agent.findUnique({
    where: { userId },
    include: {
      wallet: true,
      score: true,
      createdByAdmin: {
        select: {
          fullName: true
        }
      }
    }
  });

  if (agent) {
    return {
      status: "APPROVED",
      message: "Your agent account is active.",
      agent
    };
  }

  return {
    status: null,
    message: "Agent accounts are created by administrators only. Contact Alesun Fund admin support if you need agent access.",
    agent: null
  };
}

async function findAgentForActor(prismaClient, { userId = null, agentId = null } = {}) {
  if (agentId) {
    const agent = await prismaClient.agent.findUnique({
      where: { id: agentId }
    });
    if (agent) {
      return agent;
    }
  }

  if (userId) {
    return prismaClient.agent.findUnique({
      where: { userId }
    });
  }

  return null;
}

async function buildAgentAccessStatus(prismaClient, { userId = null, agentId = null } = {}) {
  const agent = await findAgentForActor(prismaClient, { userId, agentId });

  if (agent) {
    return {
      status: "APPROVED",
      message: agent.status === "ACTIVE" ? "Your agent account is active." : "Your agent account is not active.",
      agent
    };
  }

  return {
    status: null,
    message: "Agent accounts are created by administrators only. Contact Alesun Fund admin support if you need agent access.",
    agent: null
  };
}

async function buildAgentDashboard(prismaClient, userId) {
  const agent = await prismaClient.agent.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          email: true
        }
      },
      wallet: true,
      score: true,
      referrals: {
        include: {
          user: {
            include: {
              userProfile: true,
              loans: {
                include: {
                  repaymentSchedules: { orderBy: { dueDate: "asc" } }
                },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      },
      transactions: {
        orderBy: { createdAt: "desc" }
      },
      penalties: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!agent) {
    const error = new Error("Agent account not found");
    error.statusCode = 404;
    throw error;
  }

  const score = agent.score || await refreshAgentScore(prismaClient, agent.id);
  const referrals = agent.referrals || [];
  const referredUsers = referrals.map((referral) => referral.user);
  const latestLoans = referredUsers.map((user) => (user.loans || [])[0]).filter(Boolean);
  const activeLoans = latestLoans.filter((loan) => loan.status === "ACTIVE");
  const overdueLoans = activeLoans.filter((loan) => asNumber(loan.daysLate) > 0);
  const totalEarnings = roundCurrency(
    (agent.transactions || []).reduce((sum, item) => {
      if (item.type === "WITHDRAWAL") {
        return sum;
      }
      return sum + asNumber(item.amount);
    }, 0)
  );

  return {
    overview: {
      agentCode: agent.agentCode,
      createdBy: agent.createdByAdmin?.fullName || "Alesun Fund Admin",
      loginEmail: agent.user?.email || "",
      country: agent.country,
      region: agent.region,
      subregion: agent.subregion,
      district: agent.district,
      county: agent.subregion,
      subcounty: agent.subcounty,
      totalUsersReferred: score.totalUsersReferred,
      activeLoans: score.activeLoans,
      overdueLoans: score.overdueLoans,
      totalEarnings,
      pendingBalance: asNumber(agent.wallet?.pendingBalance),
      availableBalance: asNumber(agent.wallet?.availableBalance),
      trustScore: score.trustScore,
      status: agent.status
    },
    users: referredUsers.map((user) => {
      const loan = (user.loans || [])[0] || null;
      const nextDue = loan?.repaymentSchedules?.find((entry) => entry.status !== "PAID") || null;
      const totalScheduled = (loan?.repaymentSchedules || []).reduce((sum, item) => sum + asNumber(item.expectedAmount), 0);
      const totalPaid = (loan?.repaymentSchedules || []).reduce((sum, item) => sum + asNumber(item.paidAmount), 0);
      const repaymentProgress = totalScheduled ? Math.round((totalPaid / totalScheduled) * 100) : 0;

      return {
        id: user.id,
        name: user.fullName,
        phone: user.userProfile?.phone || "Not available",
        country: user.country,
        region: user.region,
        subregion: user.subregion,
        district: user.district,
        county: user.subregion,
        subcounty: user.subcounty,
        loanStatus: loan?.status || "NO_LOAN",
        repaymentProgress,
        nextDueDate: nextDue?.dueDate || null
      };
    }),
    alerts: referredUsers.flatMap((user) => {
      const loan = (user.loans || [])[0] || null;
      if (!loan) {
        return [];
      }

      const nextDue = loan.repaymentSchedules?.find((entry) => entry.status !== "PAID") || null;
      const alerts = [];
      if (asNumber(loan.daysLate) > 0) {
        alerts.push({
          id: `overdue-${user.id}`,
          type: "OVERDUE",
          message: `${user.fullName} has an overdue loan repayment.`
        });
      }
      if (nextDue) {
        alerts.push({
          id: `due-${user.id}`,
          type: "UPCOMING",
          message: `${user.fullName} has a payment due on ${new Date(nextDue.dueDate).toLocaleDateString("en-GB")}.`
        });
      }
      return alerts;
    }),
    earnings: (agent.transactions || []).map((item) => ({
      id: item.id,
      type: item.type,
      bucket: item.bucket,
      amount: asNumber(item.amount),
      description: item.description,
      createdAt: item.createdAt
    })),
    penalties: (agent.penalties || []).map((item) => ({
      id: item.id,
      amount: asNumber(item.amount),
      reason: item.reason,
      createdAt: item.createdAt
    }))
  };
}

async function buildAgentDashboardForActor(prismaClient, { userId = null, agentId = null } = {}) {
  const resolvedAgent = await findAgentForActor(prismaClient, { userId, agentId });

  if (!resolvedAgent) {
    const error = new Error("Agent account not found");
    error.statusCode = 404;
    throw error;
  }

  return buildAgentDashboard(prismaClient, resolvedAgent.userId);
}

async function buildGeoAnalytics(prismaClient, filters = {}) {
  const where = {
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.subregion ? { subregion: filters.subregion } : {}),
    ...(filters.district ? { district: filters.district } : {}),
    ...(filters.administrativeUnit ? { administrativeUnit: filters.administrativeUnit } : {}),
    ...(filters.subUnit ? { subUnit: filters.subUnit } : {}),
    ...(filters.subcounty ? { subcounty: filters.subcounty } : {}),
    ...(filters.agentId ? { id: filters.agentId } : {})
  };

  const [agents, loans, users, repayments] = await Promise.all([
    prismaClient.agent.findMany({
      where,
      include: {
        score: true
      }
    }),
    prismaClient.loan.findMany({
      where: {
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.region ? { region: filters.region } : {}),
        ...(filters.subregion ? { subregion: filters.subregion } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.administrativeUnit ? { administrativeUnit: filters.administrativeUnit } : {}),
        ...(filters.subUnit ? { subUnit: filters.subUnit } : {}),
        ...(filters.subcounty ? { subcounty: filters.subcounty } : {}),
        ...(filters.agentId ? { agentId: filters.agentId } : {})
      },
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            agentCode: true,
            country: true,
            region: true,
            subregion: true,
            district: true,
            administrativeUnit: true,
            subUnit: true,
            county: true,
            subcounty: true
          }
        }
      }
    }),
    prismaClient.user.findMany({
      where: {
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.region ? { region: filters.region } : {}),
        ...(filters.subregion ? { subregion: filters.subregion } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.administrativeUnit ? { administrativeUnit: filters.administrativeUnit } : {}),
        ...(filters.subUnit ? { subUnit: filters.subUnit } : {}),
        ...(filters.agentId ? { assignedAgentId: filters.agentId } : {})
      },
      select: {
        id: true,
        district: true,
        administrativeUnit: true
      }
    }),
    prismaClient.loanRepayment.findMany({
      where: {
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.region ? { region: filters.region } : {}),
        ...(filters.subregion ? { subregion: filters.subregion } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.administrativeUnit ? { administrativeUnit: filters.administrativeUnit } : {}),
        ...(filters.subUnit ? { subUnit: filters.subUnit } : {}),
        ...(filters.agentId ? { agentId: filters.agentId } : {})
      },
      select: {
        district: true,
        amount: true
      }
    })
  ]);

  const agentsPerRegionMap = new Map();
  agents.forEach((agent) => {
    agentsPerRegionMap.set(agent.region, (agentsPerRegionMap.get(agent.region) || 0) + 1);
  });

  const loansPerRegionMap = new Map();
  loans.forEach((loan) => {
    loansPerRegionMap.set(loan.region, (loansPerRegionMap.get(loan.region) || 0) + 1);
  });

  const districtRows = new Map();
  loans.forEach((loan) => {
    const current = districtRows.get(loan.district) || {
      district: loan.district,
      region: loan.region,
      subregion: loan.subregion,
      loanCount: 0,
      defaultedCount: 0,
      completedCount: 0
    };
    current.loanCount += 1;
    if (loan.status === "DEFAULTED") {
      current.defaultedCount += 1;
    }
    if (loan.status === "COMPLETED") {
      current.completedCount += 1;
    }
    districtRows.set(loan.district, current);
  });

  const districtPerformance = Array.from(districtRows.values()).map((entry) => ({
    district: entry.district,
    region: entry.region,
    subregion: entry.subregion,
    loanCount: entry.loanCount,
    defaultRate: percentage(entry.defaultedCount, entry.loanCount),
    repaymentRate: percentage(entry.completedCount, entry.loanCount)
  }));

  const usersByDistrictMap = new Map();
  const usersByAdministrativeUnitMap = new Map();
  users.forEach((user) => {
    usersByDistrictMap.set(user.district, (usersByDistrictMap.get(user.district) || 0) + 1);
    const unitKey = user.administrativeUnit || "Unassigned";
    usersByAdministrativeUnitMap.set(unitKey, (usersByAdministrativeUnitMap.get(unitKey) || 0) + 1);
  });

  const loansBySubUnitMap = new Map();
  const defaultsBySubUnitMap = new Map();
  const agentPerformanceByAdministrativeUnitMap = new Map();
  loans.forEach((loan) => {
    const subUnitKey = loan.subUnit || loan.subcounty || "Unassigned";
    loansBySubUnitMap.set(subUnitKey, (loansBySubUnitMap.get(subUnitKey) || 0) + 1);

    const defaultBucket = defaultsBySubUnitMap.get(subUnitKey) || { subUnit: subUnitKey, total: 0, defaults: 0 };
    defaultBucket.total += 1;
    if (loan.status === "DEFAULTED") {
      defaultBucket.defaults += 1;
    }
    defaultsBySubUnitMap.set(subUnitKey, defaultBucket);

    const unitKey = loan.administrativeUnit || "Unassigned";
    const agentUnitBucket = agentPerformanceByAdministrativeUnitMap.get(unitKey) || {
      administrativeUnit: unitKey,
      activeLoans: 0,
      completedLoans: 0,
      defaultedLoans: 0
    };
    if (loan.status === "ACTIVE") {
      agentUnitBucket.activeLoans += 1;
    }
    if (loan.status === "COMPLETED") {
      agentUnitBucket.completedLoans += 1;
    }
    if (loan.status === "DEFAULTED") {
      agentUnitBucket.defaultedLoans += 1;
    }
    agentPerformanceByAdministrativeUnitMap.set(unitKey, agentUnitBucket);
  });

  const repaymentsByDistrictMap = new Map();
  repayments.forEach((repayment) => {
    const current = repaymentsByDistrictMap.get(repayment.district) || 0;
    repaymentsByDistrictMap.set(repayment.district, current + asNumber(repayment.amount));
  });

  return {
    filters: {
      region: filters.region || "",
      subregion: filters.subregion || "",
      district: filters.district || "",
      administrativeUnit: filters.administrativeUnit || "",
      subUnit: filters.subUnit || "",
      subcounty: filters.subcounty || "",
      agentId: filters.agentId || ""
    },
    filterOptions: {
      geoCatalog: getGeoCatalog(),
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.fullName,
        agentCode: agent.agentCode,
        country: agent.country,
        region: agent.region,
        subregion: agent.subregion,
        district: agent.district,
        administrativeUnit: agent.administrativeUnit,
        subUnit: agent.subUnit,
        subcounty: agent.subcounty
      }))
    },
    agentsPerRegion: Array.from(agentsPerRegionMap.entries()).map(([region, count]) => ({
      region,
      count
    })),
    loanDistribution: Array.from(loansPerRegionMap.entries()).map(([region, count]) => ({
      region,
      count
    })),
    usersByDistrict: Array.from(usersByDistrictMap.entries()).map(([district, count]) => ({ district, count })),
    usersByAdministrativeUnit: Array.from(usersByAdministrativeUnitMap.entries()).map(([administrativeUnit, count]) => ({ administrativeUnit, count })),
    loansBySubUnit: Array.from(loansBySubUnitMap.entries()).map(([subUnit, count]) => ({ subUnit, count })),
    repaymentsByDistrict: Array.from(repaymentsByDistrictMap.entries()).map(([district, amount]) => ({ district, amount })),
    agentPerformanceByAdministrativeUnit: Array.from(agentPerformanceByAdministrativeUnitMap.values()),
    defaultsBySubUnit: Array.from(defaultsBySubUnitMap.values()).map((entry) => ({
      subUnit: entry.subUnit,
      total: entry.total,
      defaultRate: percentage(entry.defaults, entry.total)
    })),
    districtPerformance: districtPerformance.sort((left, right) => left.district.localeCompare(right.district)),
    heatmap: agents.map((agent) => ({
      id: agent.id,
      name: agent.fullName,
      agentCode: agent.agentCode,
      country: agent.country,
      region: agent.region,
      subregion: agent.subregion,
      district: agent.district,
      administrativeUnit: agent.administrativeUnit,
      subUnit: agent.subUnit,
      trustScore: agent.score?.trustScore || 50,
      defaultRate: asNumber(agent.score?.defaultRate),
      activeLoans: agent.score?.activeLoans || 0
    }))
  };
}

async function buildAdminAgentSummary(prismaClient, filters = {}) {
  const [agents, geoView] = await Promise.all([
    prismaClient.agent.findMany({
      include: {
        wallet: true,
        score: true,
        referrals: true,
        createdByAdmin: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      where: {
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.region ? { region: filters.region } : {}),
        ...(filters.subregion ? { subregion: filters.subregion } : {}),
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.administrativeUnit ? { administrativeUnit: filters.administrativeUnit } : {}),
        ...(filters.subUnit ? { subUnit: filters.subUnit } : {}),
        ...(filters.subcounty ? { subcounty: filters.subcounty } : {}),
        ...(filters.agentId ? { id: filters.agentId } : {})
      },
      orderBy: { approvedAt: "desc" }
    }),
    buildGeoAnalytics(prismaClient, filters)
  ]);

  const adminStatsMap = new Map();
  agents.forEach((agent) => {
    const adminId = agent.createdByAdmin?.id || "UNKNOWN";
    const current = adminStatsMap.get(adminId) || {
      adminId,
      adminName: agent.createdByAdmin?.fullName || "Unknown admin",
      agentCount: 0,
      totalDefaultRate: 0,
      totalTrustScore: 0
    };
    current.agentCount += 1;
    current.totalDefaultRate += asNumber(agent.score?.defaultRate);
    current.totalTrustScore += asNumber(agent.score?.trustScore || 50);
    adminStatsMap.set(adminId, current);
  });

  return {
    pendingApplications: [],
    approvedAgents: agents.map((agent) => ({
      id: agent.id,
      agentCode: agent.agentCode,
      name: agent.fullName,
      createdBy: agent.createdByAdmin?.fullName || "Unknown admin",
      country: agent.country,
      region: agent.region,
      subregion: agent.subregion,
      district: agent.district,
      county: agent.subregion,
      subcounty: agent.subcounty,
      totalUsersReferred: agent.score?.totalUsersReferred || agent.referrals.length,
      defaultRate: asNumber(agent.score?.defaultRate),
      trustScore: agent.score?.trustScore || 50,
      status: agent.status
    })),
    adminAccountability: Array.from(adminStatsMap.values()).map((entry) => ({
      adminId: entry.adminId,
      adminName: entry.adminName,
      agentsCreated: entry.agentCount,
      averageDefaultRate: entry.agentCount ? roundCurrency(entry.totalDefaultRate / entry.agentCount) : 0,
      averageTrustScore: entry.agentCount ? roundCurrency(entry.totalTrustScore / entry.agentCount) : 0
    })),
    geoView
  };
}

async function buildAdminAgentDetail(prismaClient, agentId) {
  const agent = await prismaClient.agent.findUnique({
    where: { id: agentId },
    include: {
      wallet: true,
      score: true,
      referrals: {
        include: {
          user: {
            include: {
              userProfile: true,
              loans: {
                include: {
                  repaymentSchedules: { orderBy: { dueDate: "asc" } }
                },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      },
      transactions: { orderBy: { createdAt: "desc" } },
      penalties: { orderBy: { createdAt: "desc" } },
      application: true,
      createdByAdmin: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!agent) {
    const error = new Error("Agent not found");
    error.statusCode = 404;
    throw error;
  }

  await refreshAgentScore(prismaClient, agent.id);
  const refreshed = await prismaClient.agent.findUnique({
    where: { id: agentId },
    include: {
      wallet: true,
      score: true,
      referrals: {
        include: {
          user: {
            include: {
              userProfile: true,
              loans: {
                include: {
                  repaymentSchedules: { orderBy: { dueDate: "asc" } }
                }
              }
            }
          }
        }
      },
      transactions: { orderBy: { createdAt: "desc" } },
      penalties: { orderBy: { createdAt: "desc" } },
      application: true,
      createdByAdmin: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      user: {
        select: {
          email: true
        }
      }
    }
  });

  return {
    id: refreshed.id,
    agentCode: refreshed.agentCode,
    fullName: refreshed.fullName,
    createdByAdmin: refreshed.createdByAdmin,
    phoneNumber: refreshed.phoneNumber,
    loginEmail: refreshed.user?.email || "",
    nationalId: refreshed.nationalId,
    country: refreshed.country,
    region: refreshed.region,
    subregion: refreshed.subregion,
    district: refreshed.district,
    administrativeUnit: refreshed.administrativeUnit,
    subUnit: refreshed.subUnit,
    county: refreshed.subregion,
    subcounty: refreshed.subcounty,
    status: refreshed.status,
    approvedAt: refreshed.approvedAt,
    wallet: {
      pendingBalance: asNumber(refreshed.wallet?.pendingBalance),
      availableBalance: asNumber(refreshed.wallet?.availableBalance)
    },
    score: refreshed.score,
    application: refreshed.application,
    referredUsers: refreshed.referrals.map((referral) => {
      const user = referral.user;
      const loan = (user.loans || [])[0] || null;
      return {
        id: user.id,
        name: user.fullName,
        phone: user.userProfile?.phone || "Not available",
        country: user.country,
        region: user.region,
        subregion: user.subregion,
        district: user.district,
        administrativeUnit: user.administrativeUnit,
        subUnit: user.subUnit,
        county: user.subregion,
        subcounty: user.subcounty,
        loanStatus: loan?.status || "NO_LOAN",
        daysLate: asNumber(loan?.daysLate)
      };
    }),
    earnings: refreshed.transactions.map((item) => ({
      id: item.id,
      type: item.type,
      bucket: item.bucket,
      amount: asNumber(item.amount),
      description: item.description,
      createdAt: item.createdAt
    })),
    penalties: refreshed.penalties.map((item) => ({
      id: item.id,
      amount: asNumber(item.amount),
      reason: item.reason,
      createdAt: item.createdAt
    }))
  };
}

module.exports = {
  SIGNUP_REWARD_AMOUNT,
  assignAgent,
  PENALTY_AMOUNT,
  DEFAULT_RATE_THRESHOLD,
  applyDefaultRatePenaltyIfNeeded,
  applyAgentTransaction,
  buildAdminAgentDetail,
  buildAdminAgentSummary,
  buildAgentAccessStatus,
  buildGeoAnalytics,
  buildAgentApplicationStatus,
  buildAgentDashboard,
  buildAgentDashboardForActor,
  createAgentByAdmin,
  captureReferral,
  ensureActiveAgentByCode,
  ensureAgentScore,
  ensureAgentWallet,
  findApprovedAgentByCode,
  linkUserToAgentOnboarding,
  processAgentRewardsForRepayment,
  refreshAgentScore,
  rejectAgentApplication,
  submitAgentApplication,
  getAssignedAgentGeoContext,
  updateAgentStatus,
  approveAgentApplication
};
