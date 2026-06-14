import type { Shift, Workbench } from './types';

/* ----------------------------- date utils ----------------------------- */
export function todayKey(): string {
  return toKey(new Date());
}
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}
export function isWeekend(key: string): boolean {
  const day = parseKey(key).getDay();
  return day === 0 || day === 6;
}
export function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/* --------------------------- per-shift maths -------------------------- */
// Worked hours for a single shift (decimal hours). Only 'work' entries count.
export function shiftHours(shift: Shift): number {
  if (shift.entry_type !== 'work') return 0;
  if (!shift.start_time || !shift.end_time) return 0;
  const start = toMinutes(shift.start_time);
  let end = toMinutes(shift.end_time);
  if (end <= start) end += 24 * 60; // overnight shift
  const minutes = end - start - (shift.break_minutes || 0);
  return Math.max(0, minutes) / 60;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Effective base rate for a shift (before premium multipliers).
export function shiftRate(shift: Shift, wb: Workbench): number {
  return shift.custom_rate != null ? shift.custom_rate : wb.default_rate;
}

// Highest applicable premium multiplier (weekend/holiday/night).
export function premiumMultiplier(shift: Shift, wb: Workbench): number {
  let mult = 1;
  if (isWeekend(shift.date)) mult = Math.max(mult, wb.weekend_multiplier);
  if (shift.tags.includes('holiday')) mult = Math.max(mult, wb.holiday_multiplier);
  if (shift.tags.includes('night shift')) mult = Math.max(mult, wb.night_multiplier);
  return mult;
}

// Gross earnings for a single shift in HOURLY mode.
export function shiftGross(shift: Shift, wb: Workbench): number {
  const hours = shiftHours(shift);
  if (hours <= 0) return 0;
  const rate = shiftRate(shift, wb);
  const premium = premiumMultiplier(shift, wb);
  const forceOt = shift.tags.includes('overtime');

  if (wb.overtime_enabled) {
    const threshold = forceOt ? 0 : wb.overtime_daily_threshold;
    const regHours = Math.min(hours, threshold);
    const otHours = Math.max(0, hours - threshold);
    const otMult = Math.max(wb.overtime_multiplier, premium);
    return regHours * rate * premium + otHours * rate * otMult;
  }
  return hours * rate * premium;
}

export function shiftOvertimeHours(shift: Shift, wb: Workbench): number {
  if (!wb.overtime_enabled) return 0;
  const hours = shiftHours(shift);
  if (shift.tags.includes('overtime')) return hours;
  return Math.max(0, hours - wb.overtime_daily_threshold);
}

/* --------------------------- aggregations ----------------------------- */
export interface MonthStats {
  year: number;
  month0: number;
  totalHours: number;
  overtimeHours: number;
  shiftsCount: number;
  gross: number;
  net: number;
  targetHours: number;
  remainingHours: number;
  progressPct: number;
  avgHoursPerShift: number;
  avgEarningsPerShift: number;
  vacationUsed: number;
  sickUsed: number;
  projectedHours: number;
  projectedGross: number;
  projectedNet: number;
  isCurrentMonth: boolean;
  daysElapsed: number;
  daysTotal: number;
}

export function shiftsInMonth(shifts: Shift[], year: number, month0: number): Shift[] {
  return shifts.filter((s) => {
    const d = parseKey(s.date);
    return d.getFullYear() === year && d.getMonth() === month0;
  });
}

export function computeMonthStats(
  wb: Workbench,
  allShifts: Shift[],
  year: number,
  month0: number,
): MonthStats {
  const monthShifts = shiftsInMonth(allShifts, year, month0);
  const workShifts = monthShifts.filter((s) => s.entry_type === 'work');

  let totalHours = 0;
  let overtimeHours = 0;
  let grossHourly = 0;
  for (const s of workShifts) {
    totalHours += shiftHours(s);
    overtimeHours += shiftOvertimeHours(s, wb);
    grossHourly += shiftGross(s, wb);
  }

  const vacationUsed = monthShifts.filter((s) => s.entry_type === 'vacation').length;
  const sickUsed = monthShifts.filter((s) => s.entry_type === 'sick').length;

  const gross = wb.salary_mode === 'monthly' ? wb.monthly_salary : grossHourly;
  const net = gross * (1 - wb.tax_rate / 100);

  const shiftsCount = workShifts.length;
  const avgHoursPerShift = shiftsCount ? totalHours / shiftsCount : 0;
  const avgEarningsPerShift = shiftsCount ? gross / shiftsCount : 0;

  const targetHours = wb.monthly_hour_target;
  const remainingHours = Math.max(0, targetHours - totalHours);
  const progressPct = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month0;
  const daysTotal = daysInMonth(year, month0);
  const daysElapsed = isCurrentMonth ? now.getDate() : daysTotal;
  const factor = isCurrentMonth && daysElapsed > 0 ? daysTotal / daysElapsed : 1;

  const projectedHours = isCurrentMonth ? totalHours * factor : totalHours;
  const projectedGross =
    wb.salary_mode === 'monthly' ? wb.monthly_salary : (isCurrentMonth ? grossHourly * factor : gross);
  const projectedNet = projectedGross * (1 - wb.tax_rate / 100);

  return {
    year,
    month0,
    totalHours,
    overtimeHours,
    shiftsCount,
    gross,
    net,
    targetHours,
    remainingHours,
    progressPct,
    avgHoursPerShift,
    avgEarningsPerShift,
    vacationUsed,
    sickUsed,
    projectedHours,
    projectedGross,
    projectedNet,
    isCurrentMonth,
    daysElapsed,
    daysTotal,
  };
}

// Weekly buckets (Mon-Sun) for a given month.
export function weeklyHours(shifts: Shift[], year: number, month0: number) {
  const monthShifts = shiftsInMonth(shifts, year, month0).filter((s) => s.entry_type === 'work');
  const buckets = new Map<string, { label: string; hours: number; gross: number }>();
  for (const s of monthShifts) {
    const d = parseKey(s.date);
    const week = startOfWeek(d);
    const key = toKey(week);
    if (!buckets.has(key)) {
      buckets.set(key, { label: weekRangeLabel(week), hours: 0, gross: 0 });
    }
  }
  return buckets;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}`;
}

/* ----------------------------- formatting ----------------------------- */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$',
  CHF: 'CHF ', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', INR: '₹', BRL: 'R$',
  ZAR: 'R ', PLN: 'zł ', MXN: 'MX$', NZD: 'NZ$', SGD: 'S$', ILS: '₪',
};

export function money(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const formatted = (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

export function fmtHours(h: number): string {
  return `${(h || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;
}

export const CURRENCIES = Object.keys(CURRENCY_SYMBOLS);
