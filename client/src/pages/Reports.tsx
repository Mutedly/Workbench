import { useMemo, useState } from 'react';
import { useWorkbench } from './WorkbenchLayout';
import { computeMonthStats, fmtHours, money, shiftGross, shiftHours } from '../calc';
import { Stat } from '../components/ui';

export default function Reports() {
  const { workbench, shifts } = useWorkbench();
  const cur = workbench.currency;
  const [range, setRange] = useState(6);

  const months = useMemo(() => {
    const now = new Date();
    const out: { label: string; hours: number; net: number; gross: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = computeMonthStats(workbench, shifts, d.getFullYear(), d.getMonth());
      out.push({
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        hours: s.totalHours,
        net: s.net,
        gross: s.gross,
      });
    }
    return out;
  }, [workbench, shifts, range]);

  const maxHours = Math.max(1, ...months.map((m) => m.hours));
  const maxNet = Math.max(1, ...months.map((m) => m.net));

  const tagBreakdown = useMemo(() => {
    const map: Record<string, { hours: number; gross: number; count: number }> = {};
    for (const s of shifts) {
      if (s.entry_type !== 'work') continue;
      const h = shiftHours(s);
      const g = shiftGross(s, workbench);
      const keys = s.tags.length ? s.tags : ['untagged'];
      for (const k of keys) {
        map[k] ||= { hours: 0, gross: 0, count: 0 };
        map[k].hours += h;
        map[k].gross += g;
        map[k].count += 1;
      }
    }
    return Object.entries(map).sort((a, b) => b[1].hours - a[1].hours);
  }, [shifts, workbench]);

  const totals = useMemo(() => {
    const work = shifts.filter((s) => s.entry_type === 'work');
    const hours = work.reduce((a, s) => a + shiftHours(s), 0);
    const gross = work.reduce((a, s) => a + shiftGross(s, workbench), 0);
    return {
      hours,
      gross,
      net: gross * (1 - workbench.tax_rate / 100),
      shifts: work.length,
      vacation: shifts.filter((s) => s.entry_type === 'vacation').length,
      sick: shifts.filter((s) => s.entry_type === 'sick').length,
    };
  }, [shifts, workbench]);

  const maxTagHours = Math.max(1, ...tagBreakdown.map(([, v]) => v.hours));

  return (
    <div>
      <div className="page-head">
        <h2>Reports & Analytics</h2>
        <select value={range} onChange={(e) => setRange(Number(e.target.value))} style={{ width: 'auto' }}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <div className="grid grid-stats">
        <Stat label="All-time hours" value={fmtHours(totals.hours)} sub={`${totals.shifts} shifts`} />
        <Stat label="All-time gross" value={money(totals.gross, cur)} />
        <Stat label="All-time net" value={money(totals.net, cur)} accent="var(--success)" />
        <Stat label="Time off taken" value={`${totals.vacation + totals.sick} days`} sub={`${totals.vacation} vacation · ${totals.sick} sick`} />
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Hours per month</h3>
        <p className="subtle" style={{ marginBottom: 10 }}>Worked hours over the selected range.</p>
        <div className="bars">
          {months.map((m, i) => (
            <div className="bar-col" key={i}>
              <span className="bar-val">{m.hours ? fmtHours(m.hours) : ''}</span>
              <div className="bar" style={{ height: `${(m.hours / maxHours) * 100}%` }} />
              <span className="bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Net earnings per month</h3>
        <p className="subtle" style={{ marginBottom: 10 }}>Estimated take-home pay over the selected range.</p>
        <div className="bars">
          {months.map((m, i) => (
            <div className="bar-col" key={i}>
              <span className="bar-val">{m.net ? money(m.net, cur) : ''}</span>
              <div className="bar" style={{ height: `${(m.net / maxNet) * 100}%`, background: 'linear-gradient(180deg, var(--success), #0ea5e9)' }} />
              <span className="bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Breakdown by tag</h3>
        {tagBreakdown.length === 0 ? (
          <p className="subtle">No work shifts logged yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tagBreakdown.map(([tag, v]) => (
              <div key={tag}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span className="badge gray">{tag}</span>
                  <span style={{ fontWeight: 700 }}>{fmtHours(v.hours)} · {money(v.gross, cur)} · {v.count} shifts</span>
                </div>
                <div className="progress"><span style={{ width: `${(v.hours / maxTagHours) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
