const {
  buildStoredFileReference,
  financialMimeTypes,
  imageMimeTypes,
  validateFileBucket
} = require("../utils/fileSecurity");
const { httpError } = require("../utils/httpError");
const { createAuditLog } = require("./auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} = require("./auditLog.service");
const { getGeoCatalog, validateUserGeography } = require("./geography.service");
const { linkUserToAgentOnboarding } = require("./agent.service");

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function maskValue(value, { visibleStart = 2, visibleEnd = 2 } = {}) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= visibleStart + visibleEnd) {
    return `${text.slice(0, 1)}***`;
  }

  return `${text.slice(0, visibleStart)}***${text.slice(text.length - visibleEnd)}`;
}

async function logDuplicateCheck(prismaClient, {
  userId,
  performedBy,
  role,
  auditContext,
  type,
  result,
  inputData,
  matchedUserId
}) {
  await createAuditLog(prismaClient, {
    userId,
    action: AUDIT_ACTIONS.DUPLICATE_CHECK_TRIGGERED,
    entityType: AUDIT_ENTITY_TYPES.ONBOARDING,
    entityId: userId,
    performedBy,
    role,
    metadata: {
      type,
      result,
      inputData,
      matchedUserId: matchedUserId || null
    },
    ...auditContext
  });
}

function isSubmittedStatus(status) {
  return ["PENDING", "VERIFIED", "REJECTED"].includes(status);
}

function getCompletionPercent(completedSteps) {
  return Math.round((Math.min(completedSteps || 0, 3) / 3) * 100);
}

function sanitizeProfile(profile, user = null) {
  if (!profile) {
    return null;
  }

  return {
    fullName: profile.fullName,
    nin: profile.nin,
    dateOfBirth: profile.dateOfBirth,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    position: profile.position,
    agentReferralId: user?.agentReferralId || profile.user?.agentReferralId || "",
    country: user?.country || profile.user?.country || "UGANDA",
    region: user?.region || profile.user?.region || "UNASSIGNED",
    subregion: user?.subregion || profile.user?.subregion || "UNASSIGNED",
    district: user?.district || profile.user?.district || "UNASSIGNED",
    administrativeUnit: user?.administrativeUnit || profile.user?.administrativeUnit || "",
    subUnit: user?.subUnit || profile.user?.subUnit || profile.user?.subcounty || "",
    county: user?.county || profile.user?.county || profile.user?.subregion || "UNASSIGNED",
    subcounty: user?.subcounty || profile.user?.subcounty || user?.subUnit || profile.user?.subUnit || "UNASSIGNED",
    village: user?.village || profile.user?.village || "",
    gpsLatitude: user?.gpsLatitude || profile.user?.gpsLatitude || null,
    gpsLongitude: user?.gpsLongitude || profile.user?.gpsLongitude || null
  };
}

function sanitizeBusiness(business) {
  if (!business) {
    return null;
  }

  return {
    businessName: business.name,
    location: business.location,
    industry: business.industry,
    yearsInOperation: business.yearsInOperation,
    weeklyRevenue: business.weeklyRevenue,
    weeklyExpenses: business.weeklyExpenses
  };
}

function sanitizeDocuments(documents) {
  if (!documents) {
    return null;
  }

  return {
    idFrontUrl: documents.idFrontUrl,
    idBackUrl: documents.idBackUrl,
    tradingLicenseUrl: documents.tradingLicenseUrl,
    submittedAt: documents.submittedAt
  };
}

function buildOnboardingResponse(user) {
  const verification = user.verificationStatus || {
    status: "INCOMPLETE",
    completedSteps: 0,
    submittedAt: null
  };
  const completedSteps = verification.completedSteps || 0;

  return {
    ownerInfo: sanitizeProfile(user.userProfile, user),
    businessInfo: sanitizeBusiness(user.businessProfile),
    documents: sanitizeDocuments(user.documents),
    verificationStatus: verification.status,
    completedSteps,
    completionPercent: getCompletionPercent(completedSteps),
    submittedAt: verification.submittedAt,
    step1Complete: completedSteps >= 1,
    step2Complete: completedSteps >= 2,
    onboardingComplete: completedSteps >= 3,
    currentStep: completedSteps >= 3 ? 3 : completedSteps + 1,
    geoCatalog: getGeoCatalog()
  };
}

