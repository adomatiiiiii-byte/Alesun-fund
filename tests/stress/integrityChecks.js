const { assert } = require("./helpers");

async function runIntegrityChecks(context) {
  context.logger.info("Running post-stress integrity checks");

  const negativeBalances = await context.prisma.$queryRawUnsafe(
    'SELECT id, "userId", "remainingBalance" FROM "Loan" WHERE CAST("remainingBalance" AS DECIMAL) < 0'
  );
  const overpaidSchedules = await context.prisma.$queryRawUnsafe(
    'SELECT id, "loanId", "expectedAmount", "paidAmount" FROM "RepaymentSchedule" WHERE CAST("paidAmount" AS DECIMAL) > CAST("expectedAmount" AS DECIMAL)'
  );
  const duplicatePendingRequests = await context.prisma.$queryRawUnsafe(
    'SELECT "userId", COUNT(*)::int AS "pendingCount" FROM "LoanRequest" WHERE status = \'PENDING\' GROUP BY "userId" HAVING COUNT(*) > 1'
  );
  const allocationMismatches = await context.prisma.$queryRawUnsafe(
    'SELECT lr.id AS "repaymentId", lr."loanId", CAST(lr.amount AS DECIMAL) AS "repaymentAmount", COALESCE(SUM(CAST(pa."amountAllocated" AS DECIMAL)), 0) AS "allocatedAmount" FROM "LoanRepayment" lr LEFT JOIN "PaymentAllocation" pa ON pa."repaymentId" = lr.id GROUP BY lr.id, lr."loanId", lr.amount HAVING COALESCE(SUM(CAST(pa."amountAllocated" AS DECIMAL)), 0) <> CAST(lr.amount AS DECIMAL)'
  );

  const findings = {
    negativeBalances,
    overpaidSchedules,
    duplicatePendingRequests,
    allocationMismatches
  };

  assert(negativeBalances.length === 0, "Integrity check failed: negative balances detected", findings);
  assert(overpaidSchedules.length === 0, "Integrity check failed: overpaid schedules detected", findings);
  assert(duplicatePendingRequests.length === 0, "Integrity check failed: duplicate pending requests detected", findings);
  assert(allocationMismatches.length === 0, "Integrity check failed: repayment allocation mismatches detected", findings);

  return {
    summary: {
      negativeBalances: negativeBalances.length,
      overpaidSchedules: overpaidSchedules.length,
      duplicatePendingRequests: duplicatePendingRequests.length,
      allocationMismatches: allocationMismatches.length
    }
  };
}

module.exports = {
  runIntegrityChecks
};
