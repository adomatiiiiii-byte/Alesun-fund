const path = require("path");
const readline = require("readline");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));

dotenv.config({
  path: path.join(__dirname, "..", "backend", ".env")
});

const prisma = require("../backend/src/prisma");
const {
  CLEANUP_CONFIRMATION,
  buildUnassignedAgentCleanupPlan,
  executeUnassignedAgentCleanup
} = require("../backend/src/services/unassignedAgentCleanup.service");

function parseArgs(argv) {
  return argv.reduce((accumulator, entry) => {
    if (entry === "--execute") {
      accumulator.execute = true;
      return accumulator;
    }

    if (entry === "--dry-run") {
      accumulator.dryRun = true;
      return accumulator;
    }

    if (entry.startsWith("--confirm=")) {
      accumulator.confirmation = entry.slice("--confirm=".length);
      return accumulator;
    }

    if (entry.startsWith("--executed-by=")) {
      accumulator.executedBy = entry.slice("--executed-by=".length);
    }

    return accumulator;
  }, {
    execute: false,
    dryRun: false,
    confirmation: "",
    executedBy: process.env.CLEANUP_EXECUTED_BY || "SYSTEM"
  });
}

function printPlan(plan) {
  const preview = {
    generatedAt: plan.generatedAt,
    invalidUsersFound: plan.summary.invalidUsersFound,
    users: plan.invalidUsers,
    counts: plan.summary.counts
  };

  console.log(JSON.stringify(preview, null, 2));
}

function askForConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(
      `Type ${CLEANUP_CONFIRMATION} to permanently delete the users listed above: `,
      (answer) => {
        rl.close();
        resolve(String(answer || "").trim());
      }
    );
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const environment = process.env.NODE_ENV || "development";
  const plan = await buildUnassignedAgentCleanupPlan(prisma);

  printPlan(plan);

  if (!args.execute) {
    console.log("\nDry run only. No records were deleted.");
    return;
  }

  let confirmation = args.confirmation;
  if (!confirmation) {
    confirmation = await askForConfirmation();
  }

  const result = await executeUnassignedAgentCleanup(prisma, {
    confirmation,
    executedBy: args.executedBy,
    environment
  });

  console.log("\nCleanup completed.");
  console.log(JSON.stringify({
    deletedCounts: result.deletedCounts,
    accountingSummary: result.accountingSummary,
    reconciliation: result.reconciliation
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to delete users without valid assigned agents.");
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
