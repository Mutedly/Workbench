import { useMemo, useState } from 'react';
import { useWorkbench } from './WorkbenchLayout';
import {
  computeMonthStats, fmtHours, money, monthLabel, parseKey, shiftGross, shiftHours,
  shiftsInMonth, startOfWeek, toKey,
} from '../calc';
import { Progress, Stat } from '../components/ui';
import PayBreakdown from '../components/PayBreakdown';
import { IconChevL, IconChevR } from '../components/Icons';

export default function Summary() {
  const { workbench, shifts } = useWorkbench();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const stats = computeMonthStats(workbench, shifts, year, month0);
  const cur = workbench.currency;

  const weeks = useMemo(() => {
    const monthShifts = shiftsInMonth(shifts, year, month0).filter((s) => s.entry_type === 'work');
    const map = new Map<string, { label: string; hours: number; gross: number }>();
    for (const s of monthShifts) {
      const wk = toKey(startOfWeek(parseKey(s.date)));
      if (!map.has(wk)) {
        const mon = parseKey(wk);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        map.set(wk, { label: `${mon.toLocaleDateString(undefined, o)}–${sun.toLocaleDateString(undefined, o)}`, hours: 0, gross: 0 });
      }
      const b = map.get(wk)!;
      b.hours += shiftHours(s);
      b.gross += shiftGross(s, workbench);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [shifts, workbench, year, month0]);

  const maxWeek = Math.max(1, ...weeks.map((w) => w.hours));
  const move = (d: number) => setCursor(new Date(year, month0 + d, 1));

  return (
    <div>
      <div className="page-head">
        <h2>Monthly Summary</h2>
        <div className="row-tight">
          <button className="btn btn-icon" onClick={() => move(-1)}><IconChevL /></button>
          <span style={{ fontWeight: 700, minWidth: 140, textAlign: 'center' }}>{monthLabel(year, month0)}</span>
          <button className="btn btn-icon" onClick={() => move(1)}><IconChevR /></button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PayBreakdown tax={stats.tax} currency={cur} title={`${monthLabel(year, month0)} pay`}
          note={stats.tax.model === 'israel' ? 'Israeli tax 2026' : undefined} />
      </div>

      <div className="grid grid-stats">
        <Stat label="Hours worked" value={fmtHours(stats.totalHours)} sub={`${stats.shiftsCount} shifts`} />
        <Stat label="Expected net income" value={money(stats.projectedTax.net, cur)}
          accent="var(--primary-text)" sub="at current pace" />
        <Stat label="Avg hours / shift" value={fmtHours(stats.avgHoursPerShift)} />
        <Stat label="Avg earnings / shift" value={money(stats.avgEarningsPerShift, cur)} />
        <Stat label="Overtime hours" value={fmtHours(stats.overtimeHours)} />
        <Stat label="Projected hours" value={fmtHours(stats.projectedHours)} sub="end of month" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 4 }}>Monthly goal</h3>
          <p className="subtle" style={{ marginBottom: 14 }}>
            {fmtHours(stats.totalHours)} of {fmtHours(stats.targetHours)} target
          </p>
          <Progress pct={stats.progressPct} />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span className="badge">{Math.round(stats.progressPct)}% complete</span>
            <span className="badge gray">{fmtHours(stats.remainingHours)} remaining</span>
          </div>

          <div className="divider" style={{ margin: '18px 0' }} />
          <h3 style={{ marginBottom: 14 }}>Hours by week</h3>
          {weeks.length === 0 ? (
            <p className="subtle">No shifts this month yet.</p>
          ) : (
            <div className="bars">
              {weeks.map((w, i) => (
                <div className="bar-col" key={i}>
                  <span className="bar-val">{fmtHours(w.hours)}</span>
                  <div className="bar" style={{ height: `${(w.hours / maxWeek) * 100}%` }} title={money(w.gross, cur)} />
                  <span className="bar-label">{w.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 14 }}>Time off & breakdown</h3>
          <BreakRow label="Vacation used" value={`${stats.vacationUsed} / ${workbench.vacation_days_total} days`} />
          <BreakRow label="Sick used" value={`${stats.sickUsed} / ${workbench.sick_days_total} days`} />
          <BreakRow label="Pay model" value={workbench.salary_mode === 'hourly' ? `${money(workbench.default_rate, cur)}/h` : 'Monthly salary'} />
          <BreakRow label="Deductions" value={workbench.tax_rate > 0 ? `${workbench.tax_rate}%` : 'None'} />
          <BreakRow label="Days elapsed" value={`${stats.daysElapsed} / ${stats.daysTotal}`} />
          {workbench.notes && (
            <>
              <div className="divider" style={{ margin: '14px 0' }} />
              <div className="subtle" style={{ whiteSpace: 'pre-wrap' }}>{workbench.notes}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="subtle">{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
