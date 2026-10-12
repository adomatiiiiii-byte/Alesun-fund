const path = require("path");
const { createRequire } = require("module");

const backendPackageJson = path.resolve(__dirname, "../../backend/package.json");
const backendRequire = createRequire(backendPackageJson);

const dotenv = backendRequire("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

const axios = backendRequire("axios");
const bcrypt = backendRequire("bcryptjs");
const { faker } = backendRequire("@faker-js/faker");
const { PrismaClient } = backendRequire("@prisma/client");

const DEFAULT_GEOGRAPHY = {
  country: "Uganda",
  region: "Central",
  subregion: "Buganda North",
  district: "Luwero",
  administrativeUnit: "Bamunanika County",
  subUnit: "Bamunanika Subcounty",
  county: "Bamunanika County",
  subcounty: "Bamunanika Subcounty",
  village: "Kazo"
};

function resolveConfig(overrides = {}) {
  const baseUrl = overrides.baseUrl || process.env.STRESS_TEST_BASE_URL || "http://localhost:4001";
  const databaseUrl = overrides.databaseUrl || process.env.STRESS_TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  const userCount = Number(overrides.userCount || process.env.STRESS_TEST_USER_COUNT || 50);
  const repaymentConcurrency = Number(overrides.repaymentConcurrency || process.env.STRESS_TEST_REPAYMENT_CONCURRENCY || 12);
  const randomDelayMs = Number(overrides.randomDelayMs || process.env.STRESS_TEST_RANDOM_DELAY_MS || 120);

  return {
    baseUrl,
    databaseUrl,
    userCount,
    repaymentConcurrency,
    randomDelayMs,
    enabled: process.env.STRESS_TEST_ENABLED === "true"
  };
}

function assertSafeEnvironment(config) {
  if (!config.enabled) {
    throw new Error(
      "Stress tests are disabled. Set STRESS_TEST_ENABLED=true and point STRESS_TEST_DATABASE_URL to a dedicated test/stress database."
    );
  }

  if (!config.databaseUrl) {
    throw new Error("Missing STRESS_TEST_DATABASE_URL for stress tests.");
  }

  const normalizedUrl = String(config.databaseUrl).toLowerCase();
  const looksLocal = normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.1");
  const looksIsolated = normalizedUrl.includes("test") || normalizedUrl.includes("stress");

  if (!looksLocal || !looksIsolated) {
    throw new Error(
      "Refusing to run stress tests against a non-local or non-isolated database. Use a localhost database whose name includes 'test' or 'stress'."
    );
  }
}

function createPrismaClient(databaseUrl) {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
}

function createMetrics() {
  return {
    requests: [],
    totalUsersCreated: 0,
    totalLoansIssued: 0,
    totalRepaymentsMade: 0,
    failedTransactions: 0,
    errors: []
  };
}

function createLogger(runId) {
  return {
    info(message, metadata = {}) {
      console.log(`[STRESS:${runId}] ${message}`, metadata);
    },
    warn(message, metadata = {}) {
      console.warn(`[STRESS:${runId}] ${message}`, metadata);
    },
    error(message, metadata = {}) {
      console.error(`[STRESS:${runId}] ${message}`, metadata);
    }
  };
}

function withBearer(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function delay(ms) {
  if (!ms) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeRandomDelay(context) {
  const maxDelay = context.config.randomDelayMs;
  if (!maxDelay) {
    return;
  }

  const waitMs = Math.floor(Math.random() * maxDelay);
  await delay(waitMs);
}

function computeResponseStats(requests) {
  if (!requests.length) {
    return {
      totalRequests: 0,
      averageResponseTimeMs: 0,
      maxResponseTimeMs: 0,
      successRate: 0,
      errorRate: 0
    };
  }

  const durations = requests.map((entry) => entry.durationMs);
  const successCount = requests.filter((entry) => entry.success).length;
  const errorCount = requests.length - successCount;

  return {
    totalRequests: requests.length,
    averageResponseTimeMs: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2)),
    maxResponseTimeMs: Math.max(...durations),
    successRate: Number(((successCount / requests.length) * 100).toFixed(2)),
    errorRate: Number(((errorCount / requests.length) * 100).toFixed(2))
  };
}

async function apiRequest(context, options) {
  const startedAt = Date.now();
  try {
    const response = await context.http.request({
      validateStatus: () => true,
      ...options
    });
    const durationMs = Date.now() - startedAt;
    const success = response.status >= 200 && response.status < 300;
    context.metrics.requests.push({
      method: (options.method || "GET").toUpperCase(),
      url: options.url,
      status: response.status,
      durationMs,
      success
    });

    if (!success) {
      context.metrics.failedTransactions += 1;
    }

    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    context.metrics.requests.push({
      method: (options.method || "GET").toUpperCase(),
      url: options.url,
      status: 0,
      durationMs,
      success: false
    });
    context.metrics.failedTransactions += 1;
    context.metrics.errors.push({
      scope: "api",
      method: (options.method || "GET").toUpperCase(),
      url: options.url,
      message: error.message
    });
    throw error;
  }
}

async function ensureStressAdmin(context) {
  const email = `stress-admin-${context.runId}@alesunfund.local`;
  const password = `Stress!${context.runId.slice(-8)}1`;
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await context.prisma.user.findUnique({
    where: { email }
  });

  let admin = existing;
  if (!admin) {
    admin = await context.prisma.user.create({
      data: {
        fullName: "Stress Test Admin",
        email,
        passwordHash,
        role: "ADMIN",
        country: "UGANDA",
        region: "CENTRAL",
        subregion: "BUGANDA NORTH",
        district: "LUWERO",
        administrativeUnit: "BAMUNANIKA COUNTY",
        subUnit: "BAMUNANIKA SUBCOUNTY",
        county: "BUGANDA NORTH",
        subcounty: "BAMUNANIKA SUBCOUNTY"
      }
    });
  } else {
    admin = await context.prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "ADMIN",
        isActive: true
      }
    });
  }

  const response = await apiRequest(context, {
    method: "POST",
    url: "/api/auth/admin/login",
    data: { email, password }
  });

  if (response.status !== 200 || !response.data?.token) {
    throw new Error(`Unable to log in stress admin. Status ${response.status}`);
  }

  context.admin = {
    id: admin.id,
    email,
    password,
    token: response.data.token
  };

  return context.admin;
}

