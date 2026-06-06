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
import { COP } from '@/lib/utils';
import type { Comercio } from '@/types/db';

interface SuperComerciosProps {
  superAdminId: string;
}

export function SuperComercios({ superAdminId }: SuperComerciosProps) {
  const toast = useToast();
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: '', type: 'Discoteca', city: '', kind: 'Franquicia', plan: 'Pro',
    tables_count: '10', plan_cost: '0', subscription_start: today,
    subscription_end: '', renewal_day: '1', color: '#7F77DD',
  });
  const supabase = createClient();

  useEffect(() => { load(); }, [superAdminId]);

  async function load() {
    const { data, error } = await supabase.from('comercios').select('*').eq('super_admin_id', superAdminId).order('name');
    setComercios((data ?? []) as Comercio[]);
    setLoadError(error?.message ?? '');
  }

  async function createComercio() {
    const response = await fetch('/api/admin/create-commerce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        subscription_end: form.subscription_end || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast(`No se pudo crear: ${result.error}`, 'alert');
      return;
    }
    toast(`Comercio creado con ${result.catalogItems} productos`, 'check');
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
      {loadError && <div className="alert-banner">No se pudieron cargar los comercios: {loadError}</div>}

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
            <div className="biz-row"><span>Costo</span><b>{COP(c.plan_cost ?? 0)}</b></div>
            <div className="biz-row"><span>Suscripción</span><b>{c.subscription_start} → {c.subscription_end ?? 'Sin fin'}</b></div>
            <div className="biz-row"><span>Renovación</span><b>Día {c.renewal_day ?? '—'}</b></div>
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
          <div className="row2">
            <Field label="Costo del plan"><input className="inp" type="number" min="0" value={form.plan_cost} onChange={e => setForm(f => ({ ...f, plan_cost: e.target.value }))} /></Field>
            <Field label="Día de renovación"><input className="inp" type="number" min="1" max="28" value={form.renewal_day} onChange={e => setForm(f => ({ ...f, renewal_day: e.target.value }))} /></Field>
          </div>
          <div className="row2">
            <Field label="Inicio suscripción"><input className="inp" type="date" value={form.subscription_start} onChange={e => setForm(f => ({ ...f, subscription_start: e.target.value }))} /></Field>
            <Field label="Fin suscripción"><input className="inp" type="date" min={form.subscription_start} value={form.subscription_end} onChange={e => setForm(f => ({ ...f, subscription_end: e.target.value }))} /></Field>
          </div>
          <Field label="Color del comercio"><input className="inp" type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></Field>
        </Modal>
      )}
    </div>
  );
}
