/* global React, ReactDOM, maylo, RUMBA, useRumba, RumbaProvider, Icon, Avatar, COP, COPk,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSlider, TweakButton,
   AdminResumen, AdminReportes, AdminInventario, AdminEmpleados, AdminPerfil,
   SuperComercios, SuperReportes, SuperUsuarios, SuperCuenta,
   EmpMesas, EmpTurno, EmpHistorial */
const { useState: useS_M, useEffect: useE_M, useRef: useR_M } = React;

/* ---------- navegación por rol ---------- */
const NAV = {
  super: {
    name: 'Super Admin', icon: 'super', shop: { name: 'Grupo MRZ Nightlife', sub: '5 comercios · Super Admin', color: '#B57BE0' },
    items: [
      { id: 'comercios', label: 'Comercios', icon: 'biz', title: 'Comercios', sub: 'Tu red de discotecas y tabernas' },
      { id: 'reportes', label: 'Reportes', icon: 'chart', title: 'Reportes consolidados', sub: 'Toda la red en un vistazo' },
      { id: 'usuarios', label: 'Administradores', icon: 'users', title: 'Administradores', sub: 'Usuarios y logueos' },
      { id: 'cuenta', label: 'Mi cuenta', icon: 'user', title: 'Mi cuenta', sub: 'Perfil del super administrador' },
    ],
    peek: { h: 'Tu red', t: 'Club Neón bajó 3% esta semana 👀 ¿Revisamos su reporte?' },
  },
  admin: {
    name: 'Admin', icon: 'admin', shop: { name: 'Discoteca Aurora', sub: 'Medellín · Plan Pro', color: '#7F77DD' },
    items: [
      { id: 'resumen', label: 'Resumen', icon: 'dash', title: 'Resumen del local', sub: 'Viernes · noche en curso' },
      { id: 'reportes', label: 'Reportes', icon: 'chart', title: 'Reportes', sub: 'Ventas diarias, semanales y mensuales' },
      { id: 'inventario', label: 'Inventario', icon: 'box', title: 'Inventario y conceptos', sub: 'Stock, ganancia y alertas' },
      { id: 'empleados', label: 'Equipo', icon: 'users', title: 'Equipo', sub: 'Empleados, reportes y logueos' },
      { id: 'perfil', label: 'Mi local', icon: 'user', title: 'Mi local', sub: 'Datos y personalización' },
    ],
    peek: { h: 'Inventario', t: 'Ojo: la Poker está en 8 unidades y la Corona se agotó 🍺' },
  },
  empleado: {
    name: 'Empleado', icon: 'empleado', shop: { name: 'Yulieth Mosquera', sub: 'Cajera · "La china"', color: '#27C3D8' },
    items: [
      { id: 'mesas', label: 'Mesas', icon: 'mesas', title: 'Mesas', sub: 'Abre, despacha y cobra' },
      { id: 'turno', label: 'Mi turno', icon: 'clock', title: 'Mi turno', sub: 'Resumen y cierre' },
      { id: 'historial', label: 'Historial', icon: 'history', title: 'Mi historial', sub: 'Lo que has vendido' },
    ],
    peek: { h: 'Tu turno', t: '¡A darle! Abre una mesa y empieza a despachar 🎺' },
  },
};
const VIEWS_C = {
  'super:comercios': SuperComercios, 'super:reportes': SuperReportes, 'super:usuarios': SuperUsuarios, 'super:cuenta': SuperCuenta,
  'admin:resumen': AdminResumen, 'admin:reportes': AdminReportes, 'admin:inventario': AdminInventario, 'admin:empleados': AdminEmpleados, 'admin:perfil': AdminPerfil,
  'empleado:mesas': EmpMesas, 'empleado:turno': EmpTurno, 'empleado:historial': EmpHistorial,
};

/* ---------- temas (Tweaks) ---------- */
/* las paletas viven en ui.jsx (PALETTES); el tema se guarda en el store (st.ui) */

