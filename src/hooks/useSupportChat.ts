'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types/db';

export function useSupportChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    supabase.from('messages')
      .select('*')
      .eq('ticket_type', 'soporte')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('sent_at', { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Message[]));

    const channel = supabase.channel(`support:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, payload => {
        const m = payload.new as Message;
        if (m.ticket_type === 'soporte') {
          setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, m]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, payload => {
        const m = payload.new as Message;
        setMessages(prev => prev.map(p => p.id === m.id ? m : p));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const sendTicket = useCallback(async (asunto: string, body: string, prioridad: string) => {
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, sender_id: userId, recipient_id: null, body,
      ticket_type: 'soporte', status: 'abierto', asunto, prioridad,
      read_at: null, sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(), comercio_id: null,
    } as Message]);
    const res = await fetch('/api/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asunto, body, prioridad }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages(prev => prev.map(m => m.id === tempId ? (message as Message) : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    return res.ok;
  }, [userId]);

  const sendReply = useCallback(async (recipientId: string, body: string) => {
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, sender_id: userId, recipient_id: recipientId, body,
      ticket_type: 'soporte', status: null, asunto: null, prioridad: null,
      read_at: null, sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(), comercio_id: null,
    } as Message]);
    const res = await fetch('/api/support', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reply', recipient_id: recipientId, body }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages(prev => prev.map(m => m.id === tempId ? (message as Message) : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    return res.ok;
  }, [userId]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    const res = await fetch('/api/support', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    return res.ok;
  }, []);

  return { messages, sendTicket, sendReply, updateStatus };
}
