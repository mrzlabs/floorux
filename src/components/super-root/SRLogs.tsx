'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import { useToast } from '@/components/ui/ToastContext';
import { presetRange, exportCSV } from '@/lib/utils';
import type { AuditLog } from '@/types/db';

export function SRLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [range, setRange] = useState(presetRange('7'));
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => { load(); }, [range]);

  async function load() {
    const { data } = await supabase.from('audit_logs').select('*')
      .gte('ts', range.from + 'T00:00:00').lte('ts', range.to + 'T23:59:59')
      .order('ts', { ascending: false }).limit(200);
    setLogs((data ?? []) as AuditLog[]);
  }

  const doCSV = () => {
    exportCSV(`audit-logs-${range.from}_${range.to}.csv`, [
      ['Fecha', 'Actor', 'Rol', 'Acción', 'Tabla', 'Record ID', 'IP'],
      ...logs.map(l => [l.ts, l.actor_id ?? '', l.actor_role ?? '', l.action, l.table_name ?? '', l.record_id ?? '', l.ip ?? '']),
    ]);
    toast('CSV descargado', 'download');
  };

  const ACTION_COLORS: Record<string, string> = {
    CREATE: 'var(--green)', UPDATE: 'var(--accent2)', DELETE: 'var(--red)', LOGIN: 'var(--accent)', SUSPEND: 'var(--orange)',
  };

  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2 style={{ fontSize: 17 }}>Logs de auditoría</h2></div>
      </div>
      <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} />
      <div className="card" style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Acción</th><th>Tabla</th><th>IP</th><th>Payload</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <>
                <tr key={l.id} style={{ cursor: l.payload ? 'pointer' : 'default' }} onClick={() => l.payload && setExpanded(expanded === l.id ? null : l.id)}>
                  <td className="muted" style={{ fontSize: 11 }}>{new Date(l.ts).toLocaleString('es-CO')}</td>
                  <td><Chip color={ACTION_COLORS[l.action] ?? 'var(--muted)'}>{l.action}</Chip></td>
                  <td className="muted">{l.table_name ?? '—'}</td>
                  <td className="muted" style={{ fontSize: 11 }}>{l.ip ?? '—'}</td>
                  <td>{l.payload && <Icon name={expanded === l.id ? 'chevd' : 'chev'} s={14} />}</td>
                </tr>
                {expanded === l.id && (
                  <tr>
                    <td colSpan={5} style={{ background: 'var(--hover)' }}>
                      <pre style={{ fontSize: 11, margin: 0, padding: '8px 16px', overflowX: 'auto', color: 'var(--muted)' }}>
                        {JSON.stringify(l.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
