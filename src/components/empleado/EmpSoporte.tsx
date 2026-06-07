'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import type { Message } from '@/types/db';

const SUPER_ROOT_ID = '5be10432-07b3-42f9-9161-04c5b0880409';

interface EmpSoporteProps {
  empleadoId: string;
}

export function EmpSoporte({ empleadoId }: EmpSoporteProps) {
  const toast = useToast();
  const [tickets, setTickets] = useState<Message[]>([]);
  const [asunto, setAsunto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [prioridad, setPrioridad] = useState<'Normal' | 'Alta' | 'Urgente'>('Normal');

  const supabase = createClient();

  useEffect(() => {
    loadTickets();

    // Realtime para nuevos mensajes
    const channel = supabase
      .channel(`tickets-emp:${empleadoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${empleadoId}`,
      }, () => loadTickets())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${empleadoId}`,
      }, () => loadTickets())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empleadoId]);

  async function loadTickets() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_type', 'soporte')
      .or(`sender_id.eq.${empleadoId},recipient_id.eq.${empleadoId}`)
      .order('sent_at', { ascending: false });
    setTickets((data ?? []) as Message[]);
  }

  async function enviarTicket() {
    if (!asunto.trim() || !detalle.trim()) {
      toast('Completa asunto y detalle', 'alert');
      return;
    }

    await supabase.from('messages').insert({
      ticket_type: 'soporte',
      sender_id: empleadoId,
      recipient_id: SUPER_ROOT_ID,
      asunto,
      body: detalle,
      prioridad,
      status: 'abierto',
      sent_at: new Date().toISOString(),
    });

    setAsunto('');
    setDetalle('');
    setPrioridad('Normal');
    toast('Solicitud enviada al equipo de soporte', 'check');
    loadTickets();
  }

  const ticketsEnviados = tickets.filter(t => t.sender_id === empleadoId);

  return (
    <div>
      <div className="card">
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="chat" s={18} />
          <span style={{ fontWeight: 800, fontSize: 16 }}>Enviar solicitud de soporte</span>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <Field label="Asunto">
              <input
                type="text"
                placeholder="Ej: Problema con inventario, Error al cobrar..."
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
              />
            </Field>

            <Field label="Detalle">
              <textarea
                placeholder="Describe tu problema o solicitud..."
                value={detalle}
                onChange={e => setDetalle(e.target.value)}
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </Field>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Prioridad</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={'fchip' + (prioridad === 'Normal' ? ' on' : '')}
                  style={prioridad === 'Normal' ? { background: 'var(--accent2)', borderColor: 'var(--accent2)', color: '#fff' } : undefined}
                  onClick={() => setPrioridad('Normal')}
                >
                  Normal
                </button>
                <button
                  className={'fchip' + (prioridad === 'Alta' ? ' on' : '')}
                  style={prioridad === 'Alta' ? { background: 'var(--yellow)', borderColor: 'var(--yellow)', color: '#000' } : undefined}
                  onClick={() => setPrioridad('Alta')}
                >
                  Alta
                </button>
                <button
                  className={'fchip' + (prioridad === 'Urgente' ? ' on' : '')}
                  style={prioridad === 'Urgente' ? { background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' } : undefined}
                  onClick={() => setPrioridad('Urgente')}
                >
                  Urgente
                </button>
              </div>
            </div>

            <button className="btn primary" onClick={enviarTicket} style={{ width: '100%' }}>
              <Icon name="send" s={16} /> Enviar solicitud
            </button>
          </div>
        </div>
      </div>

      {/* Historial de tickets */}
      {ticketsEnviados.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.06em' }}>
              Tus solicitudes
            </div>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asunto</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Respuesta</th>
              </tr>
            </thead>
            <tbody>
              {ticketsEnviados.map(t => {
                // Buscar respuesta del super_root
                const respuesta = tickets.find(
                  r => r.sender_id === SUPER_ROOT_ID &&
                       r.recipient_id === empleadoId &&
                       r.asunto === t.asunto &&
                       new Date(r.sent_at) > new Date(t.sent_at)
                );

                return (
                  <tr key={t.id}>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {new Date(t.sent_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.asunto}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {t.body && t.body.length > 60 ? t.body.substring(0, 60) + '...' : t.body}
                      </div>
                    </td>
                    <td>
                      <Chip color={
                        t.prioridad === 'Urgente' ? 'var(--red)' :
                        t.prioridad === 'Alta' ? 'var(--yellow)' :
                        'var(--accent2)'
                      }>
                        {t.prioridad}
                      </Chip>
                    </td>
                    <td>
                      <Chip color={
                        t.status === 'abierto' ? 'var(--yellow)' :
                        t.status === 'en_atencion' ? 'var(--blue)' :
                        'var(--green)'
                      }>
                        {t.status === 'abierto' ? 'Abierto' :
                         t.status === 'en_atencion' ? 'En atención' :
                         'Resuelto'}
                      </Chip>
                    </td>
                    <td>
                      {respuesta ? (
                        <div style={{ fontSize: 12, maxWidth: 300 }}>
                          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                            <Icon name="check" s={14} style={{ display: 'inline', marginRight: 4 }} />
                            Respondido
                          </div>
                          <div style={{ color: 'var(--muted)' }}>
                            {respuesta.body && respuesta.body.length > 80
                              ? respuesta.body.substring(0, 80) + '...'
                              : respuesta.body}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
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
  );
}
