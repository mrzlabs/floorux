'use client';
import { useEffect, useState, useRef } from 'react';
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

interface CommercialSettings {
  instagram: string;
  facebook: string;
  tiktok: string;
  website: string;
  whatsapp: string;
  whatsappReservations: boolean;
  metaBusinessId: string;
  metaPixelId: string;
  metaAdsConnected: boolean;
  managedCampaigns: boolean;
  campaignGoal: string;
}

const DEFAULT_COMMERCIAL: CommercialSettings = {
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  whatsapp: '',
  whatsappReservations: false,
  metaBusinessId: '',
  metaPixelId: '',
  metaAdsConnected: false,
  managedCampaigns: false,
  campaignGoal: '',
};

function getCommercial(commercialSettings: Record<string, unknown>): CommercialSettings {
  return { ...DEFAULT_COMMERCIAL, ...(commercialSettings as Partial<CommercialSettings>) };
}

interface ElectronicInvoiceSettings {
  enabled: boolean;
  provider: string;
  dianMode: 'habilitacion' | 'produccion';
  autoIssue: boolean;
  nit: string;
  taxRegime: string;
  resolution: string;
  prefix: string;
  contactEmail: string;
}

const DEFAULT_INVOICE: ElectronicInvoiceSettings = {
  enabled: false,
  provider: 'manual',
  dianMode: 'habilitacion',
  autoIssue: false,
  nit: '',
  taxRegime: '',
  resolution: '',
  prefix: '',
  contactEmail: '',
};

function getInvoice(invoiceSettings: Record<string, unknown>): ElectronicInvoiceSettings {
  return { ...DEFAULT_INVOICE, ...(invoiceSettings as Partial<ElectronicInvoiceSettings>) };
}

