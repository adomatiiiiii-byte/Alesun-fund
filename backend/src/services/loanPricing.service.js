const PROCESSING_FEE_RATE = 0.02;
const MONTHLY_INTEREST_RATE = 0.18;
const LOAN_TERM_DAYS = 30;
const LOAN_TERM_LABEL = "1 month";

function roundCurrency(value) {
  return Math.round(Number(value || 0));
}

function calculateTransparentLoanPricing(principalAmount) {
  const normalizedPrincipalAmount = roundCurrency(principalAmount);
  const processingFee = roundCurrency(normalizedPrincipalAmount * PROCESSING_FEE_RATE);
  const interestAmount = roundCurrency(normalizedPrincipalAmount * MONTHLY_INTEREST_RATE);
  const disbursedAmount = Math.max(0, normalizedPrincipalAmount - processingFee);
  const totalRepayableAmount = normalizedPrincipalAmount + interestAmount;

  return {
    principalAmount: normalizedPrincipalAmount,
    processingFee,
    disbursedAmount,
    interestAmount,
    totalRepayableAmount,
    loanTerm: LOAN_TERM_LABEL,
    annualInterestRate: roundCurrency(MONTHLY_INTEREST_RATE * 100),
    termDays: LOAN_TERM_DAYS
  };
}

module.exports = {
  PROCESSING_FEE_RATE,
  MONTHLY_INTEREST_RATE,
  LOAN_TERM_DAYS,
  LOAN_TERM_LABEL,
  calculateTransparentLoanPricing,
  roundCurrency
};
