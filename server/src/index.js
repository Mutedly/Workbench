import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { signToken, authMiddleware } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const api = express.Router();

/* ----------------------------- helpers ----------------------------- */
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name };
}

const WORKBENCH_FIELDS = [
  'name', 'salary_mode', 'default_rate', 'monthly_salary', 'monthly_contract_hours',
  'overtime_enabled', 'overtime_daily_threshold', 'overtime_multiplier',
  'weekend_multiplier', 'holiday_multiplier', 'night_multiplier',
  'vacation_days_total', 'sick_days_total', 'monthly_hour_target',
  'tax_rate', 'tax_model', 'credit_points', 'travel_per_day', 'travel_taxable',
  'currency', 'color', 'notes',
];

const SHIFT_FIELDS = [
  'date', 'start_time', 'end_time', 'break_minutes', 'title',
  'notes', 'custom_rate', 'tags', 'entry_type',
];

function mapShift(row) {
  return { ...row, tags: safeParse(row.tags, []) };
}
function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function ownWorkbench(userId, workbenchId) {
  return db
    .prepare('SELECT * FROM workbenches WHERE id = ? AND user_id = ?')
    .get(workbenchId, userId);
}

/* ------------------------------- auth ------------------------------ */
api.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(String(email).toLowerCase(), name || null, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ token: signToken(user), user: publicUser(user) });
});

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

api.get('/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

/* --------------------------- workbenches --------------------------- */
api.get('/workbenches', authMiddleware, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM workbenches WHERE user_id = ? ORDER BY sort_order ASC, id ASC')
    .all(req.user.id);
  res.json(rows);
});

api.post('/workbenches', authMiddleware, (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'Workbench name is required' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM workbenches WHERE user_id = ?').get(req.user.id).m;
  const defaults = {
    name: String(b.name).trim(),
    salary_mode: b.salary_mode === 'monthly' ? 'monthly' : 'hourly',
    default_rate: num(b.default_rate, 0),
    monthly_salary: num(b.monthly_salary, 0),
    monthly_contract_hours: num(b.monthly_contract_hours, 160),
    overtime_enabled: b.overtime_enabled ? 1 : 0,
    overtime_daily_threshold: num(b.overtime_daily_threshold, 8),
    overtime_multiplier: num(b.overtime_multiplier, 1.5),
    weekend_multiplier: num(b.weekend_multiplier, 1),
    holiday_multiplier: num(b.holiday_multiplier, 1),
    night_multiplier: num(b.night_multiplier, 1),
    vacation_days_total: num(b.vacation_days_total, 0),
    sick_days_total: num(b.sick_days_total, 0),
    monthly_hour_target: num(b.monthly_hour_target, 160),
    tax_rate: num(b.tax_rate, 0),
    tax_model: b.tax_model === 'israel' ? 'israel' : 'flat',
    credit_points: num(b.credit_points, 2.25),
    travel_per_day: num(b.travel_per_day, 0),
    travel_taxable: b.travel_taxable ? 1 : 0,
    currency: b.currency || 'USD',
    color: b.color || '#6366f1',
    notes: b.notes || '',
  };
  const cols = WORKBENCH_FIELDS.join(', ');
  const placeholders = WORKBENCH_FIELDS.map((f) => `@${f}`).join(', ');
  const info = db
    .prepare(`INSERT INTO workbenches (user_id, sort_order, ${cols}) VALUES (@user_id, @sort_order, ${placeholders})`)
    .run({ ...defaults, user_id: req.user.id, sort_order: maxOrder + 1 });
  res.json(db.prepare('SELECT * FROM workbenches WHERE id = ?').get(info.lastInsertRowid));
});

api.get('/workbenches/:id', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  res.json(wb);
});

