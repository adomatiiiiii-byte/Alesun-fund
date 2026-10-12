const express = require("express");
const fs = require("fs");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const {
  adminApplicationQuerySchema,
  adminDecisionSchema,
  adminStatusUpdateSchema,
  loanRequestStatusUpdateSchema
} = require("../validators");
const { createAuditLog } = require("../services/auditService");
const {
  buildApplicationStatusMessage,
  isNotifiableStatus,
  sendApplicationStatusNotification
} = require("../services/notification.service");
const { createLoanFromLoanRequest } = require("../services/loanRequest.service");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const { scheduleMonitoringCheck } = require("../services/monitoringService");
const { emitLoanStatusUpdated } = require("../services/dashboardRealtime.service");
const { queueGeoUpdate } = require("../services/geoRealtime.service");
const {
  buildOperationalLoanRequestWhere,
  buildVisibleLoanRequestWhere
} = require("../services/loanRequestLifecycle.service");
const { httpError } = require("../utils/httpError");
const { resolveStoredFile } = require("../utils/fileSecurity");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "RISK_ADMIN"));

function serializeApplication(application) {
  return {
    ...application,
    financialHistoryIncomplete: !Array.isArray(application.monthlyExpenses)
  };
}

async function getApplicationWithNotificationContext(prismaClient, id) {
  return prismaClient.loanApplication.findUnique({
    where: { id },
    include: {
      business: true,
      riskScore: true,
      submittedBy: { select: { id: true, fullName: true, email: true, role: true } },
      fieldOfficer: { select: { id: true, fullName: true, email: true } },
      verificationReports: {
        include: {
          officer: { select: { id: true, fullName: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      loan: {
        include: {
          payments: { orderBy: { dueDate: "asc" } },
          repaymentSchedules: { orderBy: { dueDate: "asc" } }
        }
      }
    }
  });
}

router.get("/applications", async (req, res, next) => {
  try {
    const filters = adminApplicationQuerySchema.parse(req.query);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.riskLabel ? { riskScore: { is: { label: filters.riskLabel } } } : {}),
      ...(filters.dateFrom ? { submittedAt: { gte: new Date(filters.dateFrom) } } : {})
    };

    const applications = await prisma.loanApplication.findMany({
      where,
      select: {
        id: true,
        status: true,
        source: true,
        submittedAt: true,
        loanRequestAmount: true,
        business: {
          select: {
            name: true
          }
        },
        riskScore: {
          select: {
            score: true,
            label: true
          }
        },
        loan: {
          select: {
            id: true
          }
        }
      },
      orderBy: { submittedAt: "desc" }
    });

    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

router.get("/loan-requests", async (_req, res, next) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    });

    const loanRequests = await prisma.loanRequest.findMany({
      where: buildOperationalLoanRequestWhere(["PENDING", "APPROVED", "REJECTED"]),
      include: {
        agent: {
          select: {
            id: true,
            agentCode: true,
            fullName: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            country: true,
            region: true,
            subregion: true,
            district: true,
            county: true,
            subcounty: true,
            village: true,
            agentReferralId: true,
            userProfile: {
              select: {
                phone: true,
                nin: true,
                address: true,
                position: true
              }
            },
            businessProfile: {
              select: {
                name: true,
                location: true,
                industry: true,
                yearsInOperation: true,
                weeklyRevenue: true,
                weeklyExpenses: true
              }
            },
            applications: {
              where: {
                source: "PUBLIC",
                status: "APPROVED",
              },
              select: {
                id: true,
                submittedAt: true,
                business: {
                  select: {
                    name: true
                  }
                },
                loan: {
                  select: {
                    id: true,
                    status: true
                  }
                }
              },
              orderBy: {
                submittedAt: "desc"
              },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      loanRequests: loanRequests.map((loanRequest) => ({
        ...loanRequest,
        linkedApplication: loanRequest.user.applications[0] || null,
        agent: loanRequest.agent
          ? {
              id: loanRequest.agent.id,
              agentCode: loanRequest.agent.agentCode,
              fullName: loanRequest.agent.fullName
            }
          : null,
        geoSnapshot: loanRequest.geoSnapshot,
        user: {
          id: loanRequest.user.id,
          fullName: loanRequest.user.fullName,
          email: loanRequest.user.email,
          country: loanRequest.user.country,
          region: loanRequest.user.region,
          subregion: loanRequest.user.subregion,
          district: loanRequest.user.district,
          county: loanRequest.user.county,
          subcounty: loanRequest.user.subcounty,
          village: loanRequest.user.village,
          agentReferralId: loanRequest.user.agentReferralId,
          profile: loanRequest.user.userProfile
            ? {
                phone: loanRequest.user.userProfile.phone,
                nin: loanRequest.user.userProfile.nin,
                address: loanRequest.user.userProfile.address,
                position: loanRequest.user.userProfile.position
              }
            : null,
          business: loanRequest.user.businessProfile
            ? {
                name: loanRequest.user.businessProfile.name,
                location: loanRequest.user.businessProfile.location,
                industry: loanRequest.user.businessProfile.industry,
                yearsInOperation: loanRequest.user.businessProfile.yearsInOperation,
                weeklyRevenue: loanRequest.user.businessProfile.weeklyRevenue,
                weeklyExpenses: loanRequest.user.businessProfile.weeklyExpenses
              }
            : null
        }
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/loan-requests/:id/status", async (req, res, next) => {
  try {
    const payload = loanRequestStatusUpdateSchema.parse(req.body);
    const existing = await prisma.loanRequest.findFirst({
      where: buildVisibleLoanRequestWhere({ id: req.params.id }),
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: "Loan request not found" });
    }

    if (existing.status === payload.status) {
      return res.json({ loanRequest: existing });
    }

    const { loanRequest, createdLoan } = await prisma.$transaction(async (tx) => {
      let updatedLoanRequest = null;
      let nextLoan = null;

      if (payload.status === "APPROVED") {
        const created = await createLoanFromLoanRequest(tx, {
          loanRequestId: req.params.id,
          principal: Number(existing.amount),
          annualInterestRate: 18,
          termDays: 30
        });
        updatedLoanRequest = created.loanRequest;
        nextLoan = created.loan;
      } else {
        updatedLoanRequest = await tx.loanRequest.update({
          where: { id: req.params.id },
          data: { status: payload.status },
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        });
      }

      await createAuditLog(tx, {
        userId: req.user.id,
        action:
          payload.status === "APPROVED"
            ? AUDIT_ACTIONS.LOAN_REQUEST_APPROVED
            : AUDIT_ACTIONS.LOAN_REQUEST_REJECTED,
        entityType: AUDIT_ENTITY_TYPES.LOAN_REQUEST,
        entityId: updatedLoanRequest.id,
        performedBy: req.user.id,
        role: req.user.role,
        previousValue: {
          status: existing.status
        },
        newValue: {
          status: updatedLoanRequest.status
        },
        metadata: {
          applicantId: updatedLoanRequest.user.id,
          amount: updatedLoanRequest.amount,
          createdLoanId: nextLoan?.id || null
        },
        ...extractRequestAuditContext(req)
      });

      if (nextLoan) {
        await createAuditLog(tx, {
          userId: req.user.id,
          action: AUDIT_ACTIONS.LOAN_APPROVED_WITH_TERMS,
          entityType: AUDIT_ENTITY_TYPES.LOAN,
          entityId: nextLoan.id,
          performedBy: req.user.id,
          role: req.user.role,
          newValue: {
            principalAmount: Number(nextLoan.principalAmount || nextLoan.principal || 0),
            processingFee: Number(nextLoan.processingFee || 0),
            disbursedAmount: Number(nextLoan.disbursedAmount || 0),
            interestAmount: Number(nextLoan.interestAmount || 0),
            totalRepayableAmount: Number(nextLoan.totalRepayableAmount || 0),
            loanTerm: nextLoan.loanTerm || "1 month",
            annualInterestRate: Number(nextLoan.annualInterestRate || 0),
            termDays: Number(nextLoan.termMonths || 0),
            status: nextLoan.status
          },
          metadata: {
            applicantId: updatedLoanRequest.user.id,
            loanRequestId: updatedLoanRequest.id
          },
          ...extractRequestAuditContext(req)
        });
      }

      return {
        loanRequest: updatedLoanRequest,
        createdLoan: nextLoan
      };
    });

    if (createdLoan) {
      scheduleMonitoringCheck({
        event: "loan_created",
        loanId: createdLoan.id,
        userId: createdLoan.userId
      });
      queueGeoUpdate({
        type: "loan_created",
        loanId: createdLoan.id,
        userId: createdLoan.userId,
        region: createdLoan.region,
        district: createdLoan.district
      });
    }

    emitLoanStatusUpdated({
      userId: existing.user.id,
      loanRequestId: loanRequest.id,
      loanId: createdLoan?.id || null,
      status: loanRequest.status,
      message:
        loanRequest.status === "APPROVED"
          ? "Your loan has been approved."
          : "Your previous loan request was not approved. You may submit a new request."
    });

    return res.json({ loanRequest, loan: createdLoan || null });
  } catch (error) {
    return next(error);
  }
});

router.post("/applications/:id/status", async (req, res, next) => {
  try {
    const payload = adminStatusUpdateSchema.parse(req.body);
    const existing = await getApplicationWithNotificationContext(prisma, req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (existing.status === payload.status) {
      return res.json({ application: serializeApplication(existing) });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextApplication = {
        ...existing,
        status: payload.status
      };

      const application = await tx.loanApplication.update({
        where: { id: req.params.id },
        data: {
          status: payload.status,
          ...(isNotifiableStatus(payload.status)
            ? { decisionNotes: buildApplicationStatusMessage(nextApplication) }
            : {})
        },
        include: {
          business: true,
          riskScore: true,
          submittedBy: { select: { id: true, fullName: true, email: true, role: true } },
          fieldOfficer: { select: { id: true, fullName: true, email: true } },
          verificationReports: {
            include: {
              officer: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: "desc" }
          },
          loan: {
            include: {
              payments: { orderBy: { dueDate: "asc" } },
              repaymentSchedules: { orderBy: { dueDate: "asc" } }
            }
          }
        }
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
        entityType: AUDIT_ENTITY_TYPES.APPLICATION,
        entityId: application.id,
        performedBy: req.user.id,
        role: req.user.role,
        previousValue: {
          status: existing.status,
          decisionNotes: existing.decisionNotes
        },
        newValue: {
          status: payload.status,
          decisionNotes: application.decisionNotes
        },
        metadata: { source: application.source },
        ...extractRequestAuditContext(req)
      });

      return application;
    });

    await sendApplicationStatusNotification(prisma, updated, {
      triggeredByUserId: req.user.id,
      triggeredByRole: req.user.role,
      requestContext: extractRequestAuditContext(req)
    });

    return res.json({ application: serializeApplication(updated) });
  } catch (error) {
    return next(error);
  }
});

router.get("/applications/:id", async (req, res, next) => {
  try {
    const application = await getApplicationWithNotificationContext(prisma, req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ application: serializeApplication(application) });
  } catch (error) {
    return next(error);
  }
});

router.get("/applications/:id/documents/:bucket/:index", async (req, res, next) => {
  try {
    const application = await prisma.loanApplication.findUnique({
      where: { id: req.params.id },
      select: { documentPaths: true }
    });

    if (!application) {
      throw httpError(404, "Application not found");
    }

    const bucket = application.documentPaths?.[req.params.bucket];
    const entry = Array.isArray(bucket) ? bucket[Number(req.params.index)] : null;

    if (!entry?.storedName) {
      throw httpError(404, "Requested document not found");
    }

    const absolutePath = resolveStoredFile(entry.storedName);
    if (!fs.existsSync(absolutePath)) {
      throw httpError(404, "Stored file not found");
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return next(error);
  }
});

router.post("/decision", async (req, res, next) => {
  try {
    const payload = adminDecisionSchema.parse(req.body);
    const application = await prisma.loanApplication.findUnique({
      where: { id: payload.applicationId },
      include: {
        riskScore: true,
        business: true,
        submittedBy: { select: { id: true, fullName: true, email: true, role: true } }
      }
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    let nextStatus = application.status;
    if (payload.decision === "APPROVE") nextStatus = "APPROVED";
    if (payload.decision === "REJECT") nextStatus = "REJECTED";
    if (payload.decision === "SEND_TO_FIELD_VERIFICATION") nextStatus = "UNDER_REVIEW";

    const updated = await prisma.$transaction(async (tx) => {
      const nextApplication = {
        ...application,
        status: nextStatus
      };

      const applicationRecord = await tx.loanApplication.update({
        where: { id: payload.applicationId },
        data: {
          status: nextStatus,
          decisionNotes: isNotifiableStatus(nextStatus)
            ? buildApplicationStatusMessage(nextApplication, payload.notes)
            : payload.notes || null,
          ...(payload.fieldOfficerId ? { fieldOfficerId: payload.fieldOfficerId } : {})
        },
        include: {
          business: true,
          riskScore: true,
          submittedBy: { select: { id: true, fullName: true, email: true, role: true } },
          fieldOfficer: { select: { id: true, fullName: true, email: true } }
        }
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.APPLICATION_STATUS_CHANGED,
        entityType: AUDIT_ENTITY_TYPES.APPLICATION,
        entityId: applicationRecord.id,
        performedBy: req.user.id,
        role: req.user.role,
        previousValue: {
          status: application.status,
          decisionNotes: application.decisionNotes,
          fieldOfficerId: application.fieldOfficerId
        },
        newValue: {
          status: nextStatus,
          decisionNotes: applicationRecord.decisionNotes,
          fieldOfficerId: applicationRecord.fieldOfficer?.id || payload.fieldOfficerId || null
        },
        metadata: {
          decision: payload.decision,
          source: application.source
        },
        ...extractRequestAuditContext(req)
      });

      return applicationRecord;
    });

    if (application.status !== nextStatus) {
      await sendApplicationStatusNotification(prisma, updated, {
        triggeredByUserId: req.user.id,
        triggeredByRole: req.user.role,
        requestContext: extractRequestAuditContext(req)
      });
    }

    return res.json({
      application: serializeApplication(updated)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
