type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export function KpiCard({ title, value, subtitle }: Props) {
  return (
    <article className="kpi-card">
      <h3>{title}</h3>
      <p className="kpi-value">{value}</p>
      {subtitle && <small>{subtitle}</small>}
    </article>
  );
}
