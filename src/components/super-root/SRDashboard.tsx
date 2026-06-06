'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Bars } from '@/components/ui/Bars';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import { COP, COPk } from '@/lib/utils';
import { presetRange } from '@/lib/utils';

export function SRDashboard() {
  const [stats, setStats] = useState({ superAdmins: 0, comercios: 0, users: 0, recaudo: 0 });
  const [topComercios, setTopComercios] = useState<any[]>([]);
  const [range, setRange] = useState(presetRange('30'));
  const [behaviors, setBehaviors] = useState({ sales: 0, newCommerces: 0, logins: 0, stockChanges: 0 });
  const supabase = createClient();

  useEffect(() => { load(); }, [range]);

  async function load() {
    const [{ count: sa }, { count: com }, { count: usr }, { data: sales }, { data: cs }, { count: logins }, { count: stockChanges }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin').eq('activo', true),
      supabase.from('comercios').select('*', { count: 'exact', head: true }).eq('status', 'activo'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('comercio_id, total').gte('closed_at', range.from + 'T00:00:00').lte('closed_at', range.to + 'T23:59:59'),
      supabase.from('comercios').select('id, name, city, created_at'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'LOGIN').gte('ts', range.from + 'T00:00:00').lte('ts', range.to + 'T23:59:59'),
      supabase.from('inventory_movements').select('*', { count: 'exact', head: true }).gte('created_at', range.from + 'T00:00:00').lte('created_at', range.to + 'T23:59:59'),
    ]);

    const recMap: Record<string, number> = {};
    (sales ?? []).forEach((s: any) => { recMap[s.comercio_id] = (recMap[s.comercio_id] ?? 0) + s.total; });
    const top = (cs ?? []).map((c: any) => ({ ...c, recaudo: recMap[c.id] ?? 0 }))
      .sort((a: any, b: any) => b.recaudo - a.recaudo).slice(0, 10);

    setStats({ superAdmins: sa ?? 0, comercios: com ?? 0, users: usr ?? 0, recaudo: Object.values(recMap).reduce((a, b) => a + b, 0) });
    setTopComercios(top);
    setBehaviors({
      sales: sales?.length ?? 0,
      newCommerces: (cs ?? []).filter(c => c.created_at.slice(0, 10) >= range.from && c.created_at.slice(0, 10) <= range.to).length,
      logins: logins ?? 0,
      stockChanges: stockChanges ?? 0,
    });
  }

  const bars = topComercios.map(c => ({ d: c.name.split(' ').slice(-1)[0], v: c.recaudo }));

  return (
    <div>
      <ReportToolbar range={range} setRange={setRange} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Super Admins activos" value={stats.superAdmins} icon="users" color="var(--accent)" />
        <Stat label="Comercios activos" value={stats.comercios} icon="biz" color="var(--green)" />
        <Stat label="Usuarios en sistema" value={stats.users} icon="user" color="var(--accent2)" />
        <Stat label="Recaudo del período" value={COPk(stats.recaudo)} icon="cash" color="var(--yellow)" />
      </div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Ventas cerradas" value={behaviors.sales} icon="cash" color="var(--green)" />
        <Stat label="Comercios creados" value={behaviors.newCommerces} icon="biz" color="var(--accent2)" />
        <Stat label="Inicios de sesión" value={behaviors.logins} icon="lock" color="var(--accent)" />
        <Stat label="Cambios de stock" value={behaviors.stockChanges} icon="box" color="var(--orange)" />
      </div>

      {bars.length > 0 && (
        <div className="card chart" style={{ marginBottom: 16 }}>
          <div className="chart-h">Top comercios por recaudo del período</div>
          <Bars data={bars} hotIndex={0} />
        </div>
      )}

      <div className="card">
        <div className="chart-h" style={{ marginBottom: 12 }}>Top 10 comercios</div>
        <table className="tbl">
          <thead><tr><th>#</th><th>Comercio</th><th>Ciudad</th><th style={{ textAlign: 'right' }}>Recaudo</th></tr></thead>
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
