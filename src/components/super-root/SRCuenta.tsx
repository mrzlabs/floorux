'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import { applyVisualConfig, getVisualConfig, type VisualConfig } from '@/components/shell/VisualTheme';
import type { Profile } from '@/types/db';

const PALETTES = [
  { name: 'Violeta', c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Fuego', c: ['#F5634A', '#F5A623', '#E040FB'] },
  { name: 'Bosque', c: ['#34d399', '#3b82f6', '#a78bfa'] },
  { name: 'Rosa', c: ['#f472b6', '#fb923c', '#a78bfa'] },
  { name: 'Hielo', c: ['#38bdf8', '#22d3ee', '#818cf8'] },
  { name: 'Oro', c: ['#F5C400', '#f59e42', '#E0708A'] },
];

interface SRCuentaProps {
  profile: Profile;
}

export function SRCuenta({ profile }: SRCuentaProps) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '' });
  const [visual, setVisual] = useState<VisualConfig>(() => getVisualConfig(profile.panel_theme, profile.color));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function saveProfile() {
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      alias: form.alias || null,
    }).eq('id', profile.id);
    if (error) { toast('No se pudo actualizar el perfil', 'alert'); return; }
    toast('Perfil actualizado', 'check');
  }

  async function saveVisual(next: VisualConfig) {
    const previous = visual;
    setVisual(next);
    setSaving(true);
    applyVisualConfig(next);
    const { error } = await supabase.from('profiles').update({
      panel_theme: next,
      color: next.palette[0],
    }).eq('id', profile.id);
    if (error) {
      setVisual(previous);
      applyVisualConfig(previous);
      toast('No se pudo guardar la personalización', 'alert');
      setSaving(false);
      return;
    }
    setSaving(false);
    toast('Personalización actualizada', 'check');
  }

  return (
    <div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Avatar name={form.full_name || profile.full_name} color={visual.palette[0]} size="lg" img={profile.avatar_url ?? undefined} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.full_name}</div>
              <div className="muted" style={{ fontSize: 13 }}>Super Root · {profile.email}</div>
            </div>
          </div>
          <Field label="Nombre completo">
            <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Alias">
            <input className="inp" value={form.alias} placeholder="Ej. Admin global…" onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
          </Field>
          <button className="btn pri block" style={{ marginTop: 16 }} onClick={saveProfile}>
            <Icon name="check" /> Guardar perfil
          </button>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Apariencia del panel</h2>
          <Field label="Tema">
            <div className="theme-seg">
              <button disabled={saving} className={visual.mode === 'dark' ? 'on' : ''} onClick={() => saveVisual({ ...visual, mode: 'dark' })}>
                <Icon name="moon" s={16} /> Oscuro
              </button>
              <button disabled={saving} className={visual.mode === 'light' ? 'on' : ''} onClick={() => saveVisual({ ...visual, mode: 'light' })}>
                <Icon name="sun" s={16} /> Claro
              </button>
            </div>
          </Field>
          <Field label="Paleta">
            <div className="swatches">
              {PALETTES.map(palette => {
                const active = palette.c.every((color, i) => color === visual.palette[i]);
                return (
                  <button
                    key={palette.name}
                    className={'swatch' + (active ? ' on' : '')}
                    style={{ background: `linear-gradient(135deg, ${palette.c.join(', ')})` }}
                    title={palette.name}
                    aria-label={palette.name}
                    disabled={saving}
                    onClick={() => saveVisual({ ...visual, palette: palette.c })}
                  />
                );
              })}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
