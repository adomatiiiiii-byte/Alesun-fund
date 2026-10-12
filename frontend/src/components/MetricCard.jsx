export function MetricCard({ label, value, hint }) {
  return (
    <article className="metricCard">
      <p className="metricLabel">{label}</p>
      <h3>{value}</h3>
      <span>{hint}</span>
    </article>
  );
}