async function ensureVerificationStatus(tx, userId) {
  const existing = await tx.verificationStatus.findUnique({
    where: { userId }
  });

  if (existing) {
    return existing;
  }

  return tx.verificationStatus.create({
    data: {
      user: { connect: { id: userId } },
      status: "INCOMPLETE",
      completedSteps: 0
    }
  });
}

async function getOnboardingStatus(prismaClient, userId) {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    include: {
      userProfile: true,
      businessProfile: true,
      documents: true,
      verificationStatus: true
    }
  });

  if (!user) {
    throw httpError(404, "User not found");
  }

  if (!user.verificationStatus) {
    await prismaClient.verificationStatus.create({
      data: {
        user: { connect: { id: userId } },
        status: "INCOMPLETE",
        completedSteps: 0
      }
    });

    return getOnboardingStatus(prismaClient, userId);
  }

  return buildOnboardingResponse(user);
}

function assertOnboardingEditable(verificationStatus) {
  if (verificationStatus.completedSteps >= 3 || verificationStatus.submittedAt || isSubmittedStatus(verificationStatus.status)) {
    throw httpError(403, "Onboarding has already been submitted and cannot be repeated");
  }
}

async function saveOwnerInfo({ prismaClient, userId, payload, auditContext = {}, userRole = "APPLICANT" }) {
  const normalizedFullName = String(payload.fullName || "").trim().replace(/\s+/g, " ");
  const normalizedNin = String(payload.nin || "").trim();
  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const normalizedAddress = String(payload.address || "").trim();
  const normalizedPosition = String(payload.position || "").trim();
  const normalizedAgentReferralId = String(payload.agentReferralId || "").trim().toUpperCase();
  const normalizedCountry = String(payload.country || "Uganda").trim().toUpperCase();
  const normalizedVillage = String(payload.village || "").trim();
  const normalizedName = normalizeName(normalizedFullName);
  const userLocation = {
    country: normalizedCountry,
    region: String(payload.region || "").trim(),
    subregion: String(payload.subregion || "").trim(),
    district: String(payload.district || "").trim(),
    administrativeUnit: String(payload.administrativeUnit || "").trim(),
    subUnit: String(payload.subUnit || payload.subcounty || "").trim(),
    county: String(payload.county || "").trim(),
    subcounty: String(payload.subUnit || payload.subcounty || "").trim(),
    village: normalizedVillage
  };
  const geoValidation = validateUserGeography(userLocation);
  if (!geoValidation.valid) {
    throw httpError(400, geoValidation.message);
  }
  const duplicate = await prismaClient.userProfile.findFirst({
    where: {
      OR: [
        { nin: normalizedNin },
        { phone: normalizedPhone }
      ],
      NOT: { userId }
    },
    select: {
      id: true,
      userId: true,
      nin: true,
      phone: true
    }
  });

  if (duplicate) {
    const duplicateType = duplicate.nin === normalizedNin ? "NIN" : "PHONE";
    const duplicateMessage = duplicateType === "NIN"
      ? "An account with this National ID already exists."
      : "This phone number is already registered.";

    await logDuplicateCheck(prismaClient, {
      userId,
      performedBy: userId,
      role: userRole,
      auditContext,
      type: duplicateType,
      result: "BLOCKED",
      inputData: {
        nin: maskValue(normalizedNin),
        phone: maskValue(normalizedPhone)
      },
      matchedUserId: duplicate.userId
    });

    throw httpError(400, duplicateMessage);
  }
  try {
    await prismaClient.$transaction(async (tx) => {
      const verificationStatus = await ensureVerificationStatus(tx, userId);
      assertOnboardingEditable(verificationStatus);

      const nameDuplicate = normalizedName
        ? (await tx.userProfile.findMany({
            where: {
              NOT: { userId }
            },
            select: {
              userId: true,
              fullName: true
            }
          })).find((profile) => normalizeName(profile.fullName) === normalizedName) || null
        : null;

      const previousProfile = await tx.userProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              agentReferralId: true,
              country: true,
              region: true,
              subregion: true,
              district: true,
              administrativeUnit: true,
              subUnit: true,
              county: true,
              subcounty: true,
              village: true
            }
          }
        }
      });

      const previousUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          assignedAgentId: true,
          agentReferralId: true,
          country: true,
          region: true,
          subregion: true,
          district: true,
          administrativeUnit: true,
          subUnit: true,
          county: true,
          subcounty: true,
          village: true,
          gpsLatitude: true,
          gpsLongitude: true
        }
      });

      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: {
          user: { connect: { id: userId } },
          fullName: normalizedFullName,
          nin: normalizedNin,
          dateOfBirth: new Date(payload.dateOfBirth),
          phone: normalizedPhone,
          email: normalizedEmail,
          address: normalizedAddress,
          position: normalizedPosition
        },
        update: {
          fullName: normalizedFullName,
          nin: normalizedNin,
          dateOfBirth: new Date(payload.dateOfBirth),
          phone: normalizedPhone,
          email: normalizedEmail,
          address: normalizedAddress,
          position: normalizedPosition
        }
      });

      const linkage = await linkUserToAgentOnboarding(tx, {
        userId,
        agentCode: normalizedAgentReferralId,
        userLocation,
        performedBy: userId,
        role: userRole,
        requestContext: auditContext
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: normalizedFullName,
          email: normalizedEmail,
          gpsLatitude: payload.gpsLatitude ?? null,
          gpsLongitude: payload.gpsLongitude ?? null
        }
      });

      await tx.verificationStatus.update({
        where: { userId },
        data: {
          completedSteps: Math.max(verificationStatus.completedSteps, 1),
          status: "INCOMPLETE"
        }
      });

      await createAuditLog(tx, {
        userId,
        action: AUDIT_ACTIONS.ONBOARDING_STEP_COMPLETED,
        entityType: AUDIT_ENTITY_TYPES.ONBOARDING,
        entityId: userId,
        performedBy: userId,
        role: userRole,
        previousValue: previousProfile ? sanitizeProfile(previousProfile) : null,
        newValue: sanitizeProfile(profile),
        metadata: { step: 1 },
        ...auditContext
      });

      await createAuditLog(tx, {
        userId,
        action: AUDIT_ACTIONS.USER_LOCATION_CAPTURED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: userId,
        performedBy: userId,
        role: userRole,
        previousValue: previousUser
          ? {
              country: previousUser.country,
            region: previousUser.region,
            subregion: previousUser.subregion,
            district: previousUser.district,
              administrativeUnit: previousUser.administrativeUnit,
              subUnit: previousUser.subUnit,
              county: previousUser.county,
              subcounty: previousUser.subcounty,
              village: previousUser.village,
              gpsLatitude: previousUser.gpsLatitude,
              gpsLongitude: previousUser.gpsLongitude
            }
          : null,
        newValue: {
          country: updatedUser.country,
          region: updatedUser.region,
          subregion: updatedUser.subregion,
          district: updatedUser.district,
          administrativeUnit: updatedUser.administrativeUnit,
          subUnit: updatedUser.subUnit,
          county: updatedUser.county,
          subcounty: updatedUser.subcounty,
          village: updatedUser.village,
          gpsLatitude: updatedUser.gpsLatitude,
          gpsLongitude: updatedUser.gpsLongitude
        },
        metadata: {
          assignedAgentId: linkage.agent.id,
          agentReferralId: linkage.agent.agentCode,
          assignmentStrategy: linkage.assignmentStrategy
        },
        ...auditContext
      });

      if (nameDuplicate) {
        await logDuplicateCheck(tx, {
          userId,
          performedBy: userId,
          role: userRole,
          auditContext,
          type: "NAME",
          result: "FLAGGED",
          inputData: {
            fullName: normalizedFullName
          },
          matchedUserId: nameDuplicate.userId
        });
      }
    });
  } catch (error) {
    if (error && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes("nin")) {
        await logDuplicateCheck(prismaClient, {
          userId,
          performedBy: userId,
          role: userRole,
          auditContext,
          type: "NIN",
          result: "BLOCKED",
          inputData: {
            nin: maskValue(normalizedNin),
            phone: maskValue(normalizedPhone)
          }
        });
        throw httpError(400, "An account with this National ID already exists.");
      }

      if (target.includes("phone")) {
        await logDuplicateCheck(prismaClient, {
          userId,
          performedBy: userId,
          role: userRole,
          auditContext,
          type: "PHONE",
          result: "BLOCKED",
          inputData: {
            nin: maskValue(normalizedNin),
            phone: maskValue(normalizedPhone)
          }
        });
        throw httpError(400, "This phone number is already registered.");
      }
    }

    throw error;
  }

  return getOnboardingStatus(prismaClient, userId);
}

