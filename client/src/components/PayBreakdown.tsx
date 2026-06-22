import type { TaxBreakdown } from '../calc';
import { money } from '../calc';

interface Props {
  tax: TaxBreakdown;
  currency: string;
  title?: string;
  note?: string;
}

export default function PayBreakdown({ tax, currency, title, note }: Props) {
  const m = (n: number) => money(n, currency);
  const pct = tax.gross > 0 ? Math.round((tax.totalDeductions / tax.gross) * 100) : 0;

  return (
    <div className="card card-pad">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h3>{title ?? 'Pay breakdown'}</h3>
        {note && <span className="subtle">{note}</span>}
      </div>

      <div className="pay-twin">
        <div className="pay-side">
          <div className="label">Gross · ברוטו</div>
          <div className="value">{m(tax.gross)}</div>
          <div className="sub">Before deductions</div>
        </div>
        <div className="pay-arrow">→</div>
        <div className="pay-side">
          <div className="label">Net · נטו</div>
          <div className="value" style={{ color: 'var(--success)' }}>{m(tax.net)}</div>
          <div className="sub">Take-home pay</div>
        </div>
      </div>

      <div className="divider" style={{ margin: '16px 0 4px' }} />

      {tax.travel > 0 && (
        <DedRow
          label={`Travel · נסיעות (${tax.travelDays} ${tax.travelDays === 1 ? 'day' : 'days'})`}
          value={`+ ${m(tax.travel)}`}
          positive
        />
      )}

      {tax.model === 'israel' ? (
        <>
          <DedRow label="Income tax · מס הכנסה" value={`− ${m(tax.incomeTax)}`}
            hint={tax.creditValue > 0 ? `after ${m(tax.creditValue)} credit points` : undefined} />
          <DedRow label="National Insurance · ביטוח לאומי" value={`− ${m(tax.nationalInsurance)}`} />
          <DedRow label="Health tax · מס בריאות" value={`− ${m(tax.healthInsurance)}`} />
          <DedRow label={`Total deductions (${pct}%)`} value={`− ${m(tax.totalDeductions)}`} strong />
          <p className="hint" style={{ marginTop: 10 }}>
            Estimate of mandatory employee deductions only. A real payslip can differ — it may
            include travel pay (נסיעות), pension / keren hishtalmut, and tax coordination (תיאום מס).
          </p>
        </>
      ) : (
        <DedRow label={`Deductions${pct ? ` (${pct}%)` : ''}`} value={`− ${m(tax.otherDeductions)}`} strong />
      )}
    </div>
  );
}

function DedRow({ label, value, hint, strong, positive }: {
  label: string; value: string; hint?: string; strong?: boolean; positive?: boolean;
}) {
  const valueColor = positive ? 'var(--success)' : strong ? 'var(--danger)' : 'var(--text)';
  return (
    <div className="row" style={{
      justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0',
      borderTop: strong ? '1px solid var(--border)' : undefined,
    }}>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--text)' : 'var(--text-soft)' }}>
        {label}
        {hint && <span className="hint" style={{ marginInlineStart: 8 }}>{hint}</span>}
      </span>
      <span style={{ fontWeight: strong ? 800 : 600, color: valueColor, whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}
