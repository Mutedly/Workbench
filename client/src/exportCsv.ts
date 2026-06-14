import type { Shift, Workbench } from './types';
import {
  computeMonthStats, monthLabel, parseKey, shiftGross, shiftHours, shiftRate,
} from './calc';

function cell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildWorkbenchCsv(wb: Workbench, shifts: Shift[]): string {
  const lines: string[] = [];

  lines.push(cell(`Workbench: ${wb.name}`));
  lines.push(cell(`Currency: ${wb.currency}`));
  lines.push(cell(`Pay model: ${wb.salary_mode}`));
  lines.push(cell(`Tax model: ${wb.tax_model === 'israel' ? 'Israeli tax 2026' : `Flat ${wb.tax_rate}%`}`));
  if (wb.travel_per_day > 0) {
    lines.push(cell(`Travel: ${wb.travel_per_day}/day (${wb.travel_taxable ? 'taxable' : 'tax-free'})`));
  }
  lines.push('');

  // --- Shifts ---
  lines.push(cell('SHIFTS'));
  const shiftHeaders = ['Date', 'Day', 'Type', 'Title', 'Start', 'End', 'Break (min)', 'Hours', 'Rate', 'Gross', 'Tags', 'Notes'];
  lines.push(shiftHeaders.map(cell).join(','));
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    const hours = shiftHours(s);
    lines.push([
      s.date,
      parseKey(s.date).toLocaleDateString(undefined, { weekday: 'short' }),
      s.entry_type,
      s.title,
      s.entry_type === 'work' ? s.start_time ?? '' : '',
      s.entry_type === 'work' ? s.end_time ?? '' : '',
      s.break_minutes,
      hours > 0 ? round2(hours) : '',
      s.entry_type === 'work' ? round2(shiftRate(s, wb)) : '',
      round2(shiftGross(s, wb)),
      s.tags.join('|'),
      s.notes,
    ].map(cell).join(','));
  }

  lines.push('');

  // --- Monthly breakdown with tax detail ---
  lines.push(cell('MONTHLY BREAKDOWN'));
  const monthHeaders = [
    'Month', 'Work shifts', 'Hours', 'Work pay', 'Travel days', 'Travel', 'Gross',
    'Income tax', 'National insurance', 'Health tax', 'Other deductions',
    'Total deductions', 'Net', 'Vacation days', 'Sick days',
  ];
  lines.push(monthHeaders.map(cell).join(','));

  const months = Array.from(new Set(shifts.map((s) => s.date.slice(0, 7)))).sort();
  for (const ym of months) {
    const [y, m] = ym.split('-').map(Number);
    const st = computeMonthStats(wb, shifts, y, m - 1);
    lines.push([
      monthLabel(y, m - 1),
      st.shiftsCount,
      round2(st.totalHours),
      round2(st.tax.grossWork),
      st.tax.travelDays,
      round2(st.tax.travel),
      round2(st.tax.gross),
      round2(st.tax.incomeTax),
      round2(st.tax.nationalInsurance),
      round2(st.tax.healthInsurance),
      round2(st.tax.otherDeductions),
      round2(st.tax.totalDeductions),
      round2(st.tax.net),
      st.vacationUsed,
      st.sickUsed,
    ].map(cell).join(','));
  }

  return lines.join('\n');
}

export function downloadWorkbenchCsv(wb: Workbench, shifts: Shift[]) {
  const csv = buildWorkbenchCsv(wb, shifts);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${wb.name.replace(/[^a-z0-9]/gi, '_')}_report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
