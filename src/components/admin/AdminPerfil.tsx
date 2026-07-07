'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import { applyFullTheme } from '@/hooks/useTheme';
import type { Profile, Comercio } from '@/types/db';

/* ── Paletas ─────────────────────────────────────────────── */
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

const FUENTES = ['Plus Jakarta Sans', 'DM Sans', 'Syne', 'Outfit', 'Space Grotesk'];

/* ── ExtTheme ────────────────────────────────────────────── */
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
    mode:          pt.mode === 'light' ? 'light' : 'dark',
    palette:       Array.isArray(pt.palette) && (pt.palette as unknown[]).length === 3
                     ? (pt.palette as string[]) : [fallback, '#27C3D8', '#B57BE0'],
    font:          typeof pt.font === 'string' ? pt.font : 'Plus Jakarta Sans',
    density:       pt.density === 'compact' ? 'compact' : 'comfortable',
    radius:        typeof pt.radius === 'number' ? pt.radius : 14,
    neuralOpacity: typeof pt.neuralOpacity === 'number' ? pt.neuralOpacity : 60,
  };
}

interface AdminPerfilProps {
  profile: Profile;
  comercio: Comercio;
  operating?: boolean;
}

export function AdminPerfil({ profile, comercio, operating = false }: AdminPerfilProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '', color: profile.color });
  const [bizForm, setBizForm] = useState({ name: comercio.name, address: comercio.address ?? '', phone: comercio.phone ?? '', nit: comercio.nit ?? '', color: comercio.color });
  const [theme, setTheme] = useState<ExtTheme>(() => getExtTheme(profile.panel_theme as Record<string, unknown>, profile.color));
  const [savingTheme, setSavingTheme] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(comercio.photo_url ?? '');
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  function live(patch: Partial<ExtTheme>) {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyFullTheme(next as Record<string, unknown>, profile.color);
  }

  async function saveProfile() {
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
    setEditing(false);
  }

  async function saveBiz() {
    const patch = {
      name: bizForm.name,
      address: bizForm.address || null,
      phone: bizForm.phone || null,
      nit: bizForm.nit || null,
      color: bizForm.color,
    };
    const { error } = await supabase.from('comercios').update(patch).eq('id', comercio.id);
    if (error) { toast('No se pudo actualizar el local', 'alert'); return; }
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, ...patch } }));
    toast('Local actualizado', 'check');
  }

  async function saveTheme() {
    setSavingTheme(true);
    const { error } = await supabase.from('profiles').update({
      panel_theme: { ...(profile.panel_theme as Record<string, unknown>), ...theme },
      color: theme.palette[0],
    }).eq('id', profile.id);
    setSavingTheme(false);
    if (error) { toast('No se pudo guardar las preferencias', 'alert'); return; }
    toast('Preferencias guardadas', 'check');
  }

  async function uploadCommerce(file?: File) {
    if (!file) return;
    const path = `${profile.id}/commerce-${comercio.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    const { error: updateError } = await supabase.from('comercios').update({ photo_url: data.publicUrl }).eq('id', comercio.id);
    if (updateError) { toast('No se pudo guardar la foto del comercio', 'alert'); return; }
    setPhotoUrl(data.publicUrl);
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, photo_url: data.publicUrl } }));
    toast('Foto del comercio actualizada', 'check');
  }

  const C   = { fontSize: 13, color: 'var(--muted)' } as const;
  const SEC = { fontSize: 14, fontWeight: 800, marginBottom: 14 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─── PERFIL PERSONAL ────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Avatar name={profile.full_name} color={profile.color} size="lg" img={profile.avatar_url ?? undefined} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.full_name}</div>
            <div style={C}>{profile.alias ?? 'Sin alias'} · {profile.role}</div>
          </div>
        </div>

        {operating ? (
          <p style={C}>El perfil personal no se modifica durante la operación delegada.</p>
        ) : editing ? (
          <>
            <Field label="Nombre completo">
              <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Alias">
              <input className="inp" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
            </Field>
            <Field label="Color de marca">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ height: 40, width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="btn pri block" onClick={saveProfile}><Icon name="check" /> Guardar</button>
            </div>
          </>
        ) : (
          <button className="btn sm" onClick={() => setEditing(true)}><Icon name="edit" s={14} /> Editar perfil</button>
        )}
      </div>

      {/* ─── DATOS DEL LOCAL ────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Datos del local</h2>
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <Avatar name={bizForm.name || comercio.name} color={bizForm.color} size="lg" img={photoUrl || undefined} />
          <div>
            <b>{bizForm.name || comercio.name}</b>
            <div style={C}>{comercio.type} · {comercio.city}</div>
          </div>
        </div>
        <Field label="Nombre del local">
          <input className="inp" value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Dirección">
          <input className="inp" value={bizForm.address} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} />
        </Field>
        <Field label="Teléfono">
          <input className="inp" value={bizForm.phone} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label="NIT">
          <input className="inp" value={bizForm.nit} onChange={e => setBizForm(f => ({ ...f, nit: e.target.value }))} />
        </Field>
        <Field label="Foto del comercio">
          <input className="inp" type="file" accept="image/*" onChange={e => uploadCommerce(e.target.files?.[0])} />
        </Field>
        <div className="grid g2" style={{ marginTop: 8 }}>
          <div className="stat">
            <div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="tag" s={14} sw={2} /></span>Plan</div>
            <div className="sv">{comercio.plan}</div>
          </div>
          <div className="stat">
            <div className="sk"><span className="si" style={{ background: 'var(--accent2)22', color: 'var(--accent2)' }}><Icon name="mesas" s={14} sw={2} /></span>Mesas</div>
            <div className="sv">{comercio.tables_count}</div>
          </div>
        </div>
        <div className="biz-row"><span>Inicio en FloorUX</span><b>{comercio.subscription_start ?? comercio.since}</b></div>
        <div className="biz-row"><span>Fin suscripción</span><b>{comercio.subscription_end ?? 'Sin fin'}</b></div>
        <button className="btn pri" style={{ marginTop: 16, width: '100%' }} onClick={saveBiz}>
          <Icon name="check" /> Guardar cambios del local
        </button>
      </div>

      {/* ─── APARIENCIA PERSONAL ────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Mi panel — apariencia personal</h2>

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

        <Field label="Paleta de colores">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px 10px' }}>
            {PALETAS.map(p => {
              const active = p.c.every((col, i) => col === theme.palette[i]);
              return (
                <div key={p.name} style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className={'swatch' + (active ? ' on' : '')}
                    style={{
                      width: 52, height: 52,
                      background: `linear-gradient(to right, ${p.c[0]} 0% 33%, ${p.c[1]} 33% 66%, ${p.c[2]} 66% 100%)`,
                      borderRadius: 12,
                    }}
                    title={p.name}
                    onClick={() => live({ palette: p.c })}
                  />
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, lineHeight: 1.2 }}>{p.name}</div>
                </div>
              );
            })}
          </div>
        </Field>

        <Field label="Tipografía">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FUENTES.map(f => (
              <button key={f} type="button"
                className={'fchip' + (theme.font === f ? ' on' : '')}
                style={{ fontFamily: `'${f}', system-ui, sans-serif`, fontSize: 13 }}
                onClick={() => live({ font: f })}>
                {f}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Densidad">
          <div className="theme-seg">
            <button className={theme.density === 'comfortable' ? 'on' : ''} onClick={() => live({ density: 'comfortable' })}>Cómodo</button>
            <button className={theme.density === 'compact' ? 'on' : ''} onClick={() => live({ density: 'compact' })}>Compacto</button>
          </div>
        </Field>

        <Field label={`Radio de bordes — ${theme.radius}px`}>
          <input type="range" min={4} max={24} step={1} value={theme.radius}
            onChange={e => live({ radius: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
            <span>4px</span><span>24px</span>
          </div>
        </Field>

        <Field label={`Intensidad del gradiente — ${theme.neuralOpacity}%`}>
          <input type="range" min={0} max={100} step={5} value={theme.neuralOpacity}
            onChange={e => live({ neuralOpacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
            <span>Sin gradiente</span><span>Máximo</span>
          </div>
        </Field>

        <button className="btn pri block" style={{ marginTop: 18 }} onClick={saveTheme} disabled={savingTheme}>
          <Icon name="check" /> {savingTheme ? 'Guardando…' : 'Guardar preferencias'}
        </button>
      </div>

      {/* ─── SOPORTE ────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Soporte</h2>
        <p style={C}>Envía solicitudes de soporte directamente a tu Super Admin.</p>
        <a href="/admin/soporte" className="btn pri" style={{ marginTop: 12 }}>
          <Icon name="chat" s={15} /> Ir al canal de soporte
        </a>
      </div>
    </div>
  );
}
