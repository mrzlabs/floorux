'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { Profile, Sale, Shift } from '@/types/db';

interface AdminEmpleadosProps {
  comercioId: string;
}

export function AdminEmpleados({ comercioId }: AdminEmpleadosProps) {
  const toast = useToast();
  const [empleados, setEmpleados] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const supabase = createClient();

  useEffect(() => { load(); }, [comercioId]);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('comercio_id', comercioId).eq('role', 'empleado').order('full_name');
    setEmpleados((data ?? []) as Profile[]);
  }

  async function createEmpleado() {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'empleado', comercio_id: comercioId }),
    });
    if (res.ok) {
      toast('Empleado creado · invitación enviada', 'check');
      setAdding(false);
      setForm({ name: '', email: '', password: '' });
      await load();
    } else {
      toast('Error al crear el empleado', 'alert');
    }
  }

  async function toggleActivo(emp: Profile) {
    await supabase.from('profiles').update({ activo: !emp.activo }).eq('id', emp.id);
    toast(`${emp.full_name} ${emp.activo ? 'desactivado' : 'activado'}`, emp.activo ? 'lock' : 'check');
    await load();
  }

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Equipo</h2>
          <p className="muted" style={{ fontSize: 13 }}>{empleados.filter(e => e.activo).length} activos de {empleados.length}</p>
        </div>
        <button className="btn pri" onClick={() => setAdding(true)}><Icon name="plus" /> Agregar empleado</button>
      </div>

      <div className="grid g2">
        {empleados.map(e => (
          <div className={'card' + (!e.activo ? ' off' : '')} key={e.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name={e.full_name} color={e.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{e.full_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{e.alias ?? e.email}</div>
              </div>
              <Chip color={e.activo ? 'var(--green)' : 'var(--red)'}>{e.activo ? 'Activo' : 'Inactivo'}</Chip>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={'sw' + (e.activo ? ' on' : '')} onClick={() => toggleActivo(e)} />
              <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>{e.activo ? 'Desactivar' : 'Activar'}</span>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <Modal title="Agregar empleado" icon="users" onClose={() => setAdding(false)}
          footer={<><button className="btn ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="btn pri block" onClick={createEmpleado}><Icon name="check" /> Crear empleado</button></>}>
          <Field label="Nombre completo"><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email"><input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Contraseña temporal"><input className="inp" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
        </Modal>
      )}
    </div>
  );
}
