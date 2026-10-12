const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { loanCreateSchema, paymentSchema } = require("../validators");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");
const {
  allocateRepaymentAmount,
  determineLoanLifecycle,
  generateRepaymentSchedule,
  summarizeLoanPerformance
} = require("../services/loanService");
const { calculateTransparentLoanPricing } = require("../services/loanPricing.service");
const { ensureApplicationForLoanRequest, createLoanFromLoanRequest } = require("../services/loanRequest.service");
const { processAgentRewardsForRepayment, getAssignedAgentGeoContext } = require("../services/agent.service");
const { buildLoanGeoSnapshot } = require("../services/geography.service");
const { updateUserScoreAndLimit } = require("../services/creditScore.service");
const { scheduleMonitoringCheck } = require("../services/monitoringService");
const { emitLoanStatusUpdated, emitPaymentUpdate } = require("../services/dashboardRealtime.service");
const { queueGeoUpdate } = require("../services/geoRealtime.service");

const router = express.Router();

router.use(authenticate);

function getRepaymentEntries(loan) {
  if (loan?.repaymentSchedules?.length) {
    return loan.repaymentSchedules;
  }

  return loan?.payments || [];
}

router.get("/", async (_req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        application: { include: { business: true, riskScore: true } },
        repaymentSchedules: { orderBy: { dueDate: "asc" } },
        payments: { orderBy: { dueDate: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    const enriched = loans.map((loan) => ({
      ...loan,
      payments: getRepaymentEntries(loan),
      performance: summarizeLoanPerformance(getRepaymentEntries(loan))
    }));

    return res.json({ loans: enriched });
  } catch (error) {
    return next(error);
  }
});

router.post("/", authorize("SUPER_ADMIN", "RISK_ADMIN"), async (req, res, next) => {
  try {
    const payload = loanCreateSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let application = null;
      let loan = null;
      const pricing = calculateTransparentLoanPricing(payload.principal);
      if (payload.applicationId) {
        application = await tx.loanApplication.findUnique({
            where: { id: payload.applicationId },
            include: { riskScore: true }
          });
      } else {
        const created = await createLoanFromLoanRequest(tx, {
          loanRequestId: payload.loanRequestId,
          principal: payload.principal,
          annualInterestRate: payload.annualInterestRate,
          termDays: payload.termDays
        });
        application = created.application;
        loan = created.loan;
      }

      if (!application) {
        const error = new Error("Application not found");
        error.statusCode = 404;
        throw error;
      }

      if (!loan) {
        if (!application.riskScore) {
          const error = new Error("No loan should be approved without a risk score");
          error.statusCode = 400;
          throw error;
        }

        if (application.status !== "APPROVED") {
          const error = new Error("Application must be approved by an administrator before creating a loan");
          error.statusCode = 400;
          throw error;
        }

        const existingLoan = await tx.loan.findUnique({
          where: { applicationId: application.id }
        });
        if (existingLoan) {
          const error = new Error("Application already has a loan");
          error.statusCode = 400;
          throw error;
        }

        const geoContext = application.submittedById
          ? await getAssignedAgentGeoContext(tx, application.submittedById)
          : null;

        if (!geoContext?.agent) {
          const error = new Error("Borrower must be assigned to an agent with a verified Uganda location before a loan can be created");
          error.statusCode = 400;
          throw error;
        }

        const loanLocation = {
          country: geoContext.userLocation.country,
          region: geoContext.userLocation.region,
          subregion: geoContext.userLocation.subregion,
          district: geoContext.userLocation.district,
          administrativeUnit: geoContext.userLocation.administrativeUnit,
          subUnit: geoContext.userLocation.subUnit,
          county: geoContext.userLocation.subregion,
          subcounty: geoContext.userLocation.subcounty || geoContext.userLocation.subUnit
        };

        loan = await tx.loan.create({
          data: {
            applicationId: application.id,
            userId: application.submittedById || null,
            agentId: geoContext.agent.id,
            country: loanLocation.country,
            region: loanLocation.region,
            subregion: loanLocation.subregion,
            district: loanLocation.district,
            administrativeUnit: loanLocation.administrativeUnit,
            subUnit: loanLocation.subUnit,
            county: loanLocation.subregion,
            subcounty: loanLocation.subcounty,
            geoSnapshot: buildLoanGeoSnapshot({
              userLocation: geoContext.userLocation,
              agentLocation: {
                country: geoContext.agent.country,
                region: geoContext.agent.region,
                subregion: geoContext.agent.subregion,
                district: geoContext.agent.district,
                administrativeUnit: geoContext.agent.administrativeUnit,
                subUnit: geoContext.agent.subUnit,
                county: geoContext.agent.subregion,
                subcounty: geoContext.agent.subcounty
              },
              loanLocation
            }),
            principal: pricing.principalAmount,
            principalAmount: pricing.principalAmount,
            processingFee: pricing.processingFee,
            disbursedAmount: pricing.disbursedAmount,
            interestAmount: pricing.interestAmount,
            totalRepayableAmount: pricing.totalRepayableAmount,
            loanTerm: pricing.loanTerm,
            remainingBalance: pricing.totalRepayableAmount,
            annualInterestRate: pricing.annualInterestRate,
            termMonths: pricing.termDays,
            status: "ACTIVE"
          }
        });

        if (application.submittedById) {
          await tx.user.update({
            where: { id: application.submittedById },
            data: {
              totalLoansTaken: {
                increment: 1
              }
            }
          });
        }
      }

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.LOAN_APPROVED_WITH_TERMS,
        entityType: AUDIT_ENTITY_TYPES.LOAN,
        entityId: loan.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          applicationId: application.id,
          principalAmount: Number(loan.principalAmount || loan.principal),
          processingFee: Number(loan.processingFee || 0),
          disbursedAmount: Number(loan.disbursedAmount || 0),
          interestAmount: Number(loan.interestAmount || 0),
          totalRepayableAmount: Number(loan.totalRepayableAmount || loan.remainingBalance || 0),
          annualInterestRate: Number(loan.annualInterestRate || 0),
          loanTerm: loan.loanTerm || "1 month",
          termDays: loan.termMonths,
          status: "ACTIVE"
        },
        metadata: { applicationId: application.id, loanRequestId: payload.loanRequestId || null },
        ...extractRequestAuditContext(req)
      });

      return loan;
    });

    scheduleMonitoringCheck({
      event: "loan_created",
      loanId: result.id,
      userId: result.userId
    });
    queueGeoUpdate({
      type: "loan_created",
      loanId: result.id,
      userId: result.userId,
      region: result.region,
      district: result.district
    });

    return res.status(201).json({ loan: result });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/disburse", authorize("SUPER_ADMIN", "FINANCE_ADMIN"), async (req, res, next) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const disbursedAt = new Date();
    const schedule = generateRepaymentSchedule({
      totalRepayableAmount: Number(loan.totalRepayableAmount || loan.remainingBalance || loan.principal),
      termDays: loan.termMonths,
      disbursedAt
    });
    const totalRepayable = schedule.reduce(
      (sum, payment) => sum + Number(payment.expectedAmount || 0),
      0
    );

    const updated = await prisma.$transaction(async (tx) => {
      const dueDate = schedule.length ? schedule[schedule.length - 1].dueDate : null;
      const disbursedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: "ACTIVE",
          remainingBalance: Number(loan.totalRepayableAmount || totalRepayable),
          disbursedAt,
          startDate: disbursedAt,
          dueDate
        }
      });

      await tx.repaymentSchedule.createMany({
        data: schedule.map((payment) => ({
          loanId: loan.id,
          dueDate: payment.dueDate,
          expectedAmount: payment.expectedAmount,
          paidAmount: payment.paidAmount,
          status: payment.status
        }))
      });

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.LOAN_DISBURSED,
        entityType: AUDIT_ENTITY_TYPES.LOAN,
        entityId: loan.id,
        performedBy: req.user.id,
        role: req.user.role,
        previousValue: {
          status: loan.status,
          disbursedAt: loan.disbursedAt,
          startDate: loan.startDate,
          dueDate: loan.dueDate
        },
        newValue: {
          status: "ACTIVE",
          disbursedAt,
          startDate: disbursedAt,
          dueDate,
          disbursedAmount: Number(loan.disbursedAmount || 0),
          totalRepayableAmount: Number(loan.totalRepayableAmount || totalRepayable)
        },
        metadata: { generatedInstallments: schedule.length },
        ...extractRequestAuditContext(req)
      });

      return disbursedLoan;
    });

    queueGeoUpdate({
      type: "loan_disbursed",
      loanId: updated.id,
      userId: updated.userId,
      region: updated.region,
      district: updated.district
    });
    emitLoanStatusUpdated({
      userId: updated.userId,
      loanId: updated.id,
      status: updated.status,
      message: "Your approved loan has been disbursed and your repayment plan is now active."
    });

    return res.json({ loan: updated });
  } catch (error) {
    return next(error);
  }
});

