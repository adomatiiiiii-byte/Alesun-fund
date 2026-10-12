function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNumericString(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasPositiveNumber(value) {
  const parsed = parseNumericString(value);
  return parsed !== null && parsed > 0;
}

function hasNonNegativeNumber(value) {
  const parsed = parseNumericString(value);
  return parsed !== null && parsed >= 0;
}

function hasSixNonNegativeValues(values = []) {
  return Array.isArray(values) && values.length === 6 && values.every((value) => hasNonNegativeNumber(value));
}

function hasFiles(bucket) {
  return Array.isArray(bucket) && bucket.length > 0;
}

export function isApplicantFormSubmittable(form, files) {
  return (
    hasText(form.businessName) &&
    hasText(form.industry) &&
    hasText(form.location) &&
    hasNonNegativeNumber(form.yearsInOperation) &&
    hasSixNonNegativeValues(form.monthlyRevenue) &&
    hasSixNonNegativeValues(form.monthlyExpenses) &&
    hasPositiveNumber(form.loanRequestAmount) &&
    hasText(form.loanPurpose) &&
    hasText(form.ownerName) &&
    hasText(form.ownerPhone) &&
    hasText(form.idNumber) &&
    hasNonNegativeNumber(form.cashAtBank) &&
    hasNonNegativeNumber(form.outstandingDebt) &&
    form.termsAccepted === true &&
    hasFiles(files.businessPhotos) &&
    hasFiles(files.passportPhoto) &&
    hasFiles(files.idFrontImage) &&
    hasFiles(files.idBackImage) &&
    hasFiles(files.financialRecords)
  );
}
