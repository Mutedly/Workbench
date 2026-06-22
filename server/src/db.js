import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'workbench.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  reset_code_hash TEXT,
  reset_expires INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workbenches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  salary_mode TEXT NOT NULL DEFAULT 'hourly',
  default_rate REAL NOT NULL DEFAULT 0,
  monthly_salary REAL NOT NULL DEFAULT 0,
  monthly_contract_hours REAL NOT NULL DEFAULT 160,
  overtime_enabled INTEGER NOT NULL DEFAULT 0,
  overtime_daily_threshold REAL NOT NULL DEFAULT 8,
  overtime_multiplier REAL NOT NULL DEFAULT 1.5,
  weekend_multiplier REAL NOT NULL DEFAULT 1,
  holiday_multiplier REAL NOT NULL DEFAULT 1,
  night_multiplier REAL NOT NULL DEFAULT 1,
  vacation_days_total REAL NOT NULL DEFAULT 0,
  sick_days_total REAL NOT NULL DEFAULT 0,
  monthly_hour_target REAL NOT NULL DEFAULT 160,
  paid_breaks INTEGER NOT NULL DEFAULT 0,
  plan_enabled INTEGER NOT NULL DEFAULT 0,
  min_days_per_month REAL NOT NULL DEFAULT 0,
  min_hours_per_week REAL NOT NULL DEFAULT 0,
  min_shifts_per_week REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_model TEXT NOT NULL DEFAULT 'flat',
  credit_points REAL NOT NULL DEFAULT 2.25,
  travel_per_day REAL NOT NULL DEFAULT 0,
  travel_taxable INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  color TEXT NOT NULL DEFAULT '#6366f1',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workbench_id INTEGER NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  break_minutes REAL NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  custom_rate REAL,
  tags TEXT NOT NULL DEFAULT '[]',
  entry_type TEXT NOT NULL DEFAULT 'work',
  paid_break INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workbenches_user ON workbenches(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_workbench ON shifts(workbench_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
`);

// Lightweight migrations: add columns to existing databases if they're missing.
const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
if (!userCols.has('reset_code_hash')) db.exec('ALTER TABLE users ADD COLUMN reset_code_hash TEXT');
if (!userCols.has('reset_expires')) db.exec('ALTER TABLE users ADD COLUMN reset_expires INTEGER');

const wbCols = new Set(db.prepare('PRAGMA table_info(workbenches)').all().map((c) => c.name));
const addColumn = (name, ddl) => {
  if (!wbCols.has(name)) db.exec(`ALTER TABLE workbenches ADD COLUMN ${ddl}`);
};
addColumn('tax_model', "tax_model TEXT NOT NULL DEFAULT 'flat'");
addColumn('credit_points', 'credit_points REAL NOT NULL DEFAULT 2.25');
addColumn('travel_per_day', 'travel_per_day REAL NOT NULL DEFAULT 0');
addColumn('travel_taxable', 'travel_taxable INTEGER NOT NULL DEFAULT 0');
addColumn('paid_breaks', 'paid_breaks INTEGER NOT NULL DEFAULT 0');
addColumn('plan_enabled', 'plan_enabled INTEGER NOT NULL DEFAULT 0');
addColumn('min_days_per_month', 'min_days_per_month REAL NOT NULL DEFAULT 0');
addColumn('min_hours_per_week', 'min_hours_per_week REAL NOT NULL DEFAULT 0');
addColumn('min_shifts_per_week', 'min_shifts_per_week REAL NOT NULL DEFAULT 0');

const shiftCols = new Set(db.prepare('PRAGMA table_info(shifts)').all().map((c) => c.name));
if (!shiftCols.has('paid_break')) db.exec('ALTER TABLE shifts ADD COLUMN paid_break INTEGER');

export default db;
