const { createAuditLog } = require("./auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} = require("./auditLog.service");

const STATUS_TEMPLATES = {
  APPROVED: ({ name }) =>
    `Dear ${name}, your loan application with Alesun Fund has been approved. Our team will contact you shortly with next steps.`,
  REJECTED: ({ name }) =>
    `Dear ${name}, we regret to inform you that your loan application was not approved at this time. You may reapply in the future.`,
  UNDER_REVIEW: ({ name }) =>
    `Dear ${name}, your loan application is currently under review. We may contact you for additional information.`
};

function isNotifiableStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_TEMPLATES, status);
}

function getApplicantName(application) {
  return (
    application.applicantName ||
    application.submittedBy?.fullName ||
    application.business?.ownerName ||
    "Applicant"
  );
}

function getNotificationRecipient(application) {
  return {
    name: getApplicantName(application),
    phoneNumber: application.phoneNumber || application.business?.ownerPhone || null,
    email: application.email || application.submittedBy?.email || null
  };
}

function buildApplicationStatusMessage(application, extraNote) {
  const template = STATUS_TEMPLATES[application.status];
  if (!template) {
    return null;
  }

  const recipient = getNotificationRecipient(application);
  const baseMessage = template({ name: recipient.name });
  if (!extraNote?.trim()) {
    return baseMessage;
  }

  return `${baseMessage}\n\nAdditional note from Alesun Fund:\n${extraNote.trim()}`;
}

async function sendApplicationStatusNotification(prismaClient, application, options = {}) {
  const { triggeredByUserId = null, triggeredByRole = null, requestContext = {} } = options;

  if (!isNotifiableStatus(application.status)) {
    return { sent: false, reason: "unsupported_status" };
  }

  const priorLogs = await prismaClient.auditLog.findMany({
    where: {
      action: AUDIT_ACTIONS.NOTIFICATION_SENT,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      entityId: application.id
    },
    select: {
      metadata: true
    }
  });

  if (priorLogs.some((entry) => entry.metadata?.status === application.status)) {
    return { sent: false, reason: "duplicate_status" };
  }

  const recipient = getNotificationRecipient(application);
  const message = buildApplicationStatusMessage(application);

  try {
    console.log(
      `[APPLICATION STATUS NOTIFICATION] status=${application.status} applicationId=${application.id} recipient=${recipient.email || recipient.phoneNumber || recipient.name} message="${message}"`
    );

    await createAuditLog(prismaClient, {
      userId: triggeredByUserId,
      action: AUDIT_ACTIONS.NOTIFICATION_SENT,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
      entityId: application.id,
      performedBy: triggeredByUserId || "SYSTEM",
      role: triggeredByRole || null,
      metadata: {
        status: application.status,
        applicantName: recipient.name,
        phoneNumber: recipient.phoneNumber,
        email: recipient.email,
        channel: "console",
        notificationType: "APPLICATION_STATUS"
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent
    });

    return { sent: true, message, recipient };
  } catch (error) {
    console.error(
      `[APPLICATION STATUS NOTIFICATION FAILED] applicationId=${application.id} status=${application.status}`,
      error
    );

    try {
      await createAuditLog(prismaClient, {
        userId: triggeredByUserId,
        action: "NOTIFICATION_FAILED",
        entityType: AUDIT_ENTITY_TYPES.NOTIFICATION,
        entityId: application.id,
        performedBy: triggeredByUserId || "SYSTEM",
        role: triggeredByRole || null,
        metadata: {
          status: application.status,
          message: error.message
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent
      });
    } catch (_auditError) {
      // Avoid crashing the request path if audit logging also fails.
    }

    return { sent: false, reason: "delivery_failed", error: error.message };
  }
}

module.exports = {
  buildApplicationStatusMessage,
  isNotifiableStatus,
  sendApplicationStatusNotification
};
