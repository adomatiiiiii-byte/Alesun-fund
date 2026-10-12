export function StatusBadge({ value }) {
  const variant = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <span className={`badge badge-${variant}`}>{value}</span>;
}
