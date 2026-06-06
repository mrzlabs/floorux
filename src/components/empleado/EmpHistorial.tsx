'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import React from 'react';
import { COP, COPk, presetRange } from '@/lib/utils';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import type { Sale, SaleItem } from '@/types/db';

interface EmpHistorialProps {
  empleadoId: string;
}

interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
  expanded?: boolean;
}

export function EmpHistorial({ empleadoId }: EmpHistorialProps) {
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [range, setRange] = useState(presetRange('7'));
  const supabase = createClient();

  useEffect(() => { load(); }, [empleadoId, range]);

  async function load() {
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('closed_by', empleadoId)
      .gte('closed_at', range.from + 'T00:00:00')
      .lte('closed_at', range.to + 'T23:59:59')
      .order('closed_at', { ascending: false });
    setSales((data ?? []) as SaleWithItems[]);
  }

  const total = sales.reduce((s, v) => s + v.total, 0);

  const toggle = (id: string) => setSales(s => s.map(x => x.id === id ? { ...x, expanded: !x.expanded } : x));

  return (
    <div>
      <ReportToolbar range={range} setRange={setRange} />
      <div className="grid g3" style={{ margin: '16px 0' }}>
        <Stat label="Ventas del período" value={COP(total)} icon="cash" color="var(--green)" />
        <Stat label="Mesas cobradas" value={sales.length} icon="mesas" color="var(--accent)" />
        <Stat label="Ticket promedio" value={sales.length ? COP(Math.round(total / sales.length)) : '$0'} icon="receipt" color="var(--accent2)" />
      </div>

      <div className="card">
        {sales.length === 0 ? (
          <p className="muted" style={{ padding: 24, textAlign: 'center' }}>Sin ventas en este período</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Fecha</th><th>Mesa</th><th style={{ textAlign: 'right' }}>Total</th><th>Pago</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <React.Fragment key={s.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggle(s.id)}>
                    <td className="muted">{new Date(s.closed_at).toLocaleDateString('es-CO')}</td>
                    <td>{s.mesa_name}{s.mesa_alias ? ` · ${s.mesa_alias}` : ''}</td>
                    <td className="tnum" style={{ textAlign: 'right' }}>{COP(s.total)}</td>
                    <td><span className="chip">{s.payment_method}</span></td>
                  </tr>
                  {s.expanded && s.sale_items.map(i => (
                    <tr key={i.id} style={{ background: 'var(--hover)' }}>
                      <td colSpan={2} style={{ paddingLeft: 32, color: 'var(--muted)', fontSize: 12 }}>{i.product_name}</td>
                      <td className="tnum" style={{ textAlign: 'right', fontSize: 12 }}>{i.qty} × {COP(i.unit_price)}</td>
                      <td className="tnum" style={{ fontSize: 12 }}>{COP(i.qty * i.unit_price)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
