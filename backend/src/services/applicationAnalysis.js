function parseNumeric(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasValue(value) {
  return value !== null && value !== undefined && !(typeof value === "string" && !value.trim());
}

function normalizeFinancialArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => parseNumeric(value));
}

function uniqueStoredNames(files) {
  return files
    .filter(Boolean)
    .map((file) => file.storedName || file.originalName || file.path || null)
    .filter(Boolean);
}

function getScreeningIssues(applicationData) {
  const issues = new Set();
  const monthlyRevenue = normalizeFinancialArray(applicationData.monthlyRevenue);
  const monthlyExpenses = normalizeFinancialArray(applicationData.monthlyExpenses);
  const yearsInOperation = parseNumeric(applicationData.yearsInOperation);
  const loanRequestAmount = parseNumeric(applicationData.loanRequestAmount);
  const cashAtBank = parseNumeric(applicationData.financialInfo?.cashAtBank);
  const outstandingDebt = parseNumeric(applicationData.financialInfo?.outstandingDebt);

  const requiredFields = [
    applicationData.businessName,
    applicationData.industry,
    applicationData.location,
    applicationData.ownerName,
    applicationData.ownerPhone,
    applicationData.idNumber,
    applicationData.loanPurpose
  ];

  if (requiredFields.some((value) => !hasValue(value))) {
    issues.add("Missing required application data");
  }

  if (
    !Array.isArray(applicationData.monthlyRevenue) ||
    !Array.isArray(applicationData.monthlyExpenses) ||
    applicationData.monthlyRevenue.length !== 6 ||
    applicationData.monthlyExpenses.length !== 6
  ) {
    issues.add("Missing financial data");
  }

  const hasInvalidNumericInput = [
    yearsInOperation,
    loanRequestAmount,
    cashAtBank,
    outstandingDebt,
    ...monthlyRevenue,
    ...monthlyExpenses
  ].some((value) => Number.isNaN(value) || value < 0);

  if (hasInvalidNumericInput) {
    issues.add("Invalid numeric inputs");
  }

  if (monthlyRevenue.length === 6 && monthlyExpenses.length === 6) {
    const monthsWithExpenseAboveRevenue = monthlyExpenses.filter(
      (expense, index) =>
        Number.isFinite(expense) &&
        Number.isFinite(monthlyRevenue[index]) &&
        expense > monthlyRevenue[index]
    ).length;

    if (monthsWithExpenseAboveRevenue >= 4) {
      issues.add("Expenses exceed revenue across recent trading months");
    }

    if (monthlyRevenue.every((value) => Number.isFinite(value) && value === 0)) {
      issues.add("Zero revenue reported across all recent months");
    }

    const averageRevenue = average(monthlyRevenue.filter((value) => Number.isFinite(value)));
    if ((averageRevenue === 0 && loanRequestAmount > 0) || loanRequestAmount > averageRevenue * 0.5) {
      issues.add("Loan request exceeds acceptable threshold");
    }
  }

  if (Number.isFinite(yearsInOperation) && yearsInOperation < 2) {
    issues.add("Business does not meet minimum operating years");
  }

  return Array.from(issues);
}

function getFraudFlags(applicationData) {
  const flags = new Set();
  const monthlyRevenue = normalizeFinancialArray(applicationData.monthlyRevenue).filter((value) =>
    Number.isFinite(value)
  );
  const monthlyExpenses = normalizeFinancialArray(applicationData.monthlyExpenses).filter((value) =>
    Number.isFinite(value)
  );
  const averageRevenue = average(monthlyRevenue);
  const averageExpenses = average(monthlyExpenses);
  const profitMargin = averageRevenue > 0 ? (averageRevenue - averageExpenses) / averageRevenue : 0;
  const yearsInOperation = parseNumeric(applicationData.yearsInOperation) || 0;
  const loanPurpose = String(applicationData.loanPurpose || "").toLowerCase();
  const industry = String(applicationData.industry || "").toLowerCase();
  const cashAtBank = parseNumeric(applicationData.financialInfo?.cashAtBank) || 0;
  const documents = applicationData.documents || applicationData.documentPaths || {};

  if (
    monthlyRevenue.length === 6 &&
    monthlyExpenses.length === 6 &&
    new Set(monthlyRevenue).size === 1 &&
    new Set(monthlyExpenses).size === 1 &&
    monthlyRevenue[0] !== 0
  ) {
    flags.add("Suspicious financial uniformity across months");
  }

  if (profitMargin > 0.9) {
    flags.add("Unrealistic profit margins");
  }

  if (averageRevenue >= 8000000 && averageExpenses <= averageRevenue * 0.12 && cashAtBank <= averageRevenue * 0.03) {
    flags.add("Inconsistent revenue vs operational activity");
  }

  const idFront = documents.idFrontImage || null;
  const idBack = documents.idBackImage || null;
  if ((idFront && !idBack) || (!idFront && idBack)) {
    flags.add("Potential document manipulation");
  }

  const comparedUploads = uniqueStoredNames([
    documents.passportPhoto,
    documents.idFrontImage,
    documents.idBackImage
  ]);
  if (new Set(comparedUploads).size !== comparedUploads.length) {
    flags.add("Potential document manipulation");
  }

  if (
    /(retail|agribusiness|construction|manufacturing|food|automotive|wholesale|trading)/.test(industry) &&
    profitMargin > 0.85
  ) {
    flags.add("Declared business type does not match financial behaviour");
  }

  if (
    /(nationwide|regional|international|export|franchise|chain|multiple branches|factory)/.test(loanPurpose) &&
    (averageRevenue < 5000000 || yearsInOperation < 2)
  ) {
    flags.add("Unrealistic scaling claims in loan purpose");
  }

  return Array.from(flags);
}

module.exports = {
  getScreeningIssues,
  getFraudFlags
};