async function ensureStressAgent(context) {
  if (!context.admin) {
    throw new Error("Stress admin must be initialized before the stress agent");
  }

  const email = `stress-agent-${context.runId}@agents.alesunfund.local`;
  const agentUser = await context.prisma.user.upsert({
    where: { email },
    update: {
      fullName: "Stress Test Agent",
      isActive: true
    },
    create: {
      fullName: "Stress Test Agent",
      email,
      passwordHash: await bcrypt.hash(`Agent!${context.runId.slice(-8)}1`, 10),
      role: "APPLICANT",
      country: DEFAULT_GEOGRAPHY.country.toUpperCase(),
      region: DEFAULT_GEOGRAPHY.region,
      subregion: DEFAULT_GEOGRAPHY.subregion,
      district: DEFAULT_GEOGRAPHY.district,
      administrativeUnit: DEFAULT_GEOGRAPHY.administrativeUnit,
      subUnit: DEFAULT_GEOGRAPHY.subUnit,
      county: DEFAULT_GEOGRAPHY.county,
      subcounty: DEFAULT_GEOGRAPHY.subcounty
    }
  });

  const agentCode = `AGT-${context.runId.slice(-6).toUpperCase()}`;
  const agent = await context.prisma.agent.upsert({
    where: { userId: agentUser.id },
    update: {
      createdByAdminId: context.admin.id,
      agentCode,
      fullName: "Stress Test Agent",
      phoneNumber: `07${faker.string.numeric(8)}`,
      nationalId: `STRESS-${context.runId.slice(-6)}`,
      country: DEFAULT_GEOGRAPHY.country.toUpperCase(),
      region: DEFAULT_GEOGRAPHY.region,
      subregion: DEFAULT_GEOGRAPHY.subregion,
      district: DEFAULT_GEOGRAPHY.district,
      administrativeUnit: DEFAULT_GEOGRAPHY.administrativeUnit,
      subUnit: DEFAULT_GEOGRAPHY.subUnit,
      county: DEFAULT_GEOGRAPHY.county,
      subcounty: DEFAULT_GEOGRAPHY.subcounty,
      status: "ACTIVE"
    },
    create: {
      userId: agentUser.id,
      createdByAdminId: context.admin.id,
      agentCode,
      fullName: "Stress Test Agent",
      phoneNumber: `07${faker.string.numeric(8)}`,
      nationalId: `STRESS-${context.runId.slice(-6)}`,
      country: DEFAULT_GEOGRAPHY.country.toUpperCase(),
      region: DEFAULT_GEOGRAPHY.region,
      subregion: DEFAULT_GEOGRAPHY.subregion,
      district: DEFAULT_GEOGRAPHY.district,
      administrativeUnit: DEFAULT_GEOGRAPHY.administrativeUnit,
      subUnit: DEFAULT_GEOGRAPHY.subUnit,
      county: DEFAULT_GEOGRAPHY.county,
      subcounty: DEFAULT_GEOGRAPHY.subcounty,
      status: "ACTIVE"
    }
  });

  await context.prisma.agentWallet.upsert({
    where: { agentId: agent.id },
    update: {},
    create: {
      agentId: agent.id,
      pendingBalance: 0,
      availableBalance: 0
    }
  });

  await context.prisma.agentScore.upsert({
    where: { agentId: agent.id },
    update: {},
    create: {
      agentId: agent.id,
      trustScore: 50
    }
  });

  context.agent = {
    id: agent.id,
    code: agent.agentCode,
    geography: { ...DEFAULT_GEOGRAPHY }
  };

  return context.agent;
}

