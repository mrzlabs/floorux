'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk, exportCSV, presetRange, rangeLabel, isoDate, parseISO, MES_ES } from '@/lib/utils';
import type { Sale, SaleItem, Product, Shift, Profile } from '@/types/db';

/* ── Constants ──────────────────────────────────────────── */
const PRESETS = ['hoy', 'ayer', '7', '30'] as const;
const PRESET_LABELS: Record<string, string> = { hoy: 'Hoy', ayer: 'Ayer', '7': '7 días', '30': '30 días' };

const NIGHT_HOURS = [20, 21, 22, 23, 0, 1, 2, 3];
const HOUR_LABELS: Record<number, string> = {
  20:'8pm',21:'9pm',22:'10pm',23:'11pm',0:'12am',1:'1am',2:'2am',3:'3am',
};

const PAYMENTS = [
  { id:'efectivo',      name:'Efectivo',         color:'var(--green)'   },
  { id:'transferencia', name:'Transferencia',     color:'var(--blue)'    },
  { id:'qr',            name:'QR',                color:'var(--accent3)' },
  { id:'datafono',      name:'Datáfono',          color:'var(--accent2)' },
  { id:'nequi',         name:'Nequi / Daviplata', color:'var(--yellow)'  },
];

const CAT_COLORS: Record<string, string> = {
  licor:'var(--accent)', bebida:'var(--accent2)', coctel:'var(--accent3)',
  'cóctel':'var(--accent3)', snack:'var(--yellow)', cigarro:'var(--muted)',
};
const catColor = (c: string) => CAT_COLORS[c.toLowerCase()] ?? 'var(--accent2)';

/* ── Helpers ──────────────────────────────────────��─────── */
function prevRange(r: { from: string; to: string }): { from: string; to: string } {
  const f = parseISO(r.from), t = parseISO(r.to);
  const days = Math.ceil((t.getTime() - f.getTime()) / 864e5) + 1;
  const pTo = new Date(f.getTime() - 864e5);
  const pFrom = new Date(pTo.getTime() - (days - 1) * 864e5);
  return { from: isoDate(pFrom), to: isoDate(pTo) };
}
const fmtTime = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }) : '—';
const fmtDateShort = (ts: string) => {
  const d = new Date(ts);
  return `${['dom','lun','mar','mié','jue','vie','sáb'][d.getDay()]} ${d.getDate()} ${MES_ES[d.getMonth()]}`;
};

/* ── Types ──────────────────────────────────────────────── */
type SaleWithItems = Sale & { sale_items: SaleItem[] };
type AuditRow = { id:string; name:string; cat:string; price:number; vendidas:number; descontadas:number; diferencia:number; valorRiesgo:number };
type EmpStat  = { id:string; name:string; color:string; mesas:number; recaudado:number };
type TopProd  = { id:string; name:string; cat:string; sub:string|null; cant:number; venta:number };
type ShiftRow = { id:string; label:string; mesas:number; total:number; emp_name:string };

interface AdminReportesProps {
  comercioId: string;
  comercioName: string;
}