/* ---------- Maylo drawer ---------- */
function MayloDrawer({ open, onClose, role, view, alerts, dancing, onDance }) {
  const cfg = NAV[role];
  const intro = {
    super: 'Soy Maylo, tu copiloto de la red. Vigilo el recaudo de cada comercio y te aviso si alguno se cae o se desconecta.',
    admin: 'Soy Maylo. Te aviso apenas un producto se va a acabar y te recuerdo cuando un turno se cierra para que nada se te escape.',
    empleado: 'Soy Maylo, tu asistente de barra. Abre mesas, despacha del inventario y yo te aviso si algo se está agotando.',
  }[role];
  return (
    <div className={'drawer' + (open ? ' open' : '')}>
      <div className="drawer-top">
        <div className="dr-maylo-wrap"><div className={'dr-maylo' + (dancing ? ' dancing' : '')} dangerouslySetInnerHTML={{ __html: maylo({ eyes: dancing ? 'happy' : 'open', mouth: 'talk', arms: 'wave', panel: true }) }} /></div>
        <div className="dr-id"><b>Maylo</b><span>Asistente · {cfg.name}</span></div>
        <button className="dr-x" onClick={onClose}><Icon name="close" s={18} /></button>
      </div>
      <div className="bubble">{intro}</div>

      <div className="dr-sec">Alertas {alerts.length > 0 && `· ${alerts.length}`}</div>
      {alerts.length === 0
        ? <p className="muted" style={{ fontSize: 13 }}>Todo en orden por ahora. ✨</p>
        : <div className="alerts">{alerts.map((a, i) => (
            <div className="alert-i" key={i}>
              <span className="aic" style={{ background: a.color + '22', color: a.color }}><Icon name={a.icon} s={16} /></span>
              <div><b>{a.title}</b><br /><span className="muted">{a.body}</span></div>
            </div>
          ))}</div>}

      <div className="dr-sec">Tips para esta vista</div>
      <ul className="tips">
        {(NAV[role].items.find(i => i.id === view)?.id === view) && TIPS[role + ':' + view]?.map((t, i) => <li key={i}><span className="tk" />{t}</li>)}
      </ul>
      <button className="btn pri block" style={{ marginTop: 18 }} onClick={onDance}>🎺 ¡Que Maylo baile ska!</button>
    </div>
  );
}
const TIPS = {
  'super:comercios': ['Apaga un comercio para suspender su acceso al instante.', 'El sello dorado marca tu local principal.', 'Toca “Reportes” en cada tarjeta para ver su detalle.'],
  'super:reportes': ['Compara comercios por recaudo del mes.', 'La dona muestra cuánto aporta cada local a la red.'],
  'super:usuarios': ['Cada comercio tiene un admin responsable.', 'Revisa los logueos para detectar cuentas inactivas.'],
  'super:cuenta': ['Sube tu logo para personalizar la cuenta.'],
  'admin:resumen': ['Tu noche va arriba: +12% vs ayer.', 'Te marco en rojo lo que se está agotando.'],
  'admin:reportes': ['Cambia entre Hoy, Semana y Mes arriba.', 'Descarga el PDF para enviarlo al dueño.', 'Mira qué empleado vende más.'],
  'admin:inventario': ['Crea conceptos: licor, bebida, snack…', 'Define la alerta mínima para que te avise.', 'El empleado también puede reabastecer.'],
  'admin:empleados': ['Activa o desactiva un empleado al instante.', 'Mira ventas y logueos por persona.'],
  'admin:perfil': ['Sube la foto de tu local.', 'Mantén tus datos al día para la facturación.'],
  'empleado:mesas': ['Toca una mesa libre para abrirla con un alias.', 'Cada producto que sumas baja del inventario.', 'Crea las mesas que necesites con “Crear mesa”.'],
  'empleado:turno': ['Cierra todas las mesas antes de cerrar el turno.', 'Al cerrar, le mando el reporte al admin.'],
  'empleado:historial': ['Aquí queda todo lo que cobraste.', 'Tus turnos anteriores con su detalle.'],
};

