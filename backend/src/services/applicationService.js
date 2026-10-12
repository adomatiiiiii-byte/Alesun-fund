const { applicationSchema } = require("../validators");
const { calculateAlesunRiskScore } = require("./riskScoring");
const { getScreeningIssues, getFraudFlags } = require("./applicationAnalysis");
const { createAuditLog } = require("./auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} = require("./auditLog.service");
const { httpError } = require("../utils/httpError");

function parseApplicationBody(rawBody) {
  const normalized = { ...rawBody };
  if (typeof rawBody.monthlyRevenue === "string") {
    normalized.monthlyRevenue = JSON.parse(rawBody.monthlyRevenue);
  }
  if (typeof rawBody.monthlyExpenses === "string") {
    normalized.monthlyExpenses = JSON.parse(rawBody.monthlyExpenses);
  }
  if (typeof rawBody.financialInfo === "string") {
    normalized.financialInfo = JSON.parse(rawBody.financialInfo);
  }
  return applicationSchema.parse(normalized);
}

function deriveOwnerReliabilityScore(payload, documents) {
  if (typeof payload.ownerReliabilityScore === "number") {
    return payload.ownerReliabilityScore;
  }

  let score = 50;
  if (payload.idNumber?.trim()) score += 20;
  if ((documents.idDocument || []).length || (documents.idFrontImage && documents.idBackImage)) score += 10;
  if ((documents.financialRecords || []).length) score += 10;
  if (payload.yearsInOperation >= 3) score += 5;
  if ((documents.businessPhotos || []).length >= 2) score += 5;
  if (documents.passportPhoto) score += 5;

  return Math.min(100, score);
}

function mapDocumentFields(files = {}) {
  return {
    businessPhotos: (files.businessPhotos || []).map((file) => file.reference),
    idDocument: (files.idDocument || []).map((file) => file.reference),
    financialRecords: (files.financialRecords || []).map((file) => file.reference),
    supportingDocuments: (files.supportingDocuments || files.documents || []).map(
      (file) => file.reference
    ),
    passportPhoto: files.passportPhoto?.[0]?.reference || null,
    idFrontImage: files.idFrontImage?.[0]?.reference || null,
    idBackImage: files.idBackImage?.[0]?.reference || null
  };
}

function hasCompleteMonthlyHistory(values) {
  return Array.isArray(values) && values.length === 6;
}

async function createApplication({
  prisma,
  payload,
  source,
  submittedById = null,
  files,
  auditUserId = null,
  auditContext = {}
}) {
  const documents = mapDocumentFields(files);
  const applicant = submittedById
    ? await prisma.user.findUnique({
        where: { id: submittedById },
        select: { fullName: true, email: true }
      })
    : null;
  const ownerReliabilityScore = deriveOwnerReliabilityScore(payload, documents);
  const averageExpenses =
    payload.monthlyExpenses.reduce((sum, value) => sum + value, 0) / payload.monthlyExpenses.length;
  const scoringInput = { ...payload, ownerReliabilityScore, expenses: averageExpenses };
  const result = calculateAlesunRiskScore(scoringInput);
  const analysisInput = {
    ...payload,
    documents
  };
  const screeningIssues = getScreeningIssues(analysisInput);
  const fraudFlags = getFraudFlags(analysisInput);

  let initialStatus = result.status;
  if (source === "PUBLIC") {
    initialStatus = "NEW";
  } else if (result.label === "Low risk" && screeningIssues.length) {
    initialStatus = "UNDER_REVIEW";
  }

  const created = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: payload.businessName,
        industry: payload.industry,
        location: payload.location,
        yearsInOperation: payload.yearsInOperation,
        ownerName: payload.ownerName,
        ownerPhone: payload.ownerPhone,
        idNumber: payload.idNumber,
        ownerReliabilityScore,
        averageMonthlyRevenue:
          payload.monthlyRevenue.reduce((sum, value) => sum + value, 0) / payload.monthlyRevenue.length
      }
    });

    const application = await tx.loanApplication.create({
      data: {
        businessId: business.id,
        submittedById,
        source,
        applicantName: applicant?.fullName || payload.ownerName,
        phoneNumber: payload.ownerPhone,
        email: applicant?.email || null,
        status: initialStatus,
        monthlyRevenue: payload.monthlyRevenue,
        monthlyExpenses: payload.monthlyExpenses,
        expenses: averageExpenses,
        financialInfo: payload.financialInfo,
        documentPaths: documents,
        passportPhotoUrl: documents.passportPhoto?.storedName || null,
        idFrontUrl: documents.idFrontImage?.storedName || null,
        idBackUrl: documents.idBackImage?.storedName || null,
        termsAccepted: payload.termsAccepted,
        termsAcceptedAt: payload.termsAccepted ? new Date() : null,
        loanRequestAmount: payload.loanRequestAmount,
        loanPurpose: payload.loanPurpose,
        screeningIssues,
        fraudFlags
      },
      include: {
        business: true,
        riskScore: true
      }
    });

    if (!hasCompleteMonthlyHistory(application.monthlyRevenue)) {
      throw httpError(500, "Monthly revenue history could not be saved");
    }

    if (!hasCompleteMonthlyHistory(application.monthlyExpenses)) {
      throw httpError(500, "Monthly expense history could not be saved");
    }

    const riskScore = await tx.riskScore.create({
      data: {
        applicationId: application.id,
        score: result.score,
        label: result.label,
        recommendation: result.recommendation,
        breakdown: result.breakdown
      }
    });

    await createAuditLog(tx, {
      userId: auditUserId,
      action: AUDIT_ACTIONS.APPLICATION_SUBMITTED,
      entityType: AUDIT_ENTITY_TYPES.APPLICATION,
      entityId: application.id,
      performedBy: auditUserId || "SYSTEM",
      role: source === "PUBLIC" ? "APPLICANT" : "SYSTEM",
      newValue: { status: initialStatus },
      metadata: { source, status: initialStatus },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    });

    await createAuditLog(tx, {
      userId: auditUserId,
      action: AUDIT_ACTIONS.RISK_SCORE_GENERATED,
      entityType: AUDIT_ENTITY_TYPES.RISK_SCORE,
      entityId: riskScore.id,
      performedBy: auditUserId || "SYSTEM",
      role: source === "PUBLIC" ? "APPLICANT" : "SYSTEM",
      newValue: {
        score: riskScore.score,
        label: riskScore.label,
        recommendation: riskScore.recommendation
      },
      metadata: { source, applicationId: application.id },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    });

    await createAuditLog(tx, {
      userId: auditUserId,
      action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      entityType: AUDIT_ENTITY_TYPES.DOCUMENT,
      entityId: application.id,
      performedBy: auditUserId || "SYSTEM",
      role: source === "PUBLIC" ? "APPLICANT" : "SYSTEM",
      metadata: {
        applicationId: application.id,
        source,
        uploadedBuckets: Object.fromEntries(
          Object.entries(documents).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.length : value ? 1 : 0
          ])
        )
      },
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent
    });

    return {
      application: {
        ...application,
        riskScore
      },
      riskScore
    };
  });

  return created;
}

module.exports = { parseApplicationBody, createApplication, mapDocumentFields };
