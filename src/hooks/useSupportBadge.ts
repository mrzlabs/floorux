'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupportBadge(userId: string) {
  const [count, setCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    async function fetchCount() {
      const { count: c } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('ticket_type', 'soporte')
        .eq('status', 'abierto');
      setCount(c ?? 0);
    }

    fetchCount();

    const channel = supabase.channel(`support-badge:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, fetchCount)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return count;
}
