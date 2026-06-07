'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { Bars } from '@/components/ui/Bars';
import { Donut } from '@/components/ui/Donut';
import { Icon } from '@/components/ui/Icon';
import { COP, COPk } from '@/lib/utils';
import type { Sale, Product, SaleItem } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: '#34d399' },
  { id: 'transferencia', name: 'Transferencia', color: '#5A82EE' },
  { id: 'qr', name: 'QR', color: '#B57BE0' },
  { id: 'datafono', name: 'Datáfono', color: '#27C3D8' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: '#F5C400' },
];

const CAT_COLORS: Record<string, string> = {
  licor: 'var(--accent)',
  bebida: 'var(--accent2)',
  coctel: 'var(--accent3)',
  'cóctel': 'var(--accent3)',
  snack: 'var(--yellow)',
  cigarro: 'var(--muted)',
};

const catColor = (c: string) => CAT_COLORS[c.toLowerCase()] ?? 'var(--accent2)';

type ProductoVendido = {
  id: string;
  name: string;
  cat: string;
  sub: string | null;
  cantidad: number;
  total: number;
};

type AlertaStock = {
  name: string;
  stock: number;
  min_stock: number;
  cat: string;
};

interface AdminResumenProps {
  comercioId: string;
}

export function AdminResumen({ comercioId }: AdminResumenProps) {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [mesasActivas, setMesasActivas] = useState(0);
  const [mesasTotales, setMesasTotales] = useState(0);
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([]);
  const [alertasStock, setAlertasStock] = useState<AlertaStock[]>([]);
  const supabase = createClient();

  // Cargar mesas
  async function loadMesas() {
    const { data: mesas } = await supabase
      .from('mesas')
      .select('id, status')
      .eq('comercio_id', comercioId);

    if (mesas) {
      setMesasTotales(mesas.length);
      setMesasActivas(mesas.filter(m => m.status === 'ocupada').length);
    }
  }

  // Cargar productos vendidos hoy
  async function loadProductosVendidos() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sale_items')
      .select(`
        qty,
        unit_price,
        product:products!inner(id, name, cat, sub),
        sale:sales!inner(comercio_id, closed_at)
      `)
      .eq('sale.comercio_id', comercioId)
      .gte('sale.closed_at', today + 'T00:00:00')
      .lte('sale.closed_at', today + 'T23:59:59');

    if (data) {
      const grouped: Record<string, ProductoVendido> = {};
      data.forEach((item: any) => {
        const prod = item.product;
        if (!prod) return;
        if (!grouped[prod.id]) {
          grouped[prod.id] = {
            id: prod.id,
            name: prod.name,
            cat: prod.cat,
            sub: prod.sub,
            cantidad: 0,
            total: 0,
          };
        }
        grouped[prod.id].cantidad += item.qty;
        grouped[prod.id].total += item.qty * item.unit_price;
      });

      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10);
      setProductosVendidos(sorted);
    }
  }

  // Cargar alertas de stock
  async function loadAlertasStock() {
    const { data } = await supabase
      .from('products')
      .select('name, stock, min_stock, cat')
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .gt('min_stock', 0)
      .order('stock', { ascending: true });

    if (data) {
      const alertas = data.filter((p: any) => p.stock <= p.min_stock);
      setAlertasStock(alertas);
    }
  }

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase.from('sales').select('*').eq('comercio_id', comercioId)
      .gte('closed_at', today + 'T00:00:00').order('closed_at')
      .then(({ data }) => setSales((data ?? []) as Sale[]));

    supabase.from('products').select('*').eq('comercio_id', comercioId)
      .then(({ data }) => setLowStock((data ?? [] as Product[]).filter(p => p.min_stock > 0 && p.stock <= p.min_stock)));

    loadMesas();
    loadProductosVendidos();
    loadAlertasStock();

    // Realtime para mesas
    const mesasChannel = supabase
      .channel('mesas-resumen')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesas',
        filter: `comercio_id=eq.${comercioId}`,
      }, () => {
        loadMesas();
      })
      .subscribe();

    // Recargar alertas cada 5 minutos
    const alertasInterval = setInterval(() => {
      loadAlertasStock();
    }, 300000);

    return () => {
      mesasChannel.unsubscribe();
      clearInterval(alertasInterval);
    };
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
        <Stat
          label="Mesas activas"
          value={mesasActivas}
          icon="mesas"
          color="var(--accent2)"
          sub={`de ${mesasTotales} totales`}
        />
        <Stat label="Ticket promedio" value={COP(ticket)} icon="receipt" color="var(--accent3)" />
      </div>

      {/* Alertas de stock */}
      {alertasStock.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {/* Chips de alerta rápida */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {alertasStock.filter(p => p.stock === 0).map(p => (
              <Chip key={p.name} color="var(--red)">
                🔴 {p.name} AGOTADO
              </Chip>
            ))}
            {alertasStock.filter(p => p.stock > 0).slice(0, 3).map(p => (
              <Chip key={p.name} color="var(--yellow)">
                🟡 {p.name} ({p.stock} uds)
              </Chip>
            ))}
          </div>

          {/* Banner principal */}
          <div
            className="alert-banner"
            style={{
              background: 'color-mix(in srgb, var(--red) 12%, transparent)',
              borderLeft: '3px solid var(--red)',
              cursor: 'pointer',
            }}
            onClick={() => router.push('/admin/inventario')}
          >
            <span className="ai"><Icon name="alert" s={20} /></span>
            <div style={{ flex: 1, fontSize: 13.5 }}>
              <b>⚠️ Alerta de stock: {alertasStock.length} producto(s) por debajo del mínimo</b>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>
                {alertasStock.slice(0, 5).map(p => {
                  if (p.stock === 0) {
                    return <span key={p.name} style={{ color: 'var(--red)', fontWeight: 700 }}>{p.name} (AGOTADO), </span>;
                  }
                  return <span key={p.name} style={{ color: 'var(--yellow)' }}>{p.name} ({p.stock} uds), </span>;
                })}
                {alertasStock.length > 5 ? '...' : ''}
              </div>
            </div>
            <Chip color="var(--red)">Ver inventario</Chip>
          </div>
        </div>
      )}

      {/* Tabla de productos vendidos hoy */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Vendido hoy</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>PRODUCTO</th>
                <th>CATEGORÍA</th>
                <th style={{ textAlign: 'center' }}>CANTIDAD</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {productosVendidos.length > 0 ? (
                productosVendidos.map((p, i) => (
                  <tr
                    key={p.id}
                    style={i < 3 ? {
                      background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                    } : i % 2 === 1 ? { background: 'var(--panel2)' } : undefined}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        {p.sub && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.sub}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: catColor(p.cat) + '22',
                        color: catColor(p.cat),
                      }}>
                        {p.cat}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                      {p.cantidad}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                      {COP(p.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                    Sin ventas registradas hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
