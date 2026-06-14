import { useState } from 'react';
import type { SalaryMode, Workbench } from '../types';
import { CURRENCIES } from '../calc';
import { useToast } from './Toast';
import Switch from './Switch';
import { IconGrid, IconMoney, IconClock, IconPercent, IconCar, IconTarget, IconCheck } from './Icons';

export type WbValues = Pick<
  Workbench,
  | 'name' | 'salary_mode' | 'default_rate' | 'monthly_salary' | 'monthly_contract_hours'
  | 'overtime_enabled' | 'overtime_daily_threshold' | 'overtime_multiplier'
  | 'weekend_multiplier' | 'holiday_multiplier' | 'night_multiplier'
  | 'vacation_days_total' | 'sick_days_total' | 'monthly_hour_target' | 'paid_breaks'
  | 'tax_rate' | 'tax_model' | 'credit_points'
  | 'travel_per_day' | 'travel_taxable' | 'currency' | 'color' | 'notes'
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
  paid_breaks: 0,
  tax_rate: 0,
  tax_model: 'flat',
  credit_points: 2.25,
  travel_per_day: 0,
  travel_taxable: 0,
  currency: 'USD',
  color: '#6366f1',
  notes: '',
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];

interface Props {
  initial: WbValues;
  submitLabel: string;
  successMessage?: string;
  enhanced?: boolean;
  onSubmit: (values: WbValues) => Promise<void>;
  onCancel?: () => void;
}

