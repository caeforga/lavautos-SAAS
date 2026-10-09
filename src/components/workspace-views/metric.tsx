import type { ReactNode } from 'react';

export function Metric({ label, value, detail, icon, accent = false }: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return <section className={`metric ${accent ? 'accent' : ''}`}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div>
    <strong>{value}</strong>
    <p>{detail}</p>
  </section>;
}
