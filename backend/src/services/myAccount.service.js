const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require("./auditLog.service");
const { buildLoanEligibility, getApplicantApplications } = require("./loanEligibility.service");
const {
  DEFAULT_BORROWER_SCORE
} = require("./creditScore.service");

function asNumber(value) {
  return Number(value || 0);
}

function getLatestApplication(applications) {
  return applications[0] || null;
}

function getActiveApplication(applications) {
  return (
    applications.find(
      (application) =>
        application.loan && application.loan.status === "ACTIVE"
    ) || null
  );
}

function getEvaluatedPayments(loan) {
  if (!loan) {
    return [];
  }

  const { evaluatePaymentStatus } = require("./loanService");
  const sourcePayments = loan.repaymentSchedules?.length
    ? loan.repaymentSchedules
    : (loan.payments || []);

  return sourcePayments.map((payment) => ({
    ...payment,
    ...evaluatePaymentStatus(payment)
  }));
}

function getNextPendingPayment(payments) {
  return payments.find((payment) => payment.status !== "PAID") || null;
}

function getBorrowerStatus(payments) {
  if (!payments.length) {
    return {
      code: "NO_ACTIVE_LOAN",
      label: "No active loan"
    };
  }

  const overduePayment = payments.find((payment) => payment.isOverdue);
  if (overduePayment) {
    return {
      code: "LATE",
      label: "Late"
    };
  }

  const nextPayment = getNextPendingPayment(payments);
  if (!nextPayment) {
    return {
      code: "ON_TRACK",
      label: "On track"
    };
  }

  const now = new Date();
  const dueDate = new Date(nextPayment.dueDate);
  const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 3) {
    return {
      code: "DUE_SOON",
      label: "Due soon"
    };
  }

  return {
    code: "ON_TRACK",
    label: "On track"
  };
}

function getLoanTotals(loan, payments) {
  if (!loan) {
    return {
      totalScheduled: 0,
      totalPaid: 0,
      remainingBalance: 0,
      progressPercent: 0
    };
  }

  const totalScheduled = payments.reduce((sum, payment) => sum + asNumber(payment.expectedAmount), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + asNumber(payment.paidAmount), 0);
  const remainingBalance = Math.max(
    0,
    Number((asNumber(loan.remainingBalance) || (totalScheduled - totalPaid)).toFixed(2))
  );
  const progressPercent = totalScheduled
    ? Math.min(100, Math.max(0, Math.round((totalPaid / totalScheduled) * 100)))
    : 0;

  return {
    totalScheduled,
    totalPaid,
    remainingBalance,
    progressPercent
  };
}

function buildBorrowerScore(user, applications) {
  const score = Number.isFinite(Number(user?.score))
    ? Number(user.score)
    : DEFAULT_BORROWER_SCORE;
  const positiveFactors = [];
  const negativeFactors = [];

  if ((user?.totalLoansCompleted || 0) > 0) {
    positiveFactors.push("Completed loan history");
  }
  if (user?.lastLoanStatus === "PERFECT") {
    positiveFactors.push("Last loan was repaid on time");
  }
  if (applications.length > 0) {
    positiveFactors.push("Consistent borrowing activity");
  }
  if (user?.lastLoanStatus === "LATE") {
    negativeFactors.push("Late repayment on the last completed loan");
  }
  if (user?.lastLoanStatus === "DEFAULT") {
    negativeFactors.push("Previous default reduced your borrowing power");
  }

  return {
    score,
    label: score >= 75 ? "Good" : score >= 55 ? "Average" : "Needs Improvement",
    positiveFactors,
    negativeFactors
  };
}

function buildRepaymentHistory(payments) {
  return payments.map((payment) => ({
    id: payment.id,
    dueDate: payment.dueDate,
    expectedAmount: asNumber(payment.expectedAmount),
    paidAmount: asNumber(payment.paidAmount),
    remainingAmount: Math.max(0, asNumber(payment.expectedAmount) - asNumber(payment.paidAmount)),
    date: payment.dueDate,
    amount: asNumber(payment.paidAmount) || asNumber(payment.expectedAmount),
    status: payment.status
  }));
}

