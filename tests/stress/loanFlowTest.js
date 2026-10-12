const {
  apiRequest,
  assert,
  calculateTransparentLoanPricing,
  fetchLoanWithSchedules,
  maybeRandomDelay,
  withBearer
} = require("./helpers");

async function approveLoanRequest(context, userRecord) {
  const response = await apiRequest(context, {
    method: "POST",
    url: `/api/admin/loan-requests/${userRecord.loanRequestId}/status`,
    headers: withBearer(context.admin.token),
    data: {
      status: "APPROVED"
    }
  });

  assert(response.status === 200, "Loan request approval failed", {
    loanRequestId: userRecord.loanRequestId,
    status: response.status,
    body: response.data
  });

  const loan = response.data.loan;
  assert(loan, "Approved loan request did not create a loan", {
    loanRequestId: userRecord.loanRequestId,
    body: response.data
  });

  const expectedPricing = calculateTransparentLoanPricing(userRecord.requestedAmount);
  const persistedLoan = await fetchLoanWithSchedules(context, loan.id);

  assert(Number(persistedLoan.processingFee) === expectedPricing.processingFee, "Processing fee mismatch", {
    loanId: loan.id,
    expected: expectedPricing.processingFee,
    actual: Number(persistedLoan.processingFee)
  });
  assert(Number(persistedLoan.interestAmount) === expectedPricing.interestAmount, "Interest amount mismatch", {
    loanId: loan.id,
    expected: expectedPricing.interestAmount,
    actual: Number(persistedLoan.interestAmount)
  });
  assert(Number(persistedLoan.disbursedAmount) === expectedPricing.disbursedAmount, "Disbursed amount mismatch", {
    loanId: loan.id,
    expected: expectedPricing.disbursedAmount,
    actual: Number(persistedLoan.disbursedAmount)
  });
  assert(
    Number(persistedLoan.totalRepayableAmount) === expectedPricing.totalRepayableAmount,
    "Total repayable mismatch",
    {
      loanId: loan.id,
      expected: expectedPricing.totalRepayableAmount,
      actual: Number(persistedLoan.totalRepayableAmount)
    }
  );
  assert(
    Array.isArray(persistedLoan.repaymentSchedules) && persistedLoan.repaymentSchedules.length > 0,
    "Approved loan did not create repayment schedules",
    { loanId: loan.id }
  );

  context.metrics.totalLoansIssued += 1;
  return {
    ...userRecord,
    loanId: loan.id,
    approvedLoan: persistedLoan
  };
}

async function runLoanFlowTest(context, userSimulationResult) {
  context.logger.info("Starting loan flow approval test", {
    pendingRequests: userSimulationResult.users.length
  });

  const approvedUsers = [];
  for (const userRecord of userSimulationResult.users) {
    try {
      await maybeRandomDelay(context);
      const approved = await approveLoanRequest(context, userRecord);
      approvedUsers.push(approved);
    } catch (error) {
      context.metrics.errors.push({
        scope: "loanFlow",
        userId: userRecord.userId,
        loanRequestId: userRecord.loanRequestId,
        message: error.message,
        details: error.details || null
      });
      context.logger.error("Loan flow approval failed", {
        userId: userRecord.userId,
        loanRequestId: userRecord.loanRequestId,
        error: error.message
      });
    }
  }

  assert(approvedUsers.length > 0, "No loans were approved successfully during loan flow testing");

  const duplicateRequestCandidate = approvedUsers[0];
  if (duplicateRequestCandidate) {
    const duplicateRequestResponse = await apiRequest(context, {
      method: "POST",
      url: "/api/user/loan-request",
      headers: withBearer(duplicateRequestCandidate.token),
      data: {
        amount: duplicateRequestCandidate.requestedAmount,
        pricingAccepted: true
      }
    });

    assert(
      [403, 409].includes(duplicateRequestResponse.status),
      "Duplicate loan request should be rejected once a user already has an approved or active flow",
      {
        userId: duplicateRequestCandidate.userId,
        status: duplicateRequestResponse.status,
        body: duplicateRequestResponse.data
      }
    );
  }

  context.logger.info("Loan flow approval complete", {
    approvedLoans: approvedUsers.length
  });

  return {
    approvedUsers,
    summary: {
      requestedApprovals: userSimulationResult.users.length,
      approvedLoans: approvedUsers.length,
      failedApprovals: userSimulationResult.users.length - approvedUsers.length
    }
  };
}

module.exports = {
  runLoanFlowTest
};
