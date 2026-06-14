export interface User {
  id: number;
  email: string;
  name: string | null;
}

export type SalaryMode = 'hourly' | 'monthly';
export type TaxModel = 'flat' | 'israel';

export interface Workbench {
  id: number;
  user_id: number;
  name: string;
  salary_mode: SalaryMode;
  default_rate: number;
  monthly_salary: number;
  monthly_contract_hours: number;
  overtime_enabled: number;
  overtime_daily_threshold: number;
  overtime_multiplier: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  night_multiplier: number;
  vacation_days_total: number;
  sick_days_total: number;
  monthly_hour_target: number;
  paid_breaks: number;
  plan_enabled: number;
  min_days_per_month: number;
  min_hours_per_week: number;
  min_shifts_per_week: number;
  tax_rate: number;
  tax_model: TaxModel;
  credit_points: number;
  travel_per_day: number;
  travel_taxable: number;
  currency: string;
  color: string;
  notes: string;
  created_at: string;
  sort_order: number;
}

export type EntryType = 'work' | 'vacation' | 'sick';

export const SHIFT_TAGS = [
  'training',
  'overtime',
  'holiday',
  'night shift',
  'remote',
  'office',
] as const;

export type ShiftTag = (typeof SHIFT_TAGS)[number];

export interface Shift {
  id: number;
  workbench_id: number;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  break_minutes: number;
  title: string;
  notes: string;
  custom_rate: number | null;
  tags: string[];
  entry_type: EntryType;
  paid_break: number | null; // null = inherit workbench, 1 = paid, 0 = deducted
  created_at: string;
}

export type ShiftDraft = Omit<Shift, 'id' | 'workbench_id' | 'created_at'>;
