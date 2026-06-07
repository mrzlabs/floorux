'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Icon } from '@/components/ui/Icon';
import React from 'react';
import { COP, presetRange } from '@/lib/utils';
import { ReportToolbar } from '@/components/ui/ReportToolbar';
import type { Shift } from '@/types/db';

interface EmpHistorialProps {
  empleadoId: string;
}

interface ShiftWithStats extends Shift {
  sales_count: number;
  total_sales: number;
}

interface ProductSummary {
  product_name: string;
  cat: string;
  cantidad: number;
  unit_price: number;
  total: number;
}

interface ShiftResumen {
  total_recaudado: number;
  metodo_pago_mas_usado: string;
  mesa_mayor_consumo: string;
  producto_mas_vendido: string;
}

export function EmpHistorial({ empleadoId }: EmpHistorialProps) {
  const [shifts, setShifts] = useState<ShiftWithStats[]>([]);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [productos, setProductos] = useState<Record<string, ProductSummary[]>>({});
  const [resumenes, setResumenes] = useState<Record<string, ShiftResumen>>({});
  const [range, setRange] = useState(presetRange('7'));
  const supabase = createClient();

  useEffect(() => { load(); }, [empleadoId, range]);

  async function load() {
    // Cargar turnos con estadísticas agregadas
    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('id, started_at, closed_at, status, comercio_id, empleado_id, created_at, updated_at')
      .eq('empleado_id', empleadoId)
      .eq('status', 'closed')
      .gte('closed_at', range.from + 'T00:00:00')
      .lte('closed_at', range.to + 'T23:59:59')
      .order('closed_at', { ascending: false });

    if (!shiftsData) {
      setShifts([]);
      return;
    }

    // Cargar estadísticas de ventas por turno
    const shiftsWithStats: ShiftWithStats[] = [];
    for (const shift of shiftsData) {
      const { data: salesData } = await supabase
        .from('sales')
        .select('total')
        .eq('shift_id', shift.id);

      const sales_count = salesData?.length ?? 0;
      const total_sales = salesData?.reduce((sum, s) => sum + s.total, 0) ?? 0;

      shiftsWithStats.push({
        ...shift,
        sales_count,
        total_sales,
      });
    }

    setShifts(shiftsWithStats);
  }

  async function toggleShift(shiftId: string) {
    if (expandedShift === shiftId) {
      setExpandedShift(null);
      return;
    }

    // Cargar productos vendidos en ese turno
    const { data: productData } = await supabase.rpc('get_shift_products', {
      p_shift_id: shiftId,
    });

    if (!productData) {
      // Fallback: query manual
      const { data } = await supabase
        .from('sale_items')
        .select(`
          product_name,
          qty,
          unit_price,
          sales!inner(shift_id)
        `)
        .eq('sales.shift_id', shiftId);

      if (data) {
        const grouped: Record<string, ProductSummary> = {};
        for (const item of data as any[]) {
          const key = `${item.product_name}-${item.unit_price}`;
          if (!grouped[key]) {
            grouped[key] = {
              product_name: item.product_name,
              cat: '',
              cantidad: 0,
              unit_price: item.unit_price,
              total: 0,
            };
          }
          grouped[key].cantidad += item.qty;
          grouped[key].total += item.qty * item.unit_price;
        }

        setProductos(prev => ({
          ...prev,
          [shiftId]: Object.values(grouped).sort((a, b) => b.total - a.total),
        }));
      }
    } else {
      setProductos(prev => ({ ...prev, [shiftId]: productData }));
    }

    // Cargar resumen del turno
    const { data: salesData } = await supabase
      .from('sales')
      .select('total, payment_method, mesa_name, mesa_alias')
      .eq('shift_id', shiftId);

    if (salesData) {
      const total_recaudado = salesData.reduce((s, v) => s + v.total, 0);

      // Método de pago más usado
      const paymentCounts: Record<string, number> = {};
      for (const sale of salesData) {
        paymentCounts[sale.payment_method] = (paymentCounts[sale.payment_method] ?? 0) + 1;
      }
      const metodo_pago_mas_usado = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

      // Mesa con mayor consumo
      const mesaTotals: Record<string, number> = {};
      for (const sale of salesData) {
        const mesaKey = sale.mesa_name;
        mesaTotals[mesaKey] = (mesaTotals[mesaKey] ?? 0) + sale.total;
      }
      const mesa_mayor_consumo = Object.entries(mesaTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

      // Producto más vendido (del array de productos ya cargado)
      const prods = productos[shiftId] ?? [];
      const producto_mas_vendido = prods[0]?.product_name ?? '—';

      setResumenes(prev => ({
        ...prev,
        [shiftId]: {
          total_recaudado,
          metodo_pago_mas_usado,
          mesa_mayor_consumo,
          producto_mas_vendido,
        },
      }));
    }

    setExpandedShift(shiftId);
  }

  const totalRecaudado = shifts.reduce((s, v) => s + v.total_sales, 0);
  const totalVentas = shifts.reduce((s, v) => s + v.sales_count, 0);

  return (
    <div>
      <ReportToolbar range={range} setRange={setRange} />
      <div className="grid g3" style={{ margin: '16px 0' }}>
        <Stat label="Total del período" value={COP(totalRecaudado)} icon="cash" color="var(--green)" />
        <Stat label="Turnos cerrados" value={shifts.length} icon="clock" color="var(--accent)" />
        <Stat label="Ventas totales" value={totalVentas} icon="mesas" color="var(--accent2)" />
      </div>

      <div className="card">
        {shifts.length === 0 ? (
          <p className="muted" style={{ padding: 24, textAlign: 'center' }}>Sin turnos cerrados en este período</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Inicio - Fin</th>
                <th>Mesas</th>
                <th style={{ textAlign: 'right' }}>Recaudo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => {
                const isExpanded = expandedShift === shift.id;
                const prods = productos[shift.id] ?? [];
                const resumen = resumenes[shift.id];

                return (
                  <React.Fragment key={shift.id}>
                    <tr
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : undefined,
                        borderLeft: isExpanded ? '3px solid var(--accent)' : undefined,
                      }}
                      onClick={() => toggleShift(shift.id)}
                    >
                      <td className="muted" style={{ fontSize: 13 }}>
                        {new Date(shift.closed_at!).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(shift.started_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {shift.closed_at && new Date(shift.closed_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 13 }}>{shift.sales_count}</td>
                      <td className="tnum" style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                        {COP(shift.total_sales)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Icon
                          name="chev"
                          s={16}
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </td>
                    </tr>

                    {/* Fila expandida con productos y resumen */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div style={{ background: 'var(--panel2)', padding: 20, borderTop: '1px solid var(--line)' }}>
                            {/* Resumen del turno */}
                            {resumen && (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                  gap: 12,
                                  marginBottom: 20,
                                }}
                              >
                                <div className="card" style={{ padding: 14 }}>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Total recaudado</div>
                                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                                    {COP(resumen.total_recaudado)}
                                  </div>
                                </div>
                                <div className="card" style={{ padding: 14 }}>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Método más usado</div>
                                  <div style={{ fontSize: 14, fontWeight: 700 }}>{resumen.metodo_pago_mas_usado}</div>
                                </div>
                                <div className="card" style={{ padding: 14 }}>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Mesa mayor consumo</div>
                                  <div style={{ fontSize: 14, fontWeight: 700 }}>{resumen.mesa_mayor_consumo}</div>
                                </div>
                                <div className="card" style={{ padding: 14 }}>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Producto más vendido</div>
                                  <div style={{ fontSize: 14, fontWeight: 700 }}>{resumen.producto_mas_vendido}</div>
                                </div>
                              </div>
                            )}

                            {/* Tabla de productos */}
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.06em' }}>
                              Productos vendidos
                            </div>
                            {prods.length === 0 ? (
                              <p className="muted" style={{ fontSize: 13, padding: 12 }}>Sin productos registrados</p>
                            ) : (
                              <table className="tbl" style={{ fontSize: 13 }}>
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th style={{ textAlign: 'right' }}>Precio unit.</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prods.map((p, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                                        {p.cat && (
                                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.cat}</div>
                                        )}
                                      </td>
                                      <td>{p.cantidad}</td>
                                      <td className="tnum" style={{ textAlign: 'right' }}>{COP(p.unit_price)}</td>
                                      <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>{COP(p.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                              <button className="btn sm" onClick={() => setExpandedShift(null)}>
                                <Icon name="chevd" s={14} style={{ transform: 'rotate(180deg)' }} /> Colapsar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
