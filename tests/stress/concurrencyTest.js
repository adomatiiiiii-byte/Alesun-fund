const {
  apiRequest,
  assert,
  fetchLoanWithSchedules,
  withBearer
} = require("./helpers");

async function runConcurrencyTest(context, loanFlowResult) {
  const targetUser = loanFlowResult.approvedUsers.find((entry) => Number(entry.approvedLoan?.remainingBalance || 0) > 0);
  assert(targetUser, "Concurrency test requires at least one active approved loan");

  const beforeLoan = await fetchLoanWithSchedules(context, targetUser.loanId);
  const concurrentAmount = Math.max(1, Math.floor(Number(beforeLoan.repaymentSchedules[0].expectedAmount) / 2));
  const attempts = Array.from({ length: context.config.repaymentConcurrency }).map(() =>
    apiRequest(context, {
      method: "POST",
      url: `/api/loans/${targetUser.loanId}/repay`,
      headers: withBearer(context.admin.token),
      data: { amount: concurrentAmount }
    })
  );

  context.logger.info("Starting repayment concurrency test", {
    loanId: targetUser.loanId,
    attempts: attempts.length,
    amountPerAttempt: concurrentAmount
  });

  const responses = await Promise.all(attempts);
  const afterLoan = await fetchLoanWithSchedules(context, targetUser.loanId);
  const successCount = responses.filter((response) => response.status >= 200 && response.status < 300).length;
  const failureCount = responses.length - successCount;
  const overpaidSchedule = afterLoan.repaymentSchedules.find(
    (schedule) => Number(schedule.paidAmount) > Number(schedule.expectedAmount)
  );

  assert(Number(afterLoan.remainingBalance) >= 0, "Concurrency test produced a negative loan balance", {
    loanId: targetUser.loanId,
    remainingBalance: Number(afterLoan.remainingBalance),
    responses: responses.map((entry) => entry.status)
  });
  assert(!overpaidSchedule, "Concurrency test overpaid a repayment schedule", {
    loanId: targetUser.loanId,
    scheduleId: overpaidSchedule?.id || null
  });

  context.metrics.totalRepaymentsMade += successCount;
  context.logger.info("Repayment concurrency test complete", {
    loanId: targetUser.loanId,
    successCount,
    failureCount,
    remainingBalance: Number(afterLoan.remainingBalance)
  });

  return {
    summary: {
      loanId: targetUser.loanId,
      attempts: responses.length,
      successCount,
      failureCount,
      remainingBalance: Number(afterLoan.remainingBalance)
    }
  };
}

module.exports = {
  runConcurrencyTest
};