/* ---------- Shell ---------- */
function Shell() {
  const st = useRumba();
  const [role, setRole] = useS_M('empleado');
  const [view, setView] = useS_M('mesas');
  const [sideOpen, setSideOpen] = useS_M(false);
  const [help, setHelp] = useS_M(false);
  const [peek, setPeek] = useS_M(true);
  const [toast, setToast] = useS_M(null);
  const [dancing, setDancing] = useS_M(false);
  const [biz, setBiz] = useS_M(RUMBA.BIZ.map(b => ({ ...b })));
  const peekT = useR_M();

  /* aplicar tema desde el store */
  useE_M(() => {
    const r = document.documentElement;
    const [a, b, c] = st.ui.palette || ['#7F77DD', '#27C3D8', '#B57BE0'];
    r.style.setProperty('--accent', a); r.style.setProperty('--accent2', b); r.style.setProperty('--accent3', c);
    r.style.setProperty('--r-lg', st.ui.radius + 'px'); r.style.setProperty('--r-md', Math.round(st.ui.radius * .8) + 'px'); r.style.setProperty('--r-sm', Math.round(st.ui.radius * .55) + 'px');
    r.setAttribute('data-theme', st.ui.mode || 'dark');
    document.body.style.fontSize = (st.ui.font || 14) + 'px';
  }, [st.ui]);

  const fire = (msg, icon) => { setToast({ msg, icon }); setTimeout(() => setToast(null), 2400); };
  const go = (r) => { setRole(r); setView(NAV[r].items[0].id); setHelp(false); setSideOpen(false); };
  const dance = () => { setDancing(true); fire('¡Eso! 🎺 Maylo está skankin\'', 'spark'); setTimeout(() => setDancing(false), 4800); };

  useE_M(() => { setPeek(true); clearTimeout(peekT.current); peekT.current = setTimeout(() => setPeek(false), 6000); }, [role, view]);

  /* alertas que vigila Maylo */
  const alerts = [];
  st.lowStock.forEach(p => alerts.push({ icon: 'box', color: p.stock <= 0 ? '#E0708A' : '#f59e42', title: p.stock <= 0 ? `${p.name} agotado` : `${p.name} bajo (${p.stock})`, body: p.stock <= 0 ? 'Sin stock — reabastece ya.' : `Quedan ${p.stock}, mínimo ${p.min}.` }));
  if (role === 'empleado' && st.shift.open) {
    const ab = st.mesas.filter(m => m.status === 'ocupada');
    if (ab.length) alerts.push({ icon: 'mesas', color: '#27C3D8', title: `${ab.length} mesa(s) abiertas`, body: 'Recuerda cerrarlas antes del cierre de turno.' });
  }
  const cfg = NAV[role];
  const item = cfg.items.find(i => i.id === view) || cfg.items[0];
  const Body = VIEWS_C[role + ':' + view] || (() => null);
  const extraProps = role === 'super' ? { biz, setBiz } : {};

  return (
    <div className="app">
      <aside className={'side' + (sideOpen ? ' open' : '')}>
        <div className="brand">
          <span className="brand-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19V8l7-4 7 4v11M9 19v-5h6v5" stroke="#0b0a12" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="10" r="1.6" fill="#0b0a12" /></svg></span>
          <div><div className="brand-tx">Rumba<span>.</span></div><div className="brand-sub">MRZ · Nightlife</div></div>
        </div>
        <div className="rolepick">
          {['super', 'admin', 'empleado'].map(r => (
            <button key={r} className={role === r ? 'on' : ''} onClick={() => go(r)}><Icon name={NAV[r].icon} s={16} />{r === 'super' ? 'Super' : NAV[r].name}</button>
          ))}
        </div>
        <div className="navlabel">{cfg.name}</div>
        <nav className="nav">
          {cfg.items.map(it => (
            <button key={it.id} className={'nav-i' + (view === it.id ? ' on' : '')} onClick={() => { setView(it.id); setSideOpen(false); }}>
              <Icon name={it.icon} /><span>{it.label}</span>
              {role === 'admin' && it.id === 'inventario' && st.lowStock.length > 0 && <span className="ncount">{st.lowStock.length}</span>}
            </button>
          ))}
        </nav>
        <div className="shop"><Avatar name={cfg.shop.name} color={cfg.shop.color} /><div style={{ minWidth: 0 }}><b>{cfg.shop.name}</b><span>{cfg.shop.sub}</span></div></div>
      </aside>
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="burger" onClick={() => setSideOpen(true)}><Icon name="menu" /></button>
            <div className="tt"><h1>{item.title}{role === 'empleado' && st.shift.open && view === 'mesas' && <span className="live"><i />En vivo</span>}</h1><p>{item.sub}</p></div>
          </div>
          <div className="top-actions">
            <div className="searchbox"><Icon name="search" s={18} /><input placeholder="Buscar…" /></div>
            <button className="icon-btn" onClick={() => { setHelp(true); setPeek(false); }}>
              <Icon name="bell" />{alerts.length > 0 && <span className="dot" />}
            </button>
          </div>
        </header>
        <div className="content"><PrintHead /><Body toast={fire} {...extraProps} /></div>
      </main>

      {/* Maylo dock */}
      <div className="maylo-dock">
        {peek && !help && (
          <div className="peek" onClick={() => { setHelp(true); setPeek(false); }}>
            <div className="pkh"><Icon name="spark" s={14} /> Maylo · {cfg.peek.h}</div>
            <p>{alerts.length && role !== 'super' ? alerts[0].title + ' — ' + alerts[0].body : cfg.peek.t}</p>
            <button className="peek-x" onClick={e => { e.stopPropagation(); setPeek(false); }}>×</button>
          </div>
        )}
        <button className={'fab' + (help ? ' on' : '') + (dancing ? ' dancing' : '')} onClick={() => setHelp(h => !h)}>
          <span className="fab-ring" />
          <span className="fab-maylo" dangerouslySetInnerHTML={{ __html: maylo({ arms: 'wave', glow: false, panel: false, eyes: dancing ? 'happy' : 'open', mouth: 'smile' }) }} />
          {alerts.length > 0 && !help && <span className="fab-badge">{alerts.length}</span>}
        </button>
      </div>
      <MayloDrawer open={help} onClose={() => setHelp(false)} role={role} view={view} alerts={alerts} dancing={dancing} onDance={dance} />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast"><Icon name={toast.icon || 'check'} s={18} />{toast.msg}</div>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Estilo de la noche" />
        <TweakToggle label="Tema claro" value={st.ui.mode === 'light'} onChange={v => st.setUI({ mode: v ? 'light' : 'dark' })} />
        <TweakColor label="Tema" value={st.ui.palette} options={PALETTES.map(p => p.c)} onChange={v => st.setUI({ palette: v })} />
        <TweakSlider label="Redondez" value={st.ui.radius} min={6} max={26} step={1} unit="px" onChange={v => st.setUI({ radius: v })} />
        <TweakSlider label="Tamaño de texto" value={st.ui.font} min={12} max={16} step={1} unit="px" onChange={v => st.setUI({ font: v })} />
        <TweakSection label="Demo" />
        <TweakButton label="Reiniciar datos del demo" onClick={() => { st.resetDemo(); fire('Demo reiniciado', 'spark'); }} />
      </TweaksPanel>
    </div>
  );
}

function App() { return <RumbaProvider><Shell /></RumbaProvider>; }
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
