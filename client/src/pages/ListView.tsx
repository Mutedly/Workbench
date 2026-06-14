import { useMemo, useState } from 'react';
import { useWorkbench } from './WorkbenchLayout';
import { fmtHours, money, parseKey, shiftGross, shiftHours, shiftRate, todayKey } from '../calc';
import type { Shift } from '../types';
import { SHIFT_TAGS } from '../types';
import { getToken } from '../api';
import ShiftModal from '../components/ShiftModal';
import { IconDownload, IconPlus } from '../components/Icons';

type SortKey = 'date' | 'hours' | 'earnings';

export default function ListView() {
  const { workbench, shifts, addShift, addShifts, editShift, removeShift } = useWorkbench();
  const [modal, setModal] = useState<{ shift: Shift | null; date: string } | null>(null);
  const [month, setMonth] = useState('all');
  const [type, setType] = useState('all');
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const s of shifts) set.add(s.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [shifts]);

  const rows = useMemo(() => {
    let list = shifts.map((s) => ({
      shift: s,
      hours: shiftHours(s),
      gross: shiftGross(s, workbench),
      rate: shiftRate(s, workbench),
    }));
    if (month !== 'all') list = list.filter((r) => r.shift.date.slice(0, 7) === month);
    if (type !== 'all') list = list.filter((r) => r.shift.entry_type === type);
    if (tag !== 'all') list = list.filter((r) => r.shift.tags.includes(tag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.shift.title.toLowerCase().includes(q) || r.shift.notes.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort === 'date') cmp = a.shift.date.localeCompare(b.shift.date);
      else if (sort === 'hours') cmp = a.hours - b.hours;
      else cmp = a.gross - b.gross;
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [shifts, workbench, month, type, tag, search, sort, dir]);

  const totals = useMemo(() => ({
    hours: rows.reduce((a, r) => a + r.hours, 0),
    gross: rows.reduce((a, r) => a + r.gross, 0),
  }), [rows]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setDir('desc'); }
  };
  const arrow = (key: SortKey) => (sort === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '');

  const exportCsv = async () => {
    const res = await fetch(`/api/workbenches/${workbench.id}/export.csv`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workbench.name.replace(/[^a-z0-9]/gi, '_')}_shifts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-head">
        <h2>{workbench.name} · Shifts</h2>
        <div className="row-tight">
          <button className="btn" onClick={exportCsv}><IconDownload size={16} /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => setModal({ shift: null, date: todayKey() })}>
            <IconPlus size={16} /> Add shift
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label>Search</label>
            <input placeholder="Title or notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 1 150px' }}>
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {parseKey(m + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '0 1 130px' }}>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="work">Work</option>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
            </select>
          </div>
          <div className="field" style={{ flex: '0 1 150px' }}>
            <label>Tag</label>
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="all">All tags</option>
              {SHIFT_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card card-pad empty">
          <div className="big">📋</div>
          <p>No shifts match your filters.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th onClick={() => toggleSort('date')}>Date{arrow('date')}</th>
                <th>Title</th>
                <th>Type / Tags</th>
                <th>Time</th>
                <th className="num" onClick={() => toggleSort('hours')}>Hours{arrow('hours')}</th>
                <th className="num">Rate</th>
                <th className="num" onClick={() => toggleSort('earnings')}>Earnings{arrow('earnings')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ shift: s, hours, gross, rate }) => (
                <tr key={s.id} onClick={() => setModal({ shift: s, date: s.date })}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {parseKey(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td>{s.title || <span className="muted-text">—</span>}</td>
                  <td>
                    <div className="row-tight" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {s.entry_type !== 'work' && (
                        <span className={`badge ${s.entry_type === 'vacation' ? 'green' : 'warn'}`}>{s.entry_type}</span>
                      )}
                      {s.tags.map((t) => <span key={t} className="badge gray">{t}</span>)}
                      {s.entry_type === 'work' && s.tags.length === 0 && <span className="muted-text">—</span>}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {s.entry_type === 'work' && s.start_time ? `${s.start_time}–${s.end_time}` : <span className="muted-text">—</span>}
                  </td>
                  <td className="num">{hours > 0 ? fmtHours(hours) : '—'}</td>
                  <td className="num">{s.entry_type === 'work' ? money(rate, workbench.currency) : '—'}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{gross > 0 ? money(gross, workbench.currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 800, background: 'var(--bg-elev-2)' }}>
                <td colSpan={4}>{rows.length} entries</td>
                <td className="num">{fmtHours(totals.hours)}</td>
                <td></td>
                <td className="num">{money(totals.gross, workbench.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
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
