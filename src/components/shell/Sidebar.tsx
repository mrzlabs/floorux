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
}

export function Sidebar({ profile, navItems, shopName, shopSub, shopColor, shopImg, onClose, open, returnPath, brandLogo, onBrandLogoUpload }: SidebarProps) {
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
          style={{ overflow: 'hidden', position: 'relative', cursor: onBrandLogoUpload ? 'pointer' : undefined }}
          onMouseEnter={() => onBrandLogoUpload && setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          onClick={() => onBrandLogoUpload && fileRef.current?.click()}
        >
          {uploading ? (
            <span className="live" style={{ fontSize: 11 }}><i /></span>
          ) : brandLogo ? (
            <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      <div className="rolepick" aria-label="Rol actual">
        <button className="on" type="button" disabled>
          <Icon name={role.icon} />
          {role.label}
        </button>
      </div>

      <nav className="nav">
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
              <span style={active ? { color: accentColor, display: 'contents' } : { display: 'contents' }}><Icon name={item.icon} /></span>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && <span className="ncount">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

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
