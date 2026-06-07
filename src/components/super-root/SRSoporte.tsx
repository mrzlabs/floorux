'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { Stat } from '@/components/ui/Stat';
import { useSupportChat } from '@/hooks/useSupportChat';
import type { Profile, Message } from '@/types/db';

const STATUS_OPTIONS = [
  { value: 'abierto',     label: 'Abierto',      color: 'var(--yellow)' },
  { value: 'en_atencion', label: 'En atención',  color: 'var(--accent)' },
  { value: 'resuelto',    label: 'Resuelto',     color: 'var(--green)'  },
];

const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: 'var(--red)', alta: 'var(--orange)', normal: 'var(--muted)',
};
const PRIORIDAD_ORDER: Record<string, number> = { urgente: 0, alta: 1, normal: 2 };
const STATUS_ORDER:    Record<string, number> = { abierto: 0, en_atencion: 1, resuelto: 2 };

interface SenderProfile {
  full_name: string;
  color: string;
  avatar_url: string | null;
}

interface Thread {
  senderId: string;
  sender: SenderProfile;
  messages: Message[];
  latestStatus: string | null;
  latestPrioridad: string | null;
  latestAsunto: string | null;
  latestAt: string;
  unread: number;
}

interface SRSoporteProps {
  profile: Profile;
}

export function SRSoporte({ profile }: SRSoporteProps) {
  const { messages, sendReply, updateStatus } = useSupportChat(profile.id);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [senders, setSenders] = useState<Record<string, SenderProfile>>({});
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load all super_admin profiles once
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, color, avatar_url')
      .eq('role', 'super_admin')
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, SenderProfile> = {};
        (data as (SenderProfile & { id: string })[]).forEach(p => {
          map[p.id] = { full_name: p.full_name, color: p.color, avatar_url: p.avatar_url };
        });
        setSenders(map);
      });
  }, []);

  // Group messages into threads keyed by the super_admin's sender ID
  const threads = useMemo<Thread[]>(() => {
    const senderIds = new Set(
      messages
        .filter(m => m.recipient_id === profile.id && m.ticket_type === 'soporte')
        .map(m => m.sender_id)
    );

    return Array.from(senderIds).map(sid => {
      const threadMsgs = messages
        .filter(m =>
          (m.sender_id === sid && m.recipient_id === profile.id) ||
          (m.sender_id === profile.id && m.recipient_id === sid)
        )
        .sort((a, b) => a.sent_at.localeCompare(b.sent_at));

      const latestTicket = [...threadMsgs].reverse().find(m => m.asunto);
      const last = threadMsgs[threadMsgs.length - 1];

      return {
        senderId: sid,
        sender: senders[sid] ?? { full_name: sid, color: '#7F77DD', avatar_url: null },
        messages: threadMsgs,
        latestStatus:    latestTicket?.status   ?? null,
        latestPrioridad: latestTicket?.prioridad ?? null,
        latestAsunto:    latestTicket?.asunto    ?? null,
        latestAt: last?.sent_at ?? '',
        unread: threadMsgs.filter(m => m.recipient_id === profile.id && !m.read_at).length,
      };
    }).sort((a, b) => {
      const pa = PRIORIDAD_ORDER[a.latestPrioridad ?? 'normal'] ?? 2;
      const pb = PRIORIDAD_ORDER[b.latestPrioridad ?? 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
      const sa = STATUS_ORDER[a.latestStatus ?? 'abierto'] ?? 0;
      const sb = STATUS_ORDER[b.latestStatus ?? 'abierto'] ?? 0;
      if (sa !== sb) return sa - sb;
      return b.latestAt.localeCompare(a.latestAt);
    });
  }, [messages, senders, profile.id]);

  const selectedThread = threads.find(t => t.senderId === selectedSender);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages.length]);

  async function handleReply() {
    if (!draft.trim() || !selectedSender) return;
    setSending(true);
    await sendReply(selectedSender, draft.trim());
    setDraft('');
    setSending(false);
  }

  async function handleStatus(id: string, status: string) {
    await updateStatus(id, status);
  }

  const openCount       = threads.filter(t => t.latestStatus === 'abierto').length;
  const inProgressCount = threads.filter(t => t.latestStatus === 'en_atencion').length;
  const resolvedCount   = threads.filter(t => t.latestStatus === 'resuelto').length;

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Abiertos"     value={openCount}       icon="alert" color="var(--yellow)" />
        <Stat label="En atención"  value={inProgressCount} icon="clock" color="var(--accent)" />
        <Stat label="Resueltos"    value={resolvedCount}   icon="check" color="var(--green)"  />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: 580 }}>
        {/* Lista de threads */}
        <div className="card" style={{ overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            Tickets recibidos · {threads.length}
          </div>
          {threads.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Icon name="chat" s={28} />
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Sin tickets de soporte</p>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {threads.map(t => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === t.latestStatus) ?? STATUS_OPTIONS[0];
              return (
                <button
                  key={t.senderId}
                  type="button"
                  className={'nav-i' + (selectedSender === t.senderId ? ' on' : '')}
                  style={{ width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '10px 14px' }}
                  onClick={() => setSelectedSender(t.senderId)}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 13 }}>{t.sender.full_name}</b>
                    {t.unread > 0 && <span className="ncount">{t.unread}</span>}
                  </div>
                  {t.latestAsunto && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.latestAsunto}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Chip color={statusOpt.color}>{statusOpt.label}</Chip>
                    {t.latestPrioridad && t.latestPrioridad !== 'normal' && (
                      <Chip color={PRIORIDAD_COLOR[t.latestPrioridad]}>{t.latestPrioridad}</Chip>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hilo de chat */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {!selectedThread ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <Icon name="chat" s={32} />
              <p className="muted" style={{ fontSize: 13 }}>Selecciona un ticket para ver el hilo</p>
            </div>
          ) : (
            <>
              {/* Header del thread */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <b style={{ fontSize: 14 }}>{selectedThread.sender.full_name}</b>
                  {selectedThread.latestAsunto && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{selectedThread.latestAsunto}</div>
                  )}
                </div>
                {selectedThread.latestStatus && (
                  <select
                    className="sel"
                    value={selectedThread.latestStatus}
                    style={{ fontSize: 12, padding: '3px 8px' }}
                    onChange={e => {
                      const ticketMsg = [...selectedThread.messages].reverse().find(m => m.asunto);
                      if (ticketMsg) handleStatus(ticketMsg.id, e.target.value);
                    }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                )}
              </div>

              {/* Mensajes */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedThread.messages.map(m => {
                  const mine = m.sender_id === profile.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                        background: mine ? 'var(--accent)' : 'var(--card)',
                        color: mine ? '#fff' : 'var(--ink)',
                      }}>
                        {m.asunto && (
                          <>
                            <div style={{ fontWeight: 800, marginBottom: 4 }}>{m.asunto}</div>
                            {m.prioridad && (
                              <div style={{ marginBottom: 6 }}>
                                <Chip color={PRIORIDAD_COLOR[m.prioridad] ?? 'var(--muted)'}>{m.prioridad}</Chip>
                              </div>
                            )}
                          </>
                        )}
                        <div style={{ lineHeight: 1.5 }}>{m.body}</div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                          {new Date(m.sent_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Input de respuesta */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder={`Responder a ${selectedThread.sender.full_name}…`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                />
                <button className="btn pri" onClick={handleReply} disabled={sending || !draft.trim()}>
                  <Icon name="send" s={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
