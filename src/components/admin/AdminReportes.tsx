'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Bars, PayBars } from '@/components/ui/Bars';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk, presetRange, rangeLabel, exportCSV } from '@/lib/utils';
import type { Sale, SaleItem, Profile } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: '#34d399' },
  { id: 'transferencia', name: 'Transferencia', color: '#5A82EE' },
  { id: 'qr', name: 'QR', color: '#B57BE0' },
  { id: 'datafono', name: 'Datáfono', color: '#27C3D8' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: '#F5C400' },
];

interface AdminReportesProps {
  comercioId: string;
  comercioName: string;
}

export function AdminReportes({ comercioId, comercioName }: AdminReportesProps) {
  const toast = useToast();
  const [range, setRange] = useState(presetRange('hoy'));
  const [sales, setSales] = useState<(Sale & { sale_items: SaleItem[]; profiles?: Profile })[]>([]);
  const supabase = createClient();

  useEffect(() => { load(); }, [comercioId, range]);

  async function load() {
    const { data } = await supabase.from('sales').select('*, sale_items(*), profiles(full_name)')
      .eq('comercio_id', comercioId)
      .gte('closed_at', range.from + 'T00:00:00')
      .lte('closed_at', range.to + 'T23:59:59')
      .order('closed_at');
    setSales((data ?? []) as any);
  }

  const total = sales.reduce((s, v) => s + v.total, 0);
  const cost = sales.reduce((s, v) => s + v.cost, 0);
  const util = total - cost;
  const margen = total ? Math.round(util / total * 100) : 0;

  const payMap: Record<string, number> = {};
  sales.forEach(s => { payMap[s.payment_method] = (payMap[s.payment_method] ?? 0) + s.total; });
  const payData = PAYMENTS.map(p => ({ ...p, v: payMap[p.id] ?? 0 }));

  const hourlyMap: Record<string, number> = {};
  sales.forEach(s => {
    const h = new Date(s.closed_at).getHours();
    const label = h + 'h';
    hourlyMap[label] = (hourlyMap[label] ?? 0) + s.total;
  });
  const bars = Object.entries(hourlyMap).map(([h, v]) => ({ h, v }));

  const doCSV = () => {
    exportCSV(`reporte-${comercioId}-${range.from}_${range.to}.csv`, [
      [comercioName], ['Rango', rangeLabel(range)], [],
      ['Ventas', total], ['Utilidad', util], ['Margen %', margen], ['Mesas', sales.length], [],
      ['MÉTODOS DE PAGO', 'Valor'], ...payData.map(p => [p.name, p.v]),
    ]);
    toast('CSV descargado', 'download');
  };

  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2 style={{ fontSize: 17 }}>Reporte de ventas</h2><div className="sub">{rangeLabel(range)}</div></div>
      </div>
      <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} live={range.from === new Date().toISOString().split('T')[0]} />

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Ventas del período" value={COP(total)} icon="cash" color="var(--green)" />
        <Stat label="Utilidad bruta" value={COP(util)} icon="chart" color="var(--accent)" sub={`Margen ${margen}%`} />
        <Stat label="Mesas cobradas" value={sales.length} icon="mesas" color="var(--accent2)" />
        <Stat label="Ticket promedio" value={sales.length ? COP(Math.round(total / sales.length)) : '$0'} icon="receipt" color="var(--yellow)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start', marginBottom: 16 }}>
        <div className="card chart">
          <div className="chart-h">Ventas por hora</div>
          <Bars data={bars.length ? bars : [{ h: '--', v: 0 }]} />
        </div>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 14 }}>Métodos de pago</div>
          <PayBars data={payData} total={total} />
        </div>
      </div>
    </div>
  );
}
