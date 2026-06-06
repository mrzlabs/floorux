'use server';
import { createAdminClient } from './supabase/admin';

interface AuditEntry {
  actor_id?: string;
  actor_role?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SUSPEND';
  table_name?: string;
  record_id?: string;
  payload?: Record<string, unknown>;
  ip?: string;
}

export async function writeAuditLog(entry: AuditEntry) {
  const supabase = createAdminClient();
  await supabase.from('audit_logs').insert({ ...entry, ts: new Date().toISOString() });
}
