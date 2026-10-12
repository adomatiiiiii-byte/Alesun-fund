const path = require("path");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));

dotenv.config({
  path: path.join(__dirname, "..", "backend", ".env")
});

if (process.env.NODE_ENV === "production") {
  console.error("cleanupStaleLoanRequests.js is disabled in production.");
  process.exit(1);
}

const prisma = require("../backend/src/prisma");
const { refreshAccountingMetrics } = require("../backend/src/services/accountingOverview.service");
const { STALE_LOAN_REQUEST_STATUSES } = require("../backend/src/services/loanRequestLifecycle.service");

const TEST_MARKERS = [
  "example.com",
  "test",
  "demo",
  "sample",
  "dummy",
  "fake",
  "seed",
  "staging",
  "qa"
];

function textLooksLikeTestData(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return TEST_MARKERS.some((marker) => normalized.includes(marker));
}

function requestLooksLikeTestData(loanRequest) {
  return (
    loanRequest.isTestData
    || textLooksLikeTestData(loanRequest.user?.email)
    || textLooksLikeTestData(loanRequest.user?.fullName)
    || textLooksLikeTestData(loanRequest.user?.businessProfile?.name)
  );
}

async function main() {
  const [loanRequests, loans] = await Promise.all([
    prisma.loanRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessProfile: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { userId: "asc" },
        { createdAt: "desc" }
      ]
    }),
    prisma.loan.findMany({
      select: {
        id: true,
        userId: true,
        status: true
      }
    })
  ]);

  const latestVisibleRequestByUser = new Map();
  const loanCountByUser = new Map();

  for (const loan of loans) {
    if (!loan.userId) {
      continue;
    }
    loanCountByUser.set(loan.userId, (loanCountByUser.get(loan.userId) || 0) + 1);
  }

  for (const loanRequest of loanRequests) {
    if (!latestVisibleRequestByUser.has(loanRequest.userId) && !loanRequest.deletedAt && !loanRequest.archivedAt) {
      latestVisibleRequestByUser.set(loanRequest.userId, loanRequest.id);
    }
  }

  const now = new Date();
  const updates = [];
  const summary = {
    totalLoanRequests: loanRequests.length,
    alreadyStale: 0,
    archived: 0,
    markedTest: 0,
    untouched: 0
  };

  for (const loanRequest of loanRequests) {
    const reasons = [];
    const hasLinkedLoan = (loanCountByUser.get(loanRequest.userId) || 0) > 0;
    const isLatestVisible = latestVisibleRequestByUser.get(loanRequest.userId) === loanRequest.id;
    const isTestData = requestLooksLikeTestData(loanRequest);
    const ageDays = Math.floor((now - new Date(loanRequest.createdAt)) / (1000 * 60 * 60 * 24));
    const alreadyStale =
      Boolean(loanRequest.deletedAt)
      || Boolean(loanRequest.archivedAt)
      || loanRequest.isTestData
      || STALE_LOAN_REQUEST_STATUSES.includes(loanRequest.status);

    if (alreadyStale) {
      summary.alreadyStale += 1;
      continue;
    }

    if (isTestData) {
      reasons.push("test_data");
    }

    if (loanRequest.status === "PENDING" && ageDays > 14 && (hasLinkedLoan || !isLatestVisible)) {
      reasons.push("stale_pending_request");
    }

    if (!reasons.length) {
      summary.untouched += 1;
      continue;
    }

    const nextStatus = reasons.includes("test_data") ? "TEST" : "ARCHIVED";
    const data = {
      status: nextStatus,
      archivedAt: now,
      isTestData: reasons.includes("test_data") ? true : loanRequest.isTestData
    };

    updates.push({
      id: loanRequest.id,
      data,
      reasons
    });
  }

  for (const update of updates) {
    await prisma.loanRequest.update({
      where: { id: update.id },
      data: update.data
    });

    if (update.data.status === "TEST") {
      summary.markedTest += 1;
    } else {
      summary.archived += 1;
    }
  }

  const refreshedMetrics = await refreshAccountingMetrics(prisma);

  console.log(JSON.stringify({
    ...summary,
    updated: updates.length,
    accounting: {
      pendingLoanRequests: refreshedMetrics.summary.pendingLoanRequests,
      totalPortfolioValue: refreshedMetrics.summary.totalPortfolioValue,
      activeLoansCount: refreshedMetrics.summary.activeLoansCount
    }
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to clean stale loan requests.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