async function saveBusinessInfo({ prismaClient, userId, payload, auditContext = {}, userRole = "APPLICANT" }) {
  await prismaClient.$transaction(async (tx) => {
    const verificationStatus = await ensureVerificationStatus(tx, userId);
    if (verificationStatus.completedSteps < 1) {
      throw httpError(400, "Complete owner information first");
    }
    assertOnboardingEditable(verificationStatus);

    const profile = await tx.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw httpError(400, "Complete owner information first");
    }

    const previousBusiness = await tx.business.findUnique({
      where: { userId }
    });

    const business = await tx.business.upsert({
      where: { userId },
      create: {
        userId,
        name: payload.businessName,
        location: payload.location,
        industry: payload.industry,
        yearsInOperation: payload.yearsInOperation,
        weeklyRevenue: payload.weeklyRevenue,
        weeklyExpenses: payload.weeklyExpenses,
        ownerName: profile.fullName,
        ownerPhone: profile.phone,
        idNumber: profile.nin,
        ownerReliabilityScore: 0,
        averageMonthlyRevenue: Number(payload.weeklyRevenue) * 4
      },
      update: {
        name: payload.businessName,
        location: payload.location,
        industry: payload.industry,
        yearsInOperation: payload.yearsInOperation,
        weeklyRevenue: payload.weeklyRevenue,
        weeklyExpenses: payload.weeklyExpenses,
        ownerName: profile.fullName,
        ownerPhone: profile.phone,
        idNumber: profile.nin,
        averageMonthlyRevenue: Number(payload.weeklyRevenue) * 4
      }
    });

    await tx.verificationStatus.update({
      where: { userId },
      data: {
        completedSteps: Math.max(verificationStatus.completedSteps, 2),
        status: "INCOMPLETE"
      }
    });

    await createAuditLog(tx, {
      userId,
      action: AUDIT_ACTIONS.ONBOARDING_STEP_COMPLETED,
      entityType: AUDIT_ENTITY_TYPES.ONBOARDING,
      entityId: userId,
      performedBy: userId,
      role: userRole,
      previousValue: previousBusiness ? sanitizeBusiness(previousBusiness) : null,
      newValue: sanitizeBusiness(business),
      metadata: { step: 2 },
      ...auditContext
    });
  });

  return getOnboardingStatus(prismaClient, userId);
}

