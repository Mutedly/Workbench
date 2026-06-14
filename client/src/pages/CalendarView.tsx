import { useMemo, useState } from 'react';
import { useWorkbench } from './WorkbenchLayout';
import {
  computeMonthStats, daysInMonth, fmtHours, money, monthLabel, shiftHours, toKey,
} from '../calc';
import type { Shift } from '../types';
import ShiftModal from '../components/ShiftModal';
import { Progress } from '../components/ui';
import { IconChevL, IconChevR, IconPlus } from '../components/Icons';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView() {
  const { workbench, shifts, addShift, addShifts, editShift, removeShift } = useWorkbench();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [modal, setModal] = useState<{ shift: Shift | null; date: string } | null>(null);

  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const stats = computeMonthStats(workbench, shifts, year, month0);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    for (const s of shifts) (map[s.date] ||= []).push(s);
    return map;
  }, [shifts]);

  const cells = useMemo(() => {
    const firstDow = (new Date(year, month0, 1).getDay() + 6) % 7; // Mon=0
    const total = daysInMonth(year, month0);
    const out: { key: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) {
      const d = new Date(year, month0, 1 - (firstDow - i));
      out.push({ key: toKey(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= total; d++) out.push({ key: toKey(new Date(year, month0, d)), day: d, inMonth: true });
    while (out.length % 7 !== 0) {
      const d = new Date(year, month0, total + (out.length % 7));
      const last = out[out.length - 1];
      const nd = new Date(last.key); nd.setDate(nd.getDate() + 1);
      out.push({ key: toKey(nd), day: nd.getDate(), inMonth: false });
    }
    return out;
  }, [year, month0]);

  const move = (delta: number) => setCursor(new Date(year, month0 + delta, 1));
  const todayKey = toKey(today);

  return (
    <div>
      <div className="page-head">
        <div className="row-tight">
          <span className="dot" style={{ background: workbench.color, width: 14, height: 14 }} />
          <h2>{workbench.name}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ shift: null, date: todayKey })}>
          <IconPlus size={16} /> Add shift
        </button>
      </div>

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="label">Hours</div>
          <div className="value">{fmtHours(stats.totalHours)}</div>
          <div className="sub">{stats.shiftsCount} shifts</div>
        </div>
        <div className="stat">
          <div className="label">{workbench.tax_rate > 0 ? 'Net salary' : 'Gross salary'}</div>
          <div className="value" style={{ color: 'var(--success)' }}>
            {money(workbench.tax_rate > 0 ? stats.net : stats.gross, workbench.currency)}
          </div>
          <div className="sub">{workbench.tax_rate > 0 ? `${money(stats.gross, workbench.currency)} gross` : 'this month'}</div>
        </div>
        <div className="stat">
          <div className="label">Goal progress</div>
          <div className="value">{Math.round(stats.progressPct)}%</div>
          <div style={{ marginTop: 8 }}><Progress pct={stats.progressPct} /></div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3>{monthLabel(year, month0)}</h3>
          <div className="row-tight">
            <button className="btn btn-icon" onClick={() => move(-1)}><IconChevL /></button>
            <button className="btn btn-sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
            <button className="btn btn-icon" onClick={() => move(1)}><IconChevR /></button>
          </div>
        </div>

        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((c) => {
            const dayShifts = shiftsByDate[c.key] || [];
            const dayHours = dayShifts.reduce((a, s) => a + shiftHours(s), 0);
            const dow = new Date(c.key).getDay();
            const weekend = dow === 0 || dow === 6;
            return (
              <div
                key={c.key}
                className={`cal-cell ${c.inMonth ? '' : 'muted'} ${c.key === todayKey ? 'today' : ''} ${weekend ? 'weekend' : ''}`}
                onClick={() => setModal({ shift: null, date: c.key })}
              >
                <div className="cal-daynum">
                  <span>{c.day}</span>
                  {dayHours > 0 && <span className="hrs">{fmtHours(dayHours)}</span>}
                </div>
                {dayShifts.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className={`cal-chip ${s.entry_type === 'vacation' ? 'vac' : s.entry_type === 'sick' ? 'sick' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setModal({ shift: s, date: s.date }); }}
                  >
                    {s.entry_type === 'work'
                      ? `${s.start_time ?? ''} ${s.title || ''}`.trim() || fmtHours(shiftHours(s))
                      : s.entry_type === 'vacation' ? '🏖 Vacation' : '🤒 Sick'}
                  </div>
                ))}
                {dayShifts.length > 3 && <div className="subtle" style={{ fontSize: 11 }}>+{dayShifts.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <ShiftModal
          workbench={workbench}
          shift={modal.shift}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
          addShift={addShift}
          addShifts={addShifts}
          editShift={editShift}
          removeShift={removeShift}
        />
      )}
    </div>
  );
}
