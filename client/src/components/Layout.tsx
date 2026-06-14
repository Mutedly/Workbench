import { useState } from 'react';
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { getTheme, applyTheme, type Theme } from '../theme';
import {
  IconGrid, IconCalendar, IconList, IconChart, IconReport, IconSettings,
  IconSun, IconMoon, IconLogout, IconMenu, IconPlus,
} from './Icons';

export default function Layout() {
  const { user, logout } = useAuth();
  const { workbenches } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getTheme());

  const wbMatch = useMatch('/workbench/:id/*');
  const activeId = wbMatch?.params.id ? Number(wbMatch.params.id) : null;
  const activeWb = workbenches.find((w) => w.id === activeId) || null;

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const close = () => setOpen(false);

  return (
    <div className="app-shell">
      <div className={`scrim ${open ? 'show' : ''}`} onClick={close} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand" onClick={() => { navigate('/'); close(); }} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">W</span> Workbench
        </div>

        <NavLink to="/" end className="nav-link" onClick={close}>
          <span className="ico"><IconGrid /></span> Dashboard
        </NavLink>
        <NavLink to="/new" className="nav-link" onClick={close}>
          <span className="ico"><IconPlus /></span> New Workbench
        </NavLink>

        {activeWb && (
          <>
            <div className="nav-section" style={{ color: activeWb.color }}>{activeWb.name}</div>
            <NavLink to={`/workbench/${activeWb.id}/calendar`} className="nav-link" onClick={close}>
              <span className="ico"><IconCalendar /></span> Calendar
            </NavLink>
            <NavLink to={`/workbench/${activeWb.id}/list`} className="nav-link" onClick={close}>
              <span className="ico"><IconList /></span> List
            </NavLink>
            <NavLink to={`/workbench/${activeWb.id}/summary`} className="nav-link" onClick={close}>
              <span className="ico"><IconChart /></span> Monthly Summary
            </NavLink>
            <NavLink to={`/workbench/${activeWb.id}/reports`} className="nav-link" onClick={close}>
              <span className="ico"><IconReport /></span> Reports
            </NavLink>
            <NavLink to={`/workbench/${activeWb.id}/settings`} className="nav-link" onClick={close}>
              <span className="ico"><IconSettings /></span> Settings
            </NavLink>
          </>
        )}

        {workbenches.length > 0 && !activeWb && (
          <>
            <div className="nav-section">Workbenches</div>
            {workbenches.map((w) => (
              <NavLink key={w.id} to={`/workbench/${w.id}/calendar`} className="nav-link" onClick={close}>
                <span className="dot" style={{ background: w.color }} /> {w.name}
              </NavLink>
            ))}
          </>
        )}

        <div className="sidebar-spacer" />
        <div className="divider" />
        <button className="nav-link" onClick={toggleTheme} style={{ border: 'none', background: 'none', width: '100%' }}>
          <span className="ico">{theme === 'dark' ? <IconSun /> : <IconMoon />}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="nav-link" style={{ cursor: 'default' }}>
          <span className="ico">👤</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email}
          </span>
        </div>
        <button className="nav-link" onClick={logout} style={{ border: 'none', background: 'none', width: '100%' }}>
          <span className="ico"><IconLogout /></span> Sign out
        </button>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="btn btn-icon btn-ghost mobile-bar" onClick={() => setOpen(true)} aria-label="Menu">
            <IconMenu />
          </button>
          <div className="brand mobile-bar" style={{ padding: 0, fontSize: 16 }}>
            <span className="brand-mark" style={{ width: 26, height: 26, fontSize: 15 }}>W</span>
            Workbench
          </div>
          <div className="topbar-spacer" />
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
