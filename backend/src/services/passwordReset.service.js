const crypto = require("crypto");
const prisma = require("../prisma");
const { createAuditLog } = require("./auditService");
const { AUDIT_ENTITY_TYPES } = require("./auditLog.service");
const { normalizeRole } = require("./backofficeAuth.service");

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const FORGOT_IP_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_IP_MAX = 5;
const FORGOT_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;
const FORGOT_ACCOUNT_MAX = 3;
const RESET_IP_WINDOW_MS = 15 * 60 * 1000;
const RESET_IP_MAX = 5;

const forgotByIp = new Map();
const forgotByAccount = new Map();
const resetAttemptsByIp = new Map();

function now() {
  return Date.now();
}

function trimIdentifier(identifier) {
  return String(identifier || "").trim();
}

function normalizeIdentifier(identifier) {
  return trimIdentifier(identifier).toLowerCase();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function maskIdentifier(identifier) {
  const value = trimIdentifier(identifier);
  if (!value) {
    return "";
  }

  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }

  if (value.length <= 4) {
    return `${value[0]}***`;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function pruneBucket(bucket, windowMs, reference = now()) {
  return bucket.filter((entry) => entry > reference - windowMs);
}

function recordRateLimitEvent(store, key, windowMs) {
  const next = pruneBucket(store.get(key) || [], windowMs);
  next.push(now());
  store.set(key, next);
  return next.length;
}

function getRateLimitCount(store, key, windowMs) {
  const next = pruneBucket(store.get(key) || [], windowMs);
  store.set(key, next);
  return next.length;
}

function ensureStrongPassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }
  if (!/[A-Za-z]/.test(value)) {
    const error = new Error("Password must include at least one letter");
    error.statusCode = 400;
    throw error;
  }
  if (!/[0-9]/.test(value)) {
    const error = new Error("Password must include at least one number");
    error.statusCode = 400;
    throw error;
  }
}

function getAccountTypeForRole(role) {
  return normalizeRole(role) === "APPLICANT" ? "USER" : "BACKOFFICE";
}

function getResetPortalForRole(role) {
  return normalizeRole(role) === "APPLICANT" ? "applicant" : "admin";
}

async function findAccountByIdentifier(prismaClient, identifier) {
  const rawIdentifier = trimIdentifier(identifier);
  const normalized = normalizeIdentifier(identifier);

  if (!rawIdentifier) {
    return null;
  }

  const directMatch = await prismaClient.user.findFirst({
    where: {
      OR: [
        { email: rawIdentifier },
        { email: normalized },
        { loginId: rawIdentifier },
        { loginId: normalized }
      ]
    },
    include: {
      userProfile: { select: { phone: true } },
      agentProfile: { select: { phoneNumber: true } },
      investorProfile: { select: { phone: true } }
    }
  });

  if (directMatch) {
    return directMatch;
  }

  return prismaClient.user.findFirst({
    where: {
      OR: [
        { userProfile: { is: { phone: rawIdentifier } } },
        { userProfile: { is: { phone: normalized } } },
        { agentProfile: { is: { phoneNumber: rawIdentifier } } },
        { investorProfile: { is: { phone: rawIdentifier } } }
      ]
    },
    include: {
      userProfile: { select: { phone: true } },
      agentProfile: { select: { phoneNumber: true } },
      investorProfile: { select: { phone: true } }
    }
  });
}

function getResetContact(account) {
  if (!account) {
    return null;
  }

  return account.email || account.userProfile?.phone || account.agentProfile?.phoneNumber || account.investorProfile?.phone || null;
}

