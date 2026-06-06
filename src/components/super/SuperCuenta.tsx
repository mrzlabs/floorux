'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import { applyVisualConfig, getVisualConfig, type VisualConfig } from '@/components/shell/VisualTheme';
import type { Comercio, Profile, SubscriptionHistory } from '@/types/db';

const PALETTES = [
  { name: 'Violeta', c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Fuego', c: ['#F5634A', '#F5A623', '#E040FB'] },
  { name: 'Bosque', c: ['#34d399', '#3b82f6', '#a78bfa'] },
  { name: 'Rosa', c: ['#f472b6', '#fb923c', '#a78bfa'] },
  { name: 'Hielo', c: ['#38bdf8', '#22d3ee', '#818cf8'] },
  { name: 'Oro', c: ['#F5C400', '#f59e42', '#E0708A'] },
];

interface SuperCuentaProps {
  profile: Profile;
}

export function SuperCuenta({ profile }: SuperCuentaProps) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '' });
  const [visual, setVisual] = useState<VisualConfig>(() => getVisualConfig(profile.panel_theme, profile.color));
  const [savingVisual, setSavingVisual] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.avatar_url ?? '');
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [ticket, setTicket] = useState({ subject: '', body: '', priority: 'normal' });
  const supabase = createClient();

  useEffect(() => {
    supabase.from('comercios').select('*').eq('super_admin_id', profile.id).order('name').then(async ({ data }) => {
      const rows = (data ?? []) as Comercio[];
      setComercios(rows);
      if (rows.length) {
        const { data: historyRows } = await supabase.from('subscription_history').select('*').in('comercio_id', rows.map(c => c.id)).order('created_at', { ascending: false });
        setHistory((historyRows ?? []) as SubscriptionHistory[]);
      }
    });
  }, [profile.id]);

  async function save() {
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      alias: form.alias || null,
    }).eq('id', profile.id);
    if (error) { toast('No se pudo actualizar el perfil', 'alert'); return; }
    toast('Perfil actualizado', 'check');
  }

  async function savePersonalVisual(next: VisualConfig) {
    const previous = visual;
    setVisual(next);
    setSavingVisual(true);
    applyVisualConfig(next);
    const { error } = await supabase.from('profiles').update({
      panel_theme: next,
      color: next.palette[0],
    }).eq('id', profile.id);
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

  async function uploadAvatar(file?: File) {
    if (!file) return;
    const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    setPhotoUrl(data.publicUrl);
    toast('Imagen actualizada', 'check');
  }

  async function sendSupport() {
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    if (!response.ok) { toast('No se pudo enviar la solicitud', 'alert'); return; }
    setTicket({ subject: '', body: '', priority: 'normal' });
    toast('Solicitud enviada a Super Root', 'check');
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 560, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar name={form.full_name || profile.full_name} color={visual.palette[0]} size="lg" img={photoUrl || undefined} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{profile.full_name}</div>
            <div className="muted" style={{ fontSize: 13 }}>Super Admin · {profile.email}</div>
          </div>
        </div>

        <Field label="Nombre completo">
          <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label="Alias">
          <input className="inp" value={form.alias} placeholder="Ej. El jefe, La dueña…" onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
        </Field>
        <Field label="Imagen de perfil"><input className="inp" type="file" accept="image/*" onChange={e => uploadAvatar(e.target.files?.[0])} /></Field>
        <button className="btn pri block" style={{ marginTop: 20 }} onClick={save}><Icon name="check" /> Guardar perfil</button>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 14, maxWidth: 560 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Apariencia del panel</h2>
        <Field label="Tema">
          <div className="theme-seg">
            <button disabled={savingVisual} className={visual.mode === 'dark' ? 'on' : ''} onClick={() => savePersonalVisual({ ...visual, mode: 'dark' })}>
              <Icon name="moon" s={16} /> Oscuro
            </button>
            <button disabled={savingVisual} className={visual.mode === 'light' ? 'on' : ''} onClick={() => savePersonalVisual({ ...visual, mode: 'light' })}>
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
                  disabled={savingVisual}
                  onClick={() => savePersonalVisual({ ...visual, palette: palette.c })}
                />
              );
            })}
          </div>
        </Field>
      </div>
      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>Suscripciones</h2>
          {comercios.map(c => <div className="biz-row" key={c.id}><span>{c.name}<small className="muted" style={{ display: 'block' }}>{c.subscription_start} → {c.subscription_end ?? 'Sin fin'}</small></span><b>{c.plan} · {c.subscription_status}</b></div>)}
          <h3 style={{ fontSize: 13, margin: '18px 0 8px' }}>Historial</h3>
          {history.slice(0, 10).map(h => <div className="hist-row" key={h.id}><div><b>{h.plan}</b><div className="muted" style={{ fontSize: 12 }}>{h.starts_at} → {h.ends_at ?? 'Sin fin'} · {h.status}</div></div></div>)}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>Pedir soporte a Super Root</h2>
          <Field label="Asunto"><input className="inp" value={ticket.subject} onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))} /></Field>
          <Field label="Detalle"><textarea className="inp" rows={5} value={ticket.body} onChange={e => setTicket(t => ({ ...t, body: e.target.value }))} /></Field>
          <Field label="Prioridad"><select className="sel" value={ticket.priority} onChange={e => setTicket(t => ({ ...t, priority: e.target.value }))}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option></select></Field>
          <button className="btn pri block" onClick={sendSupport} disabled={ticket.subject.length < 3 || ticket.body.length < 5}>Enviar solicitud</button>
        </div>
      </div>
    </div>
  );
}