export default function WorkbenchForm({ initial, submitLabel, successMessage, enhanced, onSubmit, onCancel }: Props) {
  const [v, setV] = useState<WbValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const set = <K extends keyof WbValues>(k: K, val: WbValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const numField = (k: keyof WbValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Number(e.target.value) as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) { setError('Please give your workbench a name'); toast.error('Please give your workbench a name'); return; }
    setBusy(true);
    setError('');
    try {
      await onSubmit(v);
      toast.success(successMessage ?? 'Saved');
    } catch (err) {
      const msg = (err as Error).message || 'Something went wrong while saving';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={enhanced ? 'wb-form--new' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <div className="error-box">{error}</div>}

      {/* Basics */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="section-head">
          <span className="icon-chip purple"><IconGrid /></span>
          <div><h3>Basics</h3><div className="section-sub">Name, currency &amp; colour</div></div>
        </div>
        <div className="field">
          <label>Workbench name</label>
          <input value={v.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Café job, Freelance design, Hospital" autoFocus />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Currency</label>
            <select
              value={v.currency}
              onChange={(e) => {
                const currency = e.target.value;
                setV((p) => ({
                  ...p,
                  currency,
                  // Helpful default: switch to Israeli tax rules for shekels (if untouched).
                  tax_model: currency === 'ILS' && p.tax_model === 'flat' && p.tax_rate === 0 ? 'israel' : p.tax_model,
                }));
              }}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Colour</label>
            {enhanced ? (
              <div className="swatches">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`swatch ${v.color === c ? 'on' : ''}`}
                    onClick={() => set('color', c)}
                    aria-label={`Colour ${c}`}
                    aria-pressed={v.color === c}
                    style={{ '--sw': c } as React.CSSProperties}
                  >
                    {v.color === c && <IconCheck size={15} />}
                  </button>
                ))}
              </div>
            ) : (
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
            )}
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
        <div className="section-head">
          <span className="icon-chip green"><IconMoney /></span>
          <div><h3>Pay</h3><div className="section-sub">How you're paid</div></div>
        </div>
        {enhanced ? (
          <div className="pay-mode">
            {(['hourly', 'monthly'] as SalaryMode[]).map((m) => (
              <button
                type="button"
                key={m}
                className={`pay-mode-opt ${v.salary_mode === m ? 'on' : ''}`}
                onClick={() => set('salary_mode', m)}
                aria-pressed={v.salary_mode === m}
              >
                <span className={`icon-chip ${m === 'hourly' ? 'green' : 'purple'}`}>
                  {m === 'hourly' ? <IconClock /> : <IconMoney />}
                </span>
                <span className="pay-mode-text">
                  <span className="pay-mode-title">{m === 'hourly' ? 'Hourly wage' : 'Monthly salary'}</span>
                  <span className="pay-mode-sub">{m === 'hourly' ? 'Paid per hour worked' : 'Fixed full-time salary'}</span>
                </span>
                <span className="pay-mode-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mode-toggle">
            {(['hourly', 'monthly'] as SalaryMode[]).map((m) => (
              <div key={m} className={`mode-opt ${v.salary_mode === m ? 'on' : ''}`} onClick={() => set('salary_mode', m)}>
                <div className="big">{m === 'hourly' ? '⏱️' : '💼'}</div>
                {m === 'hourly' ? 'Hourly wage' : 'Monthly salary'}
                <small>{m === 'hourly' ? 'Paid per hour worked' : 'Fixed full-time salary'}</small>
              </div>
            ))}
          </div>
        )}
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
        <div className="divider" />
        <Switch
          checked={!!v.paid_breaks}
          onChange={(c) => set('paid_breaks', c ? 1 : 0)}
          label="Paid breaks"
          hint="Don't deduct break time from hours. Applies to every shift (override per shift if needed)."
        />
      </div>

      {/* Overtime & premiums */}
      {v.salary_mode === 'hourly' && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-head">
            <span className="icon-chip orange"><IconClock /></span>
            <div><h3>Overtime &amp; rate rules</h3><div className="section-sub">Premiums for extra hours</div></div>
          </div>
          <Switch
            checked={!!v.overtime_enabled}
            onChange={(c) => set('overtime_enabled', c ? 1 : 0)}
            label="Enable overtime pay"
          />
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

      {/* Tax model */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="section-head">
          <span className="icon-chip blue"><IconPercent /></span>
          <div><h3>Tax model</h3><div className="section-sub">How net pay is estimated</div></div>
        </div>
        <div className="mode-toggle">
          <div className={`mode-opt ${v.tax_model === 'flat' ? 'on' : ''}`} onClick={() => set('tax_model', 'flat')}>
            <div className="big">％</div>
            Simple percentage
            <small>One flat deduction rate</small>
          </div>
          <div className={`mode-opt ${v.tax_model === 'israel' ? 'on' : ''}`} onClick={() => set('tax_model', 'israel')}>
            <div className="big">🇮🇱</div>
            Israeli tax (2026)
            <small>Income tax + Bituach Leumi + health</small>
          </div>
        </div>
        {v.tax_model === 'flat' ? (
          <div className="field" style={{ maxWidth: '50%' }}>
            <label>Tax / deduction estimate (%)</label>
            <input type="number" min={0} max={100} step="0.1" value={v.tax_rate} onChange={numField('tax_rate')} />
          </div>
        ) : (
          <div className="field" style={{ maxWidth: '50%' }}>
            <label>Credit points · נקודות זיכוי</label>
            <input type="number" min={0} step="0.25" value={v.credit_points} onChange={numField('credit_points')} />
            <span className="hint">
              ~2.25 (male) / 2.75 (female) by default. Each point = ₪242/mo off income tax.
              Net is computed from monthly gross using 2026 income-tax brackets, National Insurance & health tax.
            </span>
          </div>
        )}
      </div>

      {/* Travel allowance */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="section-head">
          <span className="icon-chip pink"><IconCar /></span>
          <div><h3>Travel allowance · נסיעות</h3><div className="section-sub">Auto-added for each work day</div></div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Travel pay per work day ({v.currency})</label>
            <input type="number" min={0} step="0.01" value={v.travel_per_day} onChange={numField('travel_per_day')} />
            <span className="hint">Added automatically for each day you have a work shift.</span>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <Switch
              checked={!!v.travel_taxable}
              onChange={(c) => set('travel_taxable', c ? 1 : 0)}
              label="Travel is taxable"
              hint="In Israel travel reimbursement is usually tax-free — leave off."
            />
          </div>
        </div>
      </div>

      {/* Targets & time off */}
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="section-head">
          <span className="icon-chip purple"><IconTarget /></span>
          <div><h3>Targets &amp; time off</h3><div className="section-sub">Goals, vacation &amp; sick days</div></div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Monthly hour target</label>
            <input type="number" min={0} value={v.monthly_hour_target} onChange={numField('monthly_hour_target')} />
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