export function AdminPerfil({ profile, comercio, operating = false }: AdminPerfilProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [origin, setOrigin] = useState('');
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '', color: profile.color });
  const [bizForm, setBizForm] = useState({ name: comercio.name, address: comercio.address ?? '', phone: comercio.phone ?? '', nit: comercio.nit ?? '', color: comercio.color });
  const [commercial, setCommercial] = useState<CommercialSettings>(() => getCommercial(comercio.commercial_settings));
  const [invoice, setInvoice] = useState<ElectronicInvoiceSettings>(() => getInvoice(comercio.invoice_settings));
  const [crmCounts, setCrmCounts] = useState({ customers: 0, reservations: 0 });
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [requestingCampaign, setRequestingCampaign] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [requestingInvoice, setRequestingInvoice] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(comercio.photo_url ?? '');
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicLink = origin ? `${origin}/local/${comercio.id}` : `/local/${comercio.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicLink)}`;

  useEffect(() => {
    let alive = true;
    async function loadCrmCounts() {
      const [{ count: customers }, { count: reservations }] = await Promise.all([
        supabase.from('public_customers').select('*', { count: 'exact', head: true }).eq('comercio_id', comercio.id),
        supabase.from('public_reservations').select('*', { count: 'exact', head: true }).eq('comercio_id', comercio.id),
      ]);
      if (alive) setCrmCounts({ customers: customers ?? 0, reservations: reservations ?? 0 });
    }
    loadCrmCounts();
    return () => { alive = false; };
  }, [comercio.id, supabase]);

  async function saveProfile() {
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
    setEditing(false);
  }

  async function saveBiz() {
    const patch = {
      name: bizForm.name,
      address: bizForm.address || null,
      phone: bizForm.phone || null,
      nit: bizForm.nit || null,
      color: bizForm.color,
    };
    const { error } = await supabase.from('comercios').update(patch).eq('id', comercio.id);
    if (error) { toast('No se pudo actualizar el local', 'alert'); return; }
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, ...patch } }));
    toast('Local actualizado', 'check');
  }

  async function uploadCommerce(file?: File) {
    if (!file) return;
    const path = `${profile.id}/commerce-${comercio.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    const { error: updateError } = await supabase.from('comercios').update({ photo_url: data.publicUrl }).eq('id', comercio.id);
    if (updateError) { toast('No se pudo guardar la foto del comercio', 'alert'); return; }
    setPhotoUrl(data.publicUrl);
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, photo_url: data.publicUrl } }));
    toast('Foto del comercio actualizada', 'check');
  }

  async function persistCommercial(nextCommercial: CommercialSettings) {
    const { error } = await supabase.from('comercios').update({ commercial_settings: nextCommercial }).eq('id', comercio.id);
    if (error) return error;
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, commercial_settings: nextCommercial } }));
    return null;
  }

  async function persistInvoice(nextInvoice: ElectronicInvoiceSettings) {
    const { error } = await supabase.from('comercios').update({ invoice_settings: nextInvoice }).eq('id', comercio.id);
    if (error) return error;
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, invoice_settings: nextInvoice } }));
    return null;
  }

  async function saveCommercial() {
    setSavingCommercial(true);
    const error = await persistCommercial(commercial);
    setSavingCommercial(false);
    if (error) { toast('No se pudo guardar la configuración comercial', 'alert'); return; }
    toast('Configuración comercial guardada', 'check');
  }

  async function requestManagedCampaigns() {
    setRequestingCampaign(true);
    const nextCommercial = { ...commercial, managedCampaigns: true };
    const error = await persistCommercial(nextCommercial);
    if (error) {
      setRequestingCampaign(false);
      toast('No se pudo guardar la solicitud comercial', 'alert');
      return;
    }
    setCommercial(nextCommercial);
    const body = [
      `Comercio: ${bizForm.name || comercio.name}`,
      `WhatsApp reservas: ${nextCommercial.whatsappReservations ? 'Activo' : 'No activo'}`,
      `WhatsApp: ${nextCommercial.whatsapp || 'No configurado'}`,
      `Instagram: ${nextCommercial.instagram || 'No configurado'}`,
      `Facebook: ${nextCommercial.facebook || 'No configurado'}`,
      `TikTok: ${nextCommercial.tiktok || 'No configurado'}`,
      `Meta Business ID: ${nextCommercial.metaBusinessId || 'No configurado'}`,
      `Pixel Meta: ${nextCommercial.metaPixelId || 'No configurado'}`,
      `Objetivo: ${nextCommercial.campaignGoal || 'Pendiente por definir'}`,
    ].join('\n');

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asunto: `Campañas gestionadas - ${bizForm.name || comercio.name}`,
        prioridad: 'alta',
        body,
      }),
    });
    setRequestingCampaign(false);
    if (!res.ok) { toast('No se pudo enviar la solicitud comercial', 'alert'); return; }
    toast('Solicitud enviada a Super Root', 'check');
  }

  async function saveInvoice() {
    setSavingInvoice(true);
    const error = await persistInvoice(invoice);
    setSavingInvoice(false);
    if (error) { toast('No se pudo guardar la facturación', 'alert'); return; }
    toast('Facturación guardada', 'check');
  }

  async function requestInvoiceSetup() {
    setRequestingInvoice(true);
    const nextInvoice = { ...invoice, enabled: true };
    const error = await persistInvoice(nextInvoice);
    if (error) {
      setRequestingInvoice(false);
      toast('No se pudo guardar la solicitud de facturación', 'alert');
      return;
    }
    setInvoice(nextInvoice);
    const body = [
      `Comercio: ${bizForm.name || comercio.name}`,
      `Proveedor: ${nextInvoice.provider}`,
      `Modo DIAN: ${nextInvoice.dianMode}`,
      `Emisión automática: ${nextInvoice.autoIssue ? 'Sí' : 'No'}`,
      `NIT: ${nextInvoice.nit || bizForm.nit || 'No configurado'}`,
      `Régimen: ${nextInvoice.taxRegime || 'No configurado'}`,
      `Resolución: ${nextInvoice.resolution || 'No configurada'}`,
      `Prefijo: ${nextInvoice.prefix || 'No configurado'}`,
      `Correo contacto: ${nextInvoice.contactEmail || 'No configurado'}`,
    ].join('\n');

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asunto: `Habilitación facturación electrónica - ${bizForm.name || comercio.name}`,
        prioridad: 'alta',
        body,
      }),
    });
    setRequestingInvoice(false);
    if (!res.ok) { toast('No se pudo enviar la solicitud de facturación', 'alert'); return; }
    toast('Solicitud de facturación enviada', 'check');
  }

  const C   = { fontSize: 13, color: 'var(--muted)' } as const;
  const SEC = { fontSize: 14, fontWeight: 800, marginBottom: 14 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─── PERFIL PERSONAL ────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Avatar name={profile.full_name} color={profile.color} size="lg" img={profile.avatar_url ?? undefined} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.full_name}</div>
            <div style={C}>{profile.alias ?? 'Sin alias'} · {profile.role}</div>
          </div>
        </div>

        {operating ? (
          <p style={C}>El perfil personal no se modifica durante la operación delegada.</p>
        ) : editing ? (
          <>
            <Field label="Nombre completo">
              <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Alias">
              <input className="inp" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
            </Field>
            <Field label="Color de marca">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ height: 40, width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer' }} />
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

      {/* ─── DATOS DEL LOCAL ────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Datos del local</h2>
        <div className="profile-card" style={{ marginBottom: 16 }}>
          <Avatar name={bizForm.name || comercio.name} color={bizForm.color} size="lg" img={photoUrl || undefined} />
          <div>
            <b>{bizForm.name || comercio.name}</b>
            <div style={C}>{comercio.type} · {comercio.city}</div>
          </div>
        </div>
        <Field label="Nombre del local">
          <input className="inp" value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Dirección">
          <input className="inp" value={bizForm.address} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} />
        </Field>
        <Field label="Teléfono">
          <input className="inp" value={bizForm.phone} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label="NIT">
          <input className="inp" value={bizForm.nit} onChange={e => setBizForm(f => ({ ...f, nit: e.target.value }))} />
        </Field>
        <Field label="Foto del comercio">
          <input className="inp" type="file" accept="image/*" onChange={e => uploadCommerce(e.target.files?.[0])} />
        </Field>
        <div className="grid g2" style={{ marginTop: 8 }}>
          <div className="stat">
            <div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="tag" s={14} sw={2} /></span>Plan</div>
            <div className="sv">{comercio.plan}</div>
          </div>
          <div className="stat">
            <div className="sk"><span className="si" style={{ background: 'var(--accent2)22', color: 'var(--accent2)' }}><Icon name="mesas" s={14} sw={2} /></span>Mesas</div>
            <div className="sv">{comercio.tables_count}</div>
          </div>
        </div>
        <div className="biz-row"><span>Inicio en FloorUX</span><b>{comercio.subscription_start ?? comercio.since}</b></div>
        <div className="biz-row"><span>Fin suscripción</span><b>{comercio.subscription_end ?? 'Sin fin'}</b></div>
        <button className="btn pri" style={{ marginTop: 16, width: '100%' }} onClick={saveBiz}>
          <Icon name="check" /> Guardar cambios del local
        </button>
      </div>

      {/* ─── IMPULSO COMERCIAL ──────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Canales e impulso comercial</h2>
        <p style={{ ...C, marginTop: -6, marginBottom: 16 }}>
          Configura redes, WhatsApp de reservas y opciones de pauta para activar el panel comercial del local.
        </p>

        <div className="grid g2">
          <Field label="Instagram">
            <input className="inp" value={commercial.instagram} placeholder="@urgenciasbar" onChange={e => setCommercial(c => ({ ...c, instagram: e.target.value }))} />
          </Field>
          <Field label="Facebook">
            <input className="inp" value={commercial.facebook} placeholder="facebook.com/urgenciasbar" onChange={e => setCommercial(c => ({ ...c, facebook: e.target.value }))} />
          </Field>
          <Field label="TikTok">
            <input className="inp" value={commercial.tiktok} placeholder="@urgenciasbar" onChange={e => setCommercial(c => ({ ...c, tiktok: e.target.value }))} />
          </Field>
          <Field label="Sitio web o Linktree">
            <input className="inp" value={commercial.website} placeholder="https://..." onChange={e => setCommercial(c => ({ ...c, website: e.target.value }))} />
          </Field>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 14, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>WhatsApp para reservas</div>
              <div style={C}>Habilita el número que recibirá reservas y consultas comerciales.</div>
            </div>
            <button
              type="button"
              className={'btn sm' + (commercial.whatsappReservations ? ' pri' : '')}
              onClick={() => setCommercial(c => ({ ...c, whatsappReservations: !c.whatsappReservations }))}
            >
              <Icon name={commercial.whatsappReservations ? 'check' : 'chat'} s={14} />
              {commercial.whatsappReservations ? 'Activo' : 'Activar'}
            </button>
          </div>
          <Field label="Número WhatsApp">
            <input className="inp" value={commercial.whatsapp} placeholder="+57 300 000 0000" onChange={e => setCommercial(c => ({ ...c, whatsapp: e.target.value }))} />
          </Field>
        </div>

        <div className="card" style={{ padding: 14, marginTop: 14, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Meta y campañas</div>
              <div style={C}>Deja listo el comercio para campañas propias o administradas por MRZLabs.</div>
            </div>
            <button
              type="button"
              className={'btn sm' + (commercial.metaAdsConnected ? ' pri' : '')}
              onClick={() => setCommercial(c => ({ ...c, metaAdsConnected: !c.metaAdsConnected }))}
            >
              <Icon name={commercial.metaAdsConnected ? 'check' : 'spark'} s={14} />
              {commercial.metaAdsConnected ? 'Conectado' : 'Marcar conexión'}
            </button>
          </div>
          <div className="grid g2">
            <Field label="Meta Business ID">
              <input className="inp" value={commercial.metaBusinessId} placeholder="ID de Business Manager" onChange={e => setCommercial(c => ({ ...c, metaBusinessId: e.target.value }))} />
            </Field>
            <Field label="Meta Pixel ID">
              <input className="inp" value={commercial.metaPixelId} placeholder="ID del pixel" onChange={e => setCommercial(c => ({ ...c, metaPixelId: e.target.value }))} />
            </Field>
          </div>
          <Field label="Objetivo comercial">
            <textarea
              className="inp"
              rows={3}
              value={commercial.campaignGoal}
              placeholder="Ej. llenar reservas de viernes, atraer cumpleaños, impulsar eventos o aumentar ticket promedio."
              onChange={e => setCommercial(c => ({ ...c, campaignGoal: e.target.value }))}
            />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn pri" onClick={saveCommercial} disabled={savingCommercial}>
            <Icon name="check" /> {savingCommercial ? 'Guardando...' : 'Guardar conexiones'}
          </button>
          <button className="btn ghost" onClick={requestManagedCampaigns} disabled={requestingCampaign}>
            <Icon name="send" s={15} /> {requestingCampaign ? 'Enviando...' : 'Solicitar campañas gestionadas'}
          </button>
        </div>
      </div>

      {/* ─── PANEL PÚBLICO DEL CLIENTE ─────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Link y QR del cliente</h2>
        <p style={{ ...C, marginTop: -6, marginBottom: 16 }}>
          Comparte este acceso para que el cliente se registre, consulte redes y solicite reservas del local.
        </p>

        <div className="grid g2" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ padding: 16, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>URL pública</div>
              <a href={publicLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 13, wordBreak: 'break-all' }}>{publicLink}</a>
            </div>
            <div className="grid g2">
              <div className="stat">
                <div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="users" s={14} /></span>Clientes</div>
                <div className="sv">{crmCounts.customers}</div>
              </div>
              <div className="stat">
                <div className="sk"><span className="si" style={{ background: 'var(--accent2)22', color: 'var(--accent2)' }}><Icon name="calendar" s={14} /></span>Reservas</div>
                <div className="sv">{crmCounts.reservations}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={qrUrl} alt="QR del panel cliente" style={{ width: 132, height: 132, borderRadius: 10, background: '#fff', padding: 8 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>QR del comercio</div>
              <div style={C}>Imprime este código o úsalo en mesas, stories y piezas comerciales.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FACTURACIÓN ELECTRÓNICA ───────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Facturación electrónica</h2>
        <p style={{ ...C, marginTop: -6, marginBottom: 16 }}>
          Configura el proveedor y los datos DIAN para emitir facturas desde las ventas del bar.
        </p>

        <div className="card" style={{ padding: 14, marginBottom: 14, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Estado de facturación</div>
              <div style={C}>La emisión requiere proveedor autorizado y resolución activa.</div>
            </div>
            <button
              type="button"
              className={'btn sm' + (invoice.enabled ? ' pri' : '')}
              onClick={() => setInvoice(i => ({ ...i, enabled: !i.enabled }))}
            >
              <Icon name={invoice.enabled ? 'check' : 'receipt'} s={14} />
              {invoice.enabled ? 'Habilitada' : 'Habilitar'}
            </button>
          </div>
        </div>

        <div className="grid g2">
          <Field label="Proveedor">
            <select className="inp" value={invoice.provider} onChange={e => setInvoice(i => ({ ...i, provider: e.target.value }))}>
              <option value="manual">Manual</option>
              <option value="factus">Factus</option>
              <option value="siigo">Siigo</option>
              <option value="alegra">Alegra</option>
            </select>
          </Field>
          <Field label="Modo DIAN">
            <select className="inp" value={invoice.dianMode} onChange={e => setInvoice(i => ({ ...i, dianMode: e.target.value as ElectronicInvoiceSettings['dianMode'] }))}>
              <option value="habilitacion">Habilitación</option>
              <option value="produccion">Producción</option>
            </select>
          </Field>
          <Field label="NIT facturador">
            <input className="inp" value={invoice.nit} placeholder={bizForm.nit || '900000000-0'} onChange={e => setInvoice(i => ({ ...i, nit: e.target.value }))} />
          </Field>
          <Field label="Régimen tributario">
            <input className="inp" value={invoice.taxRegime} placeholder="Responsable de IVA" onChange={e => setInvoice(i => ({ ...i, taxRegime: e.target.value }))} />
          </Field>
          <Field label="Resolución DIAN">
            <input className="inp" value={invoice.resolution} placeholder="Número de resolución" onChange={e => setInvoice(i => ({ ...i, resolution: e.target.value }))} />
          </Field>
          <Field label="Prefijo">
            <input className="inp" value={invoice.prefix} placeholder="FE" onChange={e => setInvoice(i => ({ ...i, prefix: e.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Correo de facturación">
            <input className="inp" type="email" value={invoice.contactEmail} placeholder="facturacion@bar.com" onChange={e => setInvoice(i => ({ ...i, contactEmail: e.target.value }))} />
          </Field>
          <Field label="Emisión automática">
            <button
              type="button"
              className={'btn sm' + (invoice.autoIssue ? ' pri' : '')}
              onClick={() => setInvoice(i => ({ ...i, autoIssue: !i.autoIssue }))}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name={invoice.autoIssue ? 'check' : 'spark'} s={14} />
              {invoice.autoIssue ? 'Activa al cerrar venta' : 'Manual por venta'}
            </button>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn pri" onClick={saveInvoice} disabled={savingInvoice}>
            <Icon name="check" /> {savingInvoice ? 'Guardando...' : 'Guardar facturación'}
          </button>
          <button className="btn ghost" onClick={requestInvoiceSetup} disabled={requestingInvoice}>
            <Icon name="send" s={15} /> {requestingInvoice ? 'Enviando...' : 'Solicitar habilitación'}
          </button>
        </div>
      </div>

      {/* ─── SOPORTE ────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Soporte</h2>
        <p style={C}>Envía solicitudes de soporte directamente a tu Super Admin.</p>
        <a href="/admin/soporte" className="btn pri" style={{ marginTop: 12 }}>
          <Icon name="chat" s={15} /> Ir al canal de soporte
        </a>
      </div>
    </div>
  );
}
