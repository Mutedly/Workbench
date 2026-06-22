import { useState } from 'react';
import type { Shift, Workbench } from '../types';
import { fmtHours, money, parseKey, shiftGross, shiftHours, shiftRate } from '../calc';
import { IconChevR, IconClose, IconPlus } from './Icons';

interface Props {
  workbench: Workbench;
  date: string;
  shifts: Shift[];
  onClose: () => void;
  onEdit: (s: Shift) => void;
  onAdd: () => void;
}

export default function DayDetails({ workbench, date, shifts, onClose, onEdit, onAdd }: Props) {
  const [view, setView] = useState<'list' | 'table'>('list');
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const cur = workbench.currency;
  const rows = shifts.map((s) => ({ s, hours: shiftHours(s, workbench), gross: shiftGross(s, workbench), rate: shiftRate(s, workbench) }));
  const totalHours = rows.reduce((a, r) => a + r.hours, 0);
  const totalGross = rows.reduce((a, r) => a + r.gross, 0);

  const heading = parseKey(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const typeBadge = (s: Shift) =>
    s.entry_type === 'work' ? null : (
      <span className={`badge ${s.entry_type === 'vacation' ? 'green' : 'warn'}`}>{s.entry_type}</span>
    );

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <div>
            <h3>{heading}</h3>
            <div className="subtle" style={{ marginTop: 2 }}>
              {shifts.length} {shifts.length === 1 ? 'entry' : 'entries'} · {fmtHours(totalHours)} · {money(totalGross, cur)}
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><IconClose /></button>
        </div>

        <div className="modal-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mini-seg">
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
              <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Compare</button>
            </span>
            <button className="btn btn-sm btn-primary" onClick={onAdd}><IconPlus size={15} /> Add shift</button>
          </div>

          {view === 'list' ? (
            <div>
              {rows.map(({ s, hours, gross, rate }) => {
                const isOpen = open.has(s.id);
                return (
                  <div className={`day-row ${isOpen ? 'open' : ''}`} key={s.id}>
                    <div className="day-row-head" onClick={() => toggle(s.id)}>
                      <span className={`chev ${isOpen ? 'open' : ''}`}><IconChevR size={16} /></span>
                      <span className="day-row-title">
                        {s.entry_type === 'work'
                          ? (s.title || `${s.start_time ?? ''}–${s.end_time ?? ''}`)
                          : (s.title || (s.entry_type === 'vacation' ? 'Vacation' : 'Sick day'))}
                        {' '}
                        {typeBadge(s)}
                      </span>
                      <span className="day-row-sum">{hours > 0 ? fmtHours(hours) : '—'} · {money(gross, cur)}</span>
                    </div>
                    {isOpen && (
                      <div className="day-row-body">
                        {s.entry_type === 'work' && (
                          <>
                            <KV k="Start" v={s.start_time ?? '—'} />
                            <KV k="End" v={s.end_time ?? '—'} />
                            <KV k="Break" v={`${s.break_minutes} min`} />
                            <KV k="Rate" v={money(rate, cur)} />
                            <KV k="Hours" v={fmtHours(hours)} />
                            <KV k="Earnings" v={money(gross, cur)} />
                          </>
                        )}
                        {s.tags.length > 0 && (
                          <div className="day-kv" style={{ gridColumn: '1 / -1' }}>
                            <div className="k">Tags</div>
                            <div className="row-tight" style={{ flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                              {s.tags.map((t) => <span key={t} className="badge gray">{t}</span>)}
                            </div>
                          </div>
                        )}
                        {s.notes && (
                          <div className="day-kv" style={{ gridColumn: '1 / -1' }}>
                            <div className="k">Notes</div>
                            <div className="v" style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{s.notes}</div>
                          </div>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <button className="btn btn-sm" onClick={() => onEdit(s)}>Edit entry</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Time</th>
                    <th className="num">Hours</th>
                    <th className="num">Rate</th>
                    <th className="num">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ s, hours, gross, rate }) => (
                    <tr key={s.id} onClick={() => onEdit(s)}>
                      <td>
                        {s.entry_type === 'work' ? (s.title || 'Shift') : (s.entry_type === 'vacation' ? 'Vacation' : 'Sick')}
                        {s.tags.length > 0 && <span className="muted-text"> · {s.tags.join(', ')}</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.entry_type === 'work' && s.start_time ? `${s.start_time}–${s.end_time}` : '—'}</td>
                      <td className="num">{hours > 0 ? fmtHours(hours) : '—'}</td>
                      <td className="num">{s.entry_type === 'work' ? money(rate, cur) : '—'}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{gross > 0 ? money(gross, cur) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg-elev-2)' }}>
                    <td colSpan={2}>Total</td>
                    <td className="num">{fmtHours(totalHours)}</td>
                    <td></td>
                    <td className="num">{money(totalGross, cur)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="day-kv">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
