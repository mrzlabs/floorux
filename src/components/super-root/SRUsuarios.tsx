'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastContext';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import type { Profile } from '@/types/db';
import type { Role } from '@/types/roles';

export function SRUsuarios() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const PAGE = 20;
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ data }, { data: commerces }, { data: supers }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('comercios').select('id, name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'super_admin'),
    ]);
    const nextLinks: Record<string, string> = {};
    (commerces ?? []).forEach(c => { nextLinks[c.id] = c.name; });
    (supers ?? []).forEach(s => { nextLinks[s.id] = s.full_name; });
    setLinks(nextLinks);
    setUsers((data ?? []) as Profile[]);
  }

  async function userAction(u: Profile, action: string, password?: string) {
    const response = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, action, password }),
    });
    if (!response.ok) {
      toast('La operación no pudo completarse', 'alert');
      return false;
    }
    return true;
  }

  async function toggle(u: Profile) {
    if (!await userAction(u, u.activo ? 'suspend' : 'activate')) return;
    toast(`${u.full_name} ${u.activo ? 'suspendido' : 'activado'}`, u.activo ? 'lock' : 'check');
    await load();
  }

  async function deleteUser(u: Profile) {
    if (!await userAction(u, 'delete')) return;
    toast(`${u.full_name} eliminado`, 'trash');
    await load();
  }

  async function resetPassword() {
    if (!resetting || newPassword.length < 8) return;
    if (await userAction(resetting, 'reset_password', newPassword)) {
      toast('Contraseña temporal actualizada', 'check');
      setResetting(null);
      setNewPassword('');
    }
  }

  const filtered = users.filter(u =>
    (filter === 'all' || u.role === filter) &&
    (!q || u.full_name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );
  const page_data = filtered.slice(page * PAGE, (page + 1) * PAGE);

  const ROLES: Role[] = ['super_super_admin', 'super_admin', 'admin', 'empleado'];

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Todos los usuarios</h2>
      </div>
      <div className="fbar" style={{ marginBottom: 12 }}>
        <div className="searchbox"><Icon name="search" s={16} /><input placeholder="Buscar nombre o email…" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} /></div>
        <button className={'fchip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Todos</button>
        {ROLES.map(r => <button key={r} className={'fchip' + (filter === r ? ' on' : '')} onClick={() => setFilter(r)}>{r}</button>)}
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Enlazado a</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {page_data.map(u => (
              <tr key={u.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={u.full_name} color={u.color} size="sm" /><b>{u.full_name}</b></div></td>
                <td className="muted" style={{ fontSize: 12 }}>{u.email}</td>
                <td><Chip>{u.role}</Chip></td>
                <td className="muted" style={{ fontSize: 12 }}>{links[u.comercio_id ?? ''] ?? links[u.super_admin_id ?? ''] ?? 'Plataforma'}</td>
                <td><Chip color={u.activo ? 'var(--green)' : 'var(--red)'}>{u.activo ? 'Activo' : 'Suspendido'}</Chip></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={'sw' + (u.activo ? ' on' : '')} onClick={() => toggle(u)} />
                    <button className="btn sm" onClick={() => setResetting(u)} title="Reiniciar contraseña"><Icon name="lock" s={13} /></button>
                    <button className="btn sm" style={{ color: 'var(--red)' }} onClick={() => deleteUser(u)}><Icon name="trash" s={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button className="btn sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>{page + 1} / {Math.ceil(filtered.length / PAGE)}</span>
          <button className="btn sm" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      </div>
      {resetting && (
        <Modal title={`Reiniciar clave · ${resetting.full_name}`} icon="lock" onClose={() => setResetting(null)}
          footer={<><button className="btn ghost" onClick={() => setResetting(null)}>Cancelar</button><button className="btn pri" disabled={newPassword.length < 8} onClick={resetPassword}>Actualizar clave</button></>}>
          <Field label="Nueva contraseña temporal"><input className="inp" type="text" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
