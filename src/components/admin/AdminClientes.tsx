'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { COP } from '@/lib/utils';
import type { Comercio, PublicCustomer, PublicReservation } from '@/types/db';

const MES: Record<number, string> = { 0: 'ene', 1: 'feb', 2: 'mar', 3: 'abr', 4: 'may', 5: 'jun', 6: 'jul', 7: 'ago', 8: 'sep', 9: 'oct', 10: 'nov', 11: 'dic' };

function birthdayMonth(birthday: string | null): number | null {
  if (!birthday) return null;
  // formatos aceptados: YYYY-MM-DD o MM-DD
  const parts = birthday.split('-').map(Number);
  if (parts.length === 3 && !Number.isNaN(parts[1])) return parts[1] - 1;
  if (parts.length === 2 && !Number.isNaN(parts[0])) return parts[0] - 1;
  return null;
}

interface AdminClientesProps {
  comercio: Comercio;
}

export function AdminClientes({ comercio }: AdminClientesProps) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [reservations, setReservations] = useState<PublicReservation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'clientes' | 'reservas' | 'vista'>('clientes');
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data: cData }, { data: rData }] = await Promise.all([
        supabase.from('public_customers').select('*').eq('comercio_id', comercio.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('public_reservations').select('*').eq('comercio_id', comercio.id).order('created_at', { ascending: false }).limit(300),
      ]);
      if (!alive) return;
      setCustomers((cData ?? []) as PublicCustomer[]);
      setReservations((rData ?? []) as PublicReservation[]);
      setLoaded(true);
    }
    load();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercio.id]);

  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const mesActual = hoy.getMonth();

  const proximasReservas = useMemo(
    () => reservations.filter(r => r.status !== 'cancelada' && r.date >= hoyISO).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [reservations, hoyISO],
  );
  const cumpleaneros = useMemo(
    () => customers.filter(c => birthdayMonth(c.birthday) === mesActual),
    [customers, mesActual],
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t) || (c.phone ?? '').includes(t),
    );
  }, [customers, q]);

  const publicLink = origin ? `${origin}/local/${comercio.id}` : `/local/${comercio.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicLink)}`;

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="sk"><Icon name="clients" s={15} /> Clientes registrados</div>
          <div className="sv tnum">{customers.length}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="calendar" s={15} /> Reservas próximas</div>
          <div className="sv tnum">{proximasReservas.length}</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="spark" s={15} /> Cumplen este mes</div>
          <div className="sv tnum">{cumpleaneros.length}</div>
          <div className="st muted">oportunidad de campaña</div>
        </div>
        <div className="stat">
          <div className="sk"><Icon name="history" s={15} /> Reservas históricas</div>
          <div className="sv tnum">{reservations.length}</div>
        </div>
      </div>

      <div className="rtoolbar">
        <div className="tabs" style={{ display: 'inline-flex' }}>
          <button className={tab === 'clientes' ? 'on' : ''} onClick={() => setTab('clientes')}>Clientes</button>
          <button className={tab === 'reservas' ? 'on' : ''} onClick={() => setTab('reservas')}>Reservas</button>
          <button className={tab === 'vista' ? 'on' : ''} onClick={() => setTab('vista')}>Lo que ven tus clientes</button>
        </div>
        {tab === 'clientes' && (
          <div className="searchbox" style={{ display: 'flex' }}>
            <Icon name="search" s={15} />
            <input placeholder="Buscar por nombre, correo o teléfono" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        )}
      </div>

      {tab === 'clientes' && (
        <div className="card">
          {!loaded ? (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>Cargando clientes…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted2)', marginBottom: 12 }}><Icon name="clients" s={34} sw={1.4} /></div>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
                {q ? 'Sin resultados para tu búsqueda' : 'Aún no tienes clientes registrados'}
              </h3>
              {!q && (
                <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
                  Comparte el enlace público o el QR de tu local (pestaña «Lo que ven tus clientes»)
                  para que se registren y reserven. Cada registro aparece aquí.
                </p>
              )}
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Contacto</th><th>Cumpleaños</th>
                    <th className="r">Visitas</th><th className="r">Consumo</th><th>Registro</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const bm = birthdayMonth(c.birthday);
                    return (
                      <tr key={c.id}>
                        <td className="cell-name">
                          <span style={{ width: 30, height: 30, borderRadius: 9, flex: 'none', background: 'color-mix(in srgb,var(--accent) 14%,transparent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          {c.name}
                        </td>
                        <td>
                          <div style={{ fontSize: 12.5 }}>{c.email}</div>
                          {c.phone && <div className="tnum" style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</div>}
                        </td>
                        <td>
                          {c.birthday ? (
                            <span className="chip" style={bm === mesActual
                              ? { background: 'color-mix(in srgb,var(--yellow) 18%,transparent)', color: 'var(--yellow)' }
                              : { background: 'var(--panel2)', color: 'var(--muted)' }}>
                              {c.birthday}{bm === mesActual ? ' · este mes' : ''}
                            </span>
                          ) : <span className="muted">—</span>}
                        </td>
                        <td className="r tnum">{c.visits}</td>
                        <td className="r tnum">{COP(c.total_spent)}</td>
                        <td className="tnum" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                          {new Date(c.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="r">
                          {c.phone && (
                            <Link href="/admin/integraciones?tab=chat" className="btn ghost sm" title="Abrir chat de WhatsApp">
                              <Icon name="whatsapp" s={14} /> Chatear
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'reservas' && (
        <div className="card">
          {!loaded ? (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--muted)' }}>Cargando reservas…</div>
          ) : reservations.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ color: 'var(--muted2)', marginBottom: 10 }}><Icon name="calendar" s={32} sw={1.4} /></div>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>Sin reservas todavía. Llegan desde la página pública de tu local.</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th className="r">Personas</th><th>Notas</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {[...proximasReservas, ...reservations.filter(r => !(r.status !== 'cancelada' && r.date >= hoyISO))].map(r => (
                    <tr key={r.id} style={r.date < hoyISO ? { opacity: .55 } : undefined}>
                      <td className="tnum">{r.date}</td>
                      <td className="tnum">{r.time}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div className="tnum" style={{ fontSize: 12, color: 'var(--muted)' }}>{r.phone || r.email}</div>
                      </td>
                      <td className="r tnum">{r.party_size}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 220 }}>{r.notes || '—'}</td>
                      <td>
                        <span className="chip" style={
                          r.status === 'confirmada' ? { background: 'color-mix(in srgb,var(--green) 16%,transparent)', color: 'var(--green)' }
                          : r.status === 'cancelada' ? { background: 'color-mix(in srgb,var(--red) 16%,transparent)', color: 'var(--red)' }
                          : { background: 'color-mix(in srgb,var(--yellow) 16%,transparent)', color: 'var(--yellow)' }
                        }>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'vista' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(260px,330px) 1fr', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Tu página pública</h3>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
              Esto es exactamente lo que ve un cliente al escanear tu QR o abrir tu enlace:
              tu local, redes, registro y reservas.
            </p>
            <img src={qrUrl} alt="QR de la página pública" width={150} height={150}
              style={{ borderRadius: 12, background: '#fff', padding: 8, display: 'block', marginBottom: 12 }} />
            <a href={publicLink} target="_blank" rel="noreferrer" className="btn sm" style={{ width: '100%', justifyContent: 'center' }}>
              <Icon name="globe" s={14} /> Abrir en pestaña nueva
            </a>
          </div>
          <div className="card" style={{ overflow: 'hidden', minHeight: 520 }}>
            {origin && (
              <iframe
                src={publicLink}
                title="Vista previa de la página pública"
                style={{ width: '100%', height: 640, border: 0, display: 'block', background: '#0b0b12' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
