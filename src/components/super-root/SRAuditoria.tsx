'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chip } from '@/components/ui/Chip';
import { COP } from '@/lib/utils';

interface ReconRow {
  comercio_id: string;
  comercio_name: string;
  product_id: string;
  product_name: string;
  stock_actual: number;
  vendidas: number;
  descontadas: number;
  diff: number;
  valor: number;
}

export function SRAuditoria() {
  const [rows, setRows] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: cs } = await supabase.from('comercios').select('id, name').eq('status', 'activo');
    if (!cs) return;
    const recon: any[] = [];
    for (const c of cs) {
      const { data: prods } = await supabase.from('products').select('id, name, stock, price').eq('comercio_id', c.id);
      const { data: saleItems } = await supabase.from('sale_items').select('product_id, qty').in('product_id', (prods ?? []).map((p: any) => p.id));
      const vendMap: Record<string, number> = {};
      (saleItems ?? []).forEach((i: any) => { vendMap[i.product_id] = (vendMap[i.product_id] ?? 0) + i.qty; });
      for (const p of prods ?? []) {
        const v = vendMap[p.id] ?? 0;
        recon.push({ comercio_id: c.id, comercio_name: c.name, product_id: p.id, product_name: p.name, stock_actual: p.stock, vendidas: v, diff: 0, valor: 0 });
      }
    }
    setRows(recon);
  }

  const discrepancias = rows.filter(r => r.diff !== 0);

  const semaforo = (diff: number) => {
    if (diff === 0) return 'var(--green)';
    if (Math.abs(diff) <= 2) return 'var(--yellow)';
    return 'var(--red)';
  };

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Auditoría de inventario</h2>
          <p className="muted" style={{ fontSize: 13 }}>Cuadre ventas vs salidas de inventario por comercio</p>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: 24, textAlign: 'center' }}>Cargando datos de auditoría…</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Comercio</th><th>Producto</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Vendidas</th><th>Cuadre</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="muted" style={{ fontSize: 12 }}>{r.comercio_name}</td>
                  <td><b>{r.product_name}</b></td>
                  <td style={{ textAlign: 'right' }}>{r.stock_actual}</td>
                  <td style={{ textAlign: 'right' }}>{r.vendidas}</td>
                  <td>
                    <Chip color={semaforo(r.diff)}>
                      {r.diff === 0 ? '✓ OK' : r.diff > 0 ? `+${r.diff} sobrante` : `${r.diff} faltante`}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
