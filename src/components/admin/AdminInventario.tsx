'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Stat } from '@/components/ui/Stat';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk, exportCSV } from '@/lib/utils';
import type { Product } from '@/types/db';

/* ── Category colors ────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  licor: 'var(--accent)',    bebida: 'var(--accent2)',
  coctel: 'var(--accent3)',  cóctel: 'var(--accent3)',
  snack: 'var(--yellow)',    cigarro: 'var(--muted)',
  cigarrillos: 'var(--muted)',
};

function catColor(cat: string): string {
  const key = cat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CAT_COLORS[cat.toLowerCase()] ?? CAT_COLORS[key] ?? 'var(--accent2)';
}

function stockColor(stock: number, min: number): string {
  if (stock === 0 || (min > 0 && stock <= min)) return 'var(--red)';
  if (min > 0 && stock <= min * 2) return 'var(--orange)';
  return 'var(--green)';
}

interface AdminInventarioProps {
  comercioId: string;
  comercioName?: string;
}

export function AdminInventario({ comercioId, comercioName = 'Comercio' }: AdminInventarioProps) {
  const toast = useToast();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [cat,        setCat]        = useState('all');
  const [q,          setQ]          = useState('');
  const [editing,    setEditing]    = useState<Product | null>(null);
  const [adding,     setAdding]     = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [form, setForm] = useState({
    name: '', cat: '', sub: '', dist: '', unit: '',
    cost: '', price: '', stock: '', min_stock: '',
  });
  const exportRef = useRef<HTMLDivElement>(null);
  const supabase  = createClient();

  useEffect(() => { load(); }, [comercioId]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExport]);

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .order('name');
    setProducts((data ?? []) as Product[]);
  }

  /* ── KPIs ──────────────────────────────────────────────── */
  const lowStock   = useMemo(() => products.filter(p => p.min_stock > 0 && p.stock <= p.min_stock), [products]);
  const stockValue = useMemo(() => products.reduce((s, p) => s + p.cost * p.stock, 0), [products]);

  /* ── Filtered list ─────────────────────────────────────── */
  const cats     = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.cat)))], [products]);
  const filtered = useMemo(() => products.filter(p =>
    (cat === 'all' || p.cat === cat) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  ), [products, cat, q]);

  /* ── CRUD ──────────────────────────────────────────────── */
  async function saveProduct() {
    const p = {
      name: form.name, cat: form.cat, sub: form.sub || null,
      dist: form.dist || null, unit: form.unit || null,
      cost: Number(form.cost), price: Number(form.price),
      stock: Number(form.stock), min_stock: Number(form.min_stock),
    };
    if (editing) {
      await supabase.from('products').update(p).eq('id', editing.id);
      toast('Producto actualizado', 'check');
    } else {
      await supabase.from('products').insert({
        ...p,
        comercio_id: comercioId,
        initial_stock: p.stock,
      });
      toast('Producto creado', 'check');
    }
    setEditing(null); setAdding(false);
    await load();
  }

  async function doRestock() {
    if (!restocking || !restockQty) return;
    await supabase.from('products').update({ stock: restocking.stock + Number(restockQty) }).eq('id', restocking.id);
    toast(`${restocking.name} +${restockQty}`, 'check');
    setRestocking(null); setRestockQty('');
    await load();
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Eliminar ${product.name} del inventario`)) return;
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', product.id);
    if (error) {
      toast('No se pudo eliminar el producto', 'alert');
      return;
    }
    toast('Producto eliminado', 'check');
    await load();
  }

  function openEdit(p: Product) {
    setForm({ name: p.name, cat: p.cat, sub: p.sub ?? '', dist: p.dist ?? '', unit: p.unit ?? '', cost: String(p.cost), price: String(p.price), stock: String(p.stock), min_stock: String(p.min_stock) });
    setEditing(p);
  }

  /* ── Exports ───────────────────────────────────────────── */
  function doExportCSV() {
    const header = ['Producto', 'Categoría', 'Distribuidor', 'Stock', 'Costo', 'Precio', 'Ganancia'];
    const rows = filtered.map(p => [p.name, p.cat, p.dist ?? '', p.stock, p.cost, p.price, p.price - p.cost]);
    exportCSV('inventario-floorux.csv', [
      [`FloorUX CRM - OperUX · Inventario — ${comercioName}`],
      ['© 2026 mrzlabs · Todos los derechos reservados'],
      header,
      ...rows,
    ]);
  }

  function doExportExcel() {
    const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cell = (v: string | number, type = 'String') =>
      `<Cell><Data ss:Type="${type}">${esc(v)}</Data></Cell>`;
    const headers = ['Producto', 'Categoría', 'Distribuidor', 'Stock', 'Costo', 'Precio', 'Ganancia'];
    const dataRows = filtered.map(p => [
      p.name, p.cat, p.dist ?? '', p.stock, p.cost, p.price, p.price - p.cost,
    ]);
    const xmlRows = dataRows.map(row =>
      '<Row>' + row.map((v, i) => cell(v, i >= 3 ? 'Number' : 'String')).join('') + '</Row>'
    ).join('\n   ');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Inventario">
  <Table>
   <Row><Cell ss:MergeAcross="6"><Data ss:Type="String">FloorUX CRM - OperUX · Inventario</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">© 2026 mrzlabs</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Generado: ${new Date().toLocaleString('es-CO')}</Data></Cell></Row>
   <Row>${headers.map(h => cell(h)).join('')}</Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventario-floorux.xls';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function printPDF() {
    const pid = 'print-inventory';
    document.getElementById(pid)?.remove();
    const date = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const trows = filtered.map(p => `
      <tr style="border-bottom:1px solid #e5e5e5">
        <td style="padding:5px 8px">${p.name}${p.unit ? ` <span style="color:#999;font-size:10px">(${p.unit})</span>` : ''}</td>
        <td style="padding:5px 8px;color:#666">${p.cat}</td>
        <td style="padding:5px 8px;color:#666">${p.dist ?? '—'}</td>
        <td style="padding:5px 8px;text-align:right">${p.stock}</td>
        <td style="padding:5px 8px;text-align:right;color:#666">$${p.cost.toLocaleString('es-CO')}</td>
        <td style="padding:5px 8px;text-align:right;font-weight:700">$${p.price.toLocaleString('es-CO')}</td>
        <td style="padding:5px 8px;text-align:right;color:#16a34a">$${(p.price - p.cost).toLocaleString('es-CO')}</td>
      </tr>`).join('');

    // SVG de Maylo hardcodeado
    const MAYLO_SVG_B64 = (() => {
      const svg = `<svg viewBox="0 0 260 332" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="wbody" x1=".2" y1="0" x2=".8" y2="1">
            <stop offset="0" stop-color="#897CEC"/>
            <stop offset=".6" stop-color="#6E61D8"/>
            <stop offset="1" stop-color="#493BA6"/>
          </linearGradient>
          <linearGradient id="whead" x1=".2" y1="0" x2=".7" y2="1">
            <stop offset="0" stop-color="#9A8EF7"/>
            <stop offset=".55" stop-color="#6E61D8"/>
            <stop offset="1" stop-color="#493BA6"/>
          </linearGradient>
          <radialGradient id="wjoint" cx=".35" cy=".3" r=".8">
            <stop offset="0" stop-color="#B8AFF6"/>
            <stop offset="1" stop-color="#46399A"/>
          </radialGradient>
          <radialGradient id="wiris" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#FFE680"/>
            <stop offset=".55" stop-color="#F5C400"/>
            <stop offset="1" stop-color="#C99A00"/>
          </radialGradient>
          <linearGradient id="wvisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2C2560"/>
            <stop offset="1" stop-color="#0A0722"/>
          </linearGradient>
        </defs>
        <ellipse cx="130" cy="320" rx="80" ry="13" fill="#000" opacity=".35"/>
        <rect x="102" y="250" width="18" height="34" rx="9" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="140" y="250" width="18" height="34" rx="9" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="89" y="296" width="42" height="20" rx="9" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="129" y="296" width="42" height="20" rx="9" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="61" y="184" width="22" height="42" rx="11" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="177" y="184" width="22" height="42" rx="11" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <circle cx="72" cy="184" r="13" fill="url(#wjoint)" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="188" cy="184" r="13" fill="url(#wjoint)" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="72" cy="230" r="14" fill="url(#wjoint)" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="188" cy="230" r="14" fill="url(#wjoint)" stroke="#150D3A" stroke-width="2.4"/>
        <rect x="106" y="150" width="48" height="26" rx="11" fill="url(#wjoint)" stroke="#150D3A" stroke-width="3"/>
        <rect x="64" y="168" width="132" height="94" rx="38" fill="url(#wbody)" stroke="#150D3A" stroke-width="3"/>
        <rect x="92" y="194" width="76" height="40" rx="12" fill="url(#wvisor)" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="108" cy="220" r="5" fill="#27C3D8"/>
        <rect x="120" y="215" width="11" height="10" rx="5" fill="#F5C400"/>
        <circle cx="144" cy="220" r="5" fill="#5A82EE"/>
        <rect x="126" y="8" width="8" height="26" rx="4" fill="url(#wjoint)" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="130" cy="9" r="6.5" fill="#27C3D8"/>
        <circle cx="48" cy="98" r="11" fill="#9DA2D8" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="48" cy="98" r="4.5" fill="#27C3D8"/>
        <circle cx="212" cy="98" r="11" fill="#9DA2D8" stroke="#150D3A" stroke-width="2.4"/>
        <circle cx="212" cy="98" r="4.5" fill="#5A82EE"/>
        <rect x="38" y="76" width="16" height="44" rx="8" fill="#9DA2D8" stroke="#150D3A" stroke-width="2.4"/>
        <rect x="206" y="76" width="16" height="44" rx="8" fill="#9DA2D8" stroke="#150D3A" stroke-width="2.4"/>
        <rect x="44" y="30" width="172" height="122" rx="46" fill="url(#whead)" stroke="#150D3A" stroke-width="3"/>
        <ellipse cx="96" cy="48" rx="60" ry="26" fill="#fff" opacity=".14"/>
        <rect x="58" y="50" width="144" height="86" rx="36" fill="url(#wvisor)" stroke="#150D3A" stroke-width="3"/>
        <circle cx="100" cy="92" r="30" fill="#585CA0" stroke="#150D3A" stroke-width="3"/>
        <circle cx="100" cy="92" r="21" fill="#0B0822"/>
        <circle cx="100" cy="92" r="16" fill="url(#wvisor)"/>
        <circle cx="100" cy="92" r="11" fill="url(#wiris)"/>
        <circle cx="100" cy="92" r="6" fill="#0B0822"/>
        <circle cx="91" cy="83" r="5" fill="#fff" opacity=".85"/>
        <circle cx="160" cy="92" r="30" fill="#585CA0" stroke="#150D3A" stroke-width="3"/>
        <circle cx="160" cy="92" r="21" fill="#0B0822"/>
        <circle cx="160" cy="92" r="16" fill="url(#wvisor)"/>
        <circle cx="160" cy="92" r="11" fill="url(#wiris)"/>
        <circle cx="160" cy="92" r="6" fill="#0B0822"/>
        <circle cx="151" cy="83" r="5" fill="#fff" opacity=".85"/>
        <rect x="120" y="84" width="20" height="16" rx="8" fill="#9DA2D8" stroke="#150D3A" stroke-width="2.4"/>
      </svg>`;
      try {
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      } catch {
        return '';
      }
    })();

    const div = document.createElement('div');
    div.id = pid;
    div.innerHTML = `
      <div style="position:relative;font-family:system-ui,sans-serif;padding:28px;color:#111">
        <img src="${MAYLO_SVG_B64}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;opacity:.06;pointer-events:none;user-select:none;z-index:0" />
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:2px solid #111;padding-bottom:14px">
          <div>
            <div style="font-size:24px;font-weight:900">FloorUX<span style="color:#7F77DD">.</span></div>
            <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.12em;margin-top:2px">OperUX · CRM</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700">Inventario · ${comercioName}</div>
            <div style="font-size:11px;color:#666;margin-top:2px">${date}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:2px solid #111">
              ${['Producto','Categoría','Distribuidor','Stock','Costo','Precio','Ganancia'].map(h => `<th style="text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${trows}</tbody>
        </table>
        <div style="margin-top:28px;text-align:center;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:10px">
          © 2026 mrzlabs · Todos los derechos reservados
        </div>
      </div>`;
    document.body.appendChild(div);
    window.print();
    setTimeout(() => div.remove(), 1500);
  }

  return (
    <>
      {/* Print styles — ocultan todo excepto el div de impresión */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(#print-inventory) { display:none!important }
          #print-inventory { display:block!important }
        }
        #print-inventory { display:none }
      `}} />

      <div>
        {/* ─── KPIs ───────────────────────────────────── */}
        <div className="grid g3" style={{ marginBottom: 14 }}>
          <Stat label="Productos" value={products.length} icon="box" color="var(--accent)" />
          <Stat label="Valor del inventario" value={COPk(stockValue)} icon="cash" color="var(--accent2)" sub="a precio de costo" />
          <Stat label="En alerta de stock" value={lowStock.length} icon="alert" color={lowStock.length > 0 ? 'var(--red)' : 'var(--green)'} />
        </div>

        {/* ─── Banner alerta ──────────────────────────── */}
        {lowStock.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14,
            background: 'color-mix(in srgb, var(--red) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
            borderLeft: '3px solid var(--red)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <span style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }}><Icon name="alert" s={16} /></span>
            <div style={{ fontSize: 13 }}>
              <b style={{ color: 'var(--red)' }}>Reponer pronto: </b>
              <span className="muted">
                {lowStock.map(p => `${p.name} (${p.stock})`).join(' · ')}
              </span>
            </div>
          </div>
        )}

        {/* ─── Filtros + acciones ─────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="searchbox" style={{ flex: '1 1 180px', minWidth: 150 }}>
            <Icon name="search" s={16} />
            <input placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c}
                type="button"
                className={'fchip' + (cat === c ? ' on' : '')}
                onClick={() => setCat(c)}
                style={cat === c ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#0b0a12' } : undefined}>
                {c === 'all' ? 'Todas' : c}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {/* Exportar */}
            <div ref={exportRef} style={{ position: 'relative' }}>
              <button className="btn sm ghost" onClick={() => setShowExport(e => !e)}>
                <Icon name="download" s={14} /> Exportar
                <span style={{ display: 'inline-flex', marginLeft: 2, opacity: 0.6 }}><Icon name="chevd" s={11} /></span>
              </button>
              {showExport && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 60,
                  background: 'var(--panel)', border: '1px solid var(--line)',
                  borderRadius: 10, overflow: 'hidden', minWidth: 130,
                  boxShadow: '0 8px 24px rgba(0,0,0,.3)',
                }}>
                  {([['CSV', doExportCSV], ['Excel (XLSX)', doExportExcel], ['PDF', printPDF]] as const).map(([label, fn]) => (
                    <button key={label} className="nav-i" style={{ width: '100%', justifyContent: 'flex-start', padding: '9px 14px', fontSize: 13 }}
                      onClick={() => { fn(); setShowExport(false); }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Nuevo producto */}
            <button className="btn pri" onClick={() => {
              setForm({ name: '', cat: '', sub: '', dist: '', unit: '', cost: '', price: '', stock: '', min_stock: '0' });
              setAdding(true);
            }}>
              <Icon name="plus" s={15} /> Nuevo producto
            </button>
          </div>
        </div>

        {/* ─── Tabla ──────────────────────────────────── */}
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Distribuidor</th>
                <th>Stock</th>
                <th style={{ textAlign: 'right' }}>Costo</th>
                <th style={{ textAlign: 'right' }}>Precio</th>
                <th style={{ textAlign: 'right' }}>Ganancia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 13 }}>Sin productos</td></tr>
              )}
              {filtered.map((p, i) => {
                const maxRef  = Math.max(p.initial_stock || 1, p.min_stock * 5 || 1, p.stock, 1);
                const pct     = Math.min(100, Math.max(0, (p.stock / maxRef) * 100));
                const sColor  = stockColor(p.stock, p.min_stock);
                const ganancia = p.price - p.cost;
                return (
                  <tr key={p.id} style={i % 2 === 1 ? { background: 'var(--panel2)' } : undefined}>
                    <td style={{ minWidth: 160 }}>
                      <b style={{ fontSize: 13 }}>{p.name}</b>
                      {p.unit && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{p.unit}</div>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                        borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: catColor(p.cat) + '22', color: catColor(p.cat),
                      }}>
                        {p.cat}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 13 }}>{p.dist ?? '—'}</td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: sColor, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sColor, minWidth: 24, textAlign: 'right' }}>
                          {p.stock}
                        </span>
                      </div>
                      {p.min_stock > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>mín {p.min_stock}</div>
                      )}
                    </td>
                    <td className="muted" style={{ textAlign: 'right', fontSize: 13 }}>{COP(p.cost)}</td>
                    <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{COP(p.price)}</td>
                    <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {COP(ganancia)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn sm" style={{ fontSize: 11 }}
                          onClick={() => { setRestocking(p); setRestockQty(''); }}
                          title="Reabastecer">
                          <Icon name="plus" s={13} /> Abastecer
                        </button>
                        <button className="btn sm ghost" onClick={() => openEdit(p)} title="Editar">
                          <Icon name="edit" s={13} />
                        </button>
                        <button className="btn sm ghost" onClick={() => removeProduct(p)} title="Eliminar">
                          <Icon name="trash" s={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Modal crear/editar ──────────────────────── */}
        {(adding || editing) && (
          <Modal
            title={editing ? `Editar: ${editing.name}` : 'Nuevo producto'}
            icon="box"
            onClose={() => { setAdding(false); setEditing(null); }}
            footer={
              <>
                <button className="btn ghost" onClick={() => { setAdding(false); setEditing(null); }}>Cancelar</button>
                <button className="btn pri block" onClick={saveProduct}><Icon name="check" /> Guardar</button>
              </>
            }>
            <div className="row2">
              <Field label="Nombre"><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
              <Field label="Categoría"><input className="inp" value={form.cat} placeholder="Licor, Bebida…" onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} /></Field>
            </div>
            <div className="row2">
              <Field label="Subcategoría"><input className="inp" value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} /></Field>
              <Field label="Distribuidor"><input className="inp" value={form.dist} onChange={e => setForm(f => ({ ...f, dist: e.target.value }))} /></Field>
            </div>
            <Field label="Unidad de venta"><input className="inp" value={form.unit} placeholder="Botella, Copa, Unidad…" onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></Field>
            <div className="row2">
              <Field label="Costo ($)"><input className="inp" type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></Field>
              <Field label="Precio venta ($)"><input className="inp" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
            </div>
            <div className="row2">
              <Field label="Stock inicial"><input className="inp" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></Field>
              <Field label="Mínimo (alerta)"><input className="inp" type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} /></Field>
            </div>
          </Modal>
        )}

        {/* ─── Modal reabastecer ───────────────────────── */}
        {restocking && (
          <Modal
            title={`Reabastecer · ${restocking.name}`}
            icon="box"
            onClose={() => setRestocking(null)}
            footer={
              <>
                <button className="btn ghost" onClick={() => setRestocking(null)}>Cancelar</button>
                <button className="btn pri block" disabled={!restockQty || Number(restockQty) <= 0} onClick={doRestock}>
                  <Icon name="check" /> Reabastecer
                </button>
              </>
            }>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{restocking.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Stock actual: <b style={{ color: stockColor(restocking.stock, restocking.min_stock) }}>{restocking.stock}</b>
                  {restocking.min_stock > 0 && ` · mín ${restocking.min_stock}`}
                </div>
              </div>
            </div>
            <Field label="Cantidad a agregar">
              <input className="inp" type="number" autoFocus value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doRestock()} />
            </Field>
            {restockQty && Number(restockQty) > 0 && (
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Stock resultante: <b style={{ color: 'var(--green)' }}>{restocking.stock + Number(restockQty)}</b>
              </p>
            )}
          </Modal>
        )}
      </div>
    </>
  );
}
