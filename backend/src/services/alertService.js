const prisma = require("../prisma");
const { emitSystemAlert } = require("./dashboardRealtime.service");

function normalizeSeverity(severity = "INFO") {
  const upper = String(severity || "INFO").toUpperCase();
  if (["INFO", "WARNING", "CRITICAL"].includes(upper)) {
    return upper;
  }
  return "INFO";
}

async function sendAlert(type, severity, message, metadata = {}, prismaClient = prisma) {
  const normalizedSeverity = normalizeSeverity(severity);

  if (!prismaClient?.systemAlert?.create) {
    if (normalizedSeverity === "CRITICAL") {
      console.error(`[SYSTEM ALERT:${normalizedSeverity}] ${type} - ${message}`, metadata);
    } else {
      console.warn(`[SYSTEM ALERT:${normalizedSeverity}] ${type} - ${message}`, metadata);
    }
    return null;
  }

  const created = await prismaClient.systemAlert.create({
    data: {
      type,
      severity: normalizedSeverity,
      message,
      metadata,
      resolved: false
    }
  });

  const prefix = `[SYSTEM ALERT:${normalizedSeverity}]`;
  if (normalizedSeverity === "CRITICAL") {
    console.error(`${prefix} ${type} - ${message}`, metadata);
    console.error("Financial inconsistency detected. Immediate review required.");
  } else {
    console.warn(`${prefix} ${type} - ${message}`, metadata);
  }

  emitSystemAlert({
    alertId: created.id,
    severity: normalizedSeverity,
    message,
    metadata: {
      type,
      ...metadata
    }
  });

  return created;
}

async function getActiveAlerts(prismaClient = prisma, { severity, limit = 20 } = {}) {
  if (!prismaClient?.systemAlert?.findMany) {
    return [];
  }

  return prismaClient.systemAlert.findMany({
    where: {
      resolved: false,
      ...(severity ? { severity: normalizeSeverity(severity) } : {})
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

module.exports = {
  getActiveAlerts,
  sendAlert
};
