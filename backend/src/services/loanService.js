function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0));
}

function calculateInstallment(totalRepayableAmount, termDays) {
  if (!termDays) {
    return 0;
  }

  return Math.floor(roundCurrency(totalRepayableAmount) / termDays);
}

function getScheduleRemainingAmount(schedule) {
  return Math.max(0, roundCurrency(Number(schedule.expectedAmount || 0) - Number(schedule.paidAmount || 0)));
}

function generateRepaymentSchedule({ totalRepayableAmount, termDays, disbursedAt }) {
  const baseDate = disbursedAt ? new Date(disbursedAt) : new Date();
  const normalizedTotal = roundCurrency(totalRepayableAmount);
  const baseInstallmentAmount = calculateInstallment(normalizedTotal, termDays);
  const remainder = Math.max(0, normalizedTotal - (baseInstallmentAmount * termDays));

  return Array.from({ length: termDays }).map((_, index) => ({
    dueDate: addDays(baseDate, index + 1),
    expectedAmount: baseInstallmentAmount + (index < remainder ? 1 : 0),
    paidAmount: 0,
    status: "PENDING"
  }));
}

function getLateDays(dueDate, resolvedAt = null, referenceDate = new Date()) {
  const due = new Date(dueDate);
  const effectiveDate = resolvedAt ? new Date(resolvedAt) : new Date(referenceDate);
  const diffDays = Math.floor((effectiveDate - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function evaluateRepaymentSchedule(schedule, referenceDate = new Date()) {
  const remainingAmount = getScheduleRemainingAmount(schedule);
  const isPaid = remainingAmount === 0;
  const lateDays = getLateDays(schedule.dueDate, isPaid ? schedule.updatedAt : null, referenceDate);

  if (isPaid) {
    return { status: "PAID", lateDays, remainingAmount, isOverdue: false };
  }

  const isOverdue = lateDays > 0;
  const status = Number(schedule.paidAmount || 0) > 0 ? "PARTIAL" : "PENDING";

  return { status, lateDays, remainingAmount, isOverdue };
}

function evaluatePaymentStatus(payment, referenceDate = new Date()) {
  if (Object.prototype.hasOwnProperty.call(payment, "expectedAmount")) {
    return evaluateRepaymentSchedule(payment, referenceDate);
  }

  const lateDays = getLateDays(payment.dueDate, payment.paidDate, referenceDate);
  if (payment.paidDate) {
    return { status: lateDays > 7 ? "PAID_LATE" : "PAID", lateDays, remainingAmount: 0, isOverdue: false };
  }
  if (lateDays > 30) {
    return { status: "DEFAULTED", lateDays, remainingAmount: Number(payment.amountDue || 0), isOverdue: true };
  }
  if (lateDays > 7) {
    return { status: "LATE", lateDays, remainingAmount: Number(payment.amountDue || 0), isOverdue: true };
  }
  return { status: "PENDING", lateDays, remainingAmount: Number(payment.amountDue || 0), isOverdue: false };
}

function determineLoanLifecycle(payments, referenceDate = new Date()) {
  const evaluatedPayments = payments.map((payment) => {
    const evaluation = evaluatePaymentStatus(payment, referenceDate);
    return {
      ...payment,
      ...evaluation
    };
  });
  const hasDefault = evaluatedPayments.some((payment) => payment.isOverdue && payment.lateDays > 30);
  const fullyPaid = evaluatedPayments.length > 0 && evaluatedPayments.every((payment) => payment.status === "PAID");
  const daysLate = evaluatedPayments.reduce(
    (max, payment) => Math.max(max, Number(payment.lateDays || 0)),
    0
  );

  return {
    payments: evaluatedPayments,
    status: hasDefault ? "DEFAULTED" : fullyPaid ? "COMPLETED" : "ACTIVE",
    fullyPaid,
    daysLate
  };
}

function summarizeLoanPerformance(payments, referenceDate = new Date()) {
  const evaluated = payments.map((payment) => ({
    ...payment,
    ...evaluatePaymentStatus(payment, referenceDate)
  }));
  const hasDefault = evaluated.some((payment) => payment.isOverdue && payment.lateDays > 30);
  const hasLate = evaluated.some((payment) => payment.isOverdue);

  return {
    payments: evaluated,
    status: hasDefault ? "DEFAULTED" : hasLate ? "WARNING" : "HEALTHY"
  };
}

function allocateRepaymentAmount(schedules, amount) {
  let remainingPayment = roundCurrency(amount);
  const updatedSchedules = [];
  const allocations = [];

  for (const schedule of schedules) {
    if (remainingPayment <= 0) {
      break;
    }

    const remainingForThisSchedule = getScheduleRemainingAmount(schedule);
    if (remainingForThisSchedule <= 0) {
      continue;
    }

    const amountAllocated = roundCurrency(Math.min(remainingPayment, remainingForThisSchedule));
    const nextPaidAmount = roundCurrency(Number(schedule.paidAmount || 0) + amountAllocated);
    const nextRemainingAmount = roundCurrency(Number(schedule.expectedAmount || 0) - nextPaidAmount);

    updatedSchedules.push({
      id: schedule.id,
      paidAmount: nextPaidAmount,
      status: nextRemainingAmount === 0 ? "PAID" : "PARTIAL"
    });
    allocations.push({
      scheduleId: schedule.id,
      amountAllocated
    });

    remainingPayment = roundCurrency(remainingPayment - amountAllocated);
  }

  return {
    allocations,
    updatedSchedules,
    remainingPayment
  };
}

module.exports = {
  allocateRepaymentAmount,
  calculateInstallment,
  determineLoanLifecycle,
  generateRepaymentSchedule,
  evaluatePaymentStatus,
  getScheduleRemainingAmount,
  summarizeLoanPerformance
};
