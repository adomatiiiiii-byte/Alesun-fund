export function getTrailingMonthLabels(baseDate = new Date(), count = 6) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
  const anchorDate = new Date(baseDate);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - (count - index), 1);
    return formatter.format(date);
  });
}

export function getFinancialHistoryRows({
  revenue = [],
  expenses = [],
  baseDate = new Date()
}) {
  const labels = getTrailingMonthLabels(baseDate, Math.max(revenue.length, expenses.length, 6));

  return labels.map((label, index) => ({
    label,
    revenue: revenue[index],
    expenses: expenses[index]
  }));
}