function buildFakeApplicantPayload(context, index) {
  const password = `Stress!Applicant${String(index).padStart(3, "0")}`;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fullName = `${firstName} ${lastName}`;
  const email = `stress-user-${context.runId}-${index}@alesunfund.local`;
  const phone = `07${faker.string.numeric(8)}`;
  const nin = `ST${context.runId.slice(-4).toUpperCase()}${String(index).padStart(5, "0")}`;
  const businessName = `${lastName} Traders ${index}`;
  const amount = 10000 + (index % 10) * 10000;

  return {
    credentials: {
      fullName,
      email,
      password
    },
    step1: {
      fullName,
      nin,
      dateOfBirth: "1994-05-02",
      phone,
      email,
      address: `${faker.location.streetAddress()}, Kampala Road`,
      position: "Director",
      agentReferralId: context.agent.code,
      ...DEFAULT_GEOGRAPHY
    },
    step2: {
      businessName,
      location: DEFAULT_GEOGRAPHY.district,
      industry: "Retail",
      yearsInOperation: 2,
      weeklyRevenue: 500000 + index * 1000,
      weeklyExpenses: 200000 + index * 500
    },
    loanRequest: {
      amount,
      pricingAccepted: true
    }
  };
}

async function finalizeOnboardingInDatabase(context, userId) {
  await context.prisma.document.upsert({
    where: { userId },
    update: {
      idFrontUrl: `stress/${context.runId}/${userId}-front.png`,
      idBackUrl: `stress/${context.runId}/${userId}-back.png`,
      tradingLicenseUrl: `stress/${context.runId}/${userId}-license.pdf`,
      submittedAt: new Date()
    },
    create: {
      userId,
      idFrontUrl: `stress/${context.runId}/${userId}-front.png`,
      idBackUrl: `stress/${context.runId}/${userId}-back.png`,
      tradingLicenseUrl: `stress/${context.runId}/${userId}-license.pdf`,
      submittedAt: new Date()
    }
  });

  await context.prisma.verificationStatus.upsert({
    where: { userId },
    update: {
      completedSteps: 3,
      status: "PENDING",
      submittedAt: new Date()
    },
    create: {
      userId,
      status: "PENDING",
      completedSteps: 3,
      submittedAt: new Date()
    }
  });
}

async function approveOnboarding(context, userId) {
  const response = await apiRequest(context, {
    method: "POST",
    url: `/api/admin/users/${userId}/verification`,
    headers: withBearer(context.admin.token),
    data: {
      status: "VERIFIED"
    }
  });

  if (response.status !== 200) {
    throw new Error(`Failed to verify onboarding for ${userId}: ${response.status} ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function fetchLoanWithSchedules(context, loanId) {
  return context.prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      repaymentSchedules: {
        orderBy: { dueDate: "asc" }
      },
      loanRepayments: {
        include: {
          allocations: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

function calculateTransparentLoanPricing(principalAmount) {
  const principal = Math.round(Number(principalAmount || 0));
  const processingFee = Math.round(principal * 0.02);
  const interestAmount = Math.round(principal * 0.18);
  return {
    principalAmount: principal,
    processingFee,
    disbursedAmount: Math.max(0, principal - processingFee),
    interestAmount,
    totalRepayableAmount: principal + interestAmount,
    loanTerm: "1 month"
  };
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function createStressContext(overrides = {}) {
  const config = resolveConfig(overrides);
  assertSafeEnvironment(config);

  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  const prisma = createPrismaClient(config.databaseUrl);
  const http = axios.create({
    baseURL: config.baseUrl,
    timeout: 30000
  });
  const metrics = createMetrics();
  const logger = createLogger(runId);

  const context = {
    runId,
    prisma,
    http,
    metrics,
    logger,
    config,
    admin: null,
    agent: null
  };

  const health = await apiRequest(context, {
    method: "GET",
    url: "/health"
  });
  assert(health.status === 200, "Backend health check failed before stress tests started", { status: health.status });

  await ensureStressAdmin(context);
  await ensureStressAgent(context);

  return context;
}

async function disposeStressContext(context) {
  if (context?.prisma) {
    await context.prisma.$disconnect();
  }
}

module.exports = {
  DEFAULT_GEOGRAPHY,
  apiRequest,
  approveOnboarding,
  assert,
  buildFakeApplicantPayload,
  calculateTransparentLoanPricing,
  computeResponseStats,
  createMetrics,
  createStressContext,
  delay,
  disposeStressContext,
  faker,
  fetchLoanWithSchedules,
  finalizeOnboardingInDatabase,
  maybeRandomDelay,
  withBearer
};
