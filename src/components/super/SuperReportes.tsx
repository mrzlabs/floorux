'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Bars } from '@/components/ui/Bars';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk, presetRange, rangeLabel, exportCSV } from '@/lib/utils';
import type { Comercio, Sale } from '@/types/db';

interface SuperReportesProps {
  superAdminId: string;
}

export function SuperReportes({ superAdminId }: SuperReportesProps) {
  const toast = useToast();
  const [range, setRange] = useState(presetRange('30'));
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [salesMap, setSalesMap] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => { load(); }, [superAdminId, range]);

  async function load() {
    const { data: cs } = await supabase.from('comercios').select('*').eq('super_admin_id', superAdminId);
    if (!cs) return;
    setComercios(cs as Comercio[]);
    const ids = cs.map((c: Comercio) => c.id);
    const { data: s } = await supabase.from('sales').select('comercio_id, total')
      .in('comercio_id', ids)
      .gte('closed_at', range.from + 'T00:00:00')
      .lte('closed_at', range.to + 'T23:59:59');
    const map: Record<string, number> = {};
    (s ?? []).forEach((v: any) => { map[v.comercio_id] = (map[v.comercio_id] ?? 0) + v.total; });
    setSalesMap(map);
  }

  const total = Object.values(salesMap).reduce((s, v) => s + v, 0);
  const bars = comercios.map(c => ({ d: c.name.split(' ').slice(-1)[0], v: salesMap[c.id] ?? 0 }));

  const doCSV = () => {
    exportCSV(`super-reportes-${range.from}_${range.to}.csv`, [
      ['Reporte consolidado'], ['Rango', rangeLabel(range)], ['Total red', total], [],
      ['Comercio', 'Recaudo'], ...comercios.map(c => [c.name, salesMap[c.id] ?? 0]),
    ]);
    toast('CSV descargado', 'download');
  };

  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2 style={{ fontSize: 17 }}>Reportes consolidados</h2><div className="sub">{rangeLabel(range)} · {comercios.length} comercios</div></div>
      </div>
      <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} />

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Recaudo de la red" value={COP(total)} icon="cash" color="var(--green)" />
        <Stat label="Comercios activos" value={comercios.filter(c => c.status === 'activo').length} icon="biz" color="var(--accent)" />
        <Stat label="Ticket promedio red" value={comercios.length ? COPk(Math.round(total / comercios.length)) : '$0'} icon="receipt" color="var(--accent2)" />
      </div>

      <div className="card chart" style={{ marginBottom: 16 }}>
        <div className="chart-h">Recaudo por comercio</div>
        <Bars data={bars.length ? bars : [{ d: '--', v: 0 }]} />
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Comercio</th><th>Ciudad</th><th>Plan</th><th style={{ textAlign: 'right' }}>Recaudo</th></tr></thead>
          <tbody>
            {comercios.sort((a, b) => (salesMap[b.id] ?? 0) - (salesMap[a.id] ?? 0)).map(c => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td className="muted">{c.city}</td>
                <td><span className="chip">{c.plan}</span></td>
                <td className="tnum" style={{ textAlign: 'right' }}>{COP(salesMap[c.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