async function submitDocuments({
  prismaClient,
  userId,
  files,
  auditContext = {},
  userRole = "APPLICANT"
}) {
  validateFileBucket(files || {}, "idFrontImage", {
    required: true,
    maxCount: 1,
    mimeTypes: imageMimeTypes,
    maxSizeBytes: 5 * 1024 * 1024,
    label: "ID front image",
    allowedDescription: "a JPG or PNG image"
  });
  validateFileBucket(files || {}, "idBackImage", {
    required: true,
    maxCount: 1,
    mimeTypes: imageMimeTypes,
    maxSizeBytes: 5 * 1024 * 1024,
    label: "ID back image",
    allowedDescription: "a JPG or PNG image"
  });
  validateFileBucket(files || {}, "tradingLicense", {
    required: true,
    maxCount: 1,
    mimeTypes: financialMimeTypes,
    maxSizeBytes: 10 * 1024 * 1024,
    label: "Trading license",
    allowedDescription: "a JPG, PNG, or PDF file"
  });

  await prismaClient.$transaction(async (tx) => {
    const verificationStatus = await ensureVerificationStatus(tx, userId);
    if (verificationStatus.completedSteps < 2) {
      throw httpError(400, "Complete business information first");
    }
    assertOnboardingEditable(verificationStatus);

    const previousDocuments = await tx.document.findUnique({
      where: { userId }
    });

    const documentRecord = await tx.document.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        idFrontUrl: buildStoredFileReference(files.idFrontImage[0]).storedName,
        idBackUrl: buildStoredFileReference(files.idBackImage[0]).storedName,
        tradingLicenseUrl: buildStoredFileReference(files.tradingLicense[0]).storedName,
        submittedAt: new Date()
      },
      update: {
        idFrontUrl: buildStoredFileReference(files.idFrontImage[0]).storedName,
        idBackUrl: buildStoredFileReference(files.idBackImage[0]).storedName,
        tradingLicenseUrl: buildStoredFileReference(files.tradingLicense[0]).storedName,
        submittedAt: new Date()
      }
    });

    const nextVerification = await tx.verificationStatus.update({
      where: { userId },
      data: {
        completedSteps: 3,
        status: "PENDING",
        submittedAt: new Date()
      }
    });

    await createAuditLog(tx, {
      userId,
      action: AUDIT_ACTIONS.ONBOARDING_DOCUMENTS_UPLOADED,
      entityType: AUDIT_ENTITY_TYPES.DOCUMENT,
      entityId: documentRecord.id,
      performedBy: userId,
      role: userRole,
      previousValue: previousDocuments ? sanitizeDocuments(previousDocuments) : null,
      newValue: sanitizeDocuments(documentRecord),
      metadata: { step: 3 },
      ...auditContext
    });

    await createAuditLog(tx, {
      userId,
      action: AUDIT_ACTIONS.ONBOARDING_SUBMITTED,
      entityType: AUDIT_ENTITY_TYPES.ONBOARDING,
      entityId: userId,
      performedBy: userId,
      role: userRole,
      newValue: {
        status: nextVerification.status,
        submittedAt: nextVerification.submittedAt
      },
      metadata: { completedSteps: 3 },
      ...auditContext
    });
  });

  return getOnboardingStatus(prismaClient, userId);
}

