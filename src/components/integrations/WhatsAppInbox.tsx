'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContext';
import { createClient } from '@/lib/supabase/client';
import type { WaContact, WaMessage } from '@/types/db';

interface WhatsAppInboxProps {
  comercioId: string;
  /** Número registrado en la integración (settings.integrations.whatsapp.handle). */
  handle?: string;
  /** true cuando OperUX ya activó la conexión. */
  active: boolean;
}

export function WhatsAppInbox({ comercioId, handle, active }: WhatsAppInboxProps) {
  const toast = useToast();
  const supabase = createClient();
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!comercioId) return;
    let cancelled = false;

    async function load() {
      const { data: cData, error: cErr } = await supabase
        .from('wa_contacts')
        .select('*')
        .eq('comercio_id', comercioId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (cErr) {
        if (cErr.code === '42P01' || /wa_contacts/.test(cErr.message)) setTableMissing(true);
        setLoaded(true);
        return;
      }
      setContacts((cData ?? []) as WaContact[]);

      const { data: mData } = await supabase
        .from('wa_messages')
        .select('*')
        .eq('comercio_id', comercioId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (cancelled) return;
      setMessages((mData ?? []) as WaMessage[]);
      setLoaded(true);
    }
    load();

    const channel = supabase
      .channel(`wa-inbox:${comercioId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wa_messages', filter: `comercio_id=eq.${comercioId}` },
        payload => {
          const msg = payload.new as WaMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wa_contacts', filter: `comercio_id=eq.${comercioId}` },
        payload => {
          const contact = payload.new as WaContact;
          setContacts(prev => prev.some(c => c.id === contact.id) ? prev : [contact, ...prev]);
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comercioId]);

  const byContact = useMemo(() => {
    const map = new Map<string, WaMessage[]>();
    for (const m of messages) {
      const list = map.get(m.contact_id) ?? [];
      list.push(m);
      map.set(m.contact_id, list);
    }
    return map;
  }, [messages]);

  const orderedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const la = byContact.get(a.id)?.at(-1)?.created_at ?? a.created_at;
      const lb = byContact.get(b.id)?.at(-1)?.created_at ?? b.created_at;
      return lb.localeCompare(la);
    });
  }, [contacts, byContact]);

  const selected = orderedContacts.find(c => c.id === selectedId) ?? orderedContacts[0] ?? null;
  const thread = selected ? (byContact.get(selected.id) ?? []) : [];

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [selected?.id, thread.length]);

  async function send() {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    const res = await fetch('/api/integrations/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: selected.id, body: draft.trim() }),
    });
    setSending(false);
    if (!res.ok) { toast('No se pudo enviar el mensaje', 'alert'); return; }
    const { message } = await res.json();
    setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
    setDraft('');
  }

  if (tableMissing) {
    return (
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--muted2)', marginBottom: 12 }}><Icon name="whatsapp" s={36} sw={1.4} /></div>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Falta un paso de instalación</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          La bandeja necesita las tablas de chat. Ejecuta <b>supabase/migrations/20260708000001_whatsapp_chat.sql</b> en
          el SQL Editor de Supabase y habilita Realtime en <b>wa_messages</b>.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!active && (
        <div className="operate-banner" style={{ marginBottom: 14 }}>
          <span><b>Conexión en activación</b> · OperUX está vinculando tu número {handle ? <b>{handle}</b> : null}. La bandeja ya funciona para clientes registrados desde la app.</span>
        </div>
      )}

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,260px) 1fr', minHeight: 440 }}>
        {/* lista de contactos */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted2)' }}>
            Clientes {contacts.length > 0 && `· ${contacts.length}`}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!loaded ? (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--muted)' }}>Cargando…</div>
            ) : orderedContacts.length === 0 ? (
              <div style={{ padding: '26px 18px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Aún no hay conversaciones. Cuando un cliente escriba a tu WhatsApp o se registre desde la app, aparecerá aquí.
              </div>
            ) : orderedContacts.map(c => {
              const last = byContact.get(c.id)?.at(-1);
              const isSel = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                  display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left',
                  padding: '11px 14px', border: 0, cursor: 'pointer', font: 'inherit',
                  background: isSel ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent',
                  color: 'var(--ink)', borderLeft: isSel ? '3px solid var(--accent)' : '3px solid transparent',
                }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', background: 'color-mix(in srgb,var(--green) 16%,transparent)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={c.source === 'app' ? 'user' : 'whatsapp'} s={16} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.phone}</b>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {last ? (last.direction === 'out' ? 'Tú: ' : '') + last.body : c.phone}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* hilo */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ fontSize: 14 }}>{selected.name || selected.phone}</b>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.phone}</span>
                <span className="chip" style={{ marginLeft: 'auto', background: 'color-mix(in srgb,var(--green) 14%,transparent)', color: 'var(--green)' }}>
                  {selected.source === 'app' ? 'Registrado en la app' : 'WhatsApp'}
                </span>
              </div>

              <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thread.length === 0 && (
                  <div style={{ margin: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>Escribe el primer mensaje a este cliente.</div>
                )}
                {thread.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start',
                    maxWidth: '78%', padding: '9px 13px', fontSize: 13.5, lineHeight: 1.45,
                    borderRadius: m.direction === 'out' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.direction === 'out' ? 'color-mix(in srgb,var(--accent) 22%,var(--panel2))' : 'var(--panel2)',
                    border: '1px solid var(--line)',
                  }}>
                    {m.body}
                    <div className="tnum" style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 4, textAlign: 'right', display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      {m.direction === 'out' && (
                        m.status === 'queued' ? <Icon name="clock" s={10} /> :
                        m.status === 'failed' ? <span style={{ color: 'var(--red)' }}><Icon name="alert" s={10} /></span> :
                        <Icon name="check" s={10} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 9 }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder={`Responder como ${handle || 'tu negocio'}…`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <button className="btn pri" onClick={send} disabled={sending || !draft.trim()}>
                  <Icon name="send" s={16} /> {sending ? '…' : 'Enviar'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
              <div style={{ color: 'var(--muted2)', marginBottom: 10 }}><Icon name="whatsapp" s={32} sw={1.4} /></div>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>Selecciona una conversación para responder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
