'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { Bars } from '@/components/ui/Bars';
import { Donut } from '@/components/ui/Donut';
import { Icon } from '@/components/ui/Icon';
import { COP, COPk } from '@/lib/utils';
import type { Sale, Product } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: '#34d399' },
  { id: 'transferencia', name: 'Transferencia', color: '#5A82EE' },
  { id: 'qr', name: 'QR', color: '#B57BE0' },
  { id: 'datafono', name: 'Datáfono', color: '#27C3D8' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: '#F5C400' },
];

interface AdminResumenProps {
  comercioId: string;
}

export function AdminResumen({ comercioId }: AdminResumenProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase.from('sales').select('*').eq('comercio_id', comercioId)
      .gte('closed_at', today + 'T00:00:00').order('closed_at')
      .then(({ data }) => setSales((data ?? []) as Sale[]));

    supabase.from('products').select('*').eq('comercio_id', comercioId)
      .then(({ data }) => setLowStock((data ?? [] as Product[]).filter(p => p.min_stock > 0 && p.stock <= p.min_stock)));
  }, [comercioId]);

  const total = sales.reduce((s, v) => s + v.total, 0);
  const mesas = sales.length;
  const ticket = mesas ? Math.round(total / mesas) : 0;

  const hourlyMap: Record<number, number> = {};
  sales.forEach(s => {
    const h = new Date(s.closed_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + s.total;
  });
  const hourly = Array.from({ length: 24 }, (_, h) => ({ h: `${h}h`, v: hourlyMap[h] ?? 0 })).filter((_, h) => h >= 18 || h <= 5);

  const payMap: Record<string, number> = {};
  sales.forEach(s => { payMap[s.payment_method] = (payMap[s.payment_method] ?? 0) + s.total; });
  const donutData = PAYMENTS.map(p => ({ ...p, v: payMap[p.id] ?? 0 })).filter(p => p.v > 0);

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Stat label="Ventas de hoy" value={COP(total)} icon="cash" color="var(--green)" />
        <Stat label="Mesas atendidas" value={mesas} icon="mesas" color="var(--accent)" />
        <Stat label="Ticket promedio" value={COP(ticket)} icon="receipt" color="var(--accent2)" />
        <Stat label="Utilidad estimada" value={COP(total * 0.58)} icon="chart" color="var(--yellow)" />
      </div>

      {lowStock.length > 0 && (
        <div className="alert-banner">
          <span className="ai"><Icon name="alert" s={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}>
            <b>{lowStock.length} producto(s) en alerta de stock.</b>{' '}
            {lowStock.slice(0, 4).map(p => p.name).join(', ')}{lowStock.length > 4 ? '…' : ''}
          </div>
          <Chip color="var(--red)">Revisar inventario</Chip>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="card chart">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="chart-h">Ventas de la noche por hora</div>
            <span className="live"><i />En vivo</span>
          </div>
          <Bars data={hourly.length ? hourly : [{ h: '--', v: 0 }]} />
        </div>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 18 }}>Métodos de pago · hoy</div>
          <Donut center={COPk(total)} data={donutData.length ? donutData : [{ name: 'Sin datos', color: 'var(--muted)', v: 1 }]} />
        </div>
      </div>
    </div>
  );
}