async function listOnboardingUsers(prismaClient) {
  const users = await prismaClient.user.findMany({
    where: {
      role: "APPLICANT"
    },
    include: {
      userProfile: true,
      businessProfile: true,
      documents: true,
      verificationStatus: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return users
    .filter((user) => user.userProfile || user.businessProfile || user.verificationStatus)
    .map((user) => {
    const onboarding = buildOnboardingResponse(user);

    return {
      id: user.id,
      email: user.email,
      ownerInfo: onboarding.ownerInfo,
      businessInfo: onboarding.businessInfo,
      documents: onboarding.documents,
      verificationStatus: onboarding.verificationStatus,
      completedSteps: onboarding.completedSteps,
      completionPercent: onboarding.completionPercent,
      submittedAt: onboarding.submittedAt
    };
    });
}

async function updateVerificationDecision({
  prismaClient,
  userId,
  status,
  performedBy,
  role,
  auditContext = {}
}) {
  const updated = await prismaClient.$transaction(async (tx) => {
    const existing = await tx.verificationStatus.findUnique({
      where: { userId }
    });

    if (!existing || existing.completedSteps < 3) {
      throw httpError(404, "Submitted onboarding record not found");
    }

    const next = await tx.verificationStatus.update({
      where: { userId },
      data: {
        status,
        reviewedAt: new Date()
      }
    });

    await createAuditLog(tx, {
      userId,
      action: AUDIT_ACTIONS.ONBOARDING_VERIFICATION_DECIDED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      performedBy,
      role,
      previousValue: {
        status: existing.status,
        reviewedAt: existing.reviewedAt
      },
      newValue: {
        status: next.status,
        reviewedAt: next.reviewedAt
      },
      metadata: {
        completedSteps: next.completedSteps
      },
      ...auditContext
    });

    return next;
  });

  return updated;
}

module.exports = {
  getOnboardingStatus,
  saveOwnerInfo,
  saveBusinessInfo,
  submitDocuments,
  listOnboardingUsers,
  updateVerificationDecision,
  getCompletionPercent
};
