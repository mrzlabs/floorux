'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { COP } from '@/lib/utils';
import {
  INTEGRATIONS_CATALOG,
  getIntegrationsState,
  integrationMonthly,
  type IntegrationDef,
  type IntegrationState,
} from '@/lib/integrations-catalog';

interface ComercioLite {
  id: string;
  name: string;
  color: string;
  photo_url: string | null;
  plan_cost: number;
  settings: Record<string, unknown>;
}

interface Row {
  comercio: ComercioLite;
  def: IntegrationDef;
  state: IntegrationState;
}

export function SRIntegraciones() {
  const toast = useToast();
  const supabase = createClient();
  const [comercios, setComercios] = useState<ComercioLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState<Row | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState('');

  useEffect(() => {
    let alive = true;
    supabase
      .from('comercios')
      .select('id, name, color, photo_url, plan_cost, settings')
      .order('name')
      .then(({ data }) => {
        if (!alive) return;
        setComercios((data ?? []) as ComercioLite[]);
        setLoaded(true);
      });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const comercio of comercios) {
      const states = getIntegrationsState(comercio.settings);
      for (const def of INTEGRATIONS_CATALOG) {
        const state = states[def.id];
        if (state) out.push({ comercio, def, state });
      }
    }
    // pendientes primero, luego por fecha de solicitud
    return out.sort((a, b) =>
      a.state.status === b.state.status
        ? (b.state.requestedAt ?? '').localeCompare(a.state.requestedAt ?? '')
        : a.state.status === 'pendiente' ? -1 : 1,
    );
  }, [comercios]);

  const pendientes = rows.filter(r => r.state.status === 'pendiente');
  const activas = rows.filter(r => r.state.status === 'activa');
  const ingresoActivo = activas.reduce((s, r) => s + integrationMonthly(r.def, r.state), 0);
  const ingresoProyectado = rows.reduce((s, r) => s + integrationMonthly(r.def, r.state), 0);

  async function runAction(row: Row, action: 'activate' | 'deactivate' | 'unlink', pnid?: string) {
    setBusy(true);
    const res = await fetch('/api/admin/integration-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comercio_id: row.comercio.id,
        integration_id: row.def.id,
        action,
        phone_number_id: pnid || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) { toast('No se pudo aplicar la acción'); return; }
    const { settings } = await res.json();
    setComercios(prev => prev.map(c => c.id === row.comercio.id ? { ...c, settings } : c));
    toast(
      action === 'activate' ? `${row.def.name} activa en ${row.comercio.name}`
      : action === 'deactivate' ? `${row.def.name} pausada`
      : `${row.def.name} desvinculada de ${row.comercio.name}`,
    );
  }

  function openActivate(row: Row) {
    if (row.def.id === 'whatsapp') {
      setActivating(row);
      setPhoneNumberId(row.state.phoneNumberId ?? '');
    } else {
      runAction(row, 'activate');
    }
  }

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="sk"><Icon name="clock" s={15} /> Solicitudes pendientes</div>
          <div className="sv tnum">{pendientes.length}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="plug" s={15} /> Integraciones activas</div>
          <div className="sv tnum">{activas.length}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="cash" s={15} /> Ingreso mensual activo</div>
          <div className="sv sm tnum">{COP(ingresoActivo)}</div>
          <div className="st muted">por integraciones</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="trending" s={15} /> Proyectado con pendientes</div>
          <div className="sv sm tnum">{COP(ingresoProyectado)}</div>
        </div>
      </div>

      <div className="card">
        {!loaded ? (
          <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>Cargando solicitudes…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ color: 'var(--muted2)', marginBottom: 10 }}><Icon name="plug" s={32} sw={1.4} /></div>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>
              Sin solicitudes por ahora. Cuando un comercio vincule una integración desde su panel, aparecerá aquí para activarla.
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Comercio</th><th>Integración</th><th>Modalidad</th><th>Dato de conexión</th>
                  <th className="r">Incremento/mes</th><th>Solicitada</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const key = row.comercio.id + ':' + row.def.id;
                  const monthly = integrationMonthly(row.def, row.state);
                  return (
                    <tr key={key}>
                      <td className="cell-name">
                        <Avatar name={row.comercio.name} color={row.comercio.color} img={row.comercio.photo_url ?? undefined} />
                        {row.comercio.name}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          <span style={{ color: 'var(--accent)' }}><Icon name={row.def.icon} s={16} /></span>
                          {row.def.name}
                        </span>
                      </td>
                      <td>
                        <span className="chip" style={row.state.managed
                          ? { background: 'color-mix(in srgb,var(--accent) 14%,transparent)', color: 'var(--accent)' }
                          : { background: 'var(--panel2)', color: 'var(--muted)' }}>
                          {row.state.managed ? 'OperUX administra' : 'Autogestión'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        <div>{row.state.handle || '—'}</div>
                        {row.def.id === 'whatsapp' && row.state.phoneNumberId && (
                          <div className="tnum" style={{ fontSize: 11, color: 'var(--muted)' }}>ID: {row.state.phoneNumberId}</div>
                        )}
                      </td>
                      <td className="r tnum">{monthly === 0 ? <span style={{ color: 'var(--green)', fontWeight: 800 }}>Gratis</span> : COP(monthly)}</td>
                      <td className="tnum" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        {row.state.requestedAt ? new Date(row.state.requestedAt).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td>
                        <span className="chip" style={row.state.status === 'activa'
                          ? { background: 'color-mix(in srgb,var(--green) 16%,transparent)', color: 'var(--green)' }
                          : { background: 'color-mix(in srgb,var(--yellow) 16%,transparent)', color: 'var(--yellow)' }}>
                          {row.state.status === 'activa' ? 'Activa' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="r" style={{ whiteSpace: 'nowrap' }}>
                        {row.state.status === 'pendiente' ? (
                          <button className="btn pri sm" onClick={() => openActivate(row)} disabled={busy}>
                            <Icon name="check" s={13} /> Activar
                          </button>
                        ) : (
                          <button className="btn ghost sm" onClick={() => runAction(row, 'deactivate')} disabled={busy}>
                            Pausar
                          </button>
                        )}
                        <button className="btn ghost sm danger" style={{ marginLeft: 6 }} onClick={() => runAction(row, 'unlink')} disabled={busy}>
                          <Icon name="close" s={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* activación de WhatsApp: pide el phone_number_id de Meta */}
      {activating && (
        <Modal
          title={`Activar WhatsApp · ${activating.comercio.name}`}
          icon="whatsapp"
          onClose={() => setActivating(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setActivating(null)}>Cancelar</button>
              <button
                className="btn pri block"
                disabled={busy}
                onClick={async () => { await runAction(activating, 'activate', phoneNumberId.trim()); setActivating(null); }}
              >
                <Icon name="check" s={16} /> {busy ? 'Activando…' : 'Activar conexión'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
            Número solicitado: <b style={{ color: 'var(--ink)' }}>{activating.state.handle || 'sin registrar'}</b>.
            Registra este número en la WABA de OperUX (Meta App Dashboard → WhatsApp) y pega aquí el
            <b> phone_number_id</b> que asigna Meta. Con eso el webhook enruta los mensajes entrantes
            a este comercio y las respuestas salen por su número.
          </p>
          <Field label="phone_number_id de Meta (opcional si aún no está registrado)">
            <input className="inp" value={phoneNumberId} placeholder="Ej: 123456789012345"
              onChange={e => setPhoneNumberId(e.target.value)} />
          </Field>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>
            Si activas sin phone_number_id, la bandeja funciona para clientes registrados desde la app;
            los mensajes de WhatsApp real quedan pendientes de este dato.
          </p>
        </Modal>
      )}
    </div>
  );
}
