const CURRENT_LOAN_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const STALE_LOAN_REQUEST_STATUSES = ["DELETED", "ARCHIVED", "CANCELLED", "TEST"];

function buildVisibleLoanRequestWhere(extraWhere = {}) {
  const where = {
    ...extraWhere,
    deletedAt: null,
    archivedAt: null,
    isTestData: false
  };

  if (!Object.prototype.hasOwnProperty.call(extraWhere, "status")) {
    where.status = { in: CURRENT_LOAN_REQUEST_STATUSES };
  }

  return where;
}

function buildOperationalLoanRequestWhere(statuses, extraWhere = {}) {
  return buildVisibleLoanRequestWhere({
    ...extraWhere,
    status: { in: statuses }
  });
}

function buildStaleLoanRequestWhere(extraWhere = {}) {
  return {
    ...extraWhere,
    OR: [
      { deletedAt: { not: null } },
      { archivedAt: { not: null } },
      { isTestData: true },
      { status: { in: STALE_LOAN_REQUEST_STATUSES } }
    ]
  };
}

module.exports = {
  CURRENT_LOAN_REQUEST_STATUSES,
  STALE_LOAN_REQUEST_STATUSES,
  buildVisibleLoanRequestWhere,
  buildOperationalLoanRequestWhere,
  buildStaleLoanRequestWhere
};
