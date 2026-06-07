'use client';
// Bucket "avatars" debe existir en Supabase Storage con acceso público.
// Crearlo desde Dashboard → Storage → New bucket → nombre: "avatars" → Public: ON
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import { applyFullTheme } from '@/hooks/useTheme';
import type { Profile } from '@/types/db';

const PALETAS = [
  { name: 'Violeta',    c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Fuego',      c: ['#F5634A', '#F5A623', '#E040FB'] },
  { name: 'Bosque',     c: ['#34d399', '#3b82f6', '#a78bfa'] },
  { name: 'Rosa',       c: ['#f472b6', '#fb923c', '#a78bfa'] },
  { name: 'Hielo',      c: ['#38bdf8', '#22d3ee', '#818cf8'] },
  { name: 'Oro',        c: ['#F5C400', '#f59e42', '#E0708A'] },
  { name: 'Neón',       c: ['#39FF14', '#FF073A', '#0FF0FC'] },
  { name: 'Cobre',      c: ['#cb6015', '#e8a87c', '#7B3F00'] },
  { name: 'Océano',     c: ['#0077B6', '#00B4D8', '#90E0EF'] },
  { name: 'Noche',      c: ['#2D00F7', '#6A00F4', '#8900F2'] },
  { name: 'Tierra',     c: ['#606c38', '#dda15e', '#bc6c25'] },
  { name: 'Candy',      c: ['#ff006e', '#8338ec', '#3a86ff'] },
  { name: 'Aurora',     c: ['#00C9FF', '#92FE9D', '#FFD700'] },
  { name: 'Lava',       c: ['#FF4500', '#FF8C00', '#FFD700'] },
  { name: 'Galaxia',    c: ['#0F2027', '#203A43', '#2C5364'] },
  { name: 'Menta',      c: ['#00B09B', '#96C93D', '#56CCF2'] },
  { name: 'Rubí',       c: ['#CB2D3E', '#EF473A', '#F7971E'] },
  { name: 'Zafiro',     c: ['#1A237E', '#283593', '#5C6BC0'] },
  { name: 'Esmeralda',  c: ['#004D40', '#00796B', '#4DB6AC'] },
  { name: 'Crepúsculo', c: ['#F7971E', '#FFD200', '#FF6B6B'] },
];

const FONTS = ['Plus Jakarta Sans', 'DM Sans', 'Syne', 'Outfit', 'Space Grotesk'];

interface ExtTheme {
  mode: 'dark' | 'light';
  palette: string[];
  font: string;
  density: 'comfortable' | 'compact';
  radius: number;
  neuralOpacity: number;
}

function getExtTheme(pt: Record<string, unknown>, fallback: string): ExtTheme {
  return {
    mode: pt.mode === 'light' ? 'light' : 'dark',
    palette: Array.isArray(pt.palette) && (pt.palette as unknown[]).length === 3
      ? (pt.palette as string[]) : [fallback, '#27C3D8', '#B57BE0'],
    font: typeof pt.font === 'string' ? pt.font : 'Plus Jakarta Sans',
    density: pt.density === 'compact' ? 'compact' : 'comfortable',
    radius: typeof pt.radius === 'number' ? pt.radius : 14,
    neuralOpacity: typeof pt.neuralOpacity === 'number' ? pt.neuralOpacity : 60,
  };
}

interface SRCuentaProps { profile: Profile }

export function SRCuenta({ profile }: SRCuentaProps) {
  const toast = useToast();
  const pt = profile.panel_theme as Record<string, unknown>;
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '' });
  const [theme, setTheme] = useState<ExtTheme>(() => getExtTheme(pt, profile.color));
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [brandLogo, setBrandLogo] = useState(typeof pt.brandLogo === 'string' ? pt.brandLogo : '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function live(patch: Partial<ExtTheme>) {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyFullTheme({ ...next, brandLogo } as Record<string, unknown>, profile.color);
  }

  async function saveAll() {
    setSaving(true);
    const panel_theme: Record<string, unknown> = { ...theme };
    if (brandLogo) panel_theme.brandLogo = brandLogo;
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      alias: form.alias || null,
      panel_theme,
      color: theme.palette[0],
    }).eq('id', profile.id);
    if (error) { toast('No se pudo guardar', 'alert'); setSaving(false); return; }
    toast('Cambios guardados', 'check');
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `profiles/${profile.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast('No se pudo subir la foto', 'alert'); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    setAvatarUrl(data.publicUrl + '?v=' + Date.now());
    setUploadingAvatar(false);
    toast('Foto actualizada', 'check');
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `profiles/${profile.id}/brand-logo.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast('No se pudo subir el logo', 'alert'); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = data.publicUrl + '?v=' + Date.now();
    setBrandLogo(url);
    setUploadingLogo(false);
    toast('Logo actualizado. Guarda los cambios para persistir.', 'check');
  }

  const C = { fontSize: 13, color: 'var(--muted)' };
  const SEC = { fontSize: 14, fontWeight: 800, marginBottom: 12, marginTop: 4 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

      {/* ── Perfil ── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Perfil</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          {/* avatar con cámara */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span
              className="avatar lg"
              style={{
                background: theme.palette[0] + '26', color: theme.palette[0],
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarUrl && !uploadingAvatar ? 'zoom-in' : undefined,
              }}
              onClick={() => avatarUrl && !uploadingAvatar && setShowPhoto(true)}
            >
              {uploadingAvatar
                ? <span className="live" style={{ fontSize: 11 }}><i /></span>
                : avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())
              }
            </span>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--panel)',
                color: '#0b0a12', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="camera" s={13} />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{form.full_name || profile.full_name}</div>
            <div style={C}>Super Root · {profile.email}</div>
          </div>
        </div>
        <Field label="Nombre completo">
          <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label="Alias">
          <input className="inp" value={form.alias} placeholder="Ej. Admin global…" onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
        </Field>
      </div>

      {/* ── Logo de marca ── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Logo de la sidebar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span className="brand-mark" style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grad)', boxShadow: '0 8px 22px -8px var(--accent)' }}>
              {uploadingLogo
                ? <span className="live" style={{ fontSize: 11 }}><i /></span>
                : brandLogo
                  ? <img src={brandLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}>
                      <path d="M5 19V8l7-4 7 4v11M9 19v-5h6v5" stroke="#0b0a12" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="1.6" fill="#0b0a12" />
                    </svg>
              }
            </span>
            <button type="button" onClick={() => logoRef.current?.click()}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--panel)', color: '#0b0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="camera" s={12} />
            </button>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Logo de la barra lateral</div>
            <div style={C}>Reemplaza el ícono de la casa. Cuadrado, máx. 2MB.</div>
            {brandLogo && (
              <button className="btn sm ghost" style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => setBrandLogo('')}>
                Restaurar por defecto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Apariencia ── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Apariencia del panel</h2>

        {/* modo */}
        <Field label="Tema">
          <div className="theme-seg">
            <button className={theme.mode === 'dark' ? 'on' : ''} onClick={() => live({ mode: 'dark' })}>
              <Icon name="moon" s={15} /> Oscuro
            </button>
            <button className={theme.mode === 'light' ? 'on' : ''} onClick={() => live({ mode: 'light' })}>
              <Icon name="sun" s={15} /> Claro
            </button>
          </div>
        </Field>

        {/* paletas */}
        <Field label="Paleta de colores">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px 10px' }}>
            {PALETAS.map(p => {
              const active = p.c.every((col, i) => col === theme.palette[i]);
              return (
                <div key={p.name} style={{ textAlign: 'center' }}>
                  <button
                    className={'swatch' + (active ? ' on' : '')}
                    style={{
                      width: 52, height: 52,
                      background: `linear-gradient(to right, ${p.c[0]} 0% 33%, ${p.c[1]} 33% 66%, ${p.c[2]} 66% 100%)`,
                    }}
                    title={p.name}
                    aria-label={p.name}
                    onClick={() => live({ palette: p.c })}
                  />
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, lineHeight: 1.2 }}>{p.name}</div>
                </div>
              );
            })}
          </div>
        </Field>

        {/* tipografía */}
        <Field label="Tipografía">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FONTS.map(f => (
              <button
                key={f}
                className={'fchip' + (theme.font === f ? ' on' : '')}
                style={{ fontFamily: `'${f}', system-ui, sans-serif`, fontSize: 13 }}
                onClick={() => live({ font: f })}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>

        {/* densidad */}
        <Field label="Densidad">
          <div className="theme-seg">
            <button className={theme.density === 'comfortable' ? 'on' : ''} onClick={() => live({ density: 'comfortable' })}>
              Cómodo
            </button>
            <button className={theme.density === 'compact' ? 'on' : ''} onClick={() => live({ density: 'compact' })}>
              Compacto
            </button>
          </div>
        </Field>

        {/* radio */}
        <Field label={`Radio de bordes — ${theme.radius}px`}>
          <input type="range" min={4} max={24} step={1} value={theme.radius}
            onChange={e => live({ radius: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
            <span>4px</span><span>24px</span>
          </div>
        </Field>

        {/* neural opacity */}
        <Field label={`Intensidad del gradiente de fondo — ${theme.neuralOpacity}%`}>
          <input type="range" min={0} max={100} step={5} value={theme.neuralOpacity}
            onChange={e => live({ neuralOpacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
            <span>Sin gradiente</span><span>Máximo</span>
          </div>
        </Field>
      </div>

      {/* ── Guardar ── */}
      <button className="btn pri block" onClick={saveAll} disabled={saving} style={{ fontSize: 15, height: 48 }}>
        <Icon name="check" /> {saving ? 'Guardando…' : 'Guardar todos los cambios'}
      </button>

      {/* ── Lightbox foto ── */}
      {showPhoto && avatarUrl && (
        <div
          onClick={() => setShowPhoto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            style={{
              maxWidth: '80vw', maxHeight: '80vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
