'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chip } from '@/components/ui/Chip';
import { Stat } from '@/components/ui/Stat';

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: string;
  created_at: string;
  super_admin_id: string;
}

export function SRSoporte() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const supabase = createClient();

  async function load() {
    const [{ data }, { data: supers }] = await Promise.all([
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'super_admin'),
    ]);
    const map: Record<string, string> = {};
    (supers ?? []).forEach(item => { map[item.id] = item.full_name; });
    setNames(map);
    setTickets((data ?? []) as Ticket[]);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: Ticket['status']) {
    await fetch('/api/support', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Abiertos" value={tickets.filter(t => t.status === 'open').length} icon="alert" color="var(--red)" />
        <Stat label="En gestión" value={tickets.filter(t => t.status === 'in_progress').length} icon="clock" color="var(--orange)" />
        <Stat label="Cerrados" value={tickets.filter(t => t.status === 'closed').length} icon="check" color="var(--green)" />
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Super Admin</th><th>Solicitud</th><th>Prioridad</th><th>Estado</th><th>Gestión</th></tr></thead>
          <tbody>{tickets.map(ticket => (
            <tr key={ticket.id}>
              <td className="muted">{new Date(ticket.created_at).toLocaleString('es-CO')}</td>
              <td>{names[ticket.super_admin_id] ?? ticket.super_admin_id}</td>
              <td><b>{ticket.subject}</b><div className="muted" style={{ fontSize: 12, maxWidth: 360 }}>{ticket.body}</div></td>
              <td><Chip color={ticket.priority === 'critical' ? 'var(--red)' : 'var(--orange)'}>{ticket.priority}</Chip></td>
              <td><Chip>{ticket.status}</Chip></td>
              <td><select className="sel" value={ticket.status} onChange={e => setStatus(ticket.id, e.target.value as Ticket['status'])}><option value="open">Abierto</option><option value="in_progress">En gestión</option><option value="closed">Cerrado</option></select></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
