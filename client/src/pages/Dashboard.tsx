import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useData } from '../data';
import { subscribeRealtime } from '../realtime';
import { useAuth } from '../auth';
import type { Shift, ShiftDraft, Workbench } from '../types';
import { computeMonthStats, fmtHours, money, parseKey, todayKey } from '../calc';
import { Progress } from '../components/ui';
import ShiftModal from '../components/ShiftModal';
import { IconPlus, IconClock, IconMoney, IconTarget } from '../components/Icons';

export default function Dashboard() {
  const { workbenches, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shiftsByWb, setShiftsByWb] = useState<Record<number, Shift[]>>({});
  const [quickAdd, setQuickAdd] = useState<Workbench | null>(null);

  useEffect(() => {
    let cancelled = false;
    workbenches.forEach((wb) => {
      api.listShifts(wb.id).then((sh) => {
        if (!cancelled) setShiftsByWb((p) => ({ ...p, [wb.id]: sh }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [workbenches]);

  // Live-refresh a workbench's shifts when they change elsewhere.
  useEffect(() => {
    return subscribeRealtime((event) => {
      if (event.kind === 'shifts' && event.workbenchId) {
        const id = event.workbenchId;
        api.listShifts(id).then((sh) => setShiftsByWb((p) => ({ ...p, [id]: sh }))).catch(() => {});
      }
    });
  }, []);

  const now = new Date();

  if (loading) return <div className="spinner" />;

  const greeting = (() => {
    const h = now.getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const name = user?.name?.split(' ')[0];
    return name ? `${part}, ${name}` : part;
  })();

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{greeting} 👋</h2>
          <p className="subtle">Here's how your income is shaping up this month.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')}><IconPlus size={16} /> New Workbench</button>
      </div>

      {workbenches.length === 0 ? (
        <div className="card card-pad empty">
          <div className="big">🧰</div>
          <h3>Create your first Workbench</h3>
          <p>A Workbench is one job, client, or income source. Add one to start tracking hours and pay.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/new')}>
            <IconPlus size={16} /> Create Workbench
          </button>
        </div>
      ) : (
        <>
          <OverallStrip workbenches={workbenches} shiftsByWb={shiftsByWb} />
          <div className="grid grid-cards" style={{ marginTop: 18 }}>
            {workbenches.map((wb) => (
              <WorkbenchCard
                key={wb.id}
                wb={wb}
                shifts={shiftsByWb[wb.id] || []}
                onOpen={() => navigate(`/workbench/${wb.id}/calendar`)}
                onQuickAdd={() => setQuickAdd(wb)}
              />
            ))}
          </div>
        </>
      )}

      {quickAdd && (
        <ShiftModal
          workbench={quickAdd}
          shift={null}
          defaultDate={todayKey()}
          onClose={() => setQuickAdd(null)}
          addShift={async (d: ShiftDraft) => {
            const s = await api.createShift(quickAdd.id, d);
            setShiftsByWb((p) => ({ ...p, [quickAdd.id]: [s, ...(p[quickAdd.id] || [])] }));
            return s;
          }}
          addShifts={async (ds: ShiftDraft[]) => {
            const created = await api.createShifts(quickAdd.id, ds);
            setShiftsByWb((p) => ({ ...p, [quickAdd.id]: [...created, ...(p[quickAdd.id] || [])] }));
            return created;
          }}
          editShift={async (id, d) => {
            const s = await api.updateShift(quickAdd.id, id, d);
            setShiftsByWb((p) => ({ ...p, [quickAdd.id]: (p[quickAdd.id] || []).map((x) => (x.id === id ? s : x)) }));
            return s;
          }}
          removeShift={async (id) => {
            await api.deleteShift(quickAdd.id, id);
            setShiftsByWb((p) => ({ ...p, [quickAdd.id]: (p[quickAdd.id] || []).filter((x) => x.id !== id) }));
          }}
        />
      )}
    </div>
  );
}

function OverallStrip({ workbenches, shiftsByWb }: { workbenches: Workbench[]; shiftsByWb: Record<number, Shift[]> }) {
  const now = new Date();
  const totals = useMemo(() => {
    let hours = 0;
    const byCurrency: Record<string, number> = {};
    for (const wb of workbenches) {
      const stats = computeMonthStats(wb, shiftsByWb[wb.id] || [], now.getFullYear(), now.getMonth());
      hours += stats.totalHours;
      byCurrency[wb.currency] = (byCurrency[wb.currency] || 0) + stats.planned.net;
    }
    return { hours, byCurrency };
  }, [workbenches, shiftsByWb]);

  const incomeParts = Object.entries(totals.byCurrency)
    .filter(([, v]) => v > 0)
    .map(([cur, v]) => money(v, cur));

  return (
    <div className="grid grid-stats">
      <div className="stat">
        <div className="label">Workbenches</div>
        <div className="value">{workbenches.length}</div>
        <div className="sub">income sources tracked</div>
      </div>
      <div className="stat">
        <div className="label">Hours this month</div>
        <div className="value">{fmtHours(totals.hours)}</div>
        <div className="sub">across all workbenches</div>
      </div>
      <div className="stat">
        <div className="label">Planned net income</div>
        <div className="value" style={{ color: 'var(--success)', fontSize: incomeParts.length > 1 ? 18 : 26 }}>
          {incomeParts.length ? incomeParts.join(' + ') : '—'}
        </div>
        <div className="sub">net · all shifts entered this month</div>
      </div>
    </div>
  );
}

function WorkbenchCard({ wb, shifts, onOpen, onQuickAdd }: {
  wb: Workbench; shifts: Shift[]; onOpen: () => void; onQuickAdd: () => void;
}) {
  const now = new Date();
  const stats = computeMonthStats(wb, shifts, now.getFullYear(), now.getMonth());
  const lastShift = useMemo(
    () => [...shifts].filter((s) => s.entry_type === 'work').sort((a, b) => b.date.localeCompare(a.date))[0],
    [shifts],
  );

  return (
    <div className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={onOpen}>
      <div className="wb-card-top" style={{ background: wb.color }} />
      <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot" style={{ background: wb.color }} /> {wb.name}
            </h3>
            <span className="badge gray" style={{ marginTop: 6 }}>
              {wb.salary_mode === 'hourly' ? `${money(wb.default_rate, wb.currency)}/h` : 'Monthly salary'}
            </span>
          </div>
          <button className="btn btn-icon btn-primary" title="Quick add shift"
            onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}>
            <IconPlus size={16} />
          </button>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <MiniStat icon={<IconClock size={15} />} label="Hours" value={fmtHours(stats.totalHours)} />
          <MiniStat icon={<IconMoney size={15} />} label="Est. net"
            value={money(stats.net, wb.currency)} accent="var(--success)" />
        </div>

        <div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span className="subtle"><IconTarget size={13} /> Monthly goal</span>
            <span style={{ fontWeight: 700 }}>{Math.round(stats.progressPct)}%</span>
          </div>
          <Progress pct={stats.progressPct} />
          <div className="subtle" style={{ marginTop: 6, fontSize: 12 }}>
            {fmtHours(stats.totalHours)} of {fmtHours(stats.targetHours)} · {fmtHours(stats.remainingHours)} to go
          </div>
        </div>

        <div className="divider" />
        <div className="subtle" style={{ fontSize: 13 }}>
          {lastShift
            ? <>Last shift: <strong style={{ color: 'var(--text)' }}>{parseKey(lastShift.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>{lastShift.title ? ` · ${lastShift.title}` : ''}</>
            : 'No shifts logged yet'}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--bg-elev-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
      <div className="subtle" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>{icon} {label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4, color: accent }}>{value}</div>
    </div>
  );
}