function buildDocuments(application) {
  if (!application) {
    return {
      businessInfo: null,
      files: []
    };
  }

  const documents = application.documentPaths || {};
  const files = [];
  const singleFiles = [
    ["passportPhoto", "Passport photo"],
    ["idFrontImage", "ID front side"],
    ["idBackImage", "ID back side"]
  ];
  const multiFiles = [
    ["financialRecords", "Financial record"],
    ["businessPhotos", "Business photo"]
  ];

  singleFiles.forEach(([key, label]) => {
    const item = documents[key];
    if (item) {
      files.push({
        id: `${key}-0`,
        label,
        field: key,
        index: 0,
        fileName: item.originalName || item.storedName || label
      });
    }
  });

  multiFiles.forEach(([key, label]) => {
    (documents[key] || []).forEach((item, index) => {
      files.push({
        id: `${key}-${index}`,
        label: `${label} ${index + 1}`,
        field: key,
        index,
        fileName: item.originalName || item.storedName || `${label} ${index + 1}`
      });
    });
  });

  return {
    businessInfo: {
      businessName: application.business.name,
      industry: application.business.industry,
      location: application.business.location,
      ownerName: application.business.ownerName,
      ownerPhone: application.business.ownerPhone
    },
    files
  };
}

function buildApplicationHistory(applications) {
  return applications.map((application) => ({
    id: application.id,
    businessName: application.business.name,
    submittedAt: application.submittedAt,
    status: application.status,
    amount: asNumber(application.loanRequestAmount)
  }));
}

function buildMessages(messageLogs) {
  return messageLogs.map((entry) => ({
    id: entry.id,
    senderRole: entry.role || entry.metadata?.senderRole || "SYSTEM",
    senderName: entry.metadata?.senderName || (entry.role === "APPLICANT" ? "You" : "Alesun Fund"),
    body: entry.metadata?.body || "",
    createdAt: entry.timestamp || entry.createdAt,
    applicationId: entry.metadata?.applicationId || null,
    attachments: Array.isArray(entry.metadata?.attachments) ? entry.metadata.attachments : []
  }));
}

function buildNotifications(applications, notificationLogs, activeLoanPayments) {
  const notifications = [];

  applications.forEach((application) => {
    notifications.push({
      id: `application-${application.id}`,
      type: "APPLICATION_UPDATE",
      title: `${application.business.name} application update`,
      body: application.decisionNotes || `Application status: ${application.status.replaceAll("_", " ")}`,
      createdAt: application.updatedAt || application.submittedAt
    });
  });

  notificationLogs.forEach((entry) => {
    notifications.push({
      id: entry.id,
      type: "SYSTEM_MESSAGE",
      title: "Application notification",
      body: entry.metadata?.message || entry.newValue?.message || "Alesun Fund sent you an update.",
      createdAt: entry.timestamp || entry.createdAt
    });
  });

  const nextPayment = getNextPendingPayment(activeLoanPayments);
  if (nextPayment) {
    const reminderType = ["LATE", "DEFAULTED"].includes(nextPayment.status)
      ? "PAYMENT_OVERDUE"
      : "PAYMENT_REMINDER";
    notifications.push({
      id: `payment-${nextPayment.id}`,
      type: reminderType,
      title: reminderType === "PAYMENT_OVERDUE" ? "Payment overdue" : "Payment due soon",
      body:
        reminderType === "PAYMENT_OVERDUE"
          ? "Your next loan installment is overdue. Please pay as soon as possible."
          : "Your next loan installment is approaching. Please prepare your repayment.",
      createdAt: nextPayment.dueDate
    });
  }

  return notifications
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 12);
}

