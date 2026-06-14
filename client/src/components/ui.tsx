import type { ReactNode } from 'react';

export function Stat({ label, value, sub, accent, info, highlight }: {
  label: string; value: ReactNode; sub?: ReactNode; accent?: string; info?: string; highlight?: boolean;
}) {
  return (
    <div className={`stat ${highlight ? 'stat-highlight' : ''}`}>
      <div className="label">
        {label}
        {info && <span className="info-dot" title={info} aria-label={info}>i</span>}
      </div>
      <div className="value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub != null && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Progress({ pct }: { pct: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
