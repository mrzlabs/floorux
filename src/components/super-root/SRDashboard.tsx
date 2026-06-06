'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Bars } from '@/components/ui/Bars';
import { COP, COPk } from '@/lib/utils';

export function SRDashboard() {
  const [stats, setStats] = useState({ superAdmins: 0, comercios: 0, users: 0, recaudo: 0 });
  const [topComercios, setTopComercios] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const [{ count: sa }, { count: com }, { count: usr }, { data: sales }, { data: cs }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin').eq('activo', true),
      supabase.from('comercios').select('*', { count: 'exact', head: true }).eq('status', 'activo'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('comercio_id, total').gte('closed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('comercios').select('id, name, city'),
    ]);

    const recMap: Record<string, number> = {};
    (sales ?? []).forEach((s: any) => { recMap[s.comercio_id] = (recMap[s.comercio_id] ?? 0) + s.total; });
    const top = (cs ?? []).map((c: any) => ({ ...c, recaudo: recMap[c.id] ?? 0 }))
      .sort((a: any, b: any) => b.recaudo - a.recaudo).slice(0, 10);

    setStats({ superAdmins: sa ?? 0, comercios: com ?? 0, users: usr ?? 0, recaudo: Object.values(recMap).reduce((a, b) => a + b, 0) });
    setTopComercios(top);
  }

  const bars = topComercios.map(c => ({ d: c.name.split(' ').slice(-1)[0], v: c.recaudo }));

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Super Admins activos" value={stats.superAdmins} icon="users" color="var(--accent)" />
        <Stat label="Comercios activos" value={stats.comercios} icon="biz" color="var(--green)" />
        <Stat label="Usuarios en sistema" value={stats.users} icon="user" color="var(--accent2)" />
        <Stat label="Recaudo global del mes" value={COPk(stats.recaudo)} icon="cash" color="var(--yellow)" />
      </div>

      {bars.length > 0 && (
        <div className="card chart" style={{ marginBottom: 16 }}>
          <div className="chart-h">Top comercios por recaudo (mes)</div>
          <Bars data={bars} hotIndex={0} />
        </div>
      )}

      <div className="card">
        <div className="chart-h" style={{ marginBottom: 12 }}>Top 10 comercios</div>
        <table className="tbl">
          <thead><tr><th>#</th><th>Comercio</th><th>Ciudad</th><th style={{ textAlign: 'right' }}>Recaudo mes</th></tr></thead>
          <tbody>
            {topComercios.map((c, i) => (
              <tr key={c.id}>
                <td className="muted">{i + 1}</td>
                <td><b>{c.name}</b></td>
                <td className="muted">{c.city}</td>
                <td className="tnum" style={{ textAlign: 'right' }}>{COP(c.recaudo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
