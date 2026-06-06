'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

interface SuperAdminRow extends Profile {
  commerce_count: number;
}

export function SRSuperAdmins() {
  const toast = useToast();
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data }, { data: commerces }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'super_admin').order('full_name'),
      supabase.from('comercios').select('super_admin_id').is('deleted_at', null),
    ]);
    const counts: Record<string, number> = {};
    (commerces ?? []).forEach(c => { counts[c.super_admin_id] = (counts[c.super_admin_id] ?? 0) + 1; });
    setSuperAdmins(((data ?? []) as Profile[]).map(sa => ({ ...sa, commerce_count: counts[sa.id] ?? 0 })));
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
    await userAction(sa.id, sa.activo ? 'suspend' : 'activate');
    toast(`${sa.full_name} ${sa.activo ? 'suspendido' : 'activado'}`, sa.activo ? 'lock' : 'check');
    await load();
  }

  async function userAction(userId: string, action: string, password?: string) {
    const response = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, password }),
    });
    if (!response.ok) toast('La operación no pudo completarse', 'alert');
    return response.ok;
  }

  async function resetPassword() {
    if (!resetting || newPassword.length < 8) return;
    if (await userAction(resetting.id, 'reset_password', newPassword)) {
      toast('Contraseña temporal actualizada', 'check');
      setResetting(null);
      setNewPassword('');
    }
  }

  async function remove(sa: Profile) {
    if (await userAction(sa.id, 'delete')) {
      toast(`${sa.full_name} desactivado`, 'trash');
      await load();
    }
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
          <thead><tr><th>Nombre</th><th>Email</th><th>Comercios</th><th>Estado</th><th>Último login</th><th>Acciones</th></tr></thead>
          <tbody>
            {superAdmins.map(sa => (
              <tr key={sa.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={sa.full_name} color={sa.color} size="sm" /><b>{sa.full_name}</b></div></td>
                <td className="muted" style={{ fontSize: 12 }}>{sa.email}</td>
                <td><Chip color="var(--accent2)">{sa.commerce_count}</Chip></td>
                <td><Chip color={sa.activo ? 'var(--green)' : 'var(--red)'}>{sa.activo ? 'Activo' : 'Suspendido'}</Chip></td>
                <td className="muted" style={{ fontSize: 12 }}>{sa.last_login ? new Date(sa.last_login).toLocaleDateString('es-CO') : 'Nunca'}</td>
                <td><div style={{ display: 'flex', gap: 6 }}>
                  <button className={'sw' + (sa.activo ? ' on' : '')} onClick={() => toggle(sa)} title="Suspender o activar" />
                  <button className="btn sm" onClick={() => setResetting(sa)} title="Reiniciar contraseña"><Icon name="lock" s={13} /></button>
                  <button className="btn sm" style={{ color: 'var(--red)' }} onClick={() => remove(sa)} title="Eliminar"><Icon name="trash" s={13} /></button>
                </div></td>
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
      {resetting && (
        <Modal title={`Reiniciar clave · ${resetting.full_name}`} icon="lock" onClose={() => setResetting(null)}
          footer={<><button className="btn ghost" onClick={() => setResetting(null)}>Cancelar</button><button className="btn pri" disabled={newPassword.length < 8} onClick={resetPassword}>Actualizar clave</button></>}>
          <Field label="Nueva contraseña temporal"><input className="inp" type="text" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></Field>
          <p className="muted" style={{ fontSize: 12 }}>La contraseña actual no se puede consultar. Solo se reemplaza.</p>
        </Modal>
      )}
    </div>
  );
}
