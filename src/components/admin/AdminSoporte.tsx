'use client';
import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { useSupportChat } from '@/hooks/useSupportChat';
import type { Profile } from '@/types/db';

const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: 'var(--red)', alta: 'var(--orange)', normal: 'var(--muted)',
};
const STATUS_COLOR: Record<string, string> = {
  abierto: 'var(--yellow)', en_atencion: 'var(--accent)', resuelto: 'var(--green)',
};
const STATUS_LABEL: Record<string, string> = {
  abierto: 'Abierto', en_atencion: 'En atención', resuelto: 'Resuelto',
};

interface AdminSoporteProps {
  profile: Profile;
}

export function AdminSoporte({ profile }: AdminSoporteProps) {
  const toast = useToast();
  const { messages, sendTicket, sendReply } = useSupportChat(profile.id);
  const [asunto, setAsunto] = useState('');
  const [body, setBody] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const thread = [...messages].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  const superAdminId = thread.find(m => m.sender_id !== profile.id)?.sender_id ?? null;
  const latestStatus = [...thread].reverse().find(m => m.status)?.status ?? null;
  const isNewTicket = asunto.trim().length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    let ok = false;
    if (isNewTicket) {
      ok = await sendTicket(asunto.trim(), body.trim(), prioridad);
      if (ok) toast('Solicitud enviada al Super Admin', 'check');
    } else {
      if (!superAdminId) { toast('Envía una solicitud primero', 'alert'); setSending(false); return; }
      ok = await sendReply(superAdminId, body.trim());
    }
    if (ok) { setAsunto(''); setBody(''); setPrioridad('normal'); }
    else toast('No se pudo enviar', 'alert');
    setSending(false);
  }

  const C = { fontSize: 13, color: 'var(--muted)' } as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, alignItems: 'start' }}>
      {/* Formulario */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
          {thread.length > 0 ? 'Nueva solicitud o respuesta' : 'Pedir soporte al Super Admin'}
        </h2>

        <Field label="Asunto (deja vacío para responder)">
          <input className="inp" value={asunto} placeholder="Ej. Problema de inventario…"
            onChange={e => setAsunto(e.target.value)} />
        </Field>

        {isNewTicket && (
          <Field label="Prioridad">
            <select className="sel" value={prioridad} onChange={e => setPrioridad(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </Field>
        )}

        <Field label={isNewTicket ? 'Detalle' : 'Mensaje'}>
          <textarea className="inp" rows={6} value={body}
            placeholder={thread.length > 0 ? 'Responde o abre nueva solicitud…' : 'Describe tu problema o consulta…'}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
          />
        </Field>
        <p style={{ ...C, marginBottom: 10 }}>Ctrl+Enter para enviar</p>

        <button className="btn pri block" onClick={handleSend}
          disabled={sending || !body.trim() || (!isNewTicket && !superAdminId)}>
          <Icon name="send" s={15} />
          {isNewTicket ? 'Enviar solicitud' : 'Responder'}
        </button>
      </div>

      {/* Hilo */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Conversación con Super Admin</h2>
          {latestStatus && (
            <Chip color={STATUS_COLOR[latestStatus] ?? 'var(--muted)'}>
              {STATUS_LABEL[latestStatus] ?? latestStatus}
            </Chip>
          )}
        </div>

        {thread.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Icon name="chat" s={32} />
            <p style={{ ...C, marginTop: 10 }}>
              Aún no has enviado ninguna solicitud.<br />Usa el formulario para contactar a tu Super Admin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {thread.map(m => {
              const mine = m.sender_id === profile.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    background: mine ? 'var(--accent)' : 'var(--card)',
                    color: mine ? '#fff' : 'var(--ink)',
                  }}>
                    {m.asunto && (
                      <>
                        <div style={{ fontWeight: 800, marginBottom: 5 }}>{m.asunto}</div>
                        {m.prioridad && (
                          <div style={{ marginBottom: 6 }}>
                            <Chip color={PRIORIDAD_COLOR[m.prioridad] ?? 'var(--muted)'}>{m.prioridad}</Chip>
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ lineHeight: 1.5 }}>{m.body}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 5, textAlign: 'right' }}>
                      {new Date(m.sent_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
