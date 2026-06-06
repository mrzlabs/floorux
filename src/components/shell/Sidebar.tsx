'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { SessionActions } from '@/components/shell/SessionActions';
import type { Profile } from '@/types/db';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  profile: Profile;
  navItems: NavItem[];
  shopName: string;
  shopSub: string;
  shopColor: string;
  onClose?: () => void;
  open?: boolean;
  returnPath?: string | null;
}

export function Sidebar({ profile, navItems, shopName, shopSub, shopColor, onClose, open, returnPath }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={'side' + (open ? ' open' : '')}>
      <div className="brand">
        <span className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 19V8l7-4 7 4v11M9 19v-5h6v5" stroke="#0b0a12" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="1.6" fill="#0b0a12" />
          </svg>
        </span>
        <div>
          <div className="brand-tx">FloorUX<span>.</span></div>
          <div className="brand-sub">OperUX · CRM</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={'nav-i' + (active ? ' on' : '')} onClick={onClose}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && <span className="ncount">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shop">
        <Avatar name={shopName} color={shopColor} />
        <div style={{ minWidth: 0 }}>
          <b>{shopName}</b>
          <span>{shopSub}</span>
        </div>
      </div>
      <SessionActions returnPath={returnPath} />
    </aside>
  );
}
