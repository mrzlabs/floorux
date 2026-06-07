'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { SessionActions } from '@/components/shell/SessionActions';
import type { Profile } from '@/types/db';

const PALETTE = ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface RoleThumb {
  src?: string | null;
  color: string;
  initials: string;
  label: string;
  bizIdx?: number;
}

interface SidebarProps {
  profile: Profile;
  navItems: NavItem[];
  shopName: string;
  shopSub: string;
  shopColor: string;
  shopImg?: string | null;
  onClose?: () => void;
  open?: boolean;
  returnPath?: string | null;
  brandLogo?: string | null;
  onBrandLogoUpload?: (file: File) => Promise<void>;
  onBrandLogoClick?: () => void;
  brandFallbackColor?: string;
  brandFallbackInitials?: string;
  roleThumb?: RoleThumb;
  navFooter?: React.ReactNode;
}

export function Sidebar({ profile, navItems, shopName, shopSub, shopColor, shopImg, onClose, open, returnPath, brandLogo, onBrandLogoUpload, onBrandLogoClick, brandFallbackColor, brandFallbackInitials, roleThumb, navFooter }: SidebarProps) {
  const pathname = usePathname();
  const [logoHover, setLogoHover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showShopPhoto, setShowShopPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const role = profile.role === 'super_super_admin'
    ? { label: 'Super Root', icon: 'super' }
    : profile.role === 'super_admin'
      ? { label: 'Super Admin', icon: 'super' }
      : profile.role === 'admin'
        ? { label: 'Admin', icon: 'admin' }
        : { label: 'Empleado', icon: 'empleado' };

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onBrandLogoUpload) return;
    setUploading(true);
    await onBrandLogoUpload(file);
    setUploading(false);
    e.target.value = '';
  }

  return (
    <aside className={'side' + (open ? ' open' : '')}>
      <div className="brand">
        <span
          className="brand-mark"
          style={{
            overflow: 'hidden', position: 'relative',
            cursor: (onBrandLogoUpload || onBrandLogoClick) ? 'pointer' : undefined,
          }}
          onMouseEnter={() => onBrandLogoUpload && setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          onClick={() => {
            if (onBrandLogoUpload) fileRef.current?.click();
            else if (onBrandLogoClick) onBrandLogoClick();
          }}
        >
          {uploading ? (
            <span className="live" style={{ fontSize: 11 }}><i /></span>
          ) : brandLogo ? (
            <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : brandFallbackInitials ? (
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%', fontWeight: 800, fontSize: 13,
              color: brandFallbackColor ?? 'var(--accent)',
              background: (brandFallbackColor ?? 'var(--accent)') + '33',
            }}>
              {brandFallbackInitials}
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 19V8l7-4 7 4v11M9 19v-5h6v5" stroke="#0b0a12" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="1.6" fill="#0b0a12" />
            </svg>
          )}
          {onBrandLogoUpload && logoHover && !uploading && (
            <span style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Icon name="camera" s={15} />
            </span>
          )}
        </span>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        <div>
          <div className="brand-tx">FloorUX<span>.</span></div>
          <div className="brand-sub">OperUX · CRM</div>
        </div>
      </div>

      {/* rolepick — rol normal o thumbnail de comercio rotante */}
      <div className="rolepick" aria-label="Rol actual">
        {roleThumb ? (
          <button className="on" type="button" disabled style={{ gap: 10, padding: '9px 12px' }}>
            <span
              key={roleThumb.bizIdx ?? 0}
              style={{
                width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flex: 'none',
                background: roleThumb.color + '33', color: roleThumb.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, animation: 'fade .4s',
              }}
            >
              {roleThumb.src
                ? <img src={roleThumb.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : roleThumb.initials
              }
            </span>
            <span style={{ fontSize: 11 }}>{roleThumb.label}</span>
          </button>
        ) : (
          <button className="on" type="button" disabled>
            <Icon name={role.icon} />
            {role.label}
          </button>
        )}
      </div>

      <nav className="nav" style={{ flex: 1 }}>
        {navItems.map((item, index) => {
          const active = pathname.startsWith(item.href);
          const accentColor = PALETTE[index % 3];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={'nav-i' + (active ? ' on' : '')}
              onClick={onClose}
              style={active ? { color: accentColor } : undefined}
            >
              <span style={active ? { color: accentColor, display: 'contents' } : { display: 'contents' }}>
                <Icon name={item.icon} />
              </span>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && <span className="ncount">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      {navFooter && <div style={{ padding: '0 12px 8px' }}>{navFooter}</div>}

      {/* shop footer — avatar clickeable solo para ver */}
      <div
        className="shop"
        style={{ cursor: shopImg ? 'zoom-in' : undefined }}
        onClick={() => shopImg && setShowShopPhoto(true)}
      >
        <Avatar name={shopName} color={shopColor} img={shopImg ?? undefined} />
        <div style={{ minWidth: 0 }}>
          <b>{shopName}</b>
          <span>{shopSub}</span>
        </div>
      </div>
      <SessionActions returnPath={returnPath} />

      {/* lightbox avatar shop */}
      {showShopPhoto && shopImg && (
        <div
          onClick={() => setShowShopPhoto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={shopImg}
            alt="Foto"
            style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </aside>
  );
}
