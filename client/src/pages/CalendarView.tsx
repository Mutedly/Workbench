import { useMemo, useRef, useState } from 'react';
import { useWorkbench } from './WorkbenchLayout';
import {
  computeMonthStats, daysInMonth, fmtHours, money, monthLabel, parseKey, shiftGross, shiftHours, toKey,
} from '../calc';
import type { Shift } from '../types';
import ShiftModal from '../components/ShiftModal';
import PayBreakdown from '../components/PayBreakdown';
import DayDetails from '../components/DayDetails';
import { Progress } from '../components/ui';
import { IconChevL, IconChevR, IconPlus } from '../components/Icons';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView() {
  const { workbench, shifts, addShift, addShifts, editShift, removeShift } = useWorkbench();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [modal, setModal] = useState<{ shift: Shift | null; date: string } | null>(null);
  const [dayModal, setDayModal] = useState<string | null>(null);

  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [bestMetric, setBestMetric] = useState<'hours' | 'money'>('money');
  const draggedRef = useRef(false);

  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const stats = computeMonthStats(workbench, shifts, year, month0);

  const moveShiftTo = (shift: Shift, targetDate: string) => {
    if (shift.date === targetDate) return;
    editShift(shift.id, {
      date: targetDate,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      title: shift.title,
      notes: shift.notes,
      custom_rate: shift.custom_rate,
      tags: shift.tags,
      entry_type: shift.entry_type,
      paid_break: shift.paid_break,
    }).catch(() => {});
  };

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    for (const s of shifts) (map[s.date] ||= []).push(s);
    return map;
  }, [shifts]);

  const daysTotal = daysInMonth(year, month0);

  const info = useMemo(() => {
    const monthWork = shifts.filter((s) => {
      const d = parseKey(s.date);
      return d.getFullYear() === year && d.getMonth() === month0 && s.entry_type === 'work' && shiftHours(s, workbench) > 0;
    });
    const activeDays = new Set(monthWork.map((s) => s.date)).size;
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month0;
    const todayK = toKey(today);

    // best day by hours and by money
    const byDate: Record<string, { hours: number; gross: number }> = {};
    let earnedHours = 0;
    let earnedDays = 0;
    const earnedDateSet = new Set<string>();
    for (const s of monthWork) {
      const h = shiftHours(s, workbench);
      const g = shiftGross(s, workbench);
      (byDate[s.date] ||= { hours: 0, gross: 0 });
      byDate[s.date].hours += h;
      byDate[s.date].gross += g;
      if (s.date <= todayK) { earnedHours += h; earnedDateSet.add(s.date); }
    }
    earnedDays = earnedDateSet.size;
    let bestHoursDay: { date: string; hours: number; gross: number } | null = null;
    let bestMoneyDay: { date: string; hours: number; gross: number } | null = null;
    for (const [date, v] of Object.entries(byDate)) {
      if (!bestHoursDay || v.hours > bestHoursDay.hours) bestHoursDay = { date, ...v };
      if (!bestMoneyDay || v.gross > bestMoneyDay.gross) bestMoneyDay = { date, ...v };
    }

    // pace vs goal — how many hours ahead/behind the expected pace by now
    const daysElapsed = isThisMonth ? today.getDate() : daysTotal;
    const weeksElapsed = Math.max(daysElapsed / 7, 0.001);
    const avgShiftHours = earnedDays > 0 ? earnedHours / earnedDays : 8;
    let weeklyHoursGoal = 0;
    if (workbench.plan_enabled && workbench.min_hours_per_week > 0) {
      weeklyHoursGoal = workbench.min_hours_per_week;
    } else if (workbench.plan_enabled && workbench.min_shifts_per_week > 0) {
      weeklyHoursGoal = workbench.min_shifts_per_week * avgShiftHours;
    } else if (workbench.monthly_hour_target > 0) {
      weeklyHoursGoal = workbench.monthly_hour_target / (daysTotal / 7);
    }
    const expectedByNow = weeklyHoursGoal * weeksElapsed;
    const paceDiff = earnedHours - expectedByNow;
    const hasGoal = weeklyHoursGoal > 0;

    return { activeDays, bestHoursDay, bestMoneyDay, paceDiff, hasGoal };
  }, [shifts, workbench, year, month0, daysTotal, today]);

  const pace = (() => {
    if (!info.hasGoal) return { cls: 'flat', text: 'No goal set' };
    const mag = Math.abs(info.paceDiff);
    if (mag < 0.5) return { cls: 'flat', text: 'On pace' };
    return info.paceDiff > 0
      ? { cls: 'up', text: `On track · +${fmtHours(mag)} ahead` }
      : { cls: 'down', text: `Behind · −${fmtHours(mag)}` };
  })();

  const bestDay = bestMetric === 'money' ? info.bestMoneyDay : info.bestHoursDay;

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
          <div className="sub">
            {stats.shiftsCount} shifts · <span className={`trend ${pace.cls}`}>{pace.text}</span>
          </div>
        </div>
        <div className="stat">
          <div className="label" style={{ justifyContent: 'space-between' }}>
            <span>Best day</span>
            <span className="mini-seg">
              <button className={bestMetric === 'hours' ? 'on' : ''} onClick={() => setBestMetric('hours')}>Hours</button>
              <button className={bestMetric === 'money' ? 'on' : ''} onClick={() => setBestMetric('money')}>Money</button>
            </span>
          </div>
          {bestDay ? (
            <>
              <div className="value" style={{ color: 'var(--success)' }}>
                {bestMetric === 'money' ? money(bestDay.gross, workbench.currency) : fmtHours(bestDay.hours)}
              </div>
              <div className="sub">
                {parseKey(bestDay.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {bestMetric === 'money' ? fmtHours(bestDay.hours) : money(bestDay.gross, workbench.currency)}
              </div>
            </>
          ) : (
            <>
              <div className="value">—</div>
              <div className="sub">no shifts yet</div>
            </>
          )}
        </div>
        <div className="stat">
          <div className="label">Forecast income</div>
          <div className="value" style={{ color: 'var(--primary-text)' }}>
            {money(stats.forecast.net, workbench.currency)}
          </div>
          <div className="sub">net · ≈{fmtHours(stats.forecastHours)} projected · {money(stats.earned.net, workbench.currency)} earned</div>
        </div>
        <div className="stat stat-split">
          <div className="split-col">
            <div className="label">Active days</div>
            <div className="value">
              {info.activeDays} <span className="of">/ {daysTotal}</span>
            </div>
            <div className="sub">days with a shift</div>
            <div style={{ marginTop: 8 }}><Progress pct={daysTotal ? (info.activeDays / daysTotal) * 100 : 0} /></div>
          </div>
          <div className="split-line" />
          <div className="split-col">
            <div className="label">Goal progress</div>
            <div className="value">{Math.round(stats.progressPct)}%</div>
            <div className="sub">{fmtHours(stats.totalHours)} of {fmtHours(stats.targetHours)}</div>
            <div style={{ marginTop: 8 }}><Progress pct={stats.progressPct} /></div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PayBreakdown tax={stats.planned} currency={workbench.currency} title={`${monthLabel(year, month0)} · planned pay`}
          note={stats.planned.model === 'israel' ? 'Israeli tax 2026' : undefined} />
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
            const dayHours = dayShifts.reduce((a, s) => a + shiftHours(s, workbench), 0);
            const dow = new Date(c.key).getDay();
            const weekend = dow === 0 || dow === 6;
            return (
              <div
                key={c.key}
                className={`cal-cell ${c.inMonth ? '' : 'muted'} ${c.key === todayKey ? 'today' : ''} ${weekend ? 'weekend' : ''} ${dragOver === c.key ? 'dragover' : ''}`}
                onClick={() => (dayShifts.length >= 3 ? setDayModal(c.key) : setModal({ shift: null, date: c.key }))}
                onDragOver={(e) => {
                  if (dragId == null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOver !== c.key) setDragOver(c.key);
                }}
                onDragLeave={() => { if (dragOver === c.key) setDragOver(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData('text/plain')) || dragId;
                  const s = shifts.find((x) => x.id === id);
                  if (s) moveShiftTo(s, c.key);
                  setDragOver(null);
                  setDragId(null);
                }}
              >
                <div className="cal-daynum">
                  <span>{c.day}</span>
                  {dayHours > 0 && <span className="hrs">{fmtHours(dayHours)}</span>}
                </div>
                {dayShifts.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className={`cal-chip ${s.entry_type === 'vacation' ? 'vac' : s.entry_type === 'sick' ? 'sick' : ''} ${dragId === s.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      draggedRef.current = true;
                      setDragId(s.id);
                      e.dataTransfer.setData('text/plain', String(s.id));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => { setDragId(null); setDragOver(null); setTimeout(() => { draggedRef.current = false; }, 0); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (draggedRef.current) return;
                      setModal({ shift: s, date: s.date });
                    }}
                  >
                    {s.entry_type === 'work'
                      ? `${s.start_time ?? ''} ${s.title || ''}`.trim() || fmtHours(shiftHours(s, workbench))
                      : s.entry_type === 'vacation' ? '🏖 Vacation' : '🤒 Sick'}
                  </div>
                ))}
                {dayShifts.length > 3 && (
                  <div className="cal-more" onClick={(e) => { e.stopPropagation(); setDayModal(c.key); }}>
                    +{dayShifts.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {dayModal && (
        <DayDetails
          workbench={workbench}
          date={dayModal}
          shifts={shiftsByDate[dayModal] || []}
          onClose={() => setDayModal(null)}
          onEdit={(s) => { setDayModal(null); setModal({ shift: s, date: s.date }); }}
          onAdd={() => { const d = dayModal; setDayModal(null); setModal({ shift: null, date: d }); }}
        />
      )}

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