async function handleLoanRepayment(req, res, next) {
  try {
    const payload = paymentSchema.parse(req.body);
    const paymentDate = payload.paymentDate ? new Date(payload.paymentDate) : new Date();

    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
      include: {
        repaymentSchedules: {
          where: { status: { not: "PAID" } },
          orderBy: { dueDate: "asc" }
        },
        payments: {
          where: { status: { in: ["PENDING", "LATE", "DEFAULTED"] } },
          orderBy: { dueDate: "asc" }
        },
        user: {
          select: { id: true }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    if (payload.amount > Number(loan.remainingBalance || 0)) {
      return res.status(400).json({ message: "Payment exceeds remaining loan balance" });
    }

    const schedulesToAllocate = loan.repaymentSchedules.length ? loan.repaymentSchedules : loan.payments;

    if (!loan.repaymentSchedules.length) {
      return res.status(400).json({ message: "Loan has no outstanding installments" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.loanRepayment.create({
        data: {
          loanId: loan.id,
          agentId: loan.agentId,
          country: loan.country,
          region: loan.region,
          subregion: loan.subregion,
          district: loan.district,
          amount: payload.amount,
          createdAt: paymentDate
        }
      });

      const allocationResult = allocateRepaymentAmount(schedulesToAllocate, payload.amount);
      if (allocationResult.remainingPayment > 0) {
        const error = new Error("Payment allocation did not match outstanding schedules");
        error.statusCode = 400;
        throw error;
      }

      await Promise.all(
        allocationResult.updatedSchedules.map((schedule) =>
          tx.repaymentSchedule.update({
            where: { id: schedule.id },
            data: {
              paidAmount: schedule.paidAmount,
              status: schedule.status
            }
          })
        )
      );

      await tx.paymentAllocation.createMany({
        data: allocationResult.allocations.map((allocation) => ({
          repaymentId: paymentRecord.id,
          scheduleId: allocation.scheduleId,
          amountAllocated: allocation.amountAllocated
        }))
      });

      const allSchedules = await tx.repaymentSchedule.findMany({
        where: { loanId: loan.id },
        orderBy: { dueDate: "asc" }
      });
      const lifecycle = determineLoanLifecycle(allSchedules, paymentDate);
      const nextRemainingBalance = Math.max(
        0,
        Number((Number(loan.remainingBalance || 0) - Number(payload.amount)).toFixed(2))
      );

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          remainingBalance: nextRemainingBalance,
          status: nextRemainingBalance === 0 ? "COMPLETED" : lifecycle.status,
          fullyPaid: nextRemainingBalance === 0 ? true : lifecycle.fullyPaid,
          daysLate: lifecycle.daysLate,
          dueDate: allSchedules.length
            ? allSchedules[allSchedules.length - 1].dueDate
            : loan.dueDate
        }
      });

      let scoreUpdate = null;
      if (
        loan.userId &&
        loan.status !== updatedLoan.status &&
        ["COMPLETED", "DEFAULTED"].includes(updatedLoan.status)
      ) {
        scoreUpdate = await updateUserScoreAndLimit(tx, loan.userId, {
          loanId: loan.id,
          performedBy: req.user.id,
          role: req.user.role,
          ...extractRequestAuditContext(req)
        });
      }

      const agentResult = await processAgentRewardsForRepayment(tx, loan, updatedLoan, payload.amount);

      await createAuditLog(tx, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
        entityType: AUDIT_ENTITY_TYPES.PAYMENT,
        entityId: paymentRecord.id,
        performedBy: req.user.id,
        role: req.user.role,
        newValue: {
          amount: payload.amount,
          createdAt: paymentDate,
          remainingBalance: nextRemainingBalance
        },
        metadata: {
          loanId: loan.id,
          allocations: allocationResult.allocations,
          agentRewardEvents: agentResult?.events?.map((event) => ({
            id: event.id,
            type: event.type,
            amount: event.amount
          })) || []
        },
        ...extractRequestAuditContext(req)
      });

      return {
        payment: paymentRecord,
        allocations: allocationResult.allocations,
        loan: updatedLoan,
        scoreUpdate,
        agentRewards: agentResult?.events || []
      };
    });

    scheduleMonitoringCheck({
      event: "repayment_processed",
      loanId: loan.id,
      userId: loan.userId,
      repaymentId: result.payment.id,
      remainingBalanceBeforePayment: Number(loan.remainingBalance || 0)
    });
    queueGeoUpdate({
      type: "repayment_processed",
      loanId: loan.id,
      userId: loan.userId,
      repaymentId: result.payment.id,
      region: loan.region,
      district: loan.district
    });
    emitPaymentUpdate({
      userId: loan.userId,
      loanId: loan.id,
      repaymentId: result.payment.id,
      remainingBalance: Number(result.loan.remainingBalance || 0),
      updatedSchedule: result.allocations
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

router.post("/:id/payments", authorize("SUPER_ADMIN", "FINANCE_ADMIN"), handleLoanRepayment);
router.post("/:id/repay", authorize("SUPER_ADMIN", "FINANCE_ADMIN"), handleLoanRepayment);

module.exports = router;
