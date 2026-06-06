'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import type { Comercio, Profile, SubscriptionHistory } from '@/types/db';

interface SuperCuentaProps {
  profile: Profile;
}

export function SuperCuenta({ profile }: SuperCuentaProps) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '', color: profile.color });
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
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
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
          <Avatar name={profile.full_name} color={profile.color} size="lg" img={profile.avatar_url ?? undefined} />
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
        <Field label="Color de marca">
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ height: 40, width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer' }} />
        </Field>
        <Field label="Imagen de perfil"><input className="inp" type="file" accept="image/*" onChange={e => uploadAvatar(e.target.files?.[0])} /></Field>
        <button className="btn pri block" style={{ marginTop: 20 }} onClick={save}><Icon name="check" /> Guardar cambios</button>
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
