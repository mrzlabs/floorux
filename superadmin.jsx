/* global React, Icon, Avatar, COP, COPk, Modal, Field, Stat, Chip, Bars, PayBars, Donut, RUMBA, useSort, Th, ReportToolbar, presetRange, rangeReport, rangeLabel, exportCSV, printPDF */
/* ============================================================
   RUMBA — Módulo SUPER ADMIN (comercios · reportes · usuarios · cuenta)
   ============================================================ */
const { useState: useS_S, useRef: useR_S } = React;

/* ---------------- COMERCIOS ---------------- */
function SuperComercios({ toast, biz, setBiz }) {
  const [add, setAdd] = useS_S(false);
  const [detail, setDetail] = useS_S(null);
  const toggle = id => setBiz(b => b.map(x => x.id === id ? { ...x, status: x.status === 'activo' ? 'inactivo' : 'activo' } : x));

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Comercios" value={biz.length} icon="biz" color="var(--accent)" />
        <Stat label="Activos" value={biz.filter(b => b.status === 'activo').length} icon="check" color="var(--green)" />
        <Stat label="Franquicias" value={biz.filter(b => b.kind === 'Franquicia').length} icon="tag" color="var(--accent2)" />
        <Stat label="Recaudo del mes" value={COPk(biz.reduce((s, b) => s + b.month, 0))} icon="cash" color="var(--yellow)" trend={11} />
      </div>

      <div className="mesas-top">
        <div><h2 style={{ fontSize: 17, fontWeight: 800 }}>Comercios enlazados</h2><p className="muted" style={{ fontSize: 13 }}>Administra tu local principal y sus franquicias</p></div>
        <button className="btn pri" onClick={() => setAdd(true)}><Icon name="plus" /> Crear comercio</button>
      </div>

      <div className="biz-grid">
        {biz.map(b => (
          <div className={'biz' + (b.status === 'inactivo' ? ' off' : '')} key={b.id}>
            <div className="biz-top">
              <Avatar name={b.name} color={b.color} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="bn">{b.name}</div><div className="bc">{b.type} · {b.city}</div></div>
              <span className={'kind-pill ' + (b.kind === 'Principal' ? 'princ' : 'fran')}>{b.kind}</span>
            </div>
            <div className="biz-row"><span>Dueño</span><b>{b.owner}</b></div>
            <div className="biz-row"><span>Plan · usuarios</span><b>{b.plan} · {b.users}</b></div>
            <div className="biz-row"><span>Recaudo del mes</span><b>{b.status === 'activo' ? COPk(b.month) : '—'}{b.status === 'activo' && <span className={b.growth >= 0 ? 'up' : 'down'} style={{ fontSize: 11, marginLeft: 6 }}>{b.growth >= 0 ? '▲' : '▼'}{Math.abs(b.growth)}%</span>}</b></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn sm pri" style={{ flex: 1 }} onClick={() => setDetail(b)}><Icon name="chart" s={15} /> Ver detalle</button>
              <button className={'sw' + (b.status === 'activo' ? ' on' : '')} onClick={() => { toggle(b.id); toast(b.status === 'activo' ? `${b.name} desactivado` : `${b.name} activado`, b.status === 'activo' ? 'lock' : 'check'); }} />
            </div>
          </div>
        ))}
      </div>

      {add && (
        <Modal icon="biz" title="Crear comercio" onClose={() => setAdd(false)}
          footer={<><button className="btn ghost" onClick={() => setAdd(false)}>Cancelar</button><button className="btn pri block" onClick={() => { setAdd(false); toast('Comercio creado · invitación enviada al dueño', 'check'); }}><Icon name="check" /> Crear comercio</button></>}>
          <div className="row2"><Field label="Nombre del comercio"><input className="inp" placeholder="Ej. Club Pacífico" /></Field><Field label="Tipo"><select className="sel"><option>Discoteca</option><option>Taberna</option><option>Bar</option></select></Field></div>
          <div className="row2"><Field label="Ciudad"><input className="inp" placeholder="Ciudad" /></Field><Field label="Vínculo"><select className="sel"><option>Franquicia</option><option>Principal</option></select></Field></div>
          <Field label="Dueño / administrador"><input className="inp" placeholder="Nombre del administrador" /></Field>
          <Field label="Plan"><select className="sel"><option>Pro</option><option>Básico</option></select></Field>
        </Modal>
      )}
      {detail && <BizDetail biz={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

const BIZ_BASIC = {
  aurora: { nit: '901.234.567-8', addr: 'Cra. 70 #44-21, Laureles', phone: '604 444 5566', since: 'Marzo 2023', mgr: '+57 312 880 4410' },
  farol: { nit: '901.882.114-2', addr: 'Cll 85 #12-30, Chicó', phone: '601 742 1180', since: 'Agosto 2024', mgr: '+57 311 220 7781' },
  neon: { nit: '901.553.990-4', addr: 'Av. 6N #28-45, Granada', phone: '602 661 7788', since: 'Enero 2024', mgr: '+57 318 905 1140' },
  puerto: { nit: '901.220.771-1', addr: 'Cll 24 #7-02, Centro', phone: '605 644 2210', since: 'Noviembre 2024', mgr: '+57 300 771 5566' },
  luna: { nit: '901.117.345-9', addr: 'Cra. 8 #19-50, Centro', phone: '606 333 9090', since: 'Febrero 2025', mgr: '+57 320 118 3490' },
};
const scaleBars = (arr, target) => { const s = arr.reduce((a, b) => a + b.v, 0) || 1; return arr.map(x => ({ ...x, v: Math.round(x.v / s * target) })); };

function BizDetail({ biz, onClose }) {
  const [tab, setTab] = useS_S('ind');
  const [range, setRange] = useS_S(presetRange('30'));
  const topSort = useSort('total');
  const b = BIZ_BASIC[biz.id] || {};
  const R = rangeReport(range, (biz.month || 1) / 227e6);
  const total = R.total, bars = R.bars, hot = R.hot, mesas = R.mesas;
  const ticket = Math.round(total / Math.max(mesas, 1));
  const util = Math.round(total * 0.58), margen = 58;
  const payData = RUMBA.PAYMENTS.map(p => ({ ...p, v: R.pay[p.id] }));
  const top = topSort.apply(RUMBA.TOP_PRODUCTS.map(t => { const p = RUMBA.productById(t.id); return { id: t.id, name: p.name, sub: p.sub, qty: Math.round(t.qty * R.scale), total: Math.round(t.total * R.scale) }; }));
  const sr = [.40, .34, .26];
  const staff = RUMBA.STAFF.filter(s => s.active).slice(0, 3).map((s, i) => ({ ...s, pv: Math.round(total * sr[i]), nmesas: Math.round(mesas * sr[i]) }));
  const alertas = Math.max(1, Math.round(biz.tables / 4));
  const doCSV = () => { exportCSV(`reporte-${biz.id}-${range.from}_${range.to}.csv`, [
    [biz.name + ' · ' + biz.city], ['Rango', rangeLabel(range)], [],
    ['Ventas', total], ['Mesas', mesas], ['Ticket promedio', ticket], ['Utilidad', util], [],
    ['MÉTODOS DE PAGO', 'Valor'], ...payData.map(p => [p.name, p.v]), [],
    ['PRODUCTOS', 'Cantidad', 'Venta'], ...top.map(t => [t.name, t.qty, t.total]), [],
    ['EMPLEADO', 'Mesas', 'Recaudado'], ...staff.map(s => [s.name, s.nmesas, s.pv]),
  ]); };
  const doPDF = () => printPDF(biz.name + ' · indicadores', 'Rango: ' + rangeLabel(range));

  const Row = ({ k, v }) => (<div className="biz-row" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}><span>{k}</span><b style={{ textAlign: 'right' }}>{v}</b></div>);

  return (
    <Modal wide icon="biz" onClose={onClose}
      title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{biz.name}<span className={'kind-pill ' + (biz.kind === 'Principal' ? 'princ' : 'fran')}>{biz.kind}</span><Chip color={biz.status === 'activo' ? 'var(--green)' : 'var(--red)'}>{biz.status === 'activo' ? 'Activo' : 'Inactivo'}</Chip></span>}>
      <div className="biz-top" style={{ marginBottom: 16 }}>
        <Avatar name={biz.name} color={biz.color} size="lg" />
        <div><div style={{ fontSize: 18, fontWeight: 800 }}>{biz.name}</div><div className="muted" style={{ fontSize: 13 }}>{biz.type} · {biz.city} · {biz.owner}</div></div>
      </div>

      <div className="tabs" style={{ display: 'inline-flex', marginBottom: 16 }}>
        <button className={tab === 'ind' ? 'on' : ''} onClick={() => setTab('ind')}>Indicadores</button>
        <button className={tab === 'datos' ? 'on' : ''} onClick={() => setTab('datos')}>Datos básicos</button>
      </div>

      {tab === 'datos' ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <Row k="Tipo de negocio" v={biz.type} />
            <Row k="Ciudad" v={biz.city} />
            <Row k="Dirección" v={b.addr} />
            <Row k="Teléfono" v={b.phone} />
            <Row k="NIT" v={b.nit} />
          </div>
          <div>
            <Row k="Vínculo" v={biz.kind} />
            <Row k="Plan" v={biz.plan} />
            <Row k="Administrador" v={biz.owner} />
            <Row k="Contacto admin" v={b.mgr} />
            <Row k="Cliente desde" v={b.since} />
          </div>
          <div className="grid g3" style={{ gridColumn: '1 / -1', marginTop: 14 }}>
            <Stat label="Usuarios" value={biz.users} icon="users" color="var(--accent)" />
            <Stat label="Mesas configuradas" value={biz.tables} icon="mesas" color="var(--accent2)" />
            <Stat label="Productos en alerta" value={alertas} icon="alert" color="var(--orange)" />
          </div>
        </div>
      ) : (
        <div>
          <div className="section-h" style={{ marginTop: 0 }}>
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>Indicadores a máximo detalle</div>
          </div>
          <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} onPDF={doPDF} live={R.live} />
          <div className="grid g3" style={{ marginBottom: 14 }}>
            <Stat label="Ventas del período" value={COP(total)} icon="cash" color="var(--green)" trend={biz.growth} />
            <Stat label="Mesas" value={mesas} icon="mesas" color="var(--accent)" />
            <Stat label="Ticket promedio" value={COP(ticket)} icon="receipt" color="var(--accent2)" />
          </div>
          <div className="grid g2" style={{ marginBottom: 14 }}>
            <Stat label="Utilidad bruta" value={COP(util)} icon="chart" color="var(--yellow)" sub={'Margen ' + margen + '%'} />
            <Stat label="Participación en la red" value={Math.round(biz.month / 220300000 * 100) + '%'} icon="biz" color="var(--accent3)" sub="del recaudo total" />
          </div>
          <div className="card chart" style={{ marginBottom: 14 }}>
            <div className="chart-h">{R.days <= 1 ? 'Ventas por hora' : R.days <= 16 ? 'Ventas por día' : 'Ventas por semana'}</div>
            <Bars data={bars} hotIndex={hot} />
          </div>
          <div className="grid g2" style={{ alignItems: 'start', marginBottom: 14 }}>
            <div className="card chart"><div className="chart-h" style={{ marginBottom: 14 }}>Métodos de pago</div><PayBars data={payData} total={total} /></div>
            <div className="card">
              <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Productos más vendidos</h2></div>
              <table className="tbl"><thead><tr><Th label="Producto" k="name" sorter={topSort} /><Th label="Cant." k="qty" sorter={topSort} right /><Th label="Venta" k="total" sorter={topSort} right /></tr></thead>
                <tbody>{top.map(t => <tr key={t.id}><td><div style={{ fontWeight: 700 }}>{t.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{t.sub}</div></td><td className="r tnum">{t.qty}</td><td className="r strong tnum">{COP(t.total)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="section-h" style={{ margin: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Ventas por empleado</h2></div>
            <table className="tbl"><thead><tr><th>Empleado</th><th>Rol</th><th className="r">Mesas</th><th className="r">Recaudado</th></tr></thead>
              <tbody>{staff.map(s => <tr key={s.id}><td><div className="cell-name"><Avatar name={s.name} color={s.color} size="sm" />{s.name.split(' ')[0]}</div></td><td><Chip color={s.color}>{s.role}</Chip></td><td className="r tnum">{s.nmesas}</td><td className="r strong tnum">{COP(s.pv)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- REPORTES CONSOLIDADOS ---------------- */
function SuperReportes({ biz, toast }) {
  const [range, setRange] = useS_S(presetRange('30'));
  const active = biz.filter(b => b.status === 'activo');
  const monthlyTotal = active.reduce((s, b) => s + b.month, 0);
  const R = rangeReport(range, (monthlyTotal || 1) / 227e6);
  const dayShare = R.days / 30;
  const perBiz = active.map(b => ({ ...b, val: Math.round(b.month * dayShare) })).sort((a, b) => b.val - a.val);
  const max = Math.max(...perBiz.map(b => b.val), 1);
  const consolidated = R.total;

  const doCSV = () => { exportCSV(`red-consolidado-${range.from}_${range.to}.csv`, [
    ['Reporte consolidado · Grupo MRZ Nightlife'], ['Rango', rangeLabel(range)], [],
    ['COMERCIO', 'Ciudad', 'Vínculo', 'Recaudo'], ...perBiz.map(b => [b.name, b.city, b.kind, b.val]), [],
    ['Total consolidado', consolidated],
  ]); toast('CSV descargado', 'download'); };
  const doPDF = () => { printPDF('Reporte consolidado · Grupo MRZ Nightlife', 'Rango: ' + rangeLabel(range)); toast('Abriendo impresión — elige “Guardar como PDF”', 'download'); };

  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2 style={{ fontSize: 17 }}>Reportes consolidados</h2><div className="sub">{rangeLabel(range)} · {R.days} día(s)</div></div>
      </div>
      <ReportToolbar range={range} setRange={setRange} onCSV={doCSV} onPDF={doPDF} live={R.live} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Recaudo consolidado" value={COP(consolidated)} icon="cash" color="var(--green)" trend={11} />
        <Stat label="Comercios activos" value={active.length} icon="biz" color="var(--accent)" />
        <Stat label="Ticket promedio red" value={COP(58200)} icon="receipt" color="var(--accent2)" />
        <Stat label="Mesas totales" value={biz.reduce((s, b) => s + b.tables, 0)} icon="mesas" color="var(--yellow)" />
      </div>
      <div className="card chart" style={{ marginBottom: 16 }}>
        <div className="chart-h">{R.days <= 1 ? 'Recaudo por hora' : R.days <= 16 ? 'Recaudo por día' : 'Recaudo por semana'}</div>
        <Bars data={R.bars} hotIndex={R.hot} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 18 }}>Recaudo por comercio</div>
          {perBiz.map(b => (
            <div className="pbar-row" key={b.id}>
              <div className="pl" style={{ flex: '0 0 160px' }}><span className="dotc" style={{ background: b.color }} />{b.name}</div>
              <div className="pbar-track"><div className="pbar-fill" style={{ width: (b.val / max * 100) + '%', background: b.color }} /></div>
              <div className="pv tnum">{COPk(b.val)}</div>
            </div>
          ))}
        </div>
        <div className="card chart">
          <div className="chart-h" style={{ marginBottom: 18 }}>Participación de la red</div>
          <Donut center={COPk(consolidated)} data={perBiz.map(b => ({ name: b.name, color: b.color, v: b.val }))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- USUARIOS ---------------- */
function SuperUsuarios({ toast, biz }) {
  const users = [
    { name: 'Laura Restrepo', role: 'Admin', b: 'Discoteca Aurora', last: 'Hoy 9:10 p. m.', color: '#7F77DD' },
    { name: 'Andrés Gómez', role: 'Admin', b: 'Taberna El Farol', last: 'Hoy 8:55 p. m.', color: '#27C3D8' },
    { name: 'Mónica Vélez', role: 'Admin', b: 'Club Neón', last: 'Ayer 11:40 p. m.', color: '#F5C400' },
    { name: 'Julián Mejía', role: 'Admin', b: 'Bar Puerto Madero', last: 'Hace 2 días', color: '#B57BE0' },
    { name: 'Carolina Díaz', role: 'Admin', b: 'Taberna La Luna', last: 'Hace 9 días', color: '#E0708A' },
  ];
  return (
    <div>
      <div className="mesas-top">
        <div><h2 style={{ fontSize: 17, fontWeight: 800 }}>Administradores</h2><p className="muted" style={{ fontSize: 13 }}>Un administrador por comercio · logueos</p></div>
        <button className="btn pri" onClick={() => toast('Invitación de administrador enviada', 'check')}><Icon name="plus" /> Invitar admin</button>
      </div>
      <div className="card" style={{ overflow: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Comercio</th><th>Último logueo</th></tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}>
                <td><div className="cell-name"><Avatar name={u.name} color={u.color} />{u.name}</div></td>
                <td><Chip color="var(--accent)">{u.role}</Chip></td>
                <td className="muted">{u.b}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{u.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- CUENTA ---------------- */
function SuperCuenta({ toast }) {
  const ref = useR_S();
  const [img, setImg] = useS_S(null);
  const pick = e => { const f = e.target.files[0]; if (f) { setImg(URL.createObjectURL(f)); toast('Foto actualizada', 'check'); } };
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="profile-card" style={{ marginBottom: 16 }}>
        <div className="pcbg" />
        <div className="photo-edit" onClick={() => ref.current.click()} style={{ zIndex: 2 }}>
          <Avatar name="MRZ Grupo" color="#B57BE0" size="lg" img={img} />
          <span className="cam"><Icon name="camera" s={14} /></span>
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
        </div>
        <div style={{ zIndex: 2 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Grupo MRZ Nightlife</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Super administrador · 5 comercios</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><Chip color="var(--accent3)">Super Admin</Chip></div>
        </div>
      </div>
      <Personalizar />
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Datos de la cuenta</h2>
        <div className="row2"><Field label="Razón social"><input className="inp" defaultValue="Grupo MRZ Nightlife S.A.S." /></Field><Field label="Contacto"><input className="inp" defaultValue="Mauricio Ríos" /></Field></div>
        <div className="row2"><Field label="Correo"><input className="inp" defaultValue="grupo@mrzlabs.dev" /></Field><Field label="Teléfono"><input className="inp" defaultValue="350 380 3010" /></Field></div>
        <button className="btn pri" style={{ marginTop: 4 }} onClick={() => toast('Datos guardados', 'check')}><Icon name="check" /> Guardar cambios</button>
      </div>
    </div>
  );
}

Object.assign(window, { SuperComercios, SuperReportes, SuperUsuarios, SuperCuenta });
