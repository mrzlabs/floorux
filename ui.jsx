/* global React, RUMBA */
/* ============================================================
   RUMBA — UI compartida + store con persistencia (localStorage)
   ============================================================ */
const { useState, useEffect, useRef, useContext, createContext, useMemo } = React;

/* ---------- formato ---------- */
const COP = n => '$' + Math.round(n).toLocaleString('es-CO');
const COPk = n => {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const profit = p => p.price - p.cost;

/* ---------- iconos ---------- */
const PATHS = {
  super: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 12h.01M15 12h.01',
  admin: 'M3 21h18M4 21V8h16v13M9 12h6M9 16h6M8 8V5a4 4 0 0 1 8 0v3',
  empleado: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  dash: 'M4 13h7V4H4v9Zm9 7h7v-9h-7v9ZM4 20h7v-4H4v4ZM13 9h7V4h-7v5Z',
  biz: 'M3 21h18M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 9h4a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2',
  mesas: 'M5 11h14M6 11V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M6 11l-1 8M18 11l1 8M9 11v4M15 11v4',
  box: 'M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M17 20c0-2.7-2.2-5-5-5s-5 2.3-5 5M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20c0-2-1.3-3.7-3-4.3M19 11a3 3 0 0 0 0-6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  user: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  chev: 'M9 6l6 6-6 6',
  chevd: 'M6 9l6 6 6-6',
  bottle: 'M10 2h4M10 2v3.2c0 .6-.2 1.1-.6 1.5L8 8.2A3 3 0 0 0 7 10.4V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.6a3 3 0 0 0-1-2.2l-1.4-1.5a2 2 0 0 1-.6-1.5V2M7 13h10',
  soda: 'M7 8h10l-1 12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 8ZM8 8l1-4h6l1 4M9 12h6',
  cocktail: 'M5 4h14l-7 8-7-8ZM12 12v7M8 21h8M16 4l1-2',
  snack: 'M6 3h12l-1 4H7L6 3ZM7 7l-1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2L17 7',
  smoke: 'M3 14h16v4H3zM19 14v4M21 9c0-2-1-2-1-4M17 9c0-2-1-2-1-4',
  cash: 'M3 7h18v10H3zM3 11h18M7 14h3',
  card: 'M3 7h18v10H3zM3 11h18M7 15h4',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  transfer: 'M7 7h11l-3-3M17 17H6l3 3',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8ZM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  check: 'M5 12l5 5L20 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  play: 'M7 5l12 7-12 7V5Z',
  stop: 'M6 6h12v12H6z',
  power: 'M12 4v8M7 6a7 7 0 1 0 10 0',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  fire: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5-.5-2.5C16 9 17 11 17 14a5 5 0 0 1-10 0c0-4 3-6 5-11Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2',
  alert: 'M12 3l9 16H3L12 3ZM12 10v4M12 17h.01',
  tag: 'M3 12l8-8h8v8l-8 8-8-8ZM16 8h.01',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  filter: 'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3ZM8 8h8M8 12h8M8 16h5',
  star: 'M12 3l2.5 6.5L21 10l-5 4.5L17.5 21 12 17l-5.5 4L8 14.5 3 10l6.5-.5L12 3Z',
};
function Icon({ name, s = 20, sw = 1.8 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d={PATHS[name] || PATHS.dash} />
    </svg>
  );
}

/* ---------- componentes base ---------- */
function Avatar({ name, color = '#7F77DD', size = '', img }) {
  return (
    <span className={'avatar ' + size} style={{ background: color + '26', color }}>
      {img ? <img src={img} alt="" /> : initials(name)}
    </span>
  );
}
function Stat({ label, value, icon, color = 'var(--accent)', trend, sub }) {
  return (
    <div className="stat">
      <div className="sk"><span className="si" style={{ background: color + '22', color }}><Icon name={icon} s={15} sw={2} /></span>{label}</div>
      <div className="sv">{value}</div>
      {trend != null && <div className={'st ' + (trend >= 0 ? 'up' : 'down')}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs período anterior</div>}
      {sub && <div className="st muted" style={{ fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}
function Chip({ children, color = 'var(--muted)' }) {
  return <span className="chip" style={{ background: color + '22', color }}>{children}</span>;
}
function Bars({ data, fmt = COPk, hotIndex }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className={'bar' + (i === hotIndex ? ' hot' : '')} style={{ height: Math.max(d.v / max * 100, 4) + '%' }}>
            <span className="blab">{fmt(d.v)}</span>
          </div>
          <div className="bar-d">{d.d || d.h}</div>
        </div>
      ))}
    </div>
  );
}
function PayBars({ data, total }) {
  return (
    <div>
      {data.map((p, i) => {
        const pct = total ? (p.v / total * 100) : 0;
        return (
          <div className="pbar-row" key={i}>
            <div className="pl"><span className="dotc" style={{ background: p.color }} />{p.name}</div>
            <div className="pbar-track"><div className="pbar-fill" style={{ width: pct + '%', background: p.color }} /></div>
            <div className="pv tnum">{COPk(p.v)}</div>
          </div>
        );
      })}
    </div>
  );
}
function Donut({ data, center }) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  let acc = 0;
  const stops = data.map(d => {
    const from = acc / total * 360; acc += d.v;
    const to = acc / total * 360;
    return `${d.color} ${from}deg ${to}deg`;
  }).join(',');
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="dc"><b>{center}</b><span>total noche</span></div>
      </div>
      <div className="legend">
        {data.map((d, i) => (
          <div className="legend-i" key={i}>
            <span className="dotc" style={{ background: d.color }} />{d.name}
            <b>{Math.round(d.v / total * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
function Modal({ title, icon, onClose, children, footer, wide }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          {icon && <span style={{ color: 'var(--accent)' }}><Icon name={icon} /></span>}
          <h3>{title}</h3>
          <button className="x" onClick={onClose}><Icon name="close" s={18} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

/* ============================================================
   STORE — estado vivo con persistencia
   ============================================================ */
const RumbaCtx = createContext(null);
const useRumba = () => useContext(RumbaCtx);
const LS = 'rumba_v1';
const load = (k, def) => { try { const v = localStorage.getItem(LS + '_' + k); return v ? JSON.parse(v) : def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(LS + '_' + k, JSON.stringify(v)); } catch {} };

const DEFAULT_MESAS = () => ([
  { id: 'm1', name: 'Mesa 1', alias: '', status: 'libre', items: [], openedAt: null, by: null },
  { id: 'm2', name: 'Mesa 2', alias: '', status: 'libre', items: [], openedAt: null, by: null },
  { id: 'm3', name: 'Mesa 3', alias: '', status: 'libre', items: [], openedAt: null, by: null },
  { id: 'm4', name: 'Barra 1', alias: '', status: 'libre', items: [], openedAt: null, by: null },
  { id: 'm5', name: 'VIP 1', alias: '', status: 'libre', items: [], openedAt: null, by: null },
  { id: 'm6', name: 'VIP 2', alias: '', status: 'libre', items: [], openedAt: null, by: null },
]);

const DEFAULT_UI = { mode: 'dark', palette: ['#7F77DD', '#27C3D8', '#B57BE0'], radius: 16, font: 14 };
const PALETTES = [
  { name: 'Neón violeta', c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Magenta noche', c: ['#B57BE0', '#E0708A', '#F5C400'] },
  { name: 'Cian eléctrico', c: ['#27C3D8', '#5A82EE', '#7F77DD'] },
  { name: 'Ámbar bar', c: ['#F5C400', '#f59e42', '#E0708A'] },
  { name: 'Esmeralda', c: ['#34d399', '#27C3D8', '#5A82EE'] },
  { name: 'Coral', c: ['#E0708A', '#B57BE0', '#7F77DD'] },
];

function RumbaProvider({ children }) {
  const [inventory, setInventory] = useState(() => load('inv', RUMBA.PRODUCTS.map(p => ({ ...p }))));
  const [mesas, setMesas] = useState(() => load('mesas', DEFAULT_MESAS()));
  const [shift, setShift] = useState(() => load('shift', { open: false, startedAt: null, by: 'Yulieth Mosquera' }));
  const [sales, setSales] = useState(() => load('sales', [])); // ventas (mesas cerradas) del turno
  const [photo, setPhoto] = useState(() => load('photo', { biz: null, user: null }));
  const [ui, setUiRaw] = useState(() => load('ui', DEFAULT_UI));

  useEffect(() => save('inv', inventory), [inventory]);
  useEffect(() => save('mesas', mesas), [mesas]);
  useEffect(() => save('shift', shift), [shift]);
  useEffect(() => save('sales', sales), [sales]);
  useEffect(() => save('photo', photo), [photo]);
  useEffect(() => save('ui', ui), [ui]);

  const stockOf = id => (inventory.find(p => p.id === id) || {}).stock ?? 0;
  const adjustStock = (id, delta) => setInventory(inv => inv.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));

  const store = {
    inventory, setInventory, mesas, shift, sales, photo, setPhoto,
    ui, setUI: p => setUiRaw(u => ({ ...u, ...p })),
    stockOf, adjustStock,
    lowStock: useMemo(() => inventory.filter(p => p.min > 0 && p.stock <= p.min), [inventory]),

    startShift: () => setShift({ open: true, startedAt: Date.now(), by: shift.by }),
    closeShift: () => { setShift(s => ({ ...s, open: false, startedAt: null })); },
    resetShiftSales: () => setSales([]),

    createMesa: (name) => setMesas(m => [...m, { id: 'm' + Date.now(), name, alias: '', status: 'libre', items: [], openedAt: null, by: null }]),
    renameMesa: (id, name) => setMesas(m => m.map(x => x.id === id ? { ...x, name } : x)),
    deleteMesa: (id) => setMesas(m => m.filter(x => x.id !== id)),
    openMesa: (id, alias) => setMesas(m => m.map(x => x.id === id ? { ...x, status: 'ocupada', alias, items: [], openedAt: Date.now(), by: shift.by } : x)),

    addItem: (mesaId, prod) => {
      if ((prod.stock ?? stockOf(prod.id)) <= 0 && prod.min > 0) return;
      if (prod.min > 0) adjustStock(prod.id, -1);
      setMesas(m => m.map(x => {
        if (x.id !== mesaId) return x;
        const ex = x.items.find(i => i.id === prod.id);
        const items = ex
          ? x.items.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
          : [...x.items, { id: prod.id, name: prod.name, price: prod.price, cost: prod.cost, qty: 1, tracked: prod.min > 0 }];
        return { ...x, items };
      }));
    },
    removeItem: (mesaId, prodId) => {
      setMesas(m => m.map(x => {
        if (x.id !== mesaId) return x;
        const it = x.items.find(i => i.id === prodId);
        if (!it) return x;
        if (it.tracked) adjustStock(prodId, +1);
        const items = it.qty > 1 ? x.items.map(i => i.id === prodId ? { ...i, qty: i.qty - 1 } : i) : x.items.filter(i => i.id !== prodId);
        return { ...x, items };
      }));
    },
    closeMesa: (mesaId, payment, evidence) => {
      const mesa = mesas.find(x => x.id === mesaId);
      if (!mesa) return;
      const total = mesa.items.reduce((s, i) => s + i.price * i.qty, 0);
      const cost = mesa.items.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
      setSales(s => [{
        id: 'v' + Date.now(), mesa: mesa.name, alias: mesa.alias,
        items: mesa.items.map(i => ({ ...i })), total, cost, payment, evidence: !!evidence,
        at: Date.now(), by: shift.by,
      }, ...s]);
      setMesas(m => m.map(x => x.id === mesaId ? { ...x, status: 'libre', alias: '', items: [], openedAt: null, by: null } : x));
    },

    restock: (prodId, qty) => adjustStock(prodId, +qty),
    addProduct: (p) => setInventory(inv => [...inv, p]),
    setStockTo: (prodId, v) => setInventory(inv => inv.map(p => p.id === prodId ? { ...p, stock: v } : p)),

    resetDemo: () => { setInventory(RUMBA.PRODUCTS.map(p => ({ ...p }))); setMesas(DEFAULT_MESAS()); setShift({ open: false, startedAt: null, by: 'Yulieth Mosquera' }); setSales([]); },
  };
  return <RumbaCtx.Provider value={store}>{children}</RumbaCtx.Provider>;
}

/* ---------- ordenamiento de tablas ---------- */
function useSort(initialKey, initialDir = 'desc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const toggle = key => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  const apply = (rows, accessors = {}) => {
    const { key, dir } = sort;
    if (!key) return rows;
    const get = accessors[key] || (r => r[key]);
    const r = [...rows].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), 'es');
    });
    return dir === 'desc' ? r.reverse() : r;
  };
  return { sort, toggle, apply };
}
function Th({ label, k, sorter, right }) {
  const on = sorter.sort.key === k;
  return (
    <th className={'sortable' + (on ? ' sorted' : '')} onClick={() => sorter.toggle(k)} style={right ? { textAlign: 'right' } : null}>
      {label}<span className="sarrow">{on ? (sorter.sort.dir === 'asc' ? '▲' : '▼') : '▾'}</span>
    </th>
  );
}

/* ---------- personalización (perfil) ---------- */
function Personalizar() {
  const st = useRumba();
  const ui = st.ui;
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Personalización</h2>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Cambia el tema y los colores de tu panel a tu gusto. Se aplica al instante.</p>
      <Field label="Tema">
        <div className="theme-seg">
          <button className={ui.mode === 'dark' ? 'on' : ''} onClick={() => st.setUI({ mode: 'dark' })}><Icon name="bell" s={15} /> Oscuro</button>
          <button className={ui.mode === 'light' ? 'on' : ''} onClick={() => st.setUI({ mode: 'light' })}><Icon name="spark" s={15} /> Claro</button>
        </div>
      </Field>
      <Field label="Color de marca">
        <div className="swatches">
          {PALETTES.map(p => (
            <button key={p.name} className={'swatch' + (ui.palette[0] === p.c[0] ? ' on' : '')} title={p.name}
              style={{ background: `linear-gradient(135deg,${p.c[0]},${p.c[1]})` }} onClick={() => st.setUI({ palette: p.c })} />
          ))}
        </div>
      </Field>
      <Field label={`Redondez · ${ui.radius}px`}>
        <input type="range" min="6" max="26" step="1" value={ui.radius} style={{ width: '100%', accentColor: 'var(--accent)' }}
          onChange={e => st.setUI({ radius: +e.target.value })} />
      </Field>
    </div>
  );
}

/* ---------- reportes: fechas + exportación ---------- */
const DEMO_TODAY = new Date(2026, 5, 5); // jueves 5 jun 2026 (demo)
const MES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtShort = s => { const d = parseISO(s); return `${d.getDate()} ${MES_ES[d.getMonth()]}`; };
const rangeDays = (from, to) => Math.max(1, Math.round((parseISO(to) - parseISO(from)) / 864e5) + 1);
const rangeLabel = r => r.from === r.to ? fmtShort(r.from) : `${fmtShort(r.from)} – ${fmtShort(r.to)}`;
function presetRange(p) {
  const t = new Date(DEMO_TODAY), mk = d => isoDate(d);
  if (p === 'hoy') return { from: mk(t), to: mk(t) };
  if (p === 'ayer') { const y = new Date(t); y.setDate(t.getDate() - 1); return { from: mk(y), to: mk(y) }; }
  if (p === '7') { const f = new Date(t); f.setDate(t.getDate() - 6); return { from: mk(f), to: mk(t) }; }
  if (p === '30') { const f = new Date(t); f.setDate(t.getDate() - 29); return { from: mk(f), to: mk(t) }; }
  return { from: mk(t), to: mk(t) };
}
function matchPreset(r) { for (const k of ['hoy', 'ayer', '7', '30']) { const p = presetRange(k); if (p.from === r.from && p.to === r.to) return k; } return 'custom'; }

function exportCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function printPDF(title, sub) {
  const modal = document.querySelector('.modal');
  const root = document.documentElement;
  if (modal) { root.classList.add('print-modal'); }
  else { const head = document.getElementById('__printhead'); if (head) head.innerHTML = `<h1>${title || 'Reporte'}</h1><p>${sub || ''}</p>`; }
  setTimeout(() => { window.print(); setTimeout(() => root.classList.remove('print-modal'), 200); }, 80);
}
function PrintHead() { return <div className="print-head" id="__printhead" />; }

function ReportToolbar({ range, setRange, onCSV, onPDF, live }) {
  const presets = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7', '7 días'], ['30', '30 días']];
  const cur = matchPreset(range);
  return (
    <div className="rtoolbar">
      <div className="fbar" style={{ marginBottom: 0 }}>
        {presets.map(([k, l]) => <button key={k} className={'fchip' + (cur === k ? ' on' : '')} onClick={() => setRange(presetRange(k))}>{l}</button>)}
        <div className="daterange">
          <Icon name="calendar" s={15} />
          <input type="date" value={range.from} max={range.to} onChange={e => setRange({ ...range, from: e.target.value })} />
          <span>–</span>
          <input type="date" value={range.to} min={range.from} max={isoDate(DEMO_TODAY)} onChange={e => setRange({ ...range, to: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {live && <span className="live"><i />En vivo</span>}
        {onCSV && <button className="btn sm" onClick={onCSV}><Icon name="download" s={15} /> CSV</button>}
        {onPDF && <button className="btn sm pri" onClick={onPDF}><Icon name="download" s={15} /> PDF</button>}
      </div>
    </div>
  );
}

/* genera bars/totales escalados por rango de fechas (base diaria por día de semana) */
const WPAT = [3.2, 2.8, 4.1, 7.4, 13.8, 16.2, 5.6].map(x => x * 1e6); // Lun..Dom (semana ≈ 53.1M)
function rangeReport(range, factor = 1) {
  const days = rangeDays(range.from, range.to);
  const start = parseISO(range.from), per = [];
  for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(start.getDate() + i); per.push({ date: d, v: WPAT[(d.getDay() + 6) % 7] * factor }); }
  let bars, hot = -1, total;
  if (days <= 1) { bars = RUMBA.TODAY_HOURLY.map(h => ({ h: h.h, v: h.v * factor })); hot = 4; total = bars.reduce((s, b) => s + b.v, 0); }
  else if (days <= 16) { bars = per.map(x => ({ d: String(x.date.getDate()), v: x.v })); total = per.reduce((s, x) => s + x.v, 0); hot = bars.reduce((mi, b, i, a) => b.v > a[mi].v ? i : mi, 0); }
  else { bars = []; for (let i = 0; i < per.length; i += 7) bars.push({ d: 'S' + (bars.length + 1), v: per.slice(i, i + 7).reduce((s, x) => s + x.v, 0) }); total = per.reduce((s, x) => s + x.v, 0); hot = bars.reduce((mi, b, i, a) => b.v > a[mi].v ? i : mi, 0); }
  const mesas = Math.round(total / 67400), sales = Math.round(mesas * 3.6), scale = total / 12.08e6;
  const ratios = { efectivo: .38, transferencia: .26, qr: .21, datafono: .09, nequi: .06 }, pay = {};
  RUMBA.PAYMENTS.forEach(p => pay[p.id] = Math.round(total * ratios[p.id]));
  return { days, bars, hot, total, mesas, sales, scale, pay, live: days <= 1 && range.to === isoDate(DEMO_TODAY) };
}

/* ---------- export ---------- */
Object.assign(window, {
  COP, COPk, initials, profit, Icon, Avatar, Stat, Chip, Bars, PayBars, Donut, Modal, Field,
  RumbaCtx, useRumba, RumbaProvider, useSort, Th, Personalizar, PALETTES,
  DEMO_TODAY, isoDate, fmtShort, rangeDays, rangeLabel, presetRange,
  exportCSV, printPDF, PrintHead, ReportToolbar, rangeReport,
});
