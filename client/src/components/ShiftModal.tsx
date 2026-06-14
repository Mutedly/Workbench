import { useEffect, useMemo, useState } from 'react';
import type { EntryType, Shift, ShiftDraft, Workbench } from '../types';
import { SHIFT_TAGS } from '../types';
import { fmtHours, money, shiftGross, shiftHours, toKey } from '../calc';
import { IconClose, IconCopy, IconTrash, IconRepeat } from './Icons';

export interface ShiftHandlers {
  addShift: (draft: ShiftDraft) => Promise<Shift>;
  addShifts: (drafts: ShiftDraft[]) => Promise<Shift[]>;
  editShift: (id: number, draft: ShiftDraft) => Promise<Shift>;
  removeShift: (id: number) => Promise<void>;
}

interface Props extends ShiftHandlers {
  workbench: Workbench;
  shift: Shift | null;
  defaultDate: string;
  onClose: () => void;
}

const emptyDraft = (date: string): ShiftDraft => ({
  date,
  start_time: '09:00',
  end_time: '17:00',
  break_minutes: 30,
  title: '',
  notes: '',
  custom_rate: null,
  tags: [],
  entry_type: 'work',
});

export default function ShiftModal({
  workbench, shift, defaultDate, onClose, addShift, addShifts, editShift, removeShift,
}: Props) {
  const [draft, setDraft] = useState<ShiftDraft>(() =>
    shift
      ? {
          date: shift.date, start_time: shift.start_time, end_time: shift.end_time,
          break_minutes: shift.break_minutes, title: shift.title, notes: shift.notes,
          custom_rate: shift.custom_rate, tags: shift.tags, entry_type: shift.entry_type,
        }
      : emptyDraft(defaultDate),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly'>('weekly');
  const [repeatCount, setRepeatCount] = useState(4);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof ShiftDraft>(k: K, v: ShiftDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleTag = (tag: string) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));

  const preview = useMemo(() => {
    const tmp: Shift = { id: 0, workbench_id: workbench.id, created_at: '', ...draft };
    return { hours: shiftHours(tmp), gross: shiftGross(tmp, workbench) };
  }, [draft, workbench]);

  const isWork = draft.entry_type === 'work';

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (shift) {
        await editShift(shift.id, draft);
      } else if (repeat && repeatCount > 1) {
        const drafts: ShiftDraft[] = [];
        const [by, bm, bd] = draft.date.split('-').map(Number);
        for (let i = 0; i < repeatCount; i++) {
          const d = new Date(by, bm - 1, bd + i * (repeatFreq === 'weekly' ? 7 : 1));
          drafts.push({ ...draft, date: toKey(d) });
        }
        await addShifts(drafts);
      } else {
        await addShift(draft);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      await addShift({ ...draft });
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const del = async () => {
    if (!shift || !confirm('Delete this entry?')) return;
    setBusy(true);
    try {
      await removeShift(shift.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{shift ? 'Edit entry' : 'Add entry'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><IconClose /></button>
        </div>

        <div className="modal-body">
          {error && <div className="error-box">{error}</div>}

          <div className="seg">
            {(['work', 'vacation', 'sick'] as EntryType[]).map((t) => (
              <button key={t} className={draft.entry_type === t ? 'on' : ''} onClick={() => set('entry_type', t)}>
                {t === 'work' ? 'Work shift' : t === 'vacation' ? 'Vacation' : 'Sick'}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Date</label>
            <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          {isWork && (
            <>
              <div className="form-grid">
                <div className="field">
                  <label>Start time</label>
                  <input type="time" value={draft.start_time ?? ''} onChange={(e) => set('start_time', e.target.value)} />
                </div>
                <div className="field">
                  <label>End time</label>
                  <input type="time" value={draft.end_time ?? ''} onChange={(e) => set('end_time', e.target.value)} />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Break (minutes)</label>
                  <input type="number" min={0} value={draft.break_minutes}
                    onChange={(e) => set('break_minutes', Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Custom hourly rate <span className="hint">optional</span></label>
                  <input type="number" min={0} step="0.01" placeholder={`Default ${workbench.default_rate}`}
                    value={draft.custom_rate ?? ''}
                    onChange={(e) => set('custom_rate', e.target.value === '' ? null : Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label>Title <span className="hint">optional</span></label>
            <input value={draft.title} placeholder="e.g. Morning shift, Client call"
              onChange={(e) => set('title', e.target.value)} />
          </div>

          {isWork && (
            <div className="field">
              <label>Tags</label>
              <div className="row-tight" style={{ flexWrap: 'wrap' }}>
                {SHIFT_TAGS.map((t) => (
                  <span key={t} className={`tag-pill ${draft.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Notes <span className="hint">optional</span></label>
            <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {!shift && isWork && (
            <div className="card" style={{ padding: 14, background: 'var(--bg-elev-2)' }}>
              <label className="row-tight" style={{ cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                <IconRepeat size={16} /> Repeat this shift
              </label>
              {repeat && (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Frequency</label>
                    <select value={repeatFreq} onChange={(e) => setRepeatFreq(e.target.value as 'daily' | 'weekly')}>
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Occurrences</label>
                    <input type="number" min={2} max={60} value={repeatCount}
                      onChange={(e) => setRepeatCount(Math.max(2, Math.min(60, Number(e.target.value))))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {isWork && (
            <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
              <span className="subtle">This shift</span>
              <span>{fmtHours(preview.hours)} · {money(preview.gross, workbench.currency)}</span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div className="row-tight">
            {shift && (
              <>
                <button className="btn btn-danger btn-sm" onClick={del} disabled={busy}><IconTrash size={15} /> Delete</button>
                <button className="btn btn-sm" onClick={duplicate} disabled={busy}><IconCopy size={15} /> Duplicate</button>
              </>
            )}
          </div>
          <div className="row-tight">
            <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : shift ? 'Save' : repeat ? `Add ${repeatCount}` : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
