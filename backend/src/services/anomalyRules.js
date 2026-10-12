function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildAlert(type, severity, message, metadata = {}) {
  return { type, severity, message, metadata };
}

function checkNegativeBalance(loan) {
  if (!loan) {
    return [];
  }

  const remainingBalance = asNumber(loan.remainingBalance);
  if (remainingBalance < 0) {
    return [
      buildAlert(
        "NEGATIVE_BALANCE",
        "CRITICAL",
        "Loan remaining balance is negative.",
        { loanId: loan.id, userId: loan.userId, remainingBalance }
      )
    ];
  }

  return [];
}

function checkScheduleOverpayment(loan, schedules = []) {
  return schedules
    .filter((schedule) => asNumber(schedule.paidAmount) > asNumber(schedule.expectedAmount))
    .map((schedule) =>
      buildAlert(
        "OVERPAYMENT_DETECTED",
        "CRITICAL",
        "Repayment schedule paid amount exceeds expected amount.",
        {
          loanId: loan?.id || null,
          scheduleId: schedule.id,
          expectedAmount: asNumber(schedule.expectedAmount),
          paidAmount: asNumber(schedule.paidAmount)
        }
      )
    );
}

function checkAllocationMismatch(payment, allocatedAmount) {
  if (!payment) {
    return [];
  }

  const paymentAmount = asNumber(payment.amount);
  if (paymentAmount !== asNumber(allocatedAmount)) {
    return [
      buildAlert(
        "PAYMENT_ALLOCATION_MISMATCH",
        "CRITICAL",
        "Payment allocations do not add up to the recorded repayment amount.",
        {
          loanId: payment.loanId,
          repaymentId: payment.id,
          paymentAmount,
          allocatedAmount: asNumber(allocatedAmount)
        }
      )
    ];
  }

  return [];
}

function checkMultipleActiveLoans(userId, activeLoanCount) {
  if (!userId || activeLoanCount <= 1) {
    return [];
  }

  return [
    buildAlert(
      "MULTIPLE_ACTIVE_LOANS",
      "WARNING",
      "User has multiple active loans.",
      { userId, activeLoanCount }
    )
  ];
}

function checkDuplicatePendingRequests(userId, pendingRequestCount) {
  if (!userId || pendingRequestCount <= 1) {
    return [];
  }

  return [
    buildAlert(
      "DUPLICATE_PENDING_REQUESTS",
      "WARNING",
      "User has multiple pending loan requests.",
      { userId, pendingRequestCount }
    )
  ];
}

function checkUnusualPaymentSize(paymentAmount, remainingBalanceBeforePayment, contextMetadata = {}) {
  const amount = asNumber(paymentAmount);
  const remaining = asNumber(remainingBalanceBeforePayment);
  if (!amount || !remaining) {
    return [];
  }

  if (amount > remaining * 1.1) {
    return [
      buildAlert(
        "UNUSUAL_PAYMENT_SIZE",
        "WARNING",
        "Repayment amount is unusually high relative to the remaining loan balance.",
        {
          ...contextMetadata,
          paymentAmount: amount,
          remainingBalanceBeforePayment: remaining
        }
      )
    ];
  }

  return [];
}

function checkRapidRepeatedPayments(loanId, rapidPaymentCount) {
  if (!loanId || rapidPaymentCount <= 3) {
    return [];
  }

  return [
    buildAlert(
      "RAPID_REPEATED_PAYMENTS",
      "WARNING",
      "More than three repayments were recorded for the same loan within 10 seconds.",
      { loanId, rapidPaymentCount }
    )
  ];
}

function checkSystemErrorRate(errorRate, requestCount) {
  if (requestCount <= 0 || errorRate <= 5) {
    return [];
  }

  return [
    buildAlert(
      "SYSTEM_ERROR_RATE",
      "WARNING",
      "API error rate exceeded 5% in the last minute.",
      { errorRate, requestCount }
    )
  ];
}

module.exports = {
  asNumber,
  checkAllocationMismatch,
  checkDuplicatePendingRequests,
  checkMultipleActiveLoans,
  checkNegativeBalance,
  checkRapidRepeatedPayments,
  checkScheduleOverpayment,
  checkSystemErrorRate,
  checkUnusualPaymentSize
};
