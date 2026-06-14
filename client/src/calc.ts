import type { Shift, Workbench } from './types';
import { computeIsraeliTax } from './israeliTax';

export interface TaxBreakdown {
  model: 'flat' | 'israel';
  gross: number; // total gross incl. travel
  grossWork: number; // pay from shifts only
  travel: number; // travel allowance added
  travelDays: number;
  incomeTax: number;
  nationalInsurance: number;
  healthInsurance: number;
  otherDeductions: number;
  creditValue: number;
  totalDeductions: number;
  net: number;
}

// Decide whether to apply the Israeli engine. ILS workbenches default to it even when
// the model field still says "flat" with no rate set (e.g. created before the feature
// existed), so net is never silently left equal to gross.
export function usesIsraeliTax(wb: Workbench): boolean {
  if (wb.tax_model === 'israel') return true;
  return wb.currency === 'ILS' && wb.tax_model === 'flat' && wb.tax_rate === 0;
}

// Pure deductions for a taxable amount (no travel logic).
function deductionsFor(wb: Workbench, taxable: number) {
  if (usesIsraeliTax(wb)) {
    const b = computeIsraeliTax(taxable, wb.credit_points);
    return {
      model: 'israel' as const,
      incomeTax: b.incomeTax,
      nationalInsurance: b.nationalInsurance,
      healthInsurance: b.healthInsurance,
      otherDeductions: 0,
      creditValue: b.creditValue,
      totalDeductions: b.totalDeductions,
    };
  }
  const ded = taxable * (wb.tax_rate / 100);
  return {
    model: 'flat' as const,
    incomeTax: 0,
    nationalInsurance: 0,
    healthInsurance: 0,
    otherDeductions: ded,
    creditValue: 0,
    totalDeductions: ded,
  };
}

// Full pay breakdown given the shift pay and number of commuting (work) days.
export function computePay(wb: Workbench, grossWork: number, travelDays: number): TaxBreakdown {
  const work = Math.max(0, grossWork);
  const travel = Math.max(0, wb.travel_per_day) * Math.max(0, travelDays);
  const gross = work + travel;
  const taxable = wb.travel_taxable ? gross : work;
  const d = deductionsFor(wb, taxable);
  return {
    ...d,
    gross,
    grossWork: work,
    travel,
    travelDays: Math.max(0, travelDays),
    net: gross - d.totalDeductions,
  };
}

// Backwards-compatible helper: net for a monthly gross with no travel.
export function computeTax(wb: Workbench, monthlyGross: number): TaxBreakdown {
  return computePay(wb, monthlyGross, 0);
}

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
// Whether a shift's break is paid (i.e. NOT deducted from worked hours).
// Per-shift override wins; otherwise fall back to the workbench default.
export function isBreakPaid(shift: Shift, wb?: Workbench): boolean {
  if (shift.paid_break === 0 || shift.paid_break === 1) return shift.paid_break === 1;
  return wb ? !!wb.paid_breaks : false;
}