function buildResetLink(token, role) {
  const portal = getResetPortalForRole(role);
  const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(token)}&portal=${portal}`;
}

async function logPasswordResetAudit(prismaClient, {
  account,
  action,
  metadata,
  requestContext = {},
  performedBy = null,
  role = null
}) {
  await createAuditLog(prismaClient, {
    userId: account?.id || undefined,
    action,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: account?.id || "UNKNOWN",
    performedBy: performedBy || account?.id || "SYSTEM",
    role: role || (account ? normalizeRole(account.role) : null),
    metadata,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent
  });
}

async function requestPasswordReset(prismaClient, identifier, requestContext = {}) {
  const ipKey = requestContext.ipAddress || "unknown";
  if (getRateLimitCount(forgotByIp, ipKey, FORGOT_IP_WINDOW_MS) >= FORGOT_IP_MAX) {
    const error = new Error("Too many password reset requests. Please try again later.");
    error.statusCode = 429;
    throw error;
  }

  recordRateLimitEvent(forgotByIp, ipKey, FORGOT_IP_WINDOW_MS);

  const maskedIdentifier = maskIdentifier(identifier);
  const account = await findAccountByIdentifier(prismaClient, identifier);

  if (!account) {
    return {
      message: "If an account matches the details provided, password reset instructions will be sent."
    };
  }

  const accountLimitKey = account.id;
  if (getRateLimitCount(forgotByAccount, accountLimitKey, FORGOT_ACCOUNT_WINDOW_MS) >= FORGOT_ACCOUNT_MAX) {
    return {
      message: "If an account matches the details provided, password reset instructions will be sent."
    };
  }

  recordRateLimitEvent(forgotByAccount, accountLimitKey, FORGOT_ACCOUNT_WINDOW_MS);

  await logPasswordResetAudit(prismaClient, {
    account,
    action: "PASSWORD_RESET_REQUESTED",
    metadata: {
      accountType: getAccountTypeForRole(account.role),
      maskedIdentifier
    },
    requestContext
  });

  if (!account.email) {
    return {
      message: "If an account matches the details provided, password reset instructions will be sent."
    };
  }

  const rawToken = generateResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prismaClient.passwordResetToken.updateMany({
    where: {
      accountId: account.id,
      accountType: getAccountTypeForRole(account.role),
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });

  await prismaClient.passwordResetToken.create({
    data: {
      accountType: getAccountTypeForRole(account.role),
      accountId: account.id,
      tokenHash,
      expiresAt,
      metadata: {
        role: normalizeRole(account.role)
      },
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null
    }
  });

  await logPasswordResetAudit(prismaClient, {
    account,
    action: "PASSWORD_RESET_TOKEN_CREATED",
    metadata: {
      accountType: getAccountTypeForRole(account.role),
      maskedIdentifier
    },
    requestContext
  });

  const resetLink = buildResetLink(rawToken, account.role);
  console.log(`[PASSWORD RESET] ${maskedIdentifier} -> ${resetLink}`);

  return {
    message: "If an account matches the details provided, password reset instructions will be sent."
  };
}

async function consumePasswordResetToken(prismaClient, token, newPassword, requestContext = {}) {
  ensureStrongPassword(newPassword);
  const tokenHash = hashToken(token);
  const ipKey = requestContext.ipAddress || "unknown";

  const resetRecord = await prismaClient.passwordResetToken.findFirst({
    where: {
      tokenHash
    },
    include: {
      account: true
    }
  });

  const isInvalid =
    !resetRecord ||
    resetRecord.usedAt ||
    resetRecord.expiresAt < new Date();

  if (isInvalid) {
    recordRateLimitEvent(resetAttemptsByIp, ipKey, RESET_IP_WINDOW_MS);
    await createAuditLog(prismaClient, {
      action: "PASSWORD_RESET_FAILED",
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: resetRecord?.accountId || "UNKNOWN",
      performedBy: "SYSTEM",
      role: null,
      metadata: {
        reason: !resetRecord ? "TOKEN_NOT_FOUND" : resetRecord.usedAt ? "TOKEN_USED" : "TOKEN_EXPIRED"
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent
    });

    if (getRateLimitCount(resetAttemptsByIp, ipKey, RESET_IP_WINDOW_MS) > RESET_IP_MAX) {
      const rateError = new Error("Too many invalid reset attempts. Please try again later.");
      rateError.statusCode = 429;
      throw rateError;
    }

    const error = new Error("Reset token is invalid or expired");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await require("bcryptjs").hash(newPassword, 10);
  await prismaClient.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetRecord.accountId },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    });

    await tx.passwordResetToken.updateMany({
      where: {
        accountId: resetRecord.accountId,
        usedAt: null,
        id: { not: resetRecord.id }
      },
      data: { usedAt: new Date() }
    });

    await logPasswordResetAudit(tx, {
      account: resetRecord.account,
      action: "PASSWORD_RESET_SUCCESS",
      metadata: {
        accountType: resetRecord.accountType
      },
      requestContext
    });
  });

  return {
    message: "Password reset successful"
  };
}

async function changePassword(prismaClient, account, currentPassword, newPassword, requestContext = {}) {
  const bcrypt = require("bcryptjs");
  ensureStrongPassword(newPassword);

  const current = await prismaClient.user.findUnique({
    where: { id: account.id }
  });

  if (!current || !(await bcrypt.compare(currentPassword, current.passwordHash))) {
    await logPasswordResetAudit(prismaClient, {
      account: current || account,
      action: "PASSWORD_RESET_FAILED",
      metadata: { reason: "CURRENT_PASSWORD_MISMATCH" },
      requestContext,
      performedBy: account.id
    });
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prismaClient.user.update({
    where: { id: account.id },
    data: {
      passwordHash,
      mustChangePassword: false
    }
  });

  await logPasswordResetAudit(prismaClient, {
    account: updated,
    action: current.mustChangePassword
      ? "PASSWORD_CHANGED_AFTER_TEMP_RESET"
      : "PASSWORD_RESET_SUCCESS",
    metadata: {
      accountType: getAccountTypeForRole(updated.role)
    },
    requestContext,
    performedBy: updated.id
  });

  return updated;
}

async function manualPasswordReset(prismaClient, actor, payload, requestContext = {}) {
  const bcrypt = require("bcryptjs");
  ensureStrongPassword(payload.newTemporaryPassword);

  let user = null;

  if (payload.accountType === "USER" || payload.accountType === "BACKOFFICE") {
    user = await prismaClient.user.findUnique({
      where: { id: payload.accountId }
    });
  } else if (payload.accountType === "AGENT") {
    const agent = await prismaClient.agent.findUnique({
      where: { id: payload.accountId },
      include: { user: true }
    });
    user = agent?.user || null;
  } else if (payload.accountType === "INVESTOR") {
    const investor = await prismaClient.investor.findUnique({
      where: { id: payload.accountId },
      include: { user: true }
    });
    user = investor?.user || null;
  }

  if (!user) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  const passwordHash = await bcrypt.hash(payload.newTemporaryPassword, 10);
  const updated = await prismaClient.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: true
    }
  });

  await prismaClient.passwordResetToken.updateMany({
    where: {
      accountId: updated.id,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });

  await logPasswordResetAudit(prismaClient, {
    account: updated,
    action: "MANUAL_PASSWORD_RESET_BY_SUPER_ADMIN",
    metadata: {
      accountType: payload.accountType,
      reason: payload.reason
    },
    requestContext,
    performedBy: actor.id,
    role: actor.role
  });

  return updated;
}

module.exports = {
  RESET_TOKEN_TTL_MS,
  changePassword,
  consumePasswordResetToken,
  ensureStrongPassword,
  findAccountByIdentifier,
  getAccountTypeForRole,
  manualPasswordReset,
  maskIdentifier,
  requestPasswordReset
};
