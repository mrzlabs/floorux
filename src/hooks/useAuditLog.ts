'use client';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type Action = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SUSPEND';

export function useAuditLog(actorId: string, actorRole: string) {
  const supabase = createClient();
  return useCallback(async (action: Action, table?: string, recordId?: string, payload?: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      table_name: table ?? null,
      record_id: recordId ?? null,
      payload: payload ?? null,
      ts: new Date().toISOString(),
    });
  }, [actorId, actorRole]);
}
