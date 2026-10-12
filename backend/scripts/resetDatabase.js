const fs = require("fs/promises");
const path = require("path");
const readline = require("readline");
const prisma = require("../src/prisma");
const { uploadDir } = require("../src/config");

const CLEAR_AUDIT_LOGS = process.argv.includes("--clear-audit-logs");

function assertDevelopmentEnvironment() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("❌ Reset not allowed outside development environment");
  }
}

function askForConfirmation() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("❌ Interactive confirmation required. Run this command in a terminal and type RESET.");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Type "RESET" to delete all development user data: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function clearUploadDirectory(directoryPath) {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    await Promise.all(
      entries.map((entry) =>
        fs.rm(path.join(directoryPath, entry.name), {
          recursive: true,
          force: true
        })
      )
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function resetUserData() {
  const summary = await prisma.$transaction(async (tx) => {
    const counts = {};

    counts.payments = await tx.payment.deleteMany();
    counts.loanRequests = await tx.loanRequest.deleteMany();
    counts.verificationReports = await tx.verificationReport.deleteMany();
    counts.riskScores = await tx.riskScore.deleteMany();
    counts.loans = await tx.loan.deleteMany();
    counts.loanApplications = await tx.loanApplication.deleteMany();
    counts.businesses = await tx.business.deleteMany();

    if (CLEAR_AUDIT_LOGS) {
      counts.auditLogs = await tx.auditLog.deleteMany();
    } else {
      counts.auditLogsDetached = await tx.auditLog.updateMany({
        where: { userId: { not: null } },
        data: { userId: null }
      });
    }

    counts.users = await tx.user.deleteMany();

    return counts;
  });

  await clearUploadDirectory(uploadDir);

  return summary;
}

async function main() {
  assertDevelopmentEnvironment();

  console.log("Development reset requested.");
  console.log(`Upload directory to clear: ${uploadDir}`);
  console.log(CLEAR_AUDIT_LOGS ? "Audit logs will be deleted." : "Audit logs will be preserved.");

  const confirmation = await askForConfirmation();
  if (confirmation !== "RESET") {
    throw new Error("❌ Reset cancelled. Confirmation text did not match.");
  }

  const summary = await resetUserData();

  console.table(
    Object.entries(summary).map(([table, result]) => ({
      table,
      affectedRows: result.count
    }))
  );
  console.log("✅ All user data cleared successfully");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