api.put('/workbenches/:id', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const b = req.body || {};
  const updates = {};
  for (const f of WORKBENCH_FIELDS) {
    if (f in b) {
      if (f === 'overtime_enabled' || f === 'travel_taxable') updates[f] = b[f] ? 1 : 0;
      else if (f === 'salary_mode') updates[f] = b[f] === 'monthly' ? 'monthly' : 'hourly';
      else if (f === 'tax_model') updates[f] = b[f] === 'israel' ? 'israel' : 'flat';
      else if (['name', 'currency', 'color', 'notes'].includes(f)) updates[f] = b[f] ?? wb[f];
      else updates[f] = num(b[f], wb[f]);
    }
  }
  if (Object.keys(updates).length) {
    const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE workbenches SET ${setClause} WHERE id = @id`).run({ ...updates, id: wb.id });
  }
  res.json(db.prepare('SELECT * FROM workbenches WHERE id = ?').get(wb.id));
});

api.delete('/workbenches/:id', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  db.prepare('DELETE FROM workbenches WHERE id = ?').run(wb.id);
  res.json({ ok: true });
});

/* ------------------------------ shifts ----------------------------- */
api.get('/workbenches/:id/shifts', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const rows = db
    .prepare('SELECT * FROM shifts WHERE workbench_id = ? ORDER BY date DESC, start_time DESC')
    .all(wb.id);
  res.json(rows.map(mapShift));
});

function buildShiftValues(b, fallback = {}) {
  return {
    date: b.date ?? fallback.date,
    start_time: b.start_time ?? fallback.start_time ?? null,
    end_time: b.end_time ?? fallback.end_time ?? null,
    break_minutes: num(b.break_minutes, fallback.break_minutes ?? 0),
    title: b.title ?? fallback.title ?? '',
    notes: b.notes ?? fallback.notes ?? '',
    custom_rate: b.custom_rate === '' || b.custom_rate == null ? (fallback.custom_rate ?? null) : num(b.custom_rate, null),
    tags: JSON.stringify(Array.isArray(b.tags) ? b.tags : safeParse(fallback.tags, [])),
    entry_type: b.entry_type ?? fallback.entry_type ?? 'work',
  };
}

api.post('/workbenches/:id/shifts', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const list = Array.isArray(req.body) ? req.body : [req.body];
  const cols = SHIFT_FIELDS.join(', ');
  const placeholders = SHIFT_FIELDS.map((f) => `@${f}`).join(', ');
  const stmt = db.prepare(`INSERT INTO shifts (workbench_id, ${cols}) VALUES (@workbench_id, ${placeholders})`);
  const created = [];
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (!item.date) throw new Error('Shift date is required');
      const vals = buildShiftValues(item);
      const info = stmt.run({ ...vals, workbench_id: wb.id });
      created.push(info.lastInsertRowid);
    }
  });
  try {
    insertMany(list);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const rows = created.map((id) => mapShift(db.prepare('SELECT * FROM shifts WHERE id = ?').get(id)));
  res.json(Array.isArray(req.body) ? rows : rows[0]);
});

api.put('/workbenches/:id/shifts/:shiftId', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ? AND workbench_id = ?').get(req.params.shiftId, wb.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  const vals = buildShiftValues(req.body || {}, shift);
  const setClause = SHIFT_FIELDS.map((f) => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE shifts SET ${setClause} WHERE id = @id`).run({ ...vals, id: shift.id });
  res.json(mapShift(db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift.id)));
});

api.delete('/workbenches/:id/shifts/:shiftId', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const info = db.prepare('DELETE FROM shifts WHERE id = ? AND workbench_id = ?').run(req.params.shiftId, wb.id);
  if (!info.changes) return res.status(404).json({ error: 'Shift not found' });
  res.json({ ok: true });
});

/* --------------------------- csv export ---------------------------- */
api.get('/workbenches/:id/export.csv', authMiddleware, (req, res) => {
  const wb = ownWorkbench(req.user.id, req.params.id);
  if (!wb) return res.status(404).json({ error: 'Workbench not found' });
  const rows = db.prepare('SELECT * FROM shifts WHERE workbench_id = ? ORDER BY date ASC').all(wb.id).map(mapShift);
  const headers = ['date', 'start_time', 'end_time', 'break_minutes', 'title', 'entry_type', 'custom_rate', 'tags', 'notes'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(headers.map((h) => csvCell(h === 'tags' ? r.tags.join('|') : r[h])).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${wb.name.replace(/[^a-z0-9]/gi, '_')}_shifts.csv"`);
  res.send(csv.join('\n'));
});

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function num(v, fallback) {
  if (v === '' || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

app.use('/api', api);
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* ----------------------- serve client build ------------------------ */
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () =>
  console.log(`Workbench API running on http://localhost:${PORT}`),
);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n  Port ${PORT} is already in use — another Workbench server (or app) is probably still running.\n` +
        `  Options:\n` +
        `    • Stop the other process, or\n` +
        `    • Start on a different port:  PORT=${Number(PORT) + 1} npm start` +
        `   (Windows: set PORT=${Number(PORT) + 1} && npm start)\n`,
    );
    process.exit(1);
  }
  throw err;
});
