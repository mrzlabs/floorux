'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { Profile } from '@/types/db';

export function SRSuperAdmins() {
  const toast = useToast();
  const [superAdmins, setSuperAdmins] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'super_admin').order('full_name');
    setSuperAdmins((data ?? []) as Profile[]);
  }

  async function createSuperAdmin() {
    await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'super_admin' }),
    });
    toast('Super Admin creado', 'check');
    setAdding(false);
    await load();
  }

  async function toggle(sa: Profile) {
    await supabase.from('profiles').update({ activo: !sa.activo }).eq('id', sa.id);
    if (sa.activo) {
      await supabase.from('profiles').update({ activo: false }).eq('super_admin_id', sa.id);
    }
    toast(`${sa.full_name} ${sa.activo ? 'suspendido' : 'activado'}`, sa.activo ? 'lock' : 'check');
    await load();
  }

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Super Admins</h2>
          <p className="muted" style={{ fontSize: 13 }}>{superAdmins.filter(s => s.activo).length} activos</p>
        </div>
        <button className="btn pri" onClick={() => setAdding(true)}><Icon name="plus" /> Crear Super Admin</button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Último login</th><th>Acciones</th></tr></thead>
          <tbody>
            {superAdmins.map(sa => (
              <tr key={sa.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={sa.full_name} color={sa.color} size="sm" /><b>{sa.full_name}</b></div></td>
                <td className="muted" style={{ fontSize: 12 }}>{sa.email}</td>
                <td><Chip color={sa.activo ? 'var(--green)' : 'var(--red)'}>{sa.activo ? 'Activo' : 'Suspendido'}</Chip></td>
                <td className="muted" style={{ fontSize: 12 }}>{sa.last_login ? new Date(sa.last_login).toLocaleDateString('es-CO') : 'Nunca'}</td>
                <td><button className={'sw' + (sa.activo ? ' on' : '')} onClick={() => toggle(sa)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Crear Super Admin" icon="users" onClose={() => setAdding(false)}
          footer={<><button className="btn ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="btn pri block" onClick={createSuperAdmin}><Icon name="check" /> Crear</button></>}>
          <Field label="Nombre completo"><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email"><input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Contraseña temporal"><input className="inp" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
        </Modal>
      )}
    </div>
  );
}
