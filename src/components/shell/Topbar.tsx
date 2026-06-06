'use client';
import { Icon } from '@/components/ui/Icon';

interface TopbarProps {
  title: string;
  sub: string;
  live?: boolean;
  alertCount?: number;
  onMenu: () => void;
  onHelp: () => void;
}

export function Topbar({ title, sub, live, alertCount, onMenu, onHelp }: TopbarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button className="burger" onClick={onMenu}><Icon name="menu" /></button>
        <div className="tt">
          <h1>
            {title}
            {live && <span className="live"><i />En vivo</span>}
          </h1>
          <p>{sub}</p>
        </div>
      </div>
      <div className="top-actions">
        <div className="searchbox"><Icon name="search" s={18} /><input placeholder="Buscar…" /></div>
        <button className="icon-btn" onClick={onHelp}>
          <Icon name="bell" />
          {(alertCount ?? 0) > 0 && <span className="dot" />}
        </button>
      </div>
    </header>
  );
}
