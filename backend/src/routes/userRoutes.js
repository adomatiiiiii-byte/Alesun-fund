const express = require("express");
const fs = require("fs");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { buildMyAccount } = require("../services/myAccount.service");
const { buildLoanEligibility } = require("../services/loanEligibility.service");
const { calculateTransparentLoanPricing } = require("../services/loanPricing.service");
const { buildLoanRequestGeoSnapshot, buildStoredUserLocation } = require("../services/geography.service");
const { scheduleMonitoringCheck } = require("../services/monitoringService");
const { emitLoanRequestCreated } = require("../services/dashboardRealtime.service");
const {
  buildOperationalLoanRequestWhere,
  buildVisibleLoanRequestWhere
} = require("../services/loanRequestLifecycle.service");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const {
  loanPricingQuerySchema,
  loanRequestCreateSchema
} = require("../validators");
const {
  buildStoredFileReference,
  removeUploadedFiles,
  resolveStoredFile
} = require("../utils/fileSecurity");
const { upload } = require("../utils/upload");
const { httpError } = require("../utils/httpError");

const router = express.Router();

router.use(authenticate, authorize("APPLICANT"));

router.get("/my-account", async (req, res, next) => {
  try {
    const account = await buildMyAccount(prisma, req.user.id);
    return res.json(account);
  } catch (error) {
    return next(error);
  }
});

