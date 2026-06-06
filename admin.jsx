/* global React, useRumba, Icon, Avatar, COP, COPk, Modal, Field, Stat, Chip, Bars, PayBars, Donut, RUMBA, profit, maylo */
/* ============================================================
   RUMBA — Módulo ADMIN (resumen · reportes · inventario · equipo · local)
   ============================================================ */
const { useState: useS_A, useRef: useR_A, useMemo: useM_A } = React;

/* período → dataset de reportes */
const PERIODS = {
  hoy: {
    label: 'Hoy', sub: 'Viernes · turno en curso', live: true,
    bars: RUMBA.TODAY_HOURLY, hot: 4,
    pay: { efectivo: 4820000, transferencia: 3210000, qr: 2680000, datafono: 1140000, nequi: 730000 },
    sales: 187, mesas: 52, scale: 1,
  },
  semana: {
    label: 'Semana', sub: 'Lun 26 – Dom 1 jun', live: false,
    bars: RUMBA.WEEK, hot: 5,
    pay: { efectivo: 21800000, transferencia: 14200000, qr: 10100000, datafono: 4800000, nequi: 2200000 },
    sales: 942, mesas: 268, scale: 6,
  },
  mes: {
    label: 'Mes', sub: 'Mayo 2026', live: false,
    bars: RUMBA.MONTH, hot: 3,
    pay: { efectivo: 82400000, transferencia: 51200000, qr: 33800000, datafono: 18600000, nequi: 9500000 },
    sales: 3680, mesas: 1042, scale: 24,
  },
};

