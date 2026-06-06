'use client';
import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useChat } from '@/hooks/useChat';
import type { Profile } from '@/types/db';

interface ChatPanelProps {
  comercioId: string;
  currentUser: Profile;
  contacts: Profile[];
}

export function ChatPanel({ comercioId, currentUser, contacts }: ChatPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, unread, sendMessage, markRead } = useChat(comercioId, currentUser.id);

  const thread = messages.filter(m =>
    (m.sender_id === selectedId && m.recipient_id === currentUser.id) ||
    (m.sender_id === currentUser.id && m.recipient_id === selectedId)
  ).reverse();

  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  const send = async () => {
    if (!draft.trim() || !selectedId) return;
    await sendMessage(draft.trim(), selectedId);
    setDraft('');
  };

  const contact = contacts.find(c => c.id === selectedId);
  const unreadFor = (id: string) => messages.filter(m => m.sender_id === id && m.recipient_id === currentUser.id && !m.read_at).length;

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{ width: 220, borderRight: '1px solid var(--line)', paddingRight: 0 }}>
        <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--muted)' }}>Contactos</div>
        {contacts.map(c => (
          <button
            key={c.id}
            className={'nav-i' + (selectedId === c.id ? ' on' : '')}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => setSelectedId(c.id)}
          >
            <Avatar name={c.full_name} color={c.color} size="sm" />
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <b>{c.full_name}</b>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.role}</div>
            </span>
            {unreadFor(c.id) > 0 && <span className="ncount">{unreadFor(c.id)}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="muted">Selecciona un contacto para chatear</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', fontWeight: 700 }}>
              {contact?.full_name}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thread.map(m => {
                const mine = m.sender_id === currentUser.id;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '8px 12px',
                      background: mine ? 'var(--accent)' : 'var(--card)',
                      color: mine ? '#fff' : 'var(--ink)',
                      borderRadius: 12, fontSize: 13,
                    }}>
                      {m.body}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, textAlign: 'right' }}>
                        {new Date(m.sent_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <input
                className="inp" style={{ flex: 1 }}
                placeholder="Escribe un mensaje…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button className="btn pri" onClick={send} disabled={!draft.trim()}>
                <Icon name="send" s={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
