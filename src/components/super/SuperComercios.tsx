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
import type { Comercio, Profile } from '@/types/db';

interface SuperComerciosProps {
  superAdminId: string;
}

export function SuperComercios({ superAdminId }: SuperComerciosProps) {
  const toast = useToast();
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<Comercio | null>(null);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [customizing, setCustomizing] = useState<Comercio | null>(null);
  const [customColor, setCustomColor] = useState('#7F77DD');
  const [customPhoto, setCustomPhoto] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
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
    const rows = (data ?? []) as Comercio[];
    setComercios(rows);
    const ids = rows.map(c => c.id);
    if (ids.length) {
      const { data: adminRows } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .in('comercio_id', ids)
        .order('full_name');
      setAdmins((adminRows ?? []) as Profile[]);
    } else {
      setAdmins([]);
    }
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

  function openAssignment(comercio: Comercio) {
    setAssigning(comercio);
    setSelectedAdmin(admins.find(admin => admin.comercio_id === comercio.id)?.id ?? '');
    setAssignMode('existing');
    setAdminForm({ name: '', email: '', password: '' });
  }

  async function assignAdmin() {
    if (!assigning) return;

    if (assignMode === 'new') {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adminForm,
          role: 'admin',
          comercio_id: assigning.id,
          super_admin_id: superAdminId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast(`No se pudo crear el acceso: ${result.error}`, 'alert');
        return;
      }
      toast('Administrador creado y asignado', 'check');
    } else {
      if (!selectedAdmin) return;
      const response = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAdmin,
          action: 'assign_commerce',
          comercioId: assigning.id,
        }),
      });
      if (!response.ok) {
        toast('No se pudo asignar el administrador', 'alert');
        return;
      }
      toast('Administrador asignado', 'check');
    }

    setAssigning(null);
    await load();
  }

  function openCustomization(comercio: Comercio) {
    setCustomizing(comercio);
    setCustomColor(comercio.color);
    setCustomPhoto(comercio.photo_url ?? '');
    setCustomFile(null);
  }

  async function saveCustomization() {
    if (!customizing) return;

    let photoUrl = customPhoto || null;
    if (customFile) {
      const extension = customFile.name.split('.').pop();
      const path = `${superAdminId}/commerce-${customizing.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('floorux-media').upload(path, customFile);
      if (uploadError) {
        toast('No se pudo cargar la foto', 'alert');
        return;
      }
      const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
      photoUrl = data.publicUrl;
    }

    const currentConfig = customizing.settings.config_visual;
    const current = currentConfig && typeof currentConfig === 'object' && !Array.isArray(currentConfig)
      ? currentConfig as Record<string, unknown>
      : {};
    const currentPalette = Array.isArray(current.palette) ? current.palette : [];
    const palette = [
      customColor,
      typeof currentPalette[1] === 'string' ? currentPalette[1] : '#27C3D8',
      typeof currentPalette[2] === 'string' ? currentPalette[2] : '#B57BE0',
    ];
    const settings = {
      ...customizing.settings,
      config_visual: {
        ...current,
        mode: current.mode === 'light' ? 'light' : 'dark',
        palette,
      },
    };

    const { error } = await supabase
      .from('comercios')
      .update({ color: customColor, photo_url: photoUrl, settings })
      .eq('id', customizing.id);
    if (error) {
      toast('No se pudo actualizar la apariencia', 'alert');
      return;
    }

    toast('Apariencia aplicada a Admin y Empleado', 'check');
    setCustomizing(null);
    await load();
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
              <Avatar name={c.name} color={c.color} img={c.photo_url ?? undefined} />
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
            <div className="biz-row">
              <span>Administrador</span>
              <b>{admins.find(admin => admin.comercio_id === c.id)?.full_name ?? 'Sin asignar'}</b>
            </div>
            <div className="biz-row">
              <span>Acceso</span>
              <b className="muted">{admins.find(admin => admin.comercio_id === c.id)?.email ?? 'Pendiente'}</b>
            </div>
            <div className="biz-row"><span>Estado</span><Chip color={c.status === 'activo' ? 'var(--green)' : 'var(--red)'}>{c.status}</Chip></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className={'sw' + (c.status === 'activo' ? ' on' : '')} onClick={() => toggleStatus(c)} />
              <button className="btn pri block" disabled={c.status !== 'activo'} onClick={() => operate(c.id)}>
                <Icon name="admin" s={14} /> Operar negocio
              </button>
            </div>
            <div className="row2">
              <button className="btn sm" onClick={() => openAssignment(c)}>
                <Icon name="users" s={14} /> Asignar admin
              </button>
              <a className="btn sm" href="/login" target="_blank" rel="noreferrer">
                <Icon name="lock" s={14} /> Ver login
              </a>
            </div>
            <button className="btn sm block" onClick={() => openCustomization(c)}>
              <Icon name="edit" s={14} /> Foto y color del local
            </button>
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

      {assigning && (
        <Modal
          title={`Administrador · ${assigning.name}`}
          icon="admin"
          onClose={() => setAssigning(null)}
          footer={(
            <>
              <button className="btn ghost" onClick={() => setAssigning(null)}>Cancelar</button>
              <button
                className="btn pri block"
                disabled={assignMode === 'existing' ? !selectedAdmin : adminForm.name.length < 2 || !adminForm.email || adminForm.password.length < 8}
                onClick={assignAdmin}
              >
                <Icon name="check" /> {assignMode === 'new' ? 'Crear y asignar' : 'Asignar'}
              </button>
            </>
          )}
        >
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button className={assignMode === 'existing' ? 'on' : ''} onClick={() => setAssignMode('existing')}>Administrador existente</button>
            <button className={assignMode === 'new' ? 'on' : ''} onClick={() => setAssignMode('new')}>Crear acceso</button>
          </div>

          {assignMode === 'existing' ? (
            <Field label="Administrador">
              <select className="sel" value={selectedAdmin} onChange={event => setSelectedAdmin(event.target.value)}>
                <option value="">Seleccionar...</option>
                {admins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name} · {admin.email}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Nombre completo"><input className="inp" value={adminForm.name} onChange={event => setAdminForm(form => ({ ...form, name: event.target.value }))} /></Field>
              <Field label="Correo de acceso"><input className="inp" type="email" value={adminForm.email} onChange={event => setAdminForm(form => ({ ...form, email: event.target.value }))} /></Field>
              <Field label="Contraseña temporal"><input className="inp" type="text" minLength={8} value={adminForm.password} onChange={event => setAdminForm(form => ({ ...form, password: event.target.value }))} /></Field>
              <p className="muted" style={{ fontSize: 12 }}>Este correo y contraseña permiten ingresar desde la pantalla de login.</p>
            </>
          )}
        </Modal>
      )}

      {customizing && (
        <Modal
          title={`Apariencia · ${customizing.name}`}
          icon="spark"
          onClose={() => setCustomizing(null)}
          footer={(
            <>
              <button className="btn ghost" onClick={() => setCustomizing(null)}>Cancelar</button>
              <button className="btn pri block" onClick={saveCustomization}><Icon name="check" /> Aplicar cambios</button>
            </>
          )}
        >
          <div className="profile-card" style={{ marginBottom: 16 }}>
            <Avatar name={customizing.name} color={customColor} size="lg" img={customPhoto || undefined} />
            <div>
              <b>{customizing.name}</b>
              <div className="muted" style={{ fontSize: 12 }}>La apariencia se aplica a Admin y Empleado.</div>
            </div>
          </div>
          <Field label="Color principal">
            <input className="inp" type="color" value={customColor} onChange={event => setCustomColor(event.target.value)} />
          </Field>
          <Field label="Foto del local">
            <input
              className="inp"
              type="file"
              accept="image/*"
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setCustomFile(file);
                if (file) setCustomPhoto(URL.createObjectURL(file));
              }}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
