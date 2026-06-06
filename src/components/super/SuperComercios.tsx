'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import { COPk } from '@/lib/utils';
import type { Comercio } from '@/types/db';

interface SuperComerciosProps {
  superAdminId: string;
}

export function SuperComercios({ superAdminId }: SuperComerciosProps) {
  const toast = useToast();
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Discoteca', city: '', kind: 'Franquicia', plan: 'Pro', tables_count: '10' });
  const supabase = createClient();

  useEffect(() => { load(); }, [superAdminId]);

  async function load() {
    const { data } = await supabase.from('comercios').select('*').eq('super_admin_id', superAdminId).order('name');
    setComercios((data ?? []) as Comercio[]);
  }

  async function createComercio() {
    await supabase.from('comercios').insert({
      super_admin_id: superAdminId,
      name: form.name, type: form.type as any, city: form.city,
      kind: form.kind as any, plan: form.plan as any,
      tables_count: Number(form.tables_count), status: 'activo',
    });
    toast('Comercio creado', 'check');
    setAdding(false);
    await load();
  }

  async function toggleStatus(c: Comercio) {
    const newStatus = c.status === 'activo' ? 'inactivo' : 'activo';
    await supabase.from('comercios').update({ status: newStatus }).eq('id', c.id);
    if (newStatus === 'inactivo') {
      await supabase.from('profiles').update({ activo: false }).eq('comercio_id', c.id);
    }
    toast(`${c.name} ${newStatus}`, newStatus === 'activo' ? 'check' : 'lock');
    await load();
  }

  async function operate(comercioId: string) {
    const response = await fetch('/api/operate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId }),
    });
    if (response.ok) window.location.assign('/admin/resumen');
  }

  const totalMonth = comercios.reduce((s, c) => s + 0, 0);

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Comercios" value={comercios.length} icon="biz" color="var(--accent)" />
        <Stat label="Activos" value={comercios.filter(c => c.status === 'activo').length} icon="check" color="var(--green)" />
        <Stat label="Franquicias" value={comercios.filter(c => c.kind === 'Franquicia').length} icon="tag" color="var(--accent2)" />
        <Stat label="Comercios totales" value={comercios.length} icon="cash" color="var(--yellow)" />
      </div>

      <div className="mesas-top">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Comercios enlazados</h2>
          <p className="muted" style={{ fontSize: 13 }}>Tu local principal y sus franquicias</p>
        </div>
        <button className="btn pri" onClick={() => setAdding(true)}><Icon name="plus" /> Crear comercio</button>
      </div>

      <div className="biz-grid">
        {comercios.map(c => (
          <div className={'biz' + (c.status === 'inactivo' ? ' off' : '')} key={c.id}>
            <div className="biz-top">
              <Avatar name={c.name} color={c.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bn">{c.name}</div>
                <div className="bc">{c.type} · {c.city}</div>
              </div>
              <span className={'kind-pill ' + (c.kind === 'Principal' ? 'princ' : 'fran')}>{c.kind}</span>
            </div>
            <div className="biz-row"><span>Plan</span><b>{c.plan}</b></div>
            <div className="biz-row"><span>Mesas</span><b>{c.tables_count}</b></div>
            <div className="biz-row"><span>Estado</span><Chip color={c.status === 'activo' ? 'var(--green)' : 'var(--red)'}>{c.status}</Chip></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className={'sw' + (c.status === 'activo' ? ' on' : '')} onClick={() => toggleStatus(c)} />
              <button className="btn pri block" disabled={c.status !== 'activo'} onClick={() => operate(c.id)}>
                <Icon name="admin" s={14} /> Operar negocio
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <Modal title="Crear comercio" icon="biz" onClose={() => setAdding(false)}
          footer={<><button className="btn ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="btn pri block" onClick={createComercio}><Icon name="check" /> Crear comercio</button></>}>
          <div className="row2">
            <Field label="Nombre del comercio"><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Tipo"><select className="sel" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>Discoteca</option><option>Taberna</option><option>Bar</option></select></Field>
          </div>
          <div className="row2">
            <Field label="Ciudad"><input className="inp" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></Field>
            <Field label="Vínculo"><select className="sel" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}><option>Franquicia</option><option>Principal</option></select></Field>
          </div>
          <div className="row2">
            <Field label="Plan"><select className="sel" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}><option>Pro</option><option>Básico</option></select></Field>
            <Field label="Nro. mesas"><input className="inp" type="number" value={form.tables_count} onChange={e => setForm(f => ({ ...f, tables_count: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
