'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { COP } from '@/lib/utils';
import {
  INTEGRATIONS_CATALOG,
  INTEGRATION_CATEGORIES,
  getIntegrationsState,
  integrationMonthly,
  integrationsMonthlyTotal,
  type IntegrationDef,
  type IntegrationsState,
  type IntegrationCategory,
} from '@/lib/integrations-catalog';
import { WhatsAppInbox } from '@/components/integrations/WhatsAppInbox';
import type { Comercio } from '@/types/db';

const CATEGORY_ORDER: IntegrationCategory[] = ['redes', 'campanas', 'facturacion', 'automatizacion'];

interface IntegrationsHubProps {
  comercio: Comercio;
  initialTab?: 'catalogo' | 'redes' | 'chat';
}

export function IntegrationsHub({ comercio, initialTab = 'catalogo' }: IntegrationsHubProps) {
  const toast = useToast();
  const supabase = createClient();
  const [tab, setTab] = useState<'catalogo' | 'redes' | 'chat'>(initialTab);
  const [states, setStates] = useState<IntegrationsState>(() => getIntegrationsState(comercio.settings));
  const [selected, setSelected] = useState<IntegrationDef | null>(null);
  const [managed, setManaged] = useState(false);
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const monthlyExtra = useMemo(() => integrationsMonthlyTotal(states), [states]);
  const connectedRedes = INTEGRATIONS_CATALOG.filter(d => d.category === 'redes' && states[d.id]);

  function openConfirm(def: IntegrationDef) {
    setSelected(def);
    setManaged(def.managedOnly ?? false);
    setHandle('');
  }

  async function persist(next: IntegrationsState, msg: string) {
    setSaving(true);
    const settings = { ...(comercio.settings ?? {}), integrations: next };
    const { error } = await supabase.from('comercios').update({ settings }).eq('id', comercio.id);
    setSaving(false);
    if (error) { toast('No se pudo guardar la solicitud', 'alert'); return false; }
    setStates(next);
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, settings } }));
    toast(msg, 'check');
    return true;
  }

  async function confirmActivation() {
    if (!selected) return;
    const next: IntegrationsState = {
      ...states,
      [selected.id]: {
        status: 'pendiente',
        managed: selected.managedOnly ? true : managed,
        handle: handle.trim() || undefined,
        requestedAt: new Date().toISOString(),
      },
    };
    if (await persist(next, 'Solicitud enviada a OperUX')) setSelected(null);
  }

  async function cancelIntegration(def: IntegrationDef) {
    const next = { ...states };
    delete next[def.id];
    await persist(next, `${def.name} desvinculada`);
  }

  const selState = selected ? states[selected.id] : undefined;
  const selPrice = selected ? (selected.managedOnly || managed ? (selected.managedMonthly ?? selected.monthly) : selected.monthly) : 0;
  const projectedTotal = comercio.plan_cost + monthlyExtra + (selected && !selState ? selPrice : 0);

  return (
    <div>
      {/* resumen superior */}
      <div className="grid g3" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="sk"><Icon name="plug" s={15} /> Integraciones activas</div>
          <div className="sv">{Object.keys(states).length}</div>
          <div className="st muted">de {INTEGRATIONS_CATALOG.length} disponibles</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="cash" s={15} /> Incremento mensual</div>
          <div className="sv sm tnum">{COP(monthlyExtra)}</div>
          <div className="st muted">sobre tu suscripción</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="receipt" s={15} /> Suscripción proyectada</div>
          <div className="sv sm tnum">{COP(comercio.plan_cost + monthlyExtra)}</div>
          <div className="st muted">plan + integraciones / mes</div>
        </div>
      </div>

      <div className="tabs" style={{ display: 'inline-flex', marginBottom: 20 }}>
        <button className={tab === 'catalogo' ? 'on' : ''} onClick={() => setTab('catalogo')}>Catálogo</button>
        <button className={tab === 'redes' ? 'on' : ''} onClick={() => setTab('redes')}>Redes y campañas</button>
        {states['whatsapp'] && (
          <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Chat clientes</button>
        )}
      </div>

      {tab === 'catalogo' && CATEGORY_ORDER.map(cat => {
        const defs = INTEGRATIONS_CATALOG.filter(d => d.category === cat);
        const meta = INTEGRATION_CATEGORIES[cat];
        return (
          <section key={cat}>
            <div className="section-h">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Icon name={meta.icon} s={17} /> {meta.label}
              </h2>
              <span className="sub">{meta.desc}</span>
            </div>
            <div className="biz-grid" style={{ marginBottom: 8 }}>
              {defs.map(def => {
                const st = states[def.id];
                return (
                  <div key={def.id} className="biz">
                    <div className="biz-top">
                      <span style={{
                        width: 40, height: 40, borderRadius: 11, flex: 'none',
                        background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
                        color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={def.icon} s={20} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="bn">{def.name}</div>
                        <div className="bc">{def.tagline}</div>
                      </div>
                    </div>

                    <div className="biz-row">
                      <span>{def.monthly === 0 && !def.managedOnly ? 'Vinculación y seguimiento' : 'Incremento mensual'}</span>
                      <b className="tnum" style={def.monthly === 0 && !def.managedOnly ? { color: 'var(--green)' } : undefined}>
                        {def.managedOnly ? COP(def.managedMonthly ?? 0) : def.monthly === 0 ? 'Gratis' : COP(def.monthly)}
                      </b>
                    </div>
                    {def.managedMonthly != null && !def.managedOnly && (
                      <div className="biz-row">
                        <span>Administrado por OperUX</span>
                        <b className="tnum">{COP(def.managedMonthly)}</b>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                      {st ? (
                        <>
                          <span className="chip" style={{
                            background: st.status === 'activa'
                              ? 'color-mix(in srgb,var(--green) 16%,transparent)'
                              : 'color-mix(in srgb,var(--yellow) 16%,transparent)',
                            color: st.status === 'activa' ? 'var(--green)' : 'var(--yellow)',
                          }}>
                            {st.status === 'activa' ? 'Activa' : 'Solicitud enviada'}
                            {st.managed ? ' · OperUX' : ''}
                          </span>
                          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => cancelIntegration(def)} disabled={saving}>
                            Desvincular
                          </button>
                        </>
                      ) : (
                        <>
                          {def.badge && <span className="chip" style={{ background: 'color-mix(in srgb,var(--accent) 14%,transparent)', color: 'var(--accent)' }}>{def.badge}</span>}
                          <button className="btn pri sm" style={{ marginLeft: 'auto' }} onClick={() => openConfirm(def)}>
                            <Icon name="link" s={14} /> {def.monthly === 0 && !def.managedOnly ? 'Vincular gratis' : 'Vincular'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {tab === 'redes' && (
        <RedesReport states={states} connectedRedes={connectedRedes} onGoCatalog={() => setTab('catalogo')} />
      )}

      {tab === 'chat' && states['whatsapp'] && (
        <WhatsAppInbox
          comercioId={comercio.id}
          handle={states['whatsapp'].handle}
          active={states['whatsapp'].status === 'activa'}
        />
      )}

      {/* pop-up de confirmación con incremento */}
      {selected && (
        <Modal title={`Vincular ${selected.name}`} icon={selected.icon} onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setSelected(null)}>Cancelar</button>
              <button className="btn pri block" onClick={confirmActivation} disabled={saving}>
                <Icon name="check" s={16} /> {saving ? 'Enviando…' : selPrice === 0 ? 'Vincular gratis' : `Confirmar incremento de ${COP(selPrice)}/mes`}
              </button>
            </>
          }>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>{selected.tagline}</p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {selected.features.map(f => (
              <li key={f} style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--green)', flex: 'none', marginTop: 1 }}><Icon name="check" s={14} /></span>
                {f}
              </li>
            ))}
          </ul>

          {!selected.managedOnly && selected.managedMonthly != null && (
            <button
              type="button"
              onClick={() => setManaged(m => !m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                padding: '13px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 16,
                border: `1px solid ${managed ? 'var(--accent)' : 'var(--line)'}`,
                background: managed ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'var(--panel2)',
                color: 'var(--ink)', font: 'inherit',
              }}>
              <span className={'sw' + (managed ? ' on' : '')} style={{ pointerEvents: 'none' }} />
              <span style={{ minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 13.5 }}>Que OperUX lo administre por mí</b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Configuración, operación y soporte incluidos · {COP(selected.managedMonthly)}/mes
                </span>
              </span>
            </button>
          )}

          {selected.handleLabel && (
            <Field label={selected.handleLabel}>
              <input className="inp" value={handle} placeholder={selected.handlePlaceholder}
                onChange={e => setHandle(e.target.value)} />
            </Field>
          )}

          {selPrice === 0 ? (
            <div className="card" style={{ padding: '14px 16px', background: 'color-mix(in srgb,var(--green) 8%,var(--panel2))', border: '1px solid color-mix(in srgb,var(--green) 30%,transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 700 }}>
                <span style={{ color: 'var(--green)' }}><Icon name="check" s={16} /></span>
                Vincular no tiene costo — tu suscripción sigue en {COP(comercio.plan_cost + monthlyExtra)}/mes
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
                Solo se cobra si más adelante activas campañas, automatizaciones o la gestión por OperUX.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: '14px 16px', background: 'var(--panel2)' }}>
              <div className="trow"><span>Suscripción actual</span><b className="tnum">{COP(comercio.plan_cost + monthlyExtra)}</b></div>
              <div className="trow"><span>{selected.name}{(selected.managedOnly || managed) ? ' · administrado' : ''}</span><b className="tnum">+{COP(selPrice)}</b></div>
              <div className="trow tot" style={{ margin: '6px 0 0', fontSize: 17 }}>
                <span>Nuevo total mensual</span><b className="tnum">{COP(projectedTotal)}</b>
              </div>
            </div>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.45 }}>
            {selPrice === 0
              ? 'Al confirmar, OperUX activa la conexión de tu cuenta. Puedes desvincular cuando quieras.'
              : 'Al confirmar, OperUX recibe tu solicitud y activa la conexión. El incremento se aplica a tu facturación desde el momento de la activación, nunca antes. Puedes desvincular cuando quieras.'}
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- panel de redes, campañas y crecimiento ---------- */

function RedesReport({ states, connectedRedes, onGoCatalog }: {
  states: IntegrationsState;
  connectedRedes: IntegrationDef[];
  onGoCatalog: () => void;
}) {
  if (connectedRedes.length === 0) {
    return (
      <div className="card" style={{ padding: '46px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--muted2)', marginBottom: 12 }}><Icon name="globe" s={38} sw={1.4} /></div>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Aún no has vinculado redes</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.5 }}>
          Conecta WhatsApp, Instagram o Facebook y aquí verás seguidores por red,
          alcance, comportamiento de campañas y el crecimiento de tu marca.
        </p>
        <button className="btn pri" onClick={onGoCatalog}><Icon name="link" s={15} /> Ver catálogo</button>
      </div>
    );
  }

  const totalFollowers = connectedRedes.reduce((s, d) => s + (states[d.id]?.metrics?.followers ?? 0), 0);
  const totalReach = connectedRedes.reduce((s, d) => s + (states[d.id]?.metrics?.reach30d ?? 0), 0);
  const campaigns = connectedRedes.flatMap(d => states[d.id]?.metrics?.campaigns ?? []);
  const anySynced = connectedRedes.some(d => states[d.id]?.metrics?.syncedAt);

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="sk"><Icon name="users" s={15} /> Seguidores totales</div>
          <div className="sv tnum">{anySynced ? totalFollowers.toLocaleString('es-CO') : '—'}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="trending" s={15} /> Alcance 30 días</div>
          <div className="sv tnum">{anySynced ? totalReach.toLocaleString('es-CO') : '—'}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="megaphone" s={15} /> Campañas</div>
          <div className="sv tnum">{campaigns.length}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="globe" s={15} /> Redes vinculadas</div>
          <div className="sv tnum">{connectedRedes.length}</div>
        </div>
      </div>

      <div className="section-h"><h2>Seguidores por red</h2><span className="sub">Actualización cada 24 h</span></div>
      <div className="biz-grid" style={{ marginBottom: 22 }}>
        {connectedRedes.map(def => {
          const st = states[def.id];
          const synced = Boolean(st?.metrics?.syncedAt);
          return (
            <div key={def.id} className="biz">
              <div className="biz-top">
                <span style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', background: 'color-mix(in srgb,var(--accent) 14%,transparent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={def.icon} s={19} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="bn">{def.name}</div>
                  <div className="bc">{st?.handle || 'Sin identificador'}</div>
                </div>
              </div>
              {synced ? (
                <>
                  <div className="biz-row"><span>Seguidores</span><b className="tnum">{(st?.metrics?.followers ?? 0).toLocaleString('es-CO')}</b></div>
                  <div className="biz-row"><span>Alcance 30 días</span><b className="tnum">{(st?.metrics?.reach30d ?? 0).toLocaleString('es-CO')}</b></div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                  <Icon name="refresh" s={14} />
                  {st?.status === 'activa' ? 'Sincronizando métricas…' : 'Pendiente de activación por OperUX'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-h"><h2>Comportamiento de campañas</h2></div>
      <div className="card">
        {campaigns.length === 0 ? (
          <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ color: 'var(--muted2)', marginBottom: 10 }}><Icon name="megaphone" s={30} sw={1.4} /></div>
            <p style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 400, margin: '0 auto' }}>
              Sin campañas registradas todavía. Vincula <b>Campañas Meta Ads</b> o activa
              <b> Impulso OperUX</b> para que impulsemos tu negocio y veas aquí sus resultados.
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Campaña</th><th>Estado</th><th className="r">Alcance</th><th className="r">Clics</th><th className="r">Inversión</th></tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.name}>
                    <td className="cell-name">{c.name}</td>
                    <td><span className="chip" style={{ background: 'color-mix(in srgb,var(--green) 14%,transparent)', color: 'var(--green)' }}>{c.status}</span></td>
                    <td className="r tnum">{c.reach.toLocaleString('es-CO')}</td>
                    <td className="r tnum">{c.clicks.toLocaleString('es-CO')}</td>
                    <td className="r tnum">{COP(c.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
