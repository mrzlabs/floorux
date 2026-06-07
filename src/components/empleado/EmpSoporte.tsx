'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import type { Message } from '@/types/db';

const SUPER_ROOT_ID = '5be10432-07b3-42f9-9161-04c5b0880409';

const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: 'var(--red)', alta: 'var(--orange)', normal: 'var(--muted)',
};
const STATUS_COLOR: Record<string, string> = {
  abierto: 'var(--yellow)', en_atencion: 'var(--accent)', resuelto: 'var(--green)',
};
const STATUS_LABEL: Record<string, string> = {
  abierto: 'Abierto', en_atencion: 'En atención', resuelto: 'Resuelto',
};

interface EmpSoporteProps {
  empleadoId: string;
}

export function EmpSoporte({ empleadoId }: EmpSoporteProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [asunto, setAsunto] = useState('');
  const [body, setBody] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadMessages();

    // Realtime para nuevos mensajes
    const channel = supabase
      .channel(`tickets-emp:${empleadoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${empleadoId}`,
      }, () => loadMessages())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${empleadoId}`,
      }, () => loadMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empleadoId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_type', 'soporte')
      .or(`sender_id.eq.${empleadoId},recipient_id.eq.${empleadoId}`)
      .order('sent_at', { ascending: true });
    setMessages((data ?? []) as Message[]);
  }

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);

    const isNewTicket = asunto.trim().length > 0;

    if (isNewTicket) {
      // Nueva solicitud
      const { error } = await supabase.from('messages').insert({
        ticket_type: 'soporte',
        sender_id: empleadoId,
        recipient_id: SUPER_ROOT_ID,
        asunto: asunto.trim(),
        body: body.trim(),
        prioridad,
        status: 'abierto',
        sent_at: new Date().toISOString(),
      });

      if (!error) {
        toast('Solicitud enviada al administrador', 'check');
        setAsunto('');
        setBody('');
        setPrioridad('normal');
      } else {
        toast('No se pudo enviar', 'alert');
      }
    } else {
      // Respuesta
      const { error } = await supabase.from('messages').insert({
        ticket_type: 'soporte',
        sender_id: empleadoId,
        recipient_id: SUPER_ROOT_ID,
        body: body.trim(),
        sent_at: new Date().toISOString(),
      });

      if (!error) {
        setBody('');
      } else {
        toast('No se pudo enviar', 'alert');
      }
    }

    setSending(false);
  }

  const thread = [...messages].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  const latestStatus = [...thread].reverse().find(m => m.status)?.status ?? null;
  const isNewTicket = asunto.trim().length > 0;
  const C = { fontSize: 13, color: 'var(--muted)' } as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, alignItems: 'start' }}>
      {/* Formulario */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
          {thread.length > 0 ? 'Nueva solicitud o respuesta' : 'Contacta con el administrador'}
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
          disabled={sending || !body.trim()}>
          <Icon name="send" s={15} />
          {isNewTicket ? 'Enviar solicitud' : 'Responder'}
        </button>
      </div>

      {/* Hilo */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800 }}>Conversación con Administrador</h2>
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
              Aún no has enviado ninguna solicitud.<br />Usa el formulario para contactar al administrador.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {thread.map(m => {
              const mine = m.sender_id === empleadoId;
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