/* ---------------- RESUMEN ---------------- */
function AdminResumen() {
  const st = useRumba();
  const liveTotal = st.sales.reduce((s, v) => s + v.total, 0) + st.mesas.filter(m => m.status === 'ocupada').reduce((s, m) => s + m.items.reduce((a, i) => a + i.price * i.qty, 0), 0);
  const total = 12580000 + liveTotal;
  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Stat label="Ventas de hoy" value={COP(total)} icon="cash" color="var(--green)" trend={12} />
        <Stat label="Mesas atendidas" value={52 + st.sales.length} icon="mesas" color="var(--accent)" trend={8} />
        <Stat label="Ticket promedio" value={COP(67400)} icon="receipt" color="var(--accent2)" trend={4} />
        <Stat label="Utilidad estimada" value={COP(total * 0.58)} icon="chart" color="var(--yellow)" trend={9} />
      </div>

      {st.lowStock.length > 0 && (
        <div className="alert-banner">
          <span className="ai"><Icon name="alert" s={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}><b>{st.lowStock.length} producto(s) en alerta de stock.</b> {st.lowStock.slice(0, 4).map(p => p.name).join(', ')}{st.lowStock.length > 4 ? '…' : ''}</div>
          <Chip color="var(--red)">Revisar inventario</Chip>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="card chart">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="chart-h">Ventas de la noche por hora</div>
            <span className="live"><i />En vivo</span>
          </div>
          <Bars data={RUMBA.TODAY_HOURLY} hotIndex={4} />
        </div>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 18 }}>Métodos de pago · hoy</div>
          <Donut center={COPk(15.58e6)} data={RUMBA.PAYMENTS.map(p => ({ name: p.name, color: p.color, v: PERIODS.hoy.pay[p.id] }))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- REPORTES (prioridad) ---------------- */
function AdminReportes({ toast }) {
  const [range, setRange] = useS_A(presetRange('hoy'));
  const [cat, setCat] = useS_A('all');
  const [emp, setEmp] = useS_A('all');
  const [pays, setPays] = useS_A(RUMBA.PAYMENTS.map(p => p.id));
  const topSort = useSort('total');
  const shiftSort = useSort('total');
  const reconSort = useSort('absdiff');
  const staffSort = useSort('pv');

  const R = rangeReport(range);
  const total = R.total;
  const costo = Math.round(total * 0.42), util = total - costo, margen = total ? Math.round(util / total * 100) : 0;

  // pagos (filtrables)
  const allPay = RUMBA.PAYMENTS.map(p => ({ ...p, v: R.pay[p.id] }));
  const payData = allPay.filter(p => pays.includes(p.id));
  const payTotal = payData.reduce((s, p) => s + p.v, 0);
  const togglePay = id => setPays(s => s.includes(id) ? (s.length > 1 ? s.filter(x => x !== id) : s) : [...s, id]);

  // productos (filtrables por categoría + ordenables)
  let top = RUMBA.TOP_PRODUCTS.map(t => { const p = RUMBA.productById(t.id); return { id: t.id, name: p.name, cat: p.cat, sub: p.sub, qty: Math.round(t.qty * R.scale), total: Math.round(t.total * R.scale) }; });
  if (cat !== 'all') top = top.filter(t => t.cat === cat);
  top = topSort.apply(top);

  // empleados (filtrables + ordenables)
  let staff = RUMBA.STAFF.filter(s => s.active).map(s => ({ ...s, pv: Math.round(s.total * R.scale / 24), nmesas: Math.round(s.shifts * R.scale / 6) }));
  if (emp !== 'all') staff = staff.filter(s => s.id === emp);
  staff = staffSort.apply(staff);

  // turnos (filtrables por empleado + ordenables)
  let shifts = RUMBA.PAST_SHIFTS.map(s => ({ ...s }));
  if (emp !== 'all') { const nm = RUMBA.STAFF.find(x => x.id === emp)?.name; shifts = shifts.filter(s => s.emp === nm); }
  shifts = shiftSort.apply(shifts);

  // cuadre inventario vs ventas
  const recon = reconSort.apply(RUMBA.RECON.map(r => {
    const p = RUMBA.productById(r.id);
    const diff = r.descontadas - r.vendidas; // >0 salió más de lo vendido (faltante)
    return { id: r.id, name: p.name, sub: p.sub, vendidas: r.vendidas, descontadas: r.descontadas, diff, absdiff: Math.abs(diff), valor: Math.abs(diff) * p.price };
  }), { absdiff: r => r.absdiff });
  const descuadres = recon.filter(r => r.diff !== 0);
  const valorDescuadre = descuadres.reduce((s, r) => s + r.valor, 0);

  const catList = [{ id: 'all', name: 'Todas' }, ...RUMBA.CATS.map(c => ({ id: c.id, name: c.name }))];
  const titulo = 'Reporte de ventas · Discoteca Aurora';

  const doCSV = () => {
    exportCSV(`reporte-aurora-${range.from}_${range.to}.csv`, [
      [titulo], ['Rango', rangeLabel(range)], [],
      ['RESUMEN'], ['Ventas', total], ['Utilidad bruta', util], ['Margen %', margen], ['Mesas', R.mesas], ['Ítems', R.sales], ['Valor descuadre', valorDescuadre], [],
      ['MÉTODOS DE PAGO', 'Valor'], ...allPay.map(p => [p.name, p.v]), [],
      ['PRODUCTOS MÁS VENDIDOS', 'Cantidad', 'Venta'], ...top.map(t => [t.name, t.qty, t.total]), [],
      ['CUADRE INVENTARIO', 'Vendidas', 'Salidas', 'Diferencia', 'Valor en riesgo'], ...recon.map(r => [r.name, r.vendidas, r.descontadas, r.diff, r.valor]), [],
      ['VENTAS POR EMPLEADO', 'Mesas', 'Recaudado'], ...staff.map(s => [s.name, s.nmesas, s.pv]),
    ]);
    toast('CSV descargado', 'download');
  };
  const doPDF = () => { printPDF(titulo, 'Rango: ' + rangeLabel(range)); toast('Abriendo impresión — elige “Guardar como PDF”', 'download'); };

  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2 style={{ fontSize: 17 }}>Reporte de ventas</h2><div className="sub">{rangeLabel(range)} · {R.days} día(s)</div></div>
      </div>
      <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} onPDF={doPDF} live={R.live} />

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Ventas del período" value={COP(total)} icon="cash" color="var(--green)" trend={12} />
        <Stat label="Utilidad bruta" value={COP(util)} icon="chart" color="var(--accent)" sub={`Margen ${margen}%`} />
        <Stat label="Mesas / ítems" value={`${R.mesas} / ${R.sales}`} icon="mesas" color="var(--accent2)" />
        <Stat label="Descuadre inventario" value={descuadres.length ? COP(valorDescuadre) : '$0'} icon="alert" color={descuadres.length ? 'var(--red)' : 'var(--green)'} sub={`${descuadres.length} producto(s)`} />
      </div>

      {/* gráfico principal + balance */}
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start', marginBottom: 16 }}>
        <div className="card chart">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="chart-h">{R.days <= 1 ? 'Ventas por hora' : R.days <= 16 ? 'Ventas por día' : 'Ventas por semana'}</div>
            {R.live && <span className="live"><i />En vivo</span>}
          </div>
          <Bars data={R.bars} hotIndex={R.hot} />
        </div>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 6 }}>Balance del período</div>
          <div className="balance">
            <div className="bseg" style={{ width: (100 - margen) + '%', background: 'linear-gradient(90deg,#3a3a4a,#55556a)' }}>{100 - margen}%</div>
            <div className="bseg" style={{ width: margen + '%', background: 'var(--grad)' }}>{margen}%</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="bkpi"><span className="bl"><span className="dotc" style={{ background: 'var(--green)' }} />Ingresos</span><span className="bv">{COP(total)}</span></div>
            <div className="bkpi"><span className="bl"><span className="dotc" style={{ background: '#55556a' }} />Costo de producto</span><span className="bv">{COP(costo)}</span></div>
            <div className="bkpi"><span className="bl"><span className="dotc" style={{ background: 'var(--accent)' }} />Utilidad bruta</span><span className="bv" style={{ color: 'var(--green)' }}>{COP(util)}</span></div>
          </div>
        </div>
      </div>

      {/* cuadre inventario vs ventas */}
      {descuadres.length > 0 ? (
        <div className="alert-banner">
          <span className="ai"><Icon name="alert" s={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}><b>El inventario no cuadra con las ventas en {descuadres.length} producto(s).</b> Salieron más unidades de las vendidas — posible merma, consumo interno o venta sin registrar. Valor en riesgo: <b>{COP(valorDescuadre)}</b>.</div>
        </div>
      ) : (
        <div className="cuadre-ok"><span className="ci"><Icon name="check" s={18} /></span><div>El inventario cuadra con las ventas. Sin descuadres en este período. ✨</div></div>
      )}
      <div className="card" style={{ marginBottom: 16, overflow: 'auto' }}>
        <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Cuadre de inventario vs ventas</h2><span className="sub">Ordena tocando una columna</span></div>
        <table className="tbl">
          <thead><tr>
            <Th label="Producto" k="name" sorter={reconSort} />
            <Th label="Vendidas" k="vendidas" sorter={reconSort} right />
            <Th label="Salidas inventario" k="descontadas" sorter={reconSort} right />
            <Th label="Diferencia" k="diff" sorter={reconSort} right />
            <Th label="Valor en riesgo" k="valor" sorter={reconSort} right />
          </tr></thead>
          <tbody>
            {recon.map(r => (
              <tr key={r.id}>
                <td><div style={{ fontWeight: 700 }}>{r.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{r.sub}</div></td>
                <td className="r tnum">{r.vendidas}</td>
                <td className="r tnum">{r.descontadas}</td>
                <td className="r"><span className={'diff ' + (r.diff === 0 ? 'ok' : 'bad')}>{r.diff === 0 ? '—' : (r.diff > 0 ? '+' + r.diff : r.diff)}</span></td>
                <td className="r">{r.diff === 0 ? <span className="diff-pill ok">Cuadra</span> : <span className="diff-pill bad">{COP(r.valor)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagos + productos */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start', marginBottom: 16 }}>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 12 }}>Métodos de pago</div>
          <div className="fbar">
            {allPay.map(p => <button key={p.id} className={'fchip' + (pays.includes(p.id) ? ' on' : '')} onClick={() => togglePay(p.id)}><span className="fdot" style={{ background: p.color }} />{p.name}</button>)}
          </div>
          <PayBars data={payData} total={payTotal} />
          <div className="bkpi" style={{ borderTop: '1px solid var(--line)', borderBottom: 0, marginTop: 6 }}><span className="bl">Total filtrado</span><span className="bv">{COP(payTotal)}</span></div>
        </div>
        <div className="card">
          <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Productos más vendidos</h2></div>
          <div className="fbar" style={{ padding: '0 18px' }}>
            {catList.map(c => <button key={c.id} className={'fchip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
          </div>
          <table className="tbl">
            <thead><tr><Th label="Producto" k="name" sorter={topSort} /><Th label="Cant." k="qty" sorter={topSort} right /><Th label="Venta" k="total" sorter={topSort} right /></tr></thead>
            <tbody>
              {top.length === 0 ? <tr><td colSpan="3" className="muted" style={{ fontSize: 13 }}>Sin productos en esta categoría.</td></tr> :
                top.map(t => <tr key={t.id}><td><div style={{ fontWeight: 700 }}>{t.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{t.sub}</div></td><td className="r tnum">{t.qty}</td><td className="r strong tnum">{COP(t.total)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* empleados + turnos */}
      <div className="fbar">
        <span className="flabel">Empleado</span>
        <button className={'fchip' + (emp === 'all' ? ' on' : '')} onClick={() => setEmp('all')}>Todos</button>
        {RUMBA.STAFF.filter(s => s.active).map(s => <button key={s.id} className={'fchip' + (emp === s.id ? ' on' : '')} onClick={() => setEmp(s.id)}><span className="fdot" style={{ background: s.color }} />{s.name.split(' ')[0]}</button>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Ventas por empleado</h2></div>
          <table className="tbl">
            <thead><tr><Th label="Empleado" k="name" sorter={staffSort} /><Th label="Mesas" k="nmesas" sorter={staffSort} right /><Th label="Recaudado" k="pv" sorter={staffSort} right /></tr></thead>
            <tbody>
              {staff.map(s => <tr key={s.id}><td><div className="cell-name"><Avatar name={s.name} color={s.color} size="sm" />{s.name.split(' ')[0]}</div></td><td className="r tnum">{s.nmesas}</td><td className="r strong tnum">{COP(s.pv)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Detalle de mesas por turno</h2></div>
          <table className="tbl">
            <thead><tr><Th label="Turno" k="date" sorter={shiftSort} /><Th label="Mesas" k="tables" sorter={shiftSort} right /><Th label="Total" k="total" sorter={shiftSort} right /></tr></thead>
            <tbody>
              {shifts.length === 0 ? <tr><td colSpan="3" className="muted" style={{ fontSize: 13 }}>Sin turnos para este empleado.</td></tr> :
                shifts.map(s => <tr key={s.id}><td><div style={{ fontWeight: 700 }}>{s.date}</div><div className="muted" style={{ fontSize: 11.5 }}>{s.emp.split(' ')[0]} · {s.open}–{s.close}</div></td><td className="r tnum">{s.tables}</td><td className="r strong tnum">{COP(s.total)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- INVENTARIO + CONCEPTOS ---------------- */
function AdminInventario({ toast }) {
  const st = useRumba();
  const [cat, setCat] = useS_A('all');
  const [q, setQ] = useS_A('');
  const [restock, setRestock] = useS_A(null);
  const [qty, setQty] = useS_A(12);
  const [newP, setNewP] = useS_A(false);

  const cats = [{ id: 'all', name: 'Todas' }, ...RUMBA.CATS.map(c => ({ id: c.id, name: c.name }))];
  const list = st.inventory.filter(p => (cat === 'all' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const invValue = st.inventory.reduce((s, p) => s + (p.min > 0 ? p.cost * p.stock : 0), 0);

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Productos" value={st.inventory.length} icon="box" color="var(--accent)" />
        <Stat label="Valor del inventario" value={COPk(invValue)} icon="cash" color="var(--green)" sub="a precio de costo" />
        <Stat label="En alerta de stock" value={st.lowStock.length} icon="alert" color="var(--red)" />
      </div>

      {st.lowStock.length > 0 && (
        <div className="alert-banner">
          <span className="ai"><Icon name="alert" s={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}><b>Reponer pronto:</b> {st.lowStock.map(p => `${p.name} (${p.stock})`).join(', ')}.</div>
        </div>
      )}

      <div className="mesas-top">
        <div className="searchbox" style={{ width: 230 }}><Icon name="search" s={16} /><input placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs">{cats.map(c => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.name}</button>)}</div>
          <button className="btn pri" onClick={() => setNewP(true)}><Icon name="plus" /> Nuevo producto</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Producto</th><th>Categoría</th><th>Distribuidor</th><th>Stock</th><th className="r">Costo</th><th className="r">Precio</th><th className="r">Ganancia</th><th></th></tr></thead>
          <tbody>
            {list.map(p => {
              const tracked = p.min > 0;
              const ratio = tracked ? Math.min(p.stock / (p.min * 2), 1) : 1;
              const cls = !tracked ? '' : p.stock <= 0 ? 'out' : p.stock <= p.min ? 'warn' : '';
              return (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 700 }}>{p.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{p.unit}</div></td>
                  <td><Chip color="var(--accent)">{p.sub}</Chip></td>
                  <td className="muted">{p.dist}</td>
                  <td>{tracked ? <><span className="stockbar"><i className={cls} style={{ width: (ratio * 100) + '%' }} /></span><b className="tnum">{p.stock}</b></> : <span className="muted">No se controla</span>}</td>
                  <td className="r muted tnum">{COP(p.cost)}</td>
                  <td className="r tnum strong">{COP(p.price)}</td>
                  <td className="r tnum" style={{ color: 'var(--green)', fontWeight: 700 }}>{COP(profit(p))}</td>
                  <td className="r">{tracked && <button className="btn sm ghost" onClick={() => { setRestock(p); setQty(12); }}><Icon name="plus" s={14} /> Reabastecer</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {restock && (
        <Modal icon="box" title={'Reabastecer · ' + restock.name} onClose={() => setRestock(null)}
          footer={<><button className="btn ghost" onClick={() => setRestock(null)}>Cancelar</button>
            <button className="btn pri block" onClick={() => { st.restock(restock.id, qty); toast(`+${qty} ${restock.name}`, 'check'); setRestock(null); }}><Icon name="check" /> Agregar al stock</button></>}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Stock actual: <b style={{ color: 'var(--ink)' }}>{restock.stock}</b> · mínimo de alerta: {restock.min}</p>
          <Field label="Unidades a ingresar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="qbtn" onClick={() => setQty(q => Math.max(1, q - 6))}><Icon name="minus" s={16} /></button>
              <input className="inp" style={{ textAlign: 'center', maxWidth: 120 }} type="number" value={qty} onChange={e => setQty(Math.max(1, +e.target.value || 1))} />
              <button className="qbtn" onClick={() => setQty(q => q + 6)}><Icon name="plus" s={16} /></button>
              <span className="muted" style={{ fontSize: 13 }}>→ quedará en <b style={{ color: 'var(--green)' }}>{restock.stock + qty}</b></span>
            </div>
          </Field>
        </Modal>
      )}
      {newP && <NewProductModal onClose={() => setNewP(false)} onSave={p => { st.addProduct(p); toast('Producto creado', 'check'); setNewP(false); }} />}
    </div>
  );
}

function NewProductModal({ onClose, onSave }) {
  const [f, setF] = useS_A({ name: '', cat: 'licor', sub: 'Cerveza', dist: 'Bavaria', unit: 'Botella 330ml', cost: '', price: '', stock: '', min: '12' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const subs = (RUMBA.CATS.find(c => c.id === f.cat) || {}).subs || [];
  const valid = f.name && f.price;
  return (
    <Modal icon="tag" title="Nuevo concepto / producto" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn pri block" disabled={!valid} onClick={() => onSave({
          id: 'p' + Date.now(), name: f.name, dist: f.dist, cat: f.cat, sub: f.sub, unit: f.unit,
          cost: +f.cost || 0, price: +f.price || 0, stock: +f.stock || 0, min: +f.min || 0,
        })}><Icon name="check" /> Crear producto</button></>}>
      <Field label="Nombre del producto"><input className="inp" autoFocus placeholder="Ej. Águila, Aguardiente, Cuba Libre…" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="row2">
        <Field label="Categoría"><select className="sel" value={f.cat} onChange={e => { set('cat', e.target.value); set('sub', (RUMBA.CATS.find(c => c.id === e.target.value) || {}).subs[0]); }}>{RUMBA.CATS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Subcategoría"><select className="sel" value={f.sub} onChange={e => set('sub', e.target.value)}>{subs.map(s => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <div className="row2">
        <Field label="Distribuidor"><select className="sel" value={f.dist} onChange={e => set('dist', e.target.value)}>{['Bavaria', 'Postobón', 'AJE', 'Licores', 'Snacks', 'Casa', 'Tabaco', 'Otro'].map(d => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Presentación"><input className="inp" placeholder="Botella 330ml" value={f.unit} onChange={e => set('unit', e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="Costo (COP)"><input className="inp" type="number" placeholder="2200" value={f.cost} onChange={e => set('cost', e.target.value)} /></Field>
        <Field label="Precio venta (COP)"><input className="inp" type="number" placeholder="7000" value={f.price} onChange={e => set('price', e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="Stock inicial"><input className="inp" type="number" placeholder="48" value={f.stock} onChange={e => set('stock', e.target.value)} /></Field>
        <Field label="Alerta mínima (0 = no controlar)"><input className="inp" type="number" value={f.min} onChange={e => set('min', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- EMPLEADOS ---------------- */
function AdminEmpleados({ toast }) {
  const [staff, setStaff] = useS_A(RUMBA.STAFF.map(s => ({ ...s })));
  const [add, setAdd] = useS_A(false);
  const toggle = id => setStaff(s => s.map(x => x.id === id ? { ...x, active: !x.active } : x));
  return (
    <div>
      <div className="mesas-top">
        <div><h2 style={{ fontSize: 17, fontWeight: 800 }}>Equipo</h2><p className="muted" style={{ fontSize: 13 }}>{staff.filter(s => s.active).length} activos · reportes y logueos por empleado</p></div>
        <button className="btn pri" onClick={() => setAdd(true)}><Icon name="plus" /> Crear usuario</button>
      </div>
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Empleado</th><th>Rol</th><th>Turnos</th><th>Último logueo</th><th className="r">Ventas</th><th className="r">Recaudado</th><th className="r">Estado</th></tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} style={{ opacity: s.active ? 1 : .5 }}>
                <td><div className="cell-name"><Avatar name={s.name} color={s.color} />{s.name}<span className="muted" style={{ fontWeight: 500, fontSize: 12 }}>"{s.alias}"</span></div></td>
                <td><Chip color={s.color}>{s.role}</Chip></td>
                <td className="tnum">{s.shifts}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{s.lastLogin}</td>
                <td className="r tnum">{s.sales}</td>
                <td className="r strong tnum">{COP(s.total)}</td>
                <td className="r"><button className={'sw' + (s.active ? ' on' : '')} onClick={() => { toggle(s.id); toast(s.active ? 'Usuario desactivado' : 'Usuario activado', s.active ? 'lock' : 'check'); }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {add && (
        <Modal icon="users" title="Crear usuario" onClose={() => setAdd(false)}
          footer={<><button className="btn ghost" onClick={() => setAdd(false)}>Cancelar</button><button className="btn pri block" onClick={() => { setAdd(false); toast('Usuario creado · credenciales enviadas', 'check'); }}><Icon name="check" /> Crear y enviar acceso</button></>}>
          <div className="row2"><Field label="Nombre"><input className="inp" placeholder="Nombre completo" /></Field><Field label="Alias"><input className="inp" placeholder="Cómo lo llaman" /></Field></div>
          <Field label="Rol"><select className="sel"><option>Mesero</option><option>Cajero</option><option>Administrador</option></select></Field>
          <Field label="Teléfono / usuario"><input className="inp" placeholder="300 000 0000" /></Field>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- MI LOCAL (perfil) ---------------- */
function AdminPerfil({ toast }) {
  const st = useRumba();
  const ref = useR_A();
  const pick = e => { const f = e.target.files[0]; if (f) { st.setPhoto({ ...st.photo, biz: URL.createObjectURL(f) }); toast('Foto actualizada', 'check'); } };
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="profile-card" style={{ marginBottom: 16 }}>
        <div className="pcbg" />
        <div className="photo-edit" onClick={() => ref.current.click()} style={{ zIndex: 2 }}>
          <Avatar name="Discoteca Aurora" color="#7F77DD" size="lg" img={st.photo.biz} />
          <span className="cam"><Icon name="camera" s={14} /></span>
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
        </div>
        <div style={{ zIndex: 2 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Discoteca Aurora</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Medellín · Plan Pro · Local principal</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><Chip color="var(--green)">Activo</Chip><Chip color="var(--yellow)">Principal</Chip></div>
        </div>
      </div>
      <Personalizar />
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Datos del local</h2>
        <div className="row2"><Field label="Nombre"><input className="inp" defaultValue="Discoteca Aurora" /></Field><Field label="Tipo"><select className="sel"><option>Discoteca</option><option>Taberna</option><option>Bar</option></select></Field></div>
        <div className="row2"><Field label="Ciudad"><input className="inp" defaultValue="Medellín" /></Field><Field label="Dirección"><input className="inp" defaultValue="Cra. 70 #44-21" /></Field></div>
        <div className="row2"><Field label="NIT"><input className="inp" defaultValue="901.234.567-8" /></Field><Field label="Teléfono"><input className="inp" defaultValue="604 444 5566" /></Field></div>
        <button className="btn pri" style={{ marginTop: 4 }} onClick={() => toast('Datos guardados', 'check')}><Icon name="check" /> Guardar cambios</button>
      </div>
    </div>
  );
}

Object.assign(window, { AdminResumen, AdminReportes, AdminInventario, AdminEmpleados, AdminPerfil });
