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
  const PAGE = 20;
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers((data ?? []) as Profile[]);
  }

  async function toggle(u: Profile) {
    await supabase.from('profiles').update({ activo: !u.activo }).eq('id', u.id);
    toast(`${u.full_name} ${u.activo ? 'suspendido' : 'activado'}`, u.activo ? 'lock' : 'check');
    await load();
  }

  async function deleteUser(u: Profile) {
    await supabase.from('profiles').update({ activo: false } as any).eq('id', u.id);
    toast(`${u.full_name} eliminado`, 'trash');
    await load();
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
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {page_data.map(u => (
              <tr key={u.id}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={u.full_name} color={u.color} size="sm" /><b>{u.full_name}</b></div></td>
                <td className="muted" style={{ fontSize: 12 }}>{u.email}</td>
                <td><Chip>{u.role}</Chip></td>
                <td><Chip color={u.activo ? 'var(--green)' : 'var(--red)'}>{u.activo ? 'Activo' : 'Suspendido'}</Chip></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={'sw' + (u.activo ? ' on' : '')} onClick={() => toggle(u)} />
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
    </div>
  );
}
