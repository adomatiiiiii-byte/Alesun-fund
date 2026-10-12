const { logAction } = require("./auditLog.service");

async function createAuditLog(prismaClient, {
  userId,
  action,
  entityType,
  entityId,
  metadata,
  previousValue,
  newValue,
  performedBy,
  role,
  ipAddress,
  userAgent
}) {
  return logAction(prismaClient, {
    userId,
    action,
    entityType,
    entityId,
    metadata,
    previousValue,
    newValue,
    performedBy: performedBy || userId || "SYSTEM",
    role,
    ipAddress,
    userAgent
  });
}

module.exports = { createAuditLog };