/* ════════════════════════════════════════════════════════ */
export function AdminReportes({ comercioId, comercioName }: AdminReportesProps) {
  const toast = useToast();
  const [preset, setPreset] = useState<string>('hoy');
  const [range, setRange] = useState(presetRange('hoy'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [sales,      setSales]      = useState<SaleWithItems[]>([]);
  const [prevTotal,  setPrevTotal]  = useState(0);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [allSI,      setAllSI]      = useState<{ product_id: string; qty: number }[]>([]);
  const [shifts,     setShifts]     = useState<(Shift & { emp_name:string })[]>([]);
  const [employees,  setEmployees]  = useState<Profile[]>([]);

  const [auditSort, setAuditSort] = useState<{ k:string; asc:boolean }>({ k:'valorRiesgo', asc:false });
  const [topCat,    setTopCat]    = useState('all');
  const [empFilter, setEmpFilter] = useState('all');
  const [payFilters, setPayFilters] = useState<string[]>([]);
  const [liveAnimations, setLiveAnimations] = useState(false);
  const [topProdSort, setTopProdSort] = useState<{ k: string; asc: boolean }>({ k: 'venta', asc: false });

  const supabase = createClient();

  useEffect(() => { load(); }, [comercioId, range]);

  useEffect(() => {
    setLiveAnimations(preset === 'hoy');
  }, [preset]);

  async function load() {
    const fDT = `${range.from}T00:00:00`;
    const tDT = `${range.to}T23:59:59`;
    const pr  = prevRange(range);

    const [{ data: s }, { data: pv }, { data: pr2 }, { data: sh }, { data: em }] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*)').eq('comercio_id', comercioId).gte('closed_at', fDT).lte('closed_at', tDT).order('closed_at'),
      supabase.from('sales').select('total').eq('comercio_id', comercioId).gte('closed_at', pr.from + 'T00:00:00').lte('closed_at', pr.to + 'T23:59:59'),
      supabase.from('products').select('id,name,cat,price,initial_stock,stock').eq('comercio_id', comercioId).is('deleted_at', null),
      supabase.from('shifts').select('id,empleado_id,started_at,closed_at,status').eq('comercio_id', comercioId).gte('started_at', fDT).lte('started_at', tDT).order('started_at', { ascending: false }).limit(60),
      supabase.from('profiles').select('id,full_name,color').eq('comercio_id', comercioId).eq('role', 'empleado'),
    ]);

    const salesRows = (s ?? []) as SaleWithItems[];
    setSales(salesRows);
    setPrevTotal(((pv ?? []) as {total:number}[]).reduce((a, v) => a + v.total, 0));

    const prods = (pr2 ?? []) as Product[];
    setProducts(prods);
    setEmployees((em ?? []) as Profile[]);

    const empMap: Record<string, string> = {};
    ((em ?? []) as Profile[]).forEach(e => { empMap[e.id] = e.full_name; });

    setShifts(((sh ?? []) as Shift[]).map(s2 => ({
      ...s2,
      emp_name: empMap[s2.empleado_id] ?? '—',
    })));

    if (prods.length) {
      const { data: siAll } = await supabase.from('sale_items').select('product_id,qty').in('product_id', prods.map(p => p.id));
      setAllSI((siAll ?? []) as { product_id: string; qty: number }[]);
    }
  }

  /* ── Derived KPIs ───────────────────────────────────────── */
  const total  = useMemo(() => sales.reduce((a, v) => a + v.total, 0), [sales]);
  const cost   = useMemo(() => sales.reduce((a, v) => a + v.cost, 0), [sales]);
  const util   = total - cost;
  const margen = total ? Math.round(util / total * 100) : 0;
  const itemsCount = useMemo(() => sales.flatMap(s => s.sale_items).reduce((a, it) => a + it.qty, 0), [sales]);

  const trend = prevTotal > 0 ? Math.round((total - prevTotal) / prevTotal * 100) : 0;
  const costPct = total > 0 ? Math.round(cost / total * 100) : 0;

  /* ── Hourly chart ───────────────────────────────────────── */
  const hourlyData = useMemo(() => {
    const m: Record<number, number> = {};
    sales.forEach(s => { const h = new Date(s.closed_at).getHours(); m[h] = (m[h] ?? 0) + s.total; });
    return NIGHT_HOURS.map(h => ({ h, v: m[h] ?? 0 }));
  }, [sales]);
  const maxHourVal = Math.max(...hourlyData.map(d => d.v), 1);

  const topHours = useMemo(() => {
    const sorted = [...hourlyData].sort((a, b) => b.v - a.v);
    const top3 = sorted.slice(0, 3).map(d => d.h);
    return {
      first: top3[0],
      second: top3[1],
      third: top3[2],
    };
  }, [hourlyData]);

  const getHourRank = (hour: number, value: number) => {
    if (value === 0) return null;
    if (hour === topHours.first) return 1;
    if (hour === topHours.second) return 2;
    if (hour === topHours.third) return 3;
    return null;
  };

  /* ── Payment methods ────────────────────────────────────── */
  const payMap = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    sales.forEach(s => {
      if (!m[s.payment_method]) {
        m[s.payment_method] = { total: 0, count: 0 };
      }
      m[s.payment_method].total += s.total;
      m[s.payment_method].count += 1;
    });
    return m;
  }, [sales]);
  const payData  = PAYMENTS.map(p => ({
    ...p,
    v: payMap[p.id]?.total ?? 0,
    count: payMap[p.id]?.count ?? 0,
  }));
  const payTotal = payData.reduce((a, p) => a + p.v, 0);
  const filtPay  = payFilters.length === 0 ? payData : payData.filter(p => payFilters.includes(p.id));
  const maxPay   = Math.max(...payData.map(p => p.v), 1);

  const togglePayFilter = (method: string) => {
    setPayFilters(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  /* ── Inventory audit ────────────────────────────────────── */
  const auditRows = useMemo<AuditRow[]>(() => {
    const siByProd: Record<string, number> = {};
    allSI.forEach(si => { siByProd[si.product_id] = (siByProd[si.product_id] ?? 0) + si.qty; });
    return products.map(p => {
      const vendidas   = siByProd[p.id] ?? 0;
      const descontadas = p.initial_stock - p.stock;
      const diferencia = descontadas - vendidas;
      return { id: p.id, name: p.name, cat: p.cat, price: p.price, vendidas, descontadas, diferencia, valorRiesgo: Math.abs(diferencia) * p.price };
    });
  }, [products, allSI]);

  const totalRiesgo = useMemo(() => auditRows.filter(r => r.diferencia !== 0).reduce((a, r) => a + r.valorRiesgo, 0), [auditRows]);
  const descuadreCount = auditRows.filter(r => r.diferencia !== 0).length;

  const sortedAudit = useMemo(() => [...auditRows].sort((a, b) => {
    const va = (a as any)[auditSort.k], vb = (b as any)[auditSort.k];
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return auditSort.asc ? cmp : -cmp;
  }), [auditRows, auditSort]);

  const toggleAuditSort = (k: string) => setAuditSort(s => ({ k, asc: s.k === k ? !s.asc : false }));
  const aSuf = (k: string) => auditSort.k === k ? (auditSort.asc ? ' ↑' : ' ↓') : '';

  /* ── Top products ───────────────────────────────────────── */
  const topProducts = useMemo<TopProd[]>(() => {
    const m: Record<string, TopProd> = {};
    sales.flatMap(s => s.sale_items).forEach(si => {
      const prod = products.find(p => p.id === si.product_id);
      if (!prod) return;
      if (!m[prod.id]) m[prod.id] = { id: prod.id, name: prod.name, cat: prod.cat, sub: prod.sub, cant: 0, venta: 0 };
      m[prod.id].cant  += si.qty;
      m[prod.id].venta += si.qty * si.unit_price;
    });
    return Object.values(m);
  }, [sales, products]);

  const sortedTopProds = useMemo(() => {
    const sorted = [...topProducts].sort((a, b) => {
      if (topProdSort.k === 'cant') {
        return topProdSort.asc ? a.cant - b.cant : b.cant - a.cant;
      }
      return topProdSort.asc ? a.venta - b.venta : b.venta - a.venta;
    });
    return sorted;
  }, [topProducts, topProdSort]);

  const filtTopProds = useMemo(() => {
    const filtered = topCat === 'all' ? sortedTopProds : sortedTopProds.filter(p => p.cat === topCat);
    return filtered.slice(0, 10);
  }, [topCat, sortedTopProds]);

  const topCats = ['all', ...Array.from(new Set(topProducts.map(p => p.cat)))];

  const toggleTopProdSort = (key: string) => {
    setTopProdSort(prev =>
      prev.k === key ? { k: key, asc: !prev.asc } : { k: key, asc: false }
    );
  };

  /* ── Employee stats ─────────────────────────────────────── */
  const empStats = useMemo<EmpStat[]>(() => {
    const m: Record<string, EmpStat> = {};
    sales.forEach(sale => {
      const shift = shifts.find(sh => sh.id === sale.shift_id);
      if (!shift) return;
      const emp = employees.find(e => e.id === shift.empleado_id);
      if (!emp) return;
      if (!m[emp.id]) m[emp.id] = { id: emp.id, name: emp.full_name, color: emp.color, mesas: 0, recaudado: 0 };
      m[emp.id].mesas     += 1;
      m[emp.id].recaudado += sale.total;
    });
    return Object.values(m).sort((a, b) => b.recaudado - a.recaudado);
  }, [sales, shifts, employees]);

  const filtEmpStats = empFilter === 'all' ? empStats : empStats.filter(e => e.id === empFilter);

  /* ���─ Shift rows ─────────────────────────────────────────── */
  const shiftRows = useMemo<ShiftRow[]>(() =>
    shifts.map(sh => {
      const shiftSales = sales.filter(s => s.shift_id === sh.id);
      return {
        id: sh.id,
        label: `${fmtDateShort(sh.started_at)} · ${sh.emp_name} · ${fmtTime(sh.started_at)}–${fmtTime(sh.closed_at)}`,
        mesas: shiftSales.length,
        total: shiftSales.reduce((a, s) => a + s.total, 0),
        emp_name: sh.emp_name,
      };
    }).filter(s => s.mesas > 0).sort((a, b) => b.total - a.total)
  , [shifts, sales]);

  /* ─�� Exports ────────────────────────────────────────────── */
  function doCSV() {
    exportCSV(`reporte-${range.from}_${range.to}.csv`, [
      [`FloorUX CRM · Reporte de ventas — ${comercioName}`],
      [`Período: ${rangeLabel(range)}`],
      ['© 2026 mrzlabs · Todos los derechos reservados'],
      [],
      ['RESUMEN'],
      ['Ventas', total], ['Costo', cost], ['Utilidad', util], ['Margen %', margen],
      ['Mesas', sales.length], ['Ítems vendidos', itemsCount],
      [],
      ['MÉTODOS DE PAGO', 'Valor'],
      ...payData.map(p => [p.name, p.v]),
      [],
      ['TOP PRODUCTOS', 'Cant.', 'Venta'],
      ...topProducts.map(p => [p.name, p.cant, p.venta]),
    ]);
    toast('CSV descargado', 'check');
  }

  async function doPDF() {
    const pid = 'reporte-print';
    document.getElementById(pid)?.remove();

    // Capturar SVG de Maylo como base64
    let mayloSvg = '';
    try {
      // @ts-ignore
      if (typeof window.maylo === 'function') {
        // @ts-ignore
        const svg = window.maylo({ eyes: 'open', mouth: 'smile', arms: 'down', panel: false });
        mayloSvg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      }
    } catch (e) {
      console.warn('No se pudo capturar Maylo SVG:', e);
    }

    const hourBars = hourlyData.map(d => {
      const h = d.h;
      const pct = Math.round(d.v / maxHourVal * 100);
      const rank = getHourRank(h, d.v);
      const color = rank === 1 ? '#eab308' : rank === 2 ? '#7F77DD' : rank === 3 ? '#8b5cf6' : '#d1d5db';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <span style="font-size:9px;color:${rank ? '#7F77DD' : '#666'};font-weight:${rank ? 700 : 400}">${d.v > 0 ? '$'+Math.round(d.v/1000)+'K' : ''}</span>
        <div style="width:100%;background:#eee;border-radius:4px;overflow:hidden;height:80px;display:flex;align-items:flex-end">
          <div style="width:100%;background:${color};height:${pct}%;border-radius:4px 4px 0 0;min-height:2px"></div>
        </div>
        <span style="font-size:9px;color:${rank ? '#7F77DD' : '#999'};font-weight:${rank ? 700 : 400}">${HOUR_LABELS[h]??''}</span>
      </div>`;
    }).join('');

    const topRows = topProducts.slice(0, 10).map((p, i) =>
      `<tr style="border-bottom:1px solid #eee"><td style="padding:5px 8px">${i+1}. ${p.name}</td><td style="padding:5px 8px;text-align:center">${p.cant}</td><td style="padding:5px 8px;text-align:right;font-weight:700">$${Math.round(p.venta/1000)}K</td></tr>`
    ).join('');

    const auditPdf = auditRows.filter(r => r.diferencia !== 0).map(r =>
      `<tr style="border-bottom:1px solid #eee"><td style="padding:5px 8px">${r.name}</td><td style="padding:5px 8px">${r.cat}</td><td style="padding:5px 8px;text-align:right">${r.vendidas}</td><td style="padding:5px 8px;text-align:right">${r.descontadas}</td><td style="padding:5px 8px;text-align:right;color:${r.diferencia>0?'#f97316':'#ef4444'}">${r.diferencia>0?'+':''}${r.diferencia}</td><td style="padding:5px 8px;text-align:right;color:#ef4444;font-weight:700">$${Math.round(r.valorRiesgo/1000)}K</td></tr>`
    ).join('');

    const date = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });

    const watermark = mayloSvg
      ? `<img src="${mayloSvg}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;opacity:.06;pointer-events:none;user-select:none;z-index:0" />`
      : `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:180px;opacity:.03;font-weight:900;color:#7F77DD;pointer-events:none;user-select:none;white-space:nowrap">MAYLO</div>`;

    const div = document.createElement('div');
    div.id = pid;
    div.innerHTML = `
<div style="font-family:system-ui,sans-serif;color:#111;padding:0;position:relative">

<!-- PORTADA -->
<div style="page-break-after:always;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;position:relative">
  ${watermark}
  <div style="font-size:52px;font-weight:900;letter-spacing:-.02em">FloorUX<span style="color:#7F77DD">.</span></div>
  <div style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.18em;margin-top:6px">OperUX · CRM Nightlife</div>
  <div style="width:60px;height:3px;background:#7F77DD;border-radius:2px;margin:28px auto"></div>
  <div style="font-size:28px;font-weight:800;margin-top:4px">${comercioName}</div>
  <div style="font-size:16px;color:#444;margin-top:8px">Reporte de ventas · ${rangeLabel(range)}</div>
  <div style="font-size:13px;color:#888;margin-top:6px">${date}</div>
  <div style="margin-top:32px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.1em;border:1px solid #ddd;padding:6px 18px;border-radius:999px">Confidencial — uso interno</div>
</div>

<!-- S1: RESUMEN EJECUTIVO -->
<div style="page-break-after:always;padding:40px;position:relative">
  ${watermark}
  <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">Sección 1 — Resumen ejecutivo</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    ${[['Ventas del período', COP(total),'#7F77DD'],['Utilidad bruta',COP(util),'#27C3D8'],['Mesas cerradas',String(sales.length),'#B57BE0'],['Ítems vendidos',String(itemsCount),'#F5C400']].map(([l,v,c])=>`<div style="border-left:3px solid ${c};padding:12px 16px;background:#fafafa;border-radius:0 8px 8px 0"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em">${l}</div><div style="font-size:22px;font-weight:900;color:#111;margin-top:4px">${v}</div></div>`).join('')}
  </div>
  <div style="margin-bottom:6px;font-size:10px;color:#888">Balance del período</div>
  <div style="display:flex;height:20px;border-radius:6px;overflow:hidden">
    <div style="width:${costPct}%;background:#d1d5db;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#555">${costPct}%</div>
    <div style="width:${100-costPct}%;background:#7F77DD;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">${100-costPct}%</div>
  </div>
  <div style="display:flex;gap:24px;margin-top:10px;font-size:11px;color:#666">
    <span>● Ingresos: ${COP(total)}</span>
    <span>● Costo: ${COP(cost)}</span>
    <span style="color:#16a34a;font-weight:700">● Utilidad: ${COP(util)}</span>
  </div>
</div>

<!-- S2: VENTAS POR HORA + EMPLEADOS -->
<div style="page-break-after:always;padding:40px;position:relative">
  ${watermark}
  <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">Sección 2 — Análisis de ventas</h2>
  <div style="margin-bottom:4px;font-size:12px;font-weight:700">Ventas por hora</div>
  <div style="display:flex;gap:8px;align-items:flex-end;height:120px;margin-bottom:24px">${hourBars}</div>
  ${empStats.length ? `<div style="margin-bottom:4px;font-size:12px;font-weight:700">Ventas por empleado</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:2px solid #111"><th style="text-align:left;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Empleado</th><th style="text-align:right;padding:5px 8px;font-size:10px;text-transform:uppercase">Mesas</th><th style="text-align:right;padding:5px 8px;font-size:10px;text-transform:uppercase">Recaudado</th></tr></thead><tbody>${empStats.map(e=>`<tr style="border-bottom:1px solid #eee"><td style="padding:5px 8px">${e.name}</td><td style="padding:5px 8px;text-align:right">${e.mesas}</td><td style="padding:5px 8px;text-align:right;font-weight:700">${COP(e.recaudado)}</td></tr>`).join('')}</tbody></table>` : ''}
</div>

<!-- S3: INVENTARIO -->
<div style="page-break-after:always;padding:40px;position:relative">
  ${watermark}
  <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">Sección 3 — Cuadre de inventario</h2>
  ${auditPdf ? `<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="border-bottom:2px solid #111">${['Producto','Cat.','Vendidas','Salidas','Dif.','Valor riesgo'].map(h=>`<th style="text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}</tr></thead><tbody>${auditPdf}</tbody></table><div style="margin-top:12px;font-size:12px;font-weight:700;color:#ef4444">Total valor en riesgo: ${COP(totalRiesgo)}</div>` : '<p style="color:#888;font-size:13px">Inventario cuadra correctamente en el período.</p>'}
</div>

<!-- S4: PAGOS + TOP PRODUCTOS -->
<div style="padding:40px;position:relative">
  ${watermark}
  <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">Sección 4 — Métodos de pago · Top productos</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
    <div>
      <div style="font-size:12px;font-weight:700;margin-bottom:12px">Distribución por método</div>
      ${payData.filter(p=>p.v>0).map(p=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${p.name}</span><span style="font-weight:700">${COP(p.v)}</span></div><div style="height:8px;background:#eee;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(p.v/payTotal*100)}%;background:#7F77DD;border-radius:4px"></div></div></div>`).join('')}
    </div>
    <div>
      <div style="font-size:12px;font-weight:700;margin-bottom:12px">Top 10 productos</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:4px 6px;font-size:9px;text-transform:uppercase">Producto</th><th style="text-align:right;padding:4px 6px;font-size:9px;text-transform:uppercase">Cant.</th><th style="text-align:right;padding:4px 6px;font-size:9px;text-transform:uppercase">Venta</th></tr></thead><tbody>${topRows}</tbody></table>
    </div>
  </div>
  <div style="margin-top:40px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #ddd;padding-top:12px;display:flex;align-items:center;justify-content:center;gap:8px">
    ${mayloSvg ? `<img src="${mayloSvg}" style="width:24px;height:24px;opacity:.4" />` : ''}
    <span>FloorUX CRM · OperUX by mrzlabs · © 2026 Todos los derechos reservados</span>
  </div>
</div>

</div>`;
    document.body.appendChild(div);
    window.print();
    setTimeout(() => div.remove(), 1500);
  }

  /* ── Range helpers ──────────────────────────────────────── */
  const isLive  = preset === 'hoy';
  function applyPreset(p: string) {
    setPreset(p); setRange(presetRange(p));
  }
  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      setPreset('custom'); setRange({ from: customFrom, to: customTo });
    }
  }

  const F13 = { fontSize: 13 } as const;
  const C   = { fontSize: 13, color: 'var(--muted)' } as const;

  /* ════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Animations + print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.8); }
        }

        @keyframes icon-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        @keyframes icon-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .live-dot {
          animation: pulse-live 1.4s ease-in-out infinite;
          display: inline-block;
        }

        .live-icon {
          animation: icon-float 2s ease-in-out infinite, icon-pulse 2s ease-in-out infinite;
        }

        .hourly-bar:hover {
          transform: scaleY(1.02);
          filter: brightness(1.15);
          cursor: pointer;
        }

        @media print {
          body > *:not(#reporte-print) { display: none !important; }
          #reporte-print { display: block !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .pdf-page {
            page-break-after: always;
            position: relative;
            min-height: 100vh;
            padding: 40px;
          }

          .pdf-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 400px;
            opacity: 0.08;
            pointer-events: none;
            user-select: none;
            z-index: 0;
          }

          .pdf-content {
            position: relative;
            z-index: 1;
          }
        }

        #reporte-print { display: none; }
      `}} />

      <div>
        {/* ─── 1. TOOLBAR ───────────────────────────────── */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {/* Preset chips */}
          <div style={{ display:'flex', gap:6 }}>
            {PRESETS.map(p => (
              <button key={p} type="button"
                className={'fchip' + (preset === p ? ' on' : '')}
                style={preset === p ? {
                  background:'var(--accent)',
                  borderColor:'var(--accent)',
                  color:'#0b0a12',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px -2px var(--accent)',
                } : undefined}
                onClick={() => applyPreset(p)}>
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input className="inp" type="date" style={{ maxWidth:145, ...F13 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={C}>→</span>
            <input className="inp" type="date" style={{ maxWidth:145, ...F13 }} value={customTo}   onChange={e => setCustomTo(e.target.value)} />
            <button className="btn sm ghost" onClick={applyCustom} disabled={!customFrom || !customTo}>Aplicar</button>
          </div>
          {/* Live badge */}
          {isLive && (
            <span style={{
              display:'flex',
              alignItems:'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--green)',
              padding: '4px 10px',
              background: 'color-mix(in srgb, var(--green) 12%, transparent)',
              borderRadius: 999,
              border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
            }}>
              <span className="live-dot">●</span> En vivo
            </span>
          )}
          {/* Export buttons */}
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button className="btn sm ghost" onClick={doCSV}><Icon name="download" s={14} /> CSV</button>
            <button className="btn sm ghost" onClick={() => doPDF()}><Icon name="receipt" s={14} /> PDF</button>
          </div>
        </div>
        <div style={{ ...C, marginBottom:16, fontSize:12 }}>{rangeLabel(range)}</div>

        {/* ─── 2. KPI CARDS ─────────────────────────────── */}
        <div className="grid g4" style={{ marginBottom:16 }}>
          {[
            {
              label: 'Ventas del período',
              value: COPk(total),
              icon: 'cash',
              color: 'var(--accent)',
              sub: prevTotal > 0 ? `${trend >= 0 ? '+' : ''}${trend}% vs período anterior` : undefined,
              subColor: trend >= 0 ? 'var(--green)' : 'var(--red)',
            },
            {
              label: 'Utilidad bruta',
              value: COPk(util),
              icon: 'chart',
              color: 'var(--accent2)',
              sub: `Margen ${margen}%`,
              subColor: 'var(--muted)',
            },
            {
              label: 'Mesas / Ítems',
              value: `${sales.length} / ${itemsCount}`,
              icon: 'mesas',
              color: 'var(--accent3)',
            },
            {
              label: 'Descuadre inventario',
              value: COPk(totalRiesgo),
              icon: 'alert',
              color: totalRiesgo > 0 ? 'var(--red)' : 'var(--green)',
              sub: descuadreCount > 0 ? `${descuadreCount} producto(s)` : 'Inventario cuadra',
              subColor: descuadreCount > 0 ? 'var(--red)' : 'var(--green)',
            },
          ].map(({ label, value, icon, color, sub, subColor }) => (
            <div key={label} style={{
              borderLeft: `3px solid ${color}`,
              background: `linear-gradient(135deg,
                color-mix(in srgb, ${color} 10%, var(--card)) 0%,
                color-mix(in srgb, ${color} 4%, var(--card)) 100%)`,
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: isLive ? `0 0 20px -8px ${color}` : undefined,
              position: 'relative',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <span style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}>
                  {label}
                </span>
                <span
                  className={isLive ? 'live-icon' : ''}
                  style={{
                    color,
                    opacity: 0.7,
                    filter: isLive ? `drop-shadow(0 0 8px ${color})` : undefined,
                  }}
                >
                  <Icon name={icon} s={32} />
                </span>
              </div>

              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink)' }}>
                {value}
              </div>

              {sub && (
                <div style={{
                  fontSize: 12,
                  marginTop: 6,
                  color: subColor,
                  fontWeight: 600
                }}>
                  {sub}
                </div>
              )}

              {isLive && (
                <span style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--green)',
                  padding: '3px 8px',
                  background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                  borderRadius: 999,
                  border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
                }}>
                  <span className="live-dot">●</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ─── 3+4. HOURLY CHART + BALANCE ──────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:16 }}>
          {/* Hourly bars */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <span style={{ fontSize:14, fontWeight:800 }}>Ventas por hora</span>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                  Top 3: {topHours.first}:00 · {topHours.second}:00 · {topHours.third}:00
                </div>
              </div>
              {isLive && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'var(--green)' }}>
                  <span className="live-dot">●</span> En vivo
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:120 }}>
              {hourlyData.map(({ h, v }) => {
                const pct = Math.round(v / maxHourVal * 100);
                const rank = getHourRank(h, v);

                const gradients = {
                  1: 'linear-gradient(to top, var(--yellow), var(--accent))',
                  2: 'linear-gradient(to top, var(--accent), var(--accent2))',
                  3: 'linear-gradient(to top, var(--accent2), var(--accent3))',
                };
                const glows = {
                  1: '0 0 20px -2px var(--yellow)',
                  2: '0 0 12px -2px var(--accent)',
                  3: '0 0 6px -2px var(--accent2)',
                };

                return (
                  <div key={h} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <span style={{
                      fontSize: 9,
                      color: rank ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: rank ? 700 : 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {v > 0 ? '$' + Math.round(v / 1000) + 'K' : ''}
                    </span>
                    <div style={{ width:'100%', background:'var(--border)', borderRadius:'4px 4px 0 0', height:'100%', display:'flex', alignItems:'flex-end', overflow:'hidden' }}>
                      <div
                        className="hourly-bar"
                        style={{
                          width: '100%',
                          borderRadius: '4px 4px 0 0',
                          height: `${pct}%`,
                          minHeight: v > 0 ? 3 : 0,
                          background: rank ? gradients[rank as 1 | 2 | 3] : 'linear-gradient(to top, var(--muted2), var(--muted))',
                          boxShadow: rank ? glows[rank as 1 | 2 | 3] : undefined,
                          opacity: rank ? 1 : 0.5,
                          transition: 'height .4s',
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: 9,
                      color: rank ? 'var(--accent)' : 'var(--muted2)',
                      fontWeight: rank ? 700 : 400,
                      whiteSpace: 'nowrap'
                    }}>
                      {HOUR_LABELS[h]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Balance bar */}
          <div className="card" style={{ padding:20 }}>
            <span style={{ fontSize:14, fontWeight:800 }}>Balance del período</span>
            <div style={{ marginTop:16 }}>
              <div style={{
                display: 'flex',
                height: 26,
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 12,
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: `${costPct}%`,
                  background: 'linear-gradient(90deg, color-mix(in srgb, var(--red) 35%, transparent) 0%, color-mix(in srgb, var(--red) 15%, transparent) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--red)',
                  transition: 'width .4s',
                }}>
                  {costPct > 8 ? `${costPct}%` : ''}
                </div>
                <div style={{
                  width: `${100 - costPct}%`,
                  background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#0b0a12',
                  transition: 'width .4s',
                }}>
                  {100 - costPct > 8 ? `${100 - costPct}%` : ''}
                </div>
              </div>
              {[
                { label:'Ingresos', value:total, color:'var(--ink)', dot:'var(--accent)' },
                { label:'Costo de producto', value:cost, color:'var(--muted)', dot:'var(--red)' },
                { label:'Utilidad bruta', value:util, color:'var(--green)', dot:'var(--green)' },
              ].map(({ label, value, color, dot }) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--line)'
                }}>
                  <span style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dot,
                      boxShadow: `0 0 8px -2px ${dot}`,
                      display: 'inline-block',
                    }} />
                    {label}
                  </span>
                  <b style={{ fontSize: 13, color }}>{COP(value)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 5. INVENTORY AUDIT ───────────────────────── */}
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:800 }}>Cuadre de inventario</span>
            <span style={C}>{sortedAudit.length} productos</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  {[['name','Producto'],['cat','Categoría'],['vendidas','Vendidas'],['descontadas','Salidas inv.'],['diferencia','Diferencia'],['valorRiesgo','Valor riesgo']].map(([k,h]) => (
                    <th key={k} className="sortable" onClick={() => toggleAuditSort(k)}
                      style={{ cursor:'pointer', userSelect:'none', ...(k === 'valorRiesgo' ? { textAlign:'right' as const } : {}) }}>
                      {h}{aSuf(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAudit.map((r, i) => {
                  const hasProblem = r.diferencia !== 0;
                  return (
                    <tr
                      key={r.id}
                      style={
                        hasProblem
                          ? {
                              background: 'color-mix(in srgb, var(--red) 8%, var(--panel2))',
                            }
                          : i % 2 === 1
                          ? { background: 'var(--panel2)' }
                          : undefined
                      }
                    >
                      <td style={{ ...F13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                        {hasProblem && (
                          <span style={{ color:'var(--red)' }}>
                            <Icon name="alert" s={16} />
                          </span>
                        )}
                        {r.name}
                      </td>
                      <td><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:catColor(r.cat)+'22', color:catColor(r.cat) }}>{r.cat}</span></td>
                      <td style={C}>{r.vendidas}</td>
                      <td style={C}>{r.descontadas}</td>
                      <td>
                        {r.diferencia === 0
                          ? <Chip color="var(--green)">Cuadra</Chip>
                          : <span style={{ fontSize:13, fontWeight:700, color: r.diferencia > 0 ? 'var(--orange)' : 'var(--red)' }}>
                              {r.diferencia > 0 ? '+' : ''}{r.diferencia}
                            </span>
                        }
                      </td>
                      <td style={{ textAlign:'right' }}>
                        {r.diferencia === 0
                          ? <Chip color="var(--green)">Cuadra</Chip>
                          : <span style={{ ...F13, fontWeight:700, color:'var(--red)' }}>{COP(r.valorRiesgo)}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalRiesgo > 0 && (
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'flex-end', gap:8 }}>
              <span style={C}>Total valor en riesgo:</span>
              <b style={{ color:'var(--red)', fontSize:14 }}>{COP(totalRiesgo)}</b>
            </div>
          )}
        </div>

        {/* ─── 6+7. PAYMENTS + TOP PRODUCTS ─────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Payment methods */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <span style={{ fontSize:14, fontWeight:800 }}>Métodos de pago</span>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              <button
                className={'fchip' + (payFilters.length === 0 ? ' on' : '')}
                onClick={() => setPayFilters([])}
                style={payFilters.length === 0 ? {
                  background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  color: '#0b0a12'
                } : undefined}
              >
                Todos ({payData.reduce((sum, p) => sum + (p.count || 0), 0)})
              </button>
              {PAYMENTS.map(p => {
                const isSelected = payFilters.includes(p.id);
                const count = payMap[p.id]?.count || 0;
                return (
                  <button
                    key={p.id}
                    className={'fchip' + (isSelected ? ' on' : '')}
                    style={isSelected ? {
                      background: p.color,
                      borderColor: p.color,
                      color: '#0b0a12'
                    } : {
                      borderColor: p.color,
                      color: p.color
                    }}
                    onClick={() => togglePayFilter(p.id)}
                  >
                    {p.name} ({count})
                  </button>
                );
              })}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filtPay.filter(p => p.v > 0).map(p => (
                <div key={p.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ ...F13, fontWeight:700, color:p.color }}>{p.name}</span>
                    <span style={{ ...F13, fontWeight:700 }}>{COP(p.v)}</span>
                  </div>
                  <div style={{ height:8, borderRadius:4, background:'var(--border)' }}>
                    <div style={{ height:'100%', width:`${Math.round(p.v/maxPay*100)}%`, borderRadius:4, background:p.color, transition:'width .4s' }} />
                  </div>
                </div>
              ))}
              {payTotal > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--line)', ...F13 }}>
                  <span style={C}>Total filtrado</span>
                  <b>{COP(filtPay.reduce((a, p) => a + p.v, 0))}</b>
                </div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="card" style={{ padding:20 }}>
            <span style={{ fontSize:14, fontWeight:800, display:'block', marginBottom:14 }}>Productos más vendidos</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              {topCats.map(c => (
                <button key={c} className={'fchip' + (topCat === c ? ' on' : '')}
                  style={topCat === c ? { background:'var(--accent)', borderColor:'var(--accent)', color:'#0b0a12' } : undefined}
                  onClick={() => setTopCat(c)}>
                  {c === 'all' ? 'Todas' : c}
                </button>
              ))}
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th
                    className="sortable"
                    onClick={() => toggleTopProdSort('name')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    PRODUCTO {topProdSort.k === 'name' ? (topProdSort.asc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleTopProdSort('cant')}
                    style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  >
                    CANT. {topProdSort.k === 'cant' ? (topProdSort.asc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleTopProdSort('venta')}
                    style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  >
                    VENTA {topProdSort.k === 'venta' ? (topProdSort.asc ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtTopProds.map((p, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const medal = i < 3 ? medals[i] : null;
                  const borderColors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];
                  const bgColors = [
                    'color-mix(in srgb, var(--accent) 8%, transparent)',
                    'color-mix(in srgb, var(--accent2) 8%, transparent)',
                    'color-mix(in srgb, var(--accent3) 8%, transparent)',
                  ];
                  return (
                    <tr
                      key={p.id}
                      style={medal ? {
                        background: bgColors[i],
                        borderLeft: `3px solid ${borderColors[i]}`,
                      } : i % 2 === 1 ? { background: 'var(--panel2)' } : undefined}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {medal && <span style={{ fontSize: 18 }}>{medal}</span>}
                          {!medal && <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>{i + 1}.</span>}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                            {p.sub && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.sub}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 13 }}>{p.cant}</td>
                      <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{COP(p.venta)}</td>
                    </tr>
                  );
                })}
                {filtTopProds.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign:'center', ...C, padding:20 }}>Sin ventas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── 8+9. EMPLOYEE STATS + SHIFT DETAIL ─────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          {/* Ventas por empleado */}
          <div className="card" style={{ padding:20 }}>
            <span style={{ fontSize:14, fontWeight:800, display:'block', marginBottom:14 }}>Ventas por empleado</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <button
                className={'fchip' + (empFilter === 'all' ? ' on' : '')}
                style={empFilter === 'all' ? { background:'var(--accent)', borderColor:'var(--accent)', color:'#0b0a12' } : undefined}
                onClick={() => setEmpFilter('all')}
              >
                Todos
              </button>
              {empStats.map(e => (
                <button
                  key={e.id}
                  className={'fchip' + (empFilter === e.id ? ' on' : '')}
                  style={empFilter === e.id ? { background:e.color, borderColor:e.color, color:'#0b0a12' } : {
                    borderColor: e.color,
                    color: e.color
                  }}
                  onClick={() => setEmpFilter(empFilter === e.id ? 'all' : e.id)}
                >
                  {e.name}
                </button>
              ))}
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>EMPLEADO</th>
                  <th style={{ textAlign:'right' }}>MESAS</th>
                  <th style={{ textAlign:'right' }}>RECAUDADO ▼</th>
                </tr>
              </thead>
              <tbody>
                {filtEmpStats.map((e, i) => {
                  const isTopEmployee = i === 0 && filtEmpStats.length > 1;
                  return (
                    <tr key={e.id} style={i % 2 === 1 ? { background:'var(--panel2)' } : undefined}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={e.name} color={e.color} size="sm" />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                            {isTopEmployee && (
                              <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>⭐ Top empleado</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign:'right', fontSize: 13 }}>{e.mesas}</td>
                      <td style={{ textAlign:'right', fontSize: 13, fontWeight:700, color:'var(--green)' }}>{COP(e.recaudado)}</td>
                    </tr>
                  );
                })}
                {filtEmpStats.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign:'center', ...C, padding:20 }}>Sin datos de empleados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detalle de mesas por turno */}
          <div className="card" style={{ padding:20 }}>
            <span style={{ fontSize:14, fontWeight:800, display:'block', marginBottom:14 }}>Detalle de mesas por turno</span>
            <table className="tbl" style={{ marginTop: 48 }}>
              <thead>
                <tr>
                  <th>TURNO ↑</th>
                  <th style={{ textAlign:'right' }}>MESAS</th>
                  <th style={{ textAlign:'right' }}>TOTAL ▼</th>
                </tr>
              </thead>
              <tbody>
                {shiftRows.map((s, i) => {
                  const isTopShift = i === 0 && shiftRows.length > 1;
                  const [datePart, empAndTime] = s.label.split(' · ');
                  return (
                    <tr key={s.id} style={i % 2 === 1 ? { background:'var(--panel2)' } : undefined}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isTopShift && <span style={{ fontSize: 18 }}>🏆</span>}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{datePart}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{empAndTime}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign:'right', fontSize: 13 }}>{s.mesas}</td>
                      <td style={{ textAlign:'right', fontSize: 13, fontWeight:700 }}>{COP(s.total)}</td>
                    </tr>
                  );
                })}
                {shiftRows.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign:'center', ...C, padding:20 }}>Sin turnos en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── 10. ALERT BANNER ─────────────────────────── */}
        {totalRiesgo > 100000 && (
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 12,
            marginBottom: 16,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--red) 15%, transparent) 0%, color-mix(in srgb, var(--red) 8%, transparent) 100%)',
            border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
            borderLeft: '4px solid var(--red)',
            boxShadow: '0 0 24px -8px var(--red)',
          }}>
            <span style={{
              color: 'var(--red)',
              flexShrink: 0,
              marginTop: 1,
              filter: 'drop-shadow(0 0 6px var(--red))',
            }}>
              <Icon name="alert" s={22} />
            </span>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <div style={{
                fontWeight: 700,
                color: 'var(--red)',
                marginBottom: 4,
                fontSize: 14,
              }}>
                ⚠️ El inventario no cuadra en {descuadreCount} producto(s)
              </div>
              <div style={{ color: 'var(--muted)', marginBottom: 6 }}>
                Salieron más unidades de las vendidas — posible merma, consumo interno o venta sin registrar.
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Valor en riesgo: <span style={{ color: 'var(--red)' }}>{COP(totalRiesgo)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
