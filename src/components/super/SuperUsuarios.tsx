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

const ROL_COLOR: Record<string, string> = {
  admin:           'var(--accent)',
  empleado:        'var(--green)',
  super_admin:     'var(--accent3)',
  super_super_admin: 'var(--muted)',
};
const ROL_LABEL: Record<string, string> = {
  admin:           'Admin',
  empleado:        'Empleado',
  super_admin:     'Super Admin',
  super_super_admin: 'Super Root',
};

interface SuperUsuariosProps {
  superAdminId: string;
}

export function SuperUsuarios({ superAdminId }: SuperUsuariosProps) {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin', comercio_id: '' });
  const [comercios, setComercios] = useState<{ id: string; name: string }[]>([]);
  const supabase = createClient();

  useEffect(() => { load(); }, [superAdminId]);

  async function load() {
    const { data: cs } = await supabase.from('comercios').select('id, name').eq('super_admin_id', superAdminId);
    setComercios((cs ?? []) as { id: string; name: string }[]);
    const ids = (cs ?? []).map((c: { id: string }) => c.id);
    if (!ids.length) { setUsers([]); return; }
    const { data } = await supabase.from('profiles').select('*').in('comercio_id', ids).order('full_name');
    setUsers((data ?? []) as Profile[]);
  }

  function openCreate() {
    setForm({ name: '', email: '', password: '', role: 'admin', comercio_id: comercios[0]?.id ?? '' });
    setAdding(true);
  }

  async function createUser() {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, super_admin_id: superAdminId }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast(result.error ?? 'No se pudo crear el usuario', 'alert');
      return;
    }
    toast(`${ROL_LABEL[form.role] ?? form.role} creado`, 'check');
    setAdding(false);
    await load();
  }

  async function toggle(u: Profile) {
    await action(u, u.activo ? 'suspend' : 'activate');
    toast(`${u.full_name} ${u.activo ? 'suspendido' : 'activado'}`, u.activo ? 'lock' : 'check');
    await load();
  }

  async function action(u: Profile, operation: string, password?: string) {
    const res = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, action: operation, password }),
    });
    if (!res.ok) { toast('La operación no pudo completarse', 'alert'); return false; }
    return true;
  }

  async function resetPassword() {
    if (!resetting || newPassword.length < 8) return;
    if (await action(resetting, 'reset_password', newPassword)) {
      toast('Contraseña temporal actualizada', 'check');
      setResetting(null);
      setNewPassword('');
    }
  }

  const adminCount    = users.filter(u => u.role === 'admin').length;
  const empleadoCount = users.filter(u => u.role === 'empleado').length;

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Usuarios</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            {adminCount} admin{adminCount !== 1 ? 's' : ''} · {empleadoCount} empleado{empleadoCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn pri" onClick={openCreate}><Icon name="plus" /> Crear usuario</button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Comercio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={u.full_name} color={u.color} size="sm" />
                    <b>{u.full_name}</b>
                  </div>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>{u.email}</td>
                <td>
                  <Chip color={ROL_COLOR[u.role] ?? 'var(--muted)'}>
                    {ROL_LABEL[u.role] ?? u.role}
                  </Chip>
                </td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {comercios.find(c => c.id === u.comercio_id)?.name ?? '—'}
                </td>
                <td>
                  <Chip color={u.activo ? 'var(--green)' : 'var(--red)'}>
                    {u.activo ? 'Activo' : 'Suspendido'}
                  </Chip>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={'sw' + (u.activo ? ' on' : '')} onClick={() => toggle(u)} />
                    <button className="btn sm" onClick={() => setResetting(u)} title="Reiniciar contraseña">
                      <Icon name="lock" s={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Crear usuario" icon="users" onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setAdding(false)}>Cancelar</button>
              <button className="btn pri block" onClick={createUser}
                disabled={!form.name || !form.email || form.password.length < 6 || !form.comercio_id}>
                <Icon name="check" /> Crear {ROL_LABEL[form.role] ?? form.role}
              </button>
            </>
          }>
          <div className="row2">
            <Field label="Nombre">
              <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Rol">
              <select className="sel" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin (administrador del comercio)</option>
                <option value="empleado">Empleado (trabaja en el comercio)</option>
              </select>
            </Field>
          </div>
          <Field label="Email">
            <input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Contraseña temporal">
            <input className="inp" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres" />
          </Field>
          <Field label="Comercio a cargo">
            <select className="sel" value={form.comercio_id} onChange={e => setForm(f => ({ ...f, comercio_id: e.target.value }))}>
              <option value="">Seleccionar comercio…</option>
              {comercios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {resetting && (
        <Modal title={`Reiniciar clave · ${resetting.full_name}`} icon="lock" onClose={() => setResetting(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setResetting(null)}>Cancelar</button>
              <button className="btn pri" disabled={newPassword.length < 8} onClick={resetPassword}>
                Actualizar clave
              </button>
            </>
          }>
          <Field label="Nueva contraseña temporal">
            <input className="inp" type="text" minLength={8} value={newPassword}
              onChange={e => setNewPassword(e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