// Worked hours for a single shift (decimal hours). Only 'work' entries count.
export function shiftHours(shift: Shift, wb?: Workbench): number {
  if (shift.entry_type !== 'work') return 0;
  if (!shift.start_time || !shift.end_time) return 0;
  const start = toMinutes(shift.start_time);
  let end = toMinutes(shift.end_time);
  if (end <= start) end += 24 * 60; // overnight shift
  const breakMin = isBreakPaid(shift, wb) ? 0 : (shift.break_minutes || 0);
  const minutes = end - start - breakMin;
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
  const hours = shiftHours(shift, wb);
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
  const hours = shiftHours(shift, wb);
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
  tax: TaxBreakdown; // planned: all entered shifts in the month
  projectedTax: TaxBreakdown; // calendar-pace projection
  earned: TaxBreakdown; // earned so far (shifts up to & incl. today)
  planned: TaxBreakdown; // alias of `tax` for clarity
  goal: TaxBreakdown; // income if the monthly hour target is reached
  earnedHours: number;
  goalHours: number;
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
  const isMonthly = wb.salary_mode === 'monthly';
  const todayK = todayKey();

  // PLANNED = every shift entered in the month (past + future).
  let totalHours = 0;
  let overtimeHours = 0;
  let grossHourly = 0;
  // EARNED = only shifts up to & including today.
  let earnedHours = 0;
  let earnedGrossHourly = 0;
  const earnedDates = new Set<string>();
  for (const s of workShifts) {
    const h = shiftHours(s, wb);
    totalHours += h;
    overtimeHours += shiftOvertimeHours(s, wb);
    grossHourly += shiftGross(s, wb);
    if (s.date <= todayK) {
      earnedHours += h;
      earnedGrossHourly += shiftGross(s, wb);
      if (h > 0) earnedDates.add(s.date);
    }
  }

  const vacationUsed = monthShifts.filter((s) => s.entry_type === 'vacation').length;
  const sickUsed = monthShifts.filter((s) => s.entry_type === 'sick').length;

  // Travel allowance is paid per distinct commuting (work) day.
  const travelDays = new Set(workShifts.filter((s) => shiftHours(s, wb) > 0).map((s) => s.date)).size;
  const earnedTravelDays = earnedDates.size;

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month0;
  const monthInPast = year < now.getFullYear() || (year === now.getFullYear() && month0 < now.getMonth());
  const daysTotal = daysInMonth(year, month0);
  const daysElapsed = isCurrentMonth ? now.getDate() : daysTotal;
  const factor = isCurrentMonth && daysElapsed > 0 ? daysTotal / daysElapsed : 1;
  const elapsedRatio = isCurrentMonth ? daysElapsed / daysTotal : monthInPast ? 1 : 0;

  const targetHours = wb.monthly_hour_target;

  // ---- build the four income scenarios ----
  // PLANNED — everything entered.
  const plannedWork = isMonthly ? wb.monthly_salary : grossHourly;
  const planned = computePay(wb, plannedWork, travelDays);

  // EARNED so far.
  const earnedWork = isMonthly ? wb.monthly_salary * elapsedRatio : earnedGrossHourly;
  const earned = computePay(wb, earnedWork, earnedTravelDays);

  // PACE — extrapolate what's been earned so far across the whole month.
  const paceWork = isMonthly ? wb.monthly_salary : earnedGrossHourly * factor;
  const paceTravelDays = isCurrentMonth ? earnedTravelDays * factor : earnedTravelDays;
  const projectedTax = computePay(wb, paceWork, paceTravelDays);
  const projectedHours = isCurrentMonth ? earnedHours * factor : earnedHours;
  const projectedGross = projectedTax.gross;
  const projectedNet = projectedTax.net;

  // GOAL — income if the monthly hour target is reached.
  let goalWork: number;
  let goalTravelDays: number;
  if (isMonthly) {
    goalWork = wb.monthly_salary;
    goalTravelDays = travelDays;
  } else {
    const avgRate = totalHours > 0 ? grossHourly / totalHours : wb.default_rate;
    goalWork = avgRate * targetHours;
    goalTravelDays = totalHours > 0 ? travelDays * (targetHours / totalHours) : Math.round(targetHours / 8);
  }
  const goal = computePay(wb, goalWork, goalTravelDays);

  const tax = planned;
  const gross = planned.gross;
  const net = planned.net;

  const shiftsCount = workShifts.length;
  const avgHoursPerShift = shiftsCount ? totalHours / shiftsCount : 0;
  const avgEarningsPerShift = shiftsCount ? gross / shiftsCount : 0;

  const remainingHours = Math.max(0, targetHours - totalHours);
  const progressPct = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;

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
    tax,
    projectedTax,
    earned,
    planned,
    goal,
    earnedHours,
    goalHours: targetHours,
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