async function buildMyAccount(prismaClient, userId) {
  const [applications, user] = await Promise.all([
    getApplicantApplications(prismaClient, userId),
    prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        score: true,
        maxLoanLimit: true,
        totalLoansTaken: true,
        totalLoansCompleted: true,
        lastLoanStatus: true
      }
    })
  ]);

  const applicationIds = applications.map((application) => application.id);
  const [messageLogs, notificationLogs] = await Promise.all([
    prismaClient.auditLog.findMany({
      where: {
        entityType: AUDIT_ENTITY_TYPES.MESSAGE,
        entityId: userId
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    applicationIds.length
      ? prismaClient.auditLog.findMany({
          where: {
            entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
            entityId: { in: applicationIds },
            action: AUDIT_ACTIONS.NOTIFICATION_SENT
          },
          orderBy: { createdAt: "desc" },
          take: 25
        })
      : Promise.resolve([])
  ]);

  const activeApplication = getActiveApplication(applications);
  const activeLoan = activeApplication?.loan || null;
  const activeLoanPayments = getEvaluatedPayments(activeLoan);
  const loanTotals = getLoanTotals(activeLoan, activeLoanPayments);
  const borrowerStatus = getBorrowerStatus(activeLoanPayments);
  const nextPayment = getNextPendingPayment(activeLoanPayments);
  const borrowerScore = buildBorrowerScore(user, applications);
  const eligibilitySummary = await buildLoanEligibility(prismaClient, userId);
  const eligibility = eligibilitySummary.eligible
    ? {
        eligible: true,
        statusText: "Eligible for next loan",
        eligibleLoanAmount: eligibilitySummary.maxLoanLimit
      }
    : {
        eligible: false,
        statusText: "Improve repayment to qualify",
        message: eligibilitySummary.reasons[0] || "Maintain good repayment to unlock higher funding",
        reasons: eligibilitySummary.reasons
      };
  const latestApplication = getLatestApplication(applications);

  return {
    summary: {
      activeLoanAmount: activeLoan ? asNumber(activeLoan.principalAmount || activeLoan.principal) : 0,
      nextPaymentDue: nextPayment
        ? {
            amount: Math.max(0, asNumber(nextPayment.expectedAmount) - asNumber(nextPayment.paidAmount)),
            date: nextPayment.dueDate
          }
        : null,
      statusBadge: borrowerStatus.code,
      statusLabel: borrowerStatus.label,
      eligibilityStatus: eligibility.statusText
    },
    activeLoan: activeLoan
      ? {
          id: activeLoan.id,
          principalAmount: asNumber(activeLoan.principalAmount || activeLoan.principal),
          processingFee: asNumber(activeLoan.processingFee),
          disbursedAmount: asNumber(activeLoan.disbursedAmount),
          interestAmount: asNumber(activeLoan.interestAmount),
          totalRepayableAmount: asNumber(activeLoan.totalRepayableAmount || loanTotals.totalScheduled),
          loanTerm: activeLoan.loanTerm || "1 month",
          interestRate: asNumber(activeLoan.annualInterestRate),
          startDate: activeLoan.disbursedAt || activeLoan.createdAt,
          dueDate: activeLoan.dueDate,
          totalPaid: loanTotals.totalPaid,
          remainingBalance: loanTotals.remainingBalance,
          progressPercent: loanTotals.progressPercent
        }
      : null,
    repayments: {
      upcomingPayment: nextPayment
        ? {
            amount: Math.max(0, asNumber(nextPayment.expectedAmount) - asNumber(nextPayment.paidAmount)),
            dueDate: nextPayment.dueDate,
            instructions: "Pay through your usual Alesun Fund collection channel and keep your payment proof."
          }
        : null
    },
    repaymentHistory: buildRepaymentHistory(activeLoanPayments),
    borrowerScore,
    eligibility,
    documents: buildDocuments(latestApplication),
    messages: buildMessages(messageLogs),
    notifications: buildNotifications(applications, notificationLogs, activeLoanPayments),
    applications: buildApplicationHistory(applications)
  };
}

module.exports = {
  buildMyAccount
};
