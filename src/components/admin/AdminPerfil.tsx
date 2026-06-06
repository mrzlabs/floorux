'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import type { Profile, Comercio } from '@/types/db';

interface AdminPerfilProps {
  profile: Profile;
  comercio: Comercio;
  operating?: boolean;
}

export function AdminPerfil({ profile, comercio, operating = false }: AdminPerfilProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '', color: profile.color });
  const [bizForm, setBizForm] = useState({ name: comercio.name, address: comercio.address ?? '', phone: comercio.phone ?? '', nit: comercio.nit ?? '' });
  const supabase = createClient();

  async function saveProfile() {
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
    setEditing(false);
  }

  async function saveBiz() {
    await supabase.from('comercios').update({ name: bizForm.name, address: bizForm.address || null, phone: bizForm.phone || null, nit: bizForm.nit || null }).eq('id', comercio.id);
    toast('Local actualizado', 'check');
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
          <div className="grid g2" style={{ marginTop: 8 }}>
            <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="tag" s={14} sw={2} /></span>Plan</div><div className="sv">{comercio.plan}</div></div>
            <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--accent2)22', color: 'var(--accent2)' }}><Icon name="mesas" s={14} sw={2} /></span>Mesas</div><div className="sv">{comercio.tables_count}</div></div>
          </div>
          <button className="btn pri" style={{ marginTop: 16, width: '100%' }} onClick={saveBiz}><Icon name="check" /> Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}
