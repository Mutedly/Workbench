import { useState } from 'react';
import type { SalaryMode, Workbench } from '../types';
import { CURRENCIES } from '../calc';

export type WbValues = Pick<
  Workbench,
  | 'name' | 'salary_mode' | 'default_rate' | 'monthly_salary' | 'monthly_contract_hours'
  | 'overtime_enabled' | 'overtime_daily_threshold' | 'overtime_multiplier'
  | 'weekend_multiplier' | 'holiday_multiplier' | 'night_multiplier'
  | 'vacation_days_total' | 'sick_days_total' | 'monthly_hour_target'
  | 'tax_rate' | 'currency' | 'color' | 'notes'
>;

export const defaultValues: WbValues = {
  name: '',
  salary_mode: 'hourly',
  default_rate: 25,
  monthly_salary: 4000,
  monthly_contract_hours: 160,
  overtime_enabled: 0,
  overtime_daily_threshold: 8,
  overtime_multiplier: 1.5,
  weekend_multiplier: 1,
  holiday_multiplier: 1,
  night_multiplier: 1,
  vacation_days_total: 20,
  sick_days_total: 10,
  monthly_hour_target: 160,
  tax_rate: 0,
  currency: 'USD',
  color: '#6366f1',
  notes: '',
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];

interface Props {
  initial: WbValues;
  submitLabel: string;
  onSubmit: (values: WbValues) => Promise<void>;
  onCancel?: () => void;
}

export default function WorkbenchForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<WbValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof WbValues>(k: K, val: WbValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const numField = (k: keyof WbValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Number(e.target.value) as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) { setError('Please give your workbench a name'); return; }
    setBusy(true);
    setError('');
    try {
      await onSubmit(v);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="error-box">{error}</div>}

      {/* Basics */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>Basics</h3>
        <div className="field">
          <label>Workbench name</label>
          <input value={v.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Café job, Freelance design, Hospital" autoFocus />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Currency</label>
            <select value={v.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Color</label>
            <div className="row-tight" style={{ flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <span key={c} onClick={() => set('color', c)}
                  style={{
                    width: 26, height: 26, borderRadius: 8, background: c, cursor: 'pointer',
                    outline: v.color === c ? '2px solid var(--text)' : '2px solid transparent',
                    outlineOffset: 2,
                  }} />
              ))}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Notes <span className="hint">optional</span></label>
          <textarea value={v.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything you want to remember about this job…" />
        </div>
      </div>

      {/* Pay */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>Pay</h3>
        <div className="mode-toggle">
          {(['hourly', 'monthly'] as SalaryMode[]).map((m) => (
            <div key={m} className={`mode-opt ${v.salary_mode === m ? 'on' : ''}`} onClick={() => set('salary_mode', m)}>
              <div className="big">{m === 'hourly' ? '⏱️' : '💼'}</div>
              {m === 'hourly' ? 'Hourly wage' : 'Monthly salary'}
              <small>{m === 'hourly' ? 'Paid per hour worked' : 'Fixed full-time salary'}</small>
            </div>
          ))}
        </div>
        {v.salary_mode === 'hourly' ? (
          <div className="field">
            <label>Default hourly rate ({v.currency})</label>
            <input type="number" min={0} step="0.01" value={v.default_rate} onChange={numField('default_rate')} />
          </div>
        ) : (
          <div className="form-grid">
            <div className="field">
              <label>Monthly salary ({v.currency})</label>
              <input type="number" min={0} step="0.01" value={v.monthly_salary} onChange={numField('monthly_salary')} />
            </div>
            <div className="field">
              <label>Contract hours / month</label>
              <input type="number" min={0} value={v.monthly_contract_hours} onChange={numField('monthly_contract_hours')} />
            </div>
          </div>
        )}
      </div>

      {/* Overtime & premiums */}
      {v.salary_mode === 'hourly' && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Overtime & rate rules</h3>
          <label className="row-tight" style={{ cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={!!v.overtime_enabled}
              onChange={(e) => set('overtime_enabled', e.target.checked ? 1 : 0)} />
            Enable overtime pay
          </label>
          {!!v.overtime_enabled && (
            <div className="form-grid">
              <div className="field">
                <label>Overtime after (hours/day)</label>
                <input type="number" min={0} step="0.5" value={v.overtime_daily_threshold} onChange={numField('overtime_daily_threshold')} />
              </div>
              <div className="field">
                <label>Overtime multiplier</label>
                <input type="number" min={1} step="0.1" value={v.overtime_multiplier} onChange={numField('overtime_multiplier')} />
              </div>
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label>Weekend multiplier</label>
              <input type="number" min={1} step="0.1" value={v.weekend_multiplier} onChange={numField('weekend_multiplier')} />
              <span className="hint">1 = no extra. Applies to Sat/Sun.</span>
            </div>
            <div className="field">
              <label>Holiday multiplier</label>
              <input type="number" min={1} step="0.1" value={v.holiday_multiplier} onChange={numField('holiday_multiplier')} />
              <span className="hint">Applies to shifts tagged “holiday”.</span>
            </div>
          </div>
          <div className="field" style={{ maxWidth: '50%' }}>
            <label>Night shift multiplier</label>
            <input type="number" min={1} step="0.1" value={v.night_multiplier} onChange={numField('night_multiplier')} />
            <span className="hint">Applies to shifts tagged “night shift”.</span>
          </div>
        </div>
      )}

      {/* Targets & deductions */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>Targets, deductions & time off</h3>
        <div className="form-grid">
          <div className="field">
            <label>Monthly hour target</label>
            <input type="number" min={0} value={v.monthly_hour_target} onChange={numField('monthly_hour_target')} />
          </div>
          <div className="field">
            <label>Tax / deduction estimate (%)</label>
            <input type="number" min={0} max={100} step="0.1" value={v.tax_rate} onChange={numField('tax_rate')} />
          </div>
          <div className="field">
            <label>Vacation days (per year)</label>
            <input type="number" min={0} value={v.vacation_days_total} onChange={numField('vacation_days_total')} />
          </div>
          <div className="field">
            <label>Sick days (per year)</label>
            <input type="number" min={0} value={v.sick_days_total} onChange={numField('sick_days_total')} />
          </div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
