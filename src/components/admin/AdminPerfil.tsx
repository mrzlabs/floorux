'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import { applyVisualConfig, getVisualConfig, type VisualConfig } from '@/components/shell/VisualTheme';
import type { Profile, Comercio } from '@/types/db';

const PALETTES = [
  { name: 'Violeta', c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Fuego', c: ['#F5634A', '#F5A623', '#E040FB'] },
  { name: 'Bosque', c: ['#34d399', '#3b82f6', '#a78bfa'] },
  { name: 'Rosa', c: ['#f472b6', '#fb923c', '#a78bfa'] },
  { name: 'Hielo', c: ['#38bdf8', '#22d3ee', '#818cf8'] },
  { name: 'Oro', c: ['#F5C400', '#f59e42', '#E0708A'] },
];

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
  const [visual, setVisual] = useState(() => getVisualConfig(comercio.settings));
  const [savingVisual, setSavingVisual] = useState(false);
  const supabase = createClient();

  async function saveProfile() {
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
    setEditing(false);
  }

  async function saveBiz() {
    const { error } = await supabase.from('comercios').update({ name: bizForm.name, address: bizForm.address || null, phone: bizForm.phone || null, nit: bizForm.nit || null, color: bizForm.color }).eq('id', comercio.id);
    if (error) {
      toast('No se pudo actualizar el local', 'alert');
      return;
    }
    toast('Local actualizado', 'check');
  }

  async function saveVisual(next: VisualConfig) {
    const previous = visual;
    setVisual(next);
    setSavingVisual(true);
    applyVisualConfig(next);

    const settings = { ...comercio.settings, config_visual: next };
    const { error } = await supabase.from('comercios').update({ settings }).eq('id', comercio.id);
    if (error) {
      setVisual(previous);
      applyVisualConfig(previous);
      toast('No se pudo guardar la personalización', 'alert');
      setSavingVisual(false);
      return;
    }
    setSavingVisual(false);
    toast('Personalización actualizada', 'check');
  }

  async function uploadCommerce(file?: File) {
    if (!file) return;
    const path = `${profile.id}/commerce-${comercio.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    await supabase.from('comercios').update({ photo_url: data.publicUrl }).eq('id', comercio.id);
    toast('Foto del comercio actualizada', 'check');
  }

  return (
    <div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Avatar name={profile.full_name} color={profile.color} size="lg" img={profile.avatar_url ?? undefined} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.full_name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{profile.alias ?? 'Sin alias'} · {profile.role}</div>
            </div>
          </div>
          {operating ? (
            <p className="muted" style={{ fontSize: 13 }}>El perfil personal no se modifica durante la operación delegada.</p>
          ) : editing ? (
            <>
              <Field label="Nombre completo"><input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
              <Field label="Alias"><input className="inp" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} /></Field>
              <Field label="Color de marca">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ height: 40, width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer' }} />
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

        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Datos del local</h2>
          <Field label="Nombre del local"><input className="inp" value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Dirección"><input className="inp" value={bizForm.address} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label="Teléfono"><input className="inp" value={bizForm.phone} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="NIT"><input className="inp" value={bizForm.nit} onChange={e => setBizForm(f => ({ ...f, nit: e.target.value }))} /></Field>
          <Field label="Color del panel"><input className="inp" type="color" value={bizForm.color} onChange={e => setBizForm(f => ({ ...f, color: e.target.value }))} /></Field>
          <Field label="Foto del comercio"><input className="inp" type="file" accept="image/*" onChange={e => uploadCommerce(e.target.files?.[0])} /></Field>
          <div className="grid g2" style={{ marginTop: 8 }}>
            <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="tag" s={14} sw={2} /></span>Plan</div><div className="sv">{comercio.plan}</div></div>
            <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--accent2)22', color: 'var(--accent2)' }}><Icon name="mesas" s={14} sw={2} /></span>Mesas</div><div className="sv">{comercio.tables_count}</div></div>
          </div>
          <div className="biz-row"><span>Inicio en FloorUX</span><b>{comercio.subscription_start ?? comercio.since}</b></div>
          <div className="biz-row"><span>Fin suscripción</span><b>{comercio.subscription_end ?? 'Sin fin'}</b></div>
          <div className="biz-row"><span>Renovación</span><b>Día {comercio.renewal_day ?? '—'}</b></div>
          <button className="btn pri" style={{ marginTop: 16, width: '100%' }} onClick={saveBiz}><Icon name="check" /> Guardar cambios</button>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Apariencia del panel</h2>
        <Field label="Tema">
          <div className="theme-seg">
            <button disabled={savingVisual} className={visual.mode === 'dark' ? 'on' : ''} onClick={() => saveVisual({ ...visual, mode: 'dark' })}>
              <Icon name="moon" s={16} /> Oscuro
            </button>
            <button disabled={savingVisual} className={visual.mode === 'light' ? 'on' : ''} onClick={() => saveVisual({ ...visual, mode: 'light' })}>
              <Icon name="sun" s={16} /> Claro
            </button>
          </div>
        </Field>
        <Field label="Paleta">
          <div className="swatches">
            {PALETTES.map(palette => {
              const active = palette.c.every((color, index) => color === visual.palette[index]);
              return (
                <button
                  key={palette.name}
                  className={'swatch' + (active ? ' on' : '')}
                  style={{ background: `linear-gradient(135deg, ${palette.c.join(', ')})` }}
                  title={palette.name}
                  aria-label={palette.name}
                  disabled={savingVisual}
                  onClick={() => saveVisual({ ...visual, palette: palette.c })}
                />
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}
