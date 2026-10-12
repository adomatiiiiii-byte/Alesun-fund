const {
  apiRequest,
  assert,
  fetchLoanWithSchedules,
  maybeRandomDelay,
  withBearer
} = require("./helpers");

function getOutstandingAmount(schedule) {
  return Number(schedule.expectedAmount) - Number(schedule.paidAmount);
}

async function repayLoan(context, loanId, amount) {
  const response = await apiRequest(context, {
    method: "POST",
    url: `/api/loans/${loanId}/repay`,
    headers: withBearer(context.admin.token),
    data: { amount }
  });

  if (response.status >= 200 && response.status < 300) {
    context.metrics.totalRepaymentsMade += 1;
  }

  return response;
}

async function runRepaymentStressTest(context, loanFlowResult) {
  const candidates = loanFlowResult.approvedUsers.slice(0, 12);
  assert(candidates.length >= 4, "Repayment stress test needs at least four approved loans");

  context.logger.info("Starting repayment stress test", { candidateLoans: candidates.length });

  const [partialCase, exactCase, overpaymentCase, multiPaymentCase, ...cycleCases] = candidates;
  const results = [];
  const cycleSummary = {
    cyclesExecuted: 0,
    successfulPartialRepayments: 0,
    successfulFullRepayments: 0,
    intentionalInvalidAttemptsRejected: 0,
    skippedLoans: 0
  };

  {
    const loan = await fetchLoanWithSchedules(context, partialCase.loanId);
    const firstSchedule = loan.repaymentSchedules[0];
    const partialAmount = Math.max(1, Math.floor(Number(firstSchedule.expectedAmount) / 2));
    const response = await repayLoan(context, partialCase.loanId, partialAmount);
    assert(response.status === 201, "Partial repayment should succeed", { body: response.data });
    const updatedLoan = await fetchLoanWithSchedules(context, partialCase.loanId);
    const updatedSchedule = updatedLoan.repaymentSchedules[0];
    assert(Number(updatedSchedule.paidAmount) === partialAmount, "Partial repayment did not update paid amount correctly", {
      loanId: partialCase.loanId,
      expected: partialAmount,
      actual: Number(updatedSchedule.paidAmount)
    });
    assert(updatedSchedule.status === "PARTIAL", "Partial repayment did not mark schedule as PARTIAL", {
      loanId: partialCase.loanId,
      status: updatedSchedule.status
    });
    results.push({ type: "partial", loanId: partialCase.loanId, status: "passed" });
  }

  {
    const loan = await fetchLoanWithSchedules(context, exactCase.loanId);
    const exactAmount = Number(loan.remainingBalance);
    const response = await repayLoan(context, exactCase.loanId, exactAmount);
    assert(response.status === 201, "Exact repayment should succeed", { body: response.data });
    const updatedLoan = await fetchLoanWithSchedules(context, exactCase.loanId);
    assert(Number(updatedLoan.remainingBalance) === 0, "Exact repayment should clear remaining balance", {
      loanId: exactCase.loanId,
      remainingBalance: Number(updatedLoan.remainingBalance)
    });
    assert(updatedLoan.status === "COMPLETED", "Exact repayment should complete the loan", {
      loanId: exactCase.loanId,
      status: updatedLoan.status
    });
    results.push({ type: "exact", loanId: exactCase.loanId, status: "passed" });
  }

  {
    const loan = await fetchLoanWithSchedules(context, overpaymentCase.loanId);
    const zeroResponse = await repayLoan(context, overpaymentCase.loanId, 0);
    assert(zeroResponse.status === 400, "Zero-value repayment should be rejected", {
      loanId: overpaymentCase.loanId,
      status: zeroResponse.status,
      body: zeroResponse.data
    });

    const negativeResponse = await repayLoan(context, overpaymentCase.loanId, -100);
    assert(negativeResponse.status === 400, "Negative repayment should be rejected", {
      loanId: overpaymentCase.loanId,
      status: negativeResponse.status,
      body: negativeResponse.data
    });

    const response = await repayLoan(context, overpaymentCase.loanId, Number(loan.remainingBalance) + 1000);
    assert(response.status === 400, "Overpayment attempt should be rejected", {
      loanId: overpaymentCase.loanId,
      status: response.status,
      body: response.data
    });

    const extremeResponse = await repayLoan(context, overpaymentCase.loanId, 999999999);
    assert(extremeResponse.status === 400, "Extremely large repayment should be rejected", {
      loanId: overpaymentCase.loanId,
      status: extremeResponse.status,
      body: extremeResponse.data
    });

    results.push({ type: "edge-cases", loanId: overpaymentCase.loanId, status: "passed" });
  }

  {
    const loan = await fetchLoanWithSchedules(context, multiPaymentCase.loanId);
    const firstSchedule = loan.repaymentSchedules[0];
    const secondAmount = Math.min(
      Number(loan.remainingBalance),
      getOutstandingAmount(firstSchedule) + Math.max(1, Math.floor(Number(firstSchedule.expectedAmount) / 3))
    );
    const firstAmount = Math.max(1, Math.floor(Number(firstSchedule.expectedAmount) / 4));

    const firstResponse = await repayLoan(context, multiPaymentCase.loanId, firstAmount);
    assert(firstResponse.status === 201, "First sequential repayment should succeed", { body: firstResponse.data });
    await maybeRandomDelay(context);
    const secondResponse = await repayLoan(context, multiPaymentCase.loanId, secondAmount);
    assert(secondResponse.status === 201, "Second sequential repayment should succeed", { body: secondResponse.data });

    const updatedLoan = await fetchLoanWithSchedules(context, multiPaymentCase.loanId);
    const updatedFirst = updatedLoan.repaymentSchedules[0];
    const updatedSecond = updatedLoan.repaymentSchedules[1];
    assert(Number(updatedFirst.paidAmount) === Number(updatedFirst.expectedAmount), "First schedule should be fully paid after sequential repayments", {
      loanId: multiPaymentCase.loanId,
      paidAmount: Number(updatedFirst.paidAmount),
      expectedAmount: Number(updatedFirst.expectedAmount)
    });
    assert(Number(updatedSecond.paidAmount) > 0, "Second schedule should receive spillover payment", {
      loanId: multiPaymentCase.loanId,
      secondSchedulePaidAmount: Number(updatedSecond.paidAmount)
    });
    results.push({ type: "multiple-payments", loanId: multiPaymentCase.loanId, status: "passed" });
  }

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    for (const cycleUser of cycleCases) {
      const loan = await fetchLoanWithSchedules(context, cycleUser.loanId);
      if (!loan || Number(loan.remainingBalance) <= 0) {
        cycleSummary.skippedLoans += 1;
        continue;
      }

      const action = Math.random();
      const amount =
        action < 0.33
          ? Math.max(1, Math.floor(Number(loan.remainingBalance) * 0.25))
          : action < 0.66
            ? Number(loan.remainingBalance)
            : Number(loan.remainingBalance) + 250;

      const response = await repayLoan(context, cycleUser.loanId, amount);
      cycleSummary.cyclesExecuted += 1;

      if (action >= 0.66) {
        assert(response.status === 400, "Intentional invalid repayment should be rejected", {
          loanId: cycleUser.loanId,
          cycle,
          status: response.status,
          body: response.data
        });
        cycleSummary.intentionalInvalidAttemptsRejected += 1;
      } else {
        assert(response.status === 201, "Cycle repayment should succeed", {
          loanId: cycleUser.loanId,
          cycle,
          status: response.status,
          body: response.data
        });
        if (action < 0.33) {
          cycleSummary.successfulPartialRepayments += 1;
        } else {
          cycleSummary.successfulFullRepayments += 1;
        }
      }
    }
  }

  context.logger.info("Repayment stress test complete", {
    cases: results.length,
    repaymentsRecorded: context.metrics.totalRepaymentsMade
  });

  return {
    results,
    summary: {
      casesExecuted: results.length,
      repaymentsRecorded: context.metrics.totalRepaymentsMade,
      fullSystemSimulation: cycleSummary
    }
  };
}

module.exports = {
  runRepaymentStressTest
};
