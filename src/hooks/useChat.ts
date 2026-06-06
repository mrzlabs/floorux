'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types/db';

export function useChat(comercioId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!comercioId) return;

    supabase
      .from('messages')
      .select('*')
      .eq('comercio_id', comercioId)
      .order('sent_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(data as Message[]);
          setUnread(data.filter(m => !m.read_at && m.recipient_id === currentUserId).length);
        }
      });

    const channel = supabase
      .channel(`chat:${comercioId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `comercio_id=eq.${comercioId}` },
        payload => {
          const msg = payload.new as Message;
          setMessages(prev => [msg, ...prev]);
          if (msg.recipient_id === currentUserId && !msg.read_at) {
            setUnread(u => u + 1);
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comercioId, currentUserId]);

  const sendMessage = useCallback(async (body: string, recipientId?: string) => {
    await supabase.from('messages').insert({
      comercio_id: comercioId,
      sender_id: currentUserId,
      recipient_id: recipientId ?? null,
      body,
      sent_at: new Date().toISOString(),
    });
  }, [comercioId, currentUserId]);

  const markRead = useCallback(async (senderId: string) => {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('comercio_id', comercioId)
      .eq('sender_id', senderId)
      .eq('recipient_id', currentUserId)
      .is('read_at', null);
    setUnread(0);
  }, [comercioId, currentUserId]);

  return { messages, unread, sendMessage, markRead };
}
