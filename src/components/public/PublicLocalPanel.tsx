'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface PublicLocalPanelProps {
  comercio: {
    id: string;
    name: string;
    type: string;
    city: string;
    address: string | null;
    phone: string | null;
    color: string;
    photo_url: string | null;
    settings: Record<string, unknown>;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

function getSocialHref(label: string, value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '#';
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^@/, '').replace(/^\/+/, '');
  if (label === 'Instagram') return `https://instagram.com/${clean}`;
  if (label === 'TikTok') return `https://tiktok.com/@${clean}`;
  if (label === 'Facebook') return `https://facebook.com/${clean}`;
  return `https://${clean}`;
}

export function PublicLocalPanel({ comercio }: PublicLocalPanelProps) {
  const commercial = useMemo(() => (comercio.settings?.commercial as Record<string, any>) ?? {}, [comercio.settings]);
  const [mode, setMode] = useState<'registro' | 'ingreso'>('registro');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', birthday: '' });
  const [reservation, setReservation] = useState({ date: '', time: '', partySize: 2, notes: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submitCustomer(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const payload = mode === 'registro'
      ? { type: 'register', ...form }
      : { type: 'login', email: form.email };
    const res = await fetch(`/api/public/local/${comercio.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(mode === 'ingreso' ? 'Correo no registrado en este local.' : 'No se pudo registrar el cliente.');
      return;
    }
    setCustomer(json.customer);
    setForm(current => ({ ...current, name: json.customer.name ?? current.name, phone: json.customer.phone ?? current.phone }));
    setNotice(mode === 'registro' ? 'Registro activo. Ya puedes reservar.' : 'Ingreso correcto.');
  }

  async function submitReservation(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    setLoading(true);
    setError('');
    setNotice('');
    const res = await fetch(`/api/public/local/${comercio.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reservation',
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: form.phone || customer.phone || '',
        ...reservation,
        partySize: Number(reservation.partySize),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError('No se pudo solicitar la reserva.');
      return;
    }
    setNotice('Reserva solicitada. El local confirmará disponibilidad.');
    setReservation({ date: '', time: '', partySize: 2, notes: '' });
  }

  const social = [
    { label: 'Instagram', value: commercial.instagram },
    { label: 'Facebook', value: commercial.facebook },
    { label: 'TikTok', value: commercial.tiktok },
    { label: 'Web', value: commercial.website },
  ].filter(item => item.value);

  const whatsapp = commercial.whatsapp ? String(commercial.whatsapp).replace(/[^\d+]/g, '') : '';

  return (
    <main className="public-page" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <section style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, .95fr)',
        gap: 0,
      }} className="public-local-grid">
        <div style={{
          position: 'relative',
          padding: '42px clamp(22px, 5vw, 72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          background: comercio.photo_url
            ? `linear-gradient(120deg, rgba(5,5,10,.88), rgba(5,5,10,.48)), url(${comercio.photo_url}) center/cover`
            : 'linear-gradient(120deg, var(--panel), var(--bg2))',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,.10)', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: comercio.color }} />
              FloorUX CRM
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 8vw, 86px)', lineHeight: .95, letterSpacing: '-.05em', marginTop: 28, maxWidth: 760 }}>
              {comercio.name}
            </h1>
            <p style={{ fontSize: 17, color: '#d9d9e8', lineHeight: 1.65, marginTop: 20, maxWidth: 560 }}>
              Reserva, consulta redes y mantén tu perfil activo en el local.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 32 }}>
            {social.map(item => (
              <a key={item.label} className="btn ghost" href={getSocialHref(item.label, item.value)} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
            {whatsapp && (
              <a className="btn pri" href={`https://wa.me/${whatsapp.replace('+', '')}`} target="_blank" rel="noreferrer">
                <Icon name="chat" s={15} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        <div style={{ padding: '34px clamp(18px, 4vw, 52px)', display: 'flex', alignItems: 'center', background: 'var(--bg)' }}>
          <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <button className={'fchip' + (mode === 'registro' ? ' on' : '')} onClick={() => setMode('registro')}>Registro</button>
                <button className={'fchip' + (mode === 'ingreso' ? ' on' : '')} onClick={() => setMode('ingreso')}>Ingresar</button>
              </div>
              <form onSubmit={submitCustomer}>
                {mode === 'registro' && (
                  <div className="field">
                    <label>Nombre</label>
                    <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                )}
                <div className="field">
                  <label>Correo</label>
                  <input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                {mode === 'registro' && (
                  <div className="grid g2">
                    <div className="field">
                      <label>Teléfono</label>
                      <input className="inp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Cumpleaños</label>
                      <input className="inp" type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
                    </div>
                  </div>
                )}
                <button className="btn pri block" disabled={loading}>
                  {loading ? 'Procesando...' : mode === 'registro' ? 'Registrarme' : 'Ingresar al panel'}
                </button>
              </form>
            </div>

            {customer && (
              <div className="card" style={{ padding: 22 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Panel cliente</div>
                  <h2 style={{ fontSize: 24, marginTop: 4 }}>{customer.name}</h2>
                </div>
                <form onSubmit={submitReservation}>
                  <div className="grid g2">
                    <div className="field">
                      <label>Fecha</label>
                      <input className="inp" type="date" value={reservation.date} onChange={e => setReservation(r => ({ ...r, date: e.target.value }))} required />
                    </div>
                    <div className="field">
                      <label>Hora</label>
                      <input className="inp" type="time" value={reservation.time} onChange={e => setReservation(r => ({ ...r, time: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="field">
                    <label>Personas</label>
                    <input className="inp" type="number" min={1} max={80} value={reservation.partySize} onChange={e => setReservation(r => ({ ...r, partySize: Number(e.target.value) }))} required />
                  </div>
                  <div className="field">
                    <label>Notas</label>
                    <textarea className="inp" rows={3} value={reservation.notes} onChange={e => setReservation(r => ({ ...r, notes: e.target.value }))} placeholder="Cumpleaños, zona preferida, botella, evento..." />
                  </div>
                  <button className="btn pri block" disabled={loading}>
                    <Icon name="calendar" s={15} /> Solicitar reserva
                  </button>
                </form>
              </div>
            )}

            {(notice || error) && (
              <div className="card" style={{ padding: 14, color: error ? 'var(--red)' : 'var(--green)', fontSize: 13, fontWeight: 700 }}>
                {error || notice}
              </div>
            )}
          </div>
        </div>
      </section>
      <style jsx>{`
        @media (max-width: 900px) {
          .public-local-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
