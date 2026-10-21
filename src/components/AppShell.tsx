import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, ClipboardCheck, FileBarChart, Map, RadioTower, Settings, ShieldCheck } from 'lucide-react';

const primaryItems = [
  { to: '/', label: 'Overview', icon: Activity },
  { to: '/sites', label: 'Sites & Map', icon: Map },
  { to: '/lunchbox', label: 'KBTCOE · LunchBox', icon: RadioTower },
];

const plannedItems = [
  { label: 'Surveys', icon: RadioTower },
  { label: 'Field Operations', icon: ClipboardCheck },
  { label: 'Reports', icon: FileBarChart },
  { label: 'Administration', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const isLunchBox = useLocation().pathname === '/lunchbox';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div>
            <strong>Mosquito Risk</strong>
            <span>Intelligence</span>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {primaryItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <p className="nav-label planned-label">Planned</p>
          {plannedItems.map(({ label, icon: Icon }) => (
            <div key={label} className="nav-item planned" aria-disabled="true">
              <Icon size={18} />
              <span>{label}</span>
              <em>soon</em>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="demo-dot" />
          <div>
            <strong>{isLunchBox ? 'KBTCOE private pilot' : 'Demo workspace'}</strong>
            <span>{isLunchBox ? 'Ground review pending' : 'Seed data · not live NMC data'}</span>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <span className="eyebrow">Pilot operations</span>
            <strong>{isLunchBox ? 'KBTCOE · LunchBox observations' : 'Surveillance Operations Dashboard'}</strong>
          </div>
          <div className="user-chip" aria-label={isLunchBox ? 'Private pilot access' : 'Current demo user'}>
            <span>VD</span>
            <div>
              <strong>{isLunchBox ? 'Private pilot' : 'Demo Coordinator'}</strong>
              <small>{isLunchBox ? 'Operator access' : 'Health Officer role'}</small>
            </div>
          </div>
        </header>
        <main className="page-area">{children}</main>
      </div>
    </div>
  );
}