router.get("/loan-eligibility", async (req, res, next) => {
  try {
    const eligibility = await buildLoanEligibility(prisma, req.user.id);
    return res.json({
      eligible: eligibility.eligible,
      score: eligibility.score,
      maxLoanLimit: eligibility.maxLoanLimit,
      reasons: eligibility.reasons
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/loan-pricing", async (req, res, next) => {
  try {
    const payload = loanPricingQuerySchema.parse(req.query);
    return res.json({
      pricing: calculateTransparentLoanPricing(payload.amount)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/loan-request/status", async (req, res, next) => {
  try {
    const [latestRequest, activeLoan, userRecord] = await Promise.all([
      prisma.loanRequest.findFirst({
        where: buildVisibleLoanRequestWhere({ userId: req.user.id }),
        include: {
          agent: true,
          referral: {
            include: {
              agent: true
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.loan.findFirst({
        where: {
          userId: req.user.id,
          status: "ACTIVE"
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          assignedAgent: true
        }
      })
    ]);

    const assignedAgent = latestRequest?.agent
      || latestRequest?.referral?.agent
      || userRecord?.assignedAgent
      || null;

    if (latestRequest?.status === "PENDING") {
      return res.json({
        status: "PENDING",
        amount: Number(latestRequest.amount),
        message: "Your loan request has been submitted and is awaiting admin approval",
        createdAt: latestRequest.createdAt,
        updatedAt: latestRequest.updatedAt,
        referral: assignedAgent
          ? {
              agentCode: assignedAgent.agentCode,
              agentName: assignedAgent.fullName
            }
          : null
      });
    }

    if (activeLoan || latestRequest?.status === "APPROVED") {
      return res.json({
        status: "APPROVED",
        amount: latestRequest ? Number(latestRequest.amount) : null,
        message: "Your loan has been approved.",
        createdAt: latestRequest?.createdAt || null,
        updatedAt: latestRequest?.updatedAt || null,
        referral: assignedAgent
          ? {
              agentCode: assignedAgent.agentCode,
              agentName: assignedAgent.fullName
            }
          : null
      });
    }

    if (latestRequest?.status === "REJECTED") {
      return res.json({
        status: "REJECTED",
        amount: Number(latestRequest.amount),
        message: "Your previous loan request was not approved. You may submit a new request.",
        createdAt: latestRequest.createdAt,
        updatedAt: latestRequest.updatedAt,
        referral: assignedAgent
          ? {
              agentCode: assignedAgent.agentCode,
              agentName: assignedAgent.fullName
            }
          : null
      });
    }

    return res.json({
      status: null,
      amount: null,
      message: null,
      createdAt: null,
      updatedAt: null,
      referral: assignedAgent
        ? {
            agentCode: assignedAgent.agentCode,
            agentName: assignedAgent.fullName
          }
        : null
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/loan-request", async (req, res, next) => {
  try {
    const payload = loanRequestCreateSchema.parse(req.body);
    const pricing = calculateTransparentLoanPricing(payload.amount);
    const [pendingLoanRequest, activeLoan, userRecord] = await Promise.all([
      prisma.loanRequest.findFirst({
        where: buildOperationalLoanRequestWhere(["PENDING"], { userId: req.user.id })
      }),
      prisma.loan.findFirst({
        where: {
          userId: req.user.id,
          status: "ACTIVE"
        },
        select: { id: true }
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          assignedAgent: true
        }
      })
    ]);

    if (pendingLoanRequest) {
      return res.status(409).json({
        message: "You already have a loan request awaiting approval"
      });
    }

    if (activeLoan) {
      return res.status(403).json({
        message: "You cannot apply for a new loan while you have an active loan"
      });
    }

    const userLocation = buildStoredUserLocation(userRecord || {});
    const locationComplete = ["country", "region", "subregion", "district", "administrativeUnit", "subUnit"]
      .every((field) => {
        const value = userLocation[field];
        return value && value !== "UNASSIGNED";
      });

    const hasActiveAssignedAgent = Boolean(
      userRecord?.assignedAgentId
      && userRecord?.assignedAgent
      && userRecord.assignedAgent.status === "ACTIVE"
    );

    if (!hasActiveAssignedAgent || !locationComplete) {
      return res.status(403).json({
        message: "Please complete your onboarding location details before applying for a loan."
      });
    }

    const eligibility = await buildLoanEligibility(prisma, req.user.id);

    if (!eligibility.eligible) {
      return res.status(403).json({
        message: "You are currently not eligible for a loan",
        reasons: eligibility.reasons
      });
    }

    if (payload.amount > eligibility.maxLoanLimit) {
      return res.status(400).json({
        message: `Loan amount cannot exceed UGX ${Number(eligibility.maxLoanLimit).toLocaleString()}`
      });
    }

    const loanRequest = await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { userId: req.user.id }
      });
      const created = await tx.loanRequest.create({
        data: {
          user: { connect: { id: req.user.id } },
          amount: pricing.principalAmount,
          status: "PENDING",
          agentId: userRecord.assignedAgentId,
          referralId: referral?.id || null,
          country: userLocation.country,
          region: userLocation.region,
          subregion: userLocation.subregion,
          district: userLocation.district,
          administrativeUnit: userLocation.administrativeUnit,
          subUnit: userLocation.subUnit,
          county: userLocation.subregion,
          subcounty: userLocation.subcounty || userLocation.subUnit,
          village: userLocation.village,
          geoSnapshot: buildLoanRequestGeoSnapshot({
            userLocation,
            assignedAgentId: userRecord.assignedAgentId
          })
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } }
        }
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.LOAN_REQUEST_CREATED_WITH_STORED_AGENT,
        entityType: AUDIT_ENTITY_TYPES.LOAN_REQUEST,
        entityId: created.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          amount: created.amount,
          status: created.status
        },
        metadata: {
          maxLoanLimit: eligibility.maxLoanLimit,
          assignedAgentId: userRecord.assignedAgentId,
          agentReferralId: userRecord.agentReferralId || null,
          geoSnapshot: created.geoSnapshot,
          pricing
        },
        ...extractRequestAuditContext(req)
      });

      return created;
    });

    scheduleMonitoringCheck({
      event: "loan_request_created",
      userId: req.user.id
    });
    emitLoanRequestCreated({
      loanRequestId: loanRequest.id,
      userId: req.user.id,
      amount: Number(loanRequest.amount),
      status: loanRequest.status
    });

    return res.status(201).json({
      loanRequest,
      message: "Your loan request has been submitted and is awaiting admin approval"
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/my-account/messages", upload.array("attachments", 5), async (req, res, next) => {
  try {
    const body = String(req.body?.body || "").trim();
    const applicationId = req.body?.applicationId || null;
    const attachments = Array.isArray(req.files)
      ? req.files.map((file) => buildStoredFileReference(file))
      : [];

    if (!body && !attachments.length) {
      return res.status(400).json({ message: "Message body or attachment is required" });
    }

    if (body.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or less" });
    }

    if (applicationId) {
      const application = await prisma.loanApplication.findFirst({
        where: {
          id: applicationId,
          submittedById: req.user.id,
          source: "PUBLIC"
        },
        select: { id: true }
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
    }

    const entry = await createAuditLog(prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.APPLICANT_MESSAGE_SENT,
      entityType: AUDIT_ENTITY_TYPES.MESSAGE,
      entityId: req.user.id,
      performedBy: req.user.id,
      role: req.user.role,
      metadata: {
        body,
        applicationId,
        senderName: req.user.fullName,
        senderRole: "APPLICANT",
        attachments
      },
      ...extractRequestAuditContext(req)
    });

    return res.status(201).json({
      message: {
        id: entry.id,
        senderRole: "APPLICANT",
        senderName: req.user.fullName,
        body,
        createdAt: entry.timestamp,
        applicationId,
        attachments
      }
    });
  } catch (error) {
    removeUploadedFiles({ attachments: req.files || [] });
    return next(error);
  }
});

router.get("/my-account/message-files/:messageId/:index?", async (req, res, next) => {
  try {
    const message = await prisma.auditLog.findFirst({
      where: {
        id: req.params.messageId,
        entityType: AUDIT_ENTITY_TYPES.MESSAGE,
        entityId: req.user.id
      },
      select: {
        metadata: true
      }
    });

    if (!message) {
      throw httpError(404, "Message not found");
    }

    const attachments = Array.isArray(message.metadata?.attachments)
      ? message.metadata.attachments
      : [];
    const attachment = attachments[Number(req.params.index || 0)];

    if (!attachment?.storedName) {
      throw httpError(404, "Attachment not found");
    }

    const absolutePath = resolveStoredFile(attachment.storedName);
    if (!fs.existsSync(absolutePath)) {
      throw httpError(404, "Stored file not found");
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  }
});

router.get("/my-account/files/:applicationId/:field/:index?", async (req, res, next) => {
  try {
    const application = await prisma.loanApplication.findFirst({
      where: {
        id: req.params.applicationId,
        submittedById: req.user.id,
        source: "PUBLIC"
      },
      select: {
        documentPaths: true
      }
    });

    if (!application) {
      throw httpError(404, "Application not found");
    }

    const documents = application.documentPaths || {};
    const field = req.params.field;
    const value = documents[field];

    if (!value) {
      throw httpError(404, "Requested file not found");
    }

    const fileReference = Array.isArray(value)
      ? value[Number(req.params.index || 0)]
      : value;

    if (!fileReference?.storedName) {
      throw httpError(404, "Requested file not found");
    }

    const absolutePath = resolveStoredFile(fileReference.storedName);
    if (!fs.existsSync(absolutePath)) {
      throw httpError(404, "Stored file not found");
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
