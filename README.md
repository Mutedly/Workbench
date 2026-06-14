# Workbench — Work Hours & Salary Tracker

A clean, fast, modern web app for shift workers and freelancers to track work hours
and know **exactly how much money they're making this month** — without opening Excel.

The core concept is the **Workbench**: each Workbench represents a separate job, client,
or income source, with its own settings, shifts, calculations, and views. Data is never
mixed between Workbenches.

## Features

- **Accounts** — email/password sign up & log in (JWT auth).
- **Multiple Workbenches** — one per job/client/income source, each fully independent.
- **Workbench settings** — name, hourly **or** monthly-salary mode, default rate,
  overtime rules, weekend/holiday/night rate multipliers, vacation & sick days,
  monthly hour target, tax/deduction estimate, currency, color, and notes.
- **Shifts** — date, start/end time, break, optional title, notes, custom rate,
  tags (training, overtime, holiday, night shift, remote, office), plus vacation/sick entries.
- **Calculations** — hours per day/week/month, gross & net salary, remaining hours to
  goal, average hours & earnings per shift, overtime hours, vacation/sick usage, and a
  **salary prediction based on current month pace**.
- **Calendar View** — monthly calendar with shifts inside each day; click to add/edit/delete.
- **List View** — sortable, filterable table (by month, type, tag, search) with CSV export.
- **Dashboard** — every Workbench as a card (current month hours, estimated salary,
  goal progress bar, last shift, quick-add button) plus combined totals.
- **Monthly Summary** & **Reports/Analytics** — weekly breakdowns, multi-month trends,
  tag breakdowns.
- **Extras** — duplicate shift, recurring shifts, CSV export, dark mode, mobile-friendly
  responsive design, progress bars.

## Tech stack

- **Frontend:** React + TypeScript + Vite, React Router. No UI framework — custom CSS
  with light/dark theming.
- **Backend:** Node.js + Express, JWT auth, bcrypt password hashing.
- **Database:** SQLite (`better-sqlite3`), zero-config, file-based (`server/data/`).

## Getting started

Requires Node.js 18+.

```bash
# install everything (uses npm workspaces)
npm install

# development (API on :4000, Vite dev server on :5173 with proxy)
npm run dev
# open http://localhost:5173

# production (build client, serve everything from the API on :4000)
npm start
# open http://localhost:4000
```

### Environment variables (optional)

| Variable     | Default                  | Description                          |
| ------------ | ------------------------ | ------------------------------------ |
| `PORT`       | `4000`                   | API / production server port         |
| `JWT_SECRET` | dev fallback             | Secret for signing auth tokens       |
| `DATA_DIR`   | `server/data`            | Where the SQLite database is stored  |

## Project structure

```
server/   Express API + SQLite (auth, workbenches, shifts, CSV export)
client/   React + Vite SPA (pages, calc engine, components)
```

## How pay is calculated

For **hourly** Workbenches each shift's worked hours are `(end − start) − break`
(overnight shifts supported). The applicable rate is the shift's custom rate or the
Workbench default, multiplied by the highest applicable premium (weekend / holiday /
night). When overtime is enabled, hours beyond the daily threshold (or any shift tagged
`overtime`) are paid at the overtime multiplier.

For **monthly-salary** Workbenches the gross is the configured monthly salary.

Net salary applies the Workbench's tax/deduction percentage. The "expected income"
projection scales the current month's totals by `days in month ÷ days elapsed`.
