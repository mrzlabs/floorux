/* global React, useRumba, Icon, Avatar, COP, COPk, Modal, Field, RUMBA, initials, maylo */
/* ============================================================
   RUMBA — Módulo EMPLEADO (turno + mesas + POS)
   ============================================================ */
const { useState: useStateE, useRef: useRefE, useMemo: useMemoE } = React;

const mesaTotal = m => m.items.reduce((s, i) => s + i.price * i.qty, 0);
const sinceLabel = ts => {
  if (!ts) return '';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return min + ' min';
  return Math.floor(min / 60) + 'h ' + (min % 60) + 'm';
};

/* ---------------- POS modal ---------------- */
function MesaPOS({ mesa, onClose }) {
  const st = useRumba();
  const [cat, setCat] = useStateE('all');
  const [q, setQ] = useStateE('');
  const [phase, setPhase] = useStateE('order');
  const [pay, setPay] = useStateE(null);
  const [evi, setEvi] = useStateE(null);
  const fileRef = useRefE();

  const live = st.mesas.find(m => m.id === mesa.id) || mesa;
  const total = mesaTotal(live);
  const cats = [{ id: 'all', name: 'Todo' }, ...RUMBA.CATS.map(c => ({ id: c.id, name: c.name }))];
  const list = st.inventory.filter(p =>
    (cat === 'all' || p.cat === cat) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sub.toLowerCase().includes(q.toLowerCase())));

  const pickEvi = e => { const f = e.target.files[0]; if (f) setEvi(URL.createObjectURL(f)); };
  const confirm = () => { st.closeMesa(mesa.id, pay, evi); onClose('cerrada', total, pay); };

  return (
    <Modal wide icon="mesas" onClose={() => onClose()}
      title={<span>{live.name}{live.alias ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> · {live.alias}</span> : ''}</span>}>
      {phase === 'order' ? (
        <div className="pos">
          {/* picker */}
          <div className="pos-pick">
            <div className="pos-cats">
              <div className="searchbox" style={{ width: '100%', marginBottom: 4 }}>
                <Icon name="search" s={16} />
                <input placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              {cats.map(c => (
                <button key={c.id} className={'catbtn' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.name}</button>
              ))}
            </div>
            <div className="pick-list">
              {list.map(p => {
                const out = p.min > 0 && p.stock <= 0;
                const low = p.min > 0 && p.stock > 0 && p.stock <= p.min;
                return (
                  <button key={p.id} className="prod" disabled={out} onClick={() => st.addItem(mesa.id, p)}>
                    <span className={'pstk' + (out || low ? ' low' : '')}>{p.min > 0 ? (out ? 'Agotado' : p.stock) : '∞'}</span>
                    <span className="pn">{p.name}</span>
                    <span className="pmeta">{p.sub} · {p.unit}</span>
                    <span className="pp">{COP(p.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* ticket */}
          <div className="pos-ticket">
            <div className="ticket-h">
              <div className="ta">Consumo</div>
              <div className="tn"><Icon name="receipt" s={18} /> {live.items.length} ítems</div>
            </div>
            {live.items.length === 0 ? (
              <div className="ticket-empty"><Icon name="receipt" s={40} /><p>Toca un producto para despacharlo del inventario y sumarlo a la cuenta.</p></div>
            ) : (
              <div className="ticket-lines">
                {live.items.map(i => (
                  <div className="tline" key={i.id}>
                    <div className="tqty">
                      <button className="qbtn" onClick={() => st.removeItem(mesa.id, i.id)}><Icon name="minus" s={14} sw={2.6} /></button>
                      <b className="tnum">{i.qty}</b>
                      <button className="qbtn" onClick={() => st.addItem(mesa.id, i)}><Icon name="plus" s={14} sw={2.6} /></button>
                    </div>
                    <div className="tinfo"><b>{i.name}</b><span>{COP(i.price)} c/u</span></div>
                    <div className="tsum tnum">{COP(i.price * i.qty)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="ticket-f">
              <div className="trow"><span>Abierta hace</span><b style={{ color: 'var(--ink)' }}>{sinceLabel(live.openedAt)}</b></div>
              <div className="trow tot"><span>Total</span><span className="tnum">{COP(total)}</span></div>
              <button className="btn pri block lg" disabled={!live.items.length} onClick={() => setPhase('pay')}>
                <Icon name="cash" /> Cerrar mesa y cobrar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---- pago ---- */
        <div className="modal-b" style={{ padding: '4px 2px' }}>
          <div className="card" style={{ padding: 18, marginBottom: 18, textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Total a cobrar</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', marginTop: 4 }}>{COP(total)}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{live.items.reduce((s, i) => s + i.qty, 0)} productos · {live.name}{live.alias ? ' · ' + live.alias : ''}</div>
          </div>
          <Field label="¿Cómo pagó?">
            <div className="pays">
              {RUMBA.PAYMENTS.map(p => (
                <button key={p.id} className={'pay' + (pay === p.id ? ' on' : '')} onClick={() => setPay(p.id)}>
                  <span className="pdot" style={{ background: p.color }} />{p.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Evidencia (opcional)">
            <div className="evidence" onClick={() => fileRef.current.click()}>
              {evi ? <img src={evi} alt="evidencia" /> : <Icon name="camera" s={22} />}
              <span>{evi ? 'Comprobante cargado · toca para cambiar' : 'Cargar foto del comprobante / voucher'}</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickEvi} />
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn ghost" onClick={() => setPhase('order')}><Icon name="chev" s={16} style={{ transform: 'rotate(180deg)' }} /> Volver</button>
            <button className="btn pri block lg" disabled={!pay} onClick={confirm}><Icon name="check" /> Confirmar cobro y liberar mesa</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- abrir mesa ---------------- */
function OpenMesaModal({ mesa, onClose, onOpen }) {
  const [alias, setAlias] = useStateE('');
  return (
    <Modal icon="mesas" title={'Abrir ' + mesa.name} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn pri block" onClick={() => onOpen(alias || 'Cliente')}><Icon name="play" /> Abrir mesa</button></>}>
      <Field label="Alias del cliente o grupo">
        <input className="inp" autoFocus placeholder="Ej. Mesa del cumpleaños, Don Jorge…" value={alias}
          onChange={e => setAlias(e.target.value)} onKeyDown={e => e.key === 'Enter' && onOpen(alias || 'Cliente')} />
      </Field>
      <p className="muted" style={{ fontSize: 12.5 }}>Le pondremos nombre a la cuenta para identificarla mientras está abierta.</p>
    </Modal>
  );
}

/* ---------------- vista MESAS ---------------- */
function EmpMesas({ toast }) {
  const st = useRumba();
  const [opening, setOpening] = useStateE(null);
  const [pos, setPos] = useStateE(null);
  const [newMesa, setNewMesa] = useStateE(false);
  const [mesaName, setMesaName] = useStateE('');
  const [filt, setFilt] = useStateE('todas');
  const [, force] = useStateE(0);
  React.useEffect(() => { const t = setInterval(() => force(n => n + 1), 1000); return () => clearInterval(t); }, []);

  if (!st.shift.open) return <ShiftGate toast={toast} />;

  const ocupadas = st.mesas.filter(m => m.status === 'ocupada');
  const ventaActual = ocupadas.reduce((s, m) => s + mesaTotal(m), 0);
  const totalNoche = st.sales.reduce((s, v) => s + v.total, 0) + ventaActual;
  const elapsed = st.shift.startedAt ? Math.floor((Date.now() - st.shift.startedAt) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0'), mm = String(Math.floor(elapsed % 3600 / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0');

  // sparkline de la noche (patrón base + ventas reales)
  const nowHour = new Date().getHours();
  const spark = RUMBA.TODAY_HOURLY.map((h, i) => h.v);
  const maxSpark = Math.max(...spark, 1);
  const liveIdx = Math.min(spark.length - 1, Math.max(0, nowHour >= 20 ? nowHour - 20 : (nowHour <= 3 ? nowHour + 4 : 4)));

  const list = st.mesas.filter(m => filt === 'todas' || (filt === 'abiertas' ? m.status === 'ocupada' : m.status === 'libre'));

  const closePos = (action, total) => { setPos(null); if (action === 'cerrada') toast(`Mesa cobrada · ${COP(total)}`, 'check'); };

  return (
    <div>
      <div className="night-strip">
        <div>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700 }}>VENTA DE LA NOCHE</div>
          <div className="big tnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>{COP(totalNoche)}</div>
          <div className="muted" style={{ fontSize: 12 }}>{st.sales.length} cobradas · {ocupadas.length} abiertas</div>
        </div>
        <div className="spark">{spark.map((v, i) => <i key={i} className={i === liveIdx ? 'now' : ''} style={{ height: Math.max(v / maxSpark * 100, 6) + '%' }} />)}</div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}><span className="live" style={{ padding: '2px 8px' }}><i />EN VIVO</span></div>
          <div className="tick" style={{ fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{hh}:{mm}:{ss}</div>
          <div className="muted" style={{ fontSize: 12 }}>turno en curso</div>
        </div>
      </div>

      <div className="mesas-top">
        <div className="tabs">
          <button className={filt === 'todas' ? 'on' : ''} onClick={() => setFilt('todas')}>Todas ({st.mesas.length})</button>
          <button className={filt === 'abiertas' ? 'on' : ''} onClick={() => setFilt('abiertas')}>Abiertas ({ocupadas.length})</button>
          <button className={filt === 'libres' ? 'on' : ''} onClick={() => setFilt('libres')}>Libres ({st.mesas.length - ocupadas.length})</button>
        </div>
        <button className="btn" onClick={() => setNewMesa(true)}><Icon name="plus" /> Crear mesa</button>
      </div>

      <div className="mesas-grid">
        {list.map((m, idx) => {
          const t = mesaTotal(m);
          const nItems = m.items.reduce((s, i) => s + i.qty, 0);
          return (
            <button key={m.id} className={'mesa ' + m.status} style={{ animationDelay: (idx * 0.03) + 's' }}
              onClick={() => m.status === 'libre' ? setOpening(m) : setPos(m)}>
              <span className="mpill">{m.status === 'libre' ? 'Libre' : 'Abierta'}</span>
              <div className="mname">{m.name}</div>
              {m.status === 'libre'
                ? <div className="mfree-ic"><Icon name="plus" s={26} /> Abrir</div>
                : <>
                    <div className="mst">{m.alias || 'Cliente'}</div>
                    <div className="mtot tnum">{COP(t)}</div>
                    <div className="mmeta"><Icon name="clock" s={13} /> {sinceLabel(m.openedAt)} · {nItems} ítems</div>
                    {m.items.length > 0 && (
                      <div className="mchips">
                        {m.items.slice(0, 3).map(i => <span className="mchip" key={i.id}>{i.qty}× {i.name.split(' ')[0]}</span>)}
                        {m.items.length > 3 && <span className="mchip more">+{m.items.length - 3}</span>}
                      </div>
                    )}
                  </>}
            </button>
          );
        })}
        {filt !== 'abiertas' && <button className="mesa add" onClick={() => setNewMesa(true)}><Icon name="plus" s={26} /><span style={{ marginTop: 8 }}>Nueva mesa</span></button>}
      </div>

      {opening && <OpenMesaModal mesa={opening} onClose={() => setOpening(null)}
        onOpen={alias => { st.openMesa(opening.id, alias); const m = opening; setOpening(null); setPos(m); }} />}
      {pos && <MesaPOS mesa={pos} onClose={closePos} />}
      {newMesa && (
        <Modal icon="plus" title="Crear mesa" onClose={() => setNewMesa(false)}
          footer={<><button className="btn ghost" onClick={() => setNewMesa(false)}>Cancelar</button>
            <button className="btn pri block" onClick={() => { if (mesaName.trim()) { st.createMesa(mesaName.trim()); toast('Mesa creada', 'check'); } setMesaName(''); setNewMesa(false); }}><Icon name="check" /> Crear</button></>}>
          <Field label="Nombre de la mesa"><input className="inp" autoFocus placeholder="Ej. Mesa 7, Barra 2, VIP 3…" value={mesaName} onChange={e => setMesaName(e.target.value)} /></Field>
          <p className="muted" style={{ fontSize: 12.5 }}>Crea las mesas, barras o zonas VIP que necesites para tu local.</p>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- gate: iniciar turno ---------------- */
function ShiftGate({ toast }) {
  const st = useRumba();
  return (
    <div style={{ maxWidth: 460, margin: '8vh auto 0', textAlign: 'center' }}>
      <div style={{ width: 130, margin: '0 auto 6px' }} dangerouslySetInnerHTML={{ __html: maylo({ arms: 'wave', eyes: 'happy', mouth: 'smile', panel: true }) }} />
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>¡Buena noche, {st.shift.by.split(' ')[0]}!</h2>
      <p className="muted" style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.5 }}>Inicia tu turno para abrir mesas, despachar del inventario y registrar las ventas de la noche.</p>
      <button className="btn pri lg" style={{ margin: '24px auto 0' }} onClick={() => { st.startShift(); toast('Turno iniciado · ¡a darle! 🎺', 'play'); }}>
        <Icon name="play" /> Iniciar turno
      </button>
    </div>
  );
}

/* ---------------- vista TURNO / cierre ---------------- */
function EmpTurno({ toast }) {
  const st = useRumba();
  const [closing, setClosing] = useStateE(false);
  if (!st.shift.open) return <ShiftGate toast={toast} />;

  const total = st.sales.reduce((s, v) => s + v.total, 0);
  const abiertas = st.mesas.filter(m => m.status === 'ocupada');
  const byPay = RUMBA.PAYMENTS.map(p => ({ ...p, v: st.sales.filter(s => s.payment === p.id).reduce((a, b) => a + b.total, 0) })).filter(p => p.v > 0);

  return (
    <div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat label="Ventas del turno" value={COP(total)} icon="cash" color="var(--green)" />
        <Stat label="Mesas cobradas" value={st.sales.length} icon="receipt" color="var(--accent)" />
        <Stat label="Mesas abiertas" value={abiertas.length} icon="mesas" color="var(--accent2)" />
        <Stat label="Ticket promedio" value={st.sales.length ? COP(total / st.sales.length) : '$0'} icon="chart" color="var(--yellow)" />
      </div>

      {abiertas.length > 0 && (
        <div className="alert-banner" style={{ background: 'color-mix(in srgb,var(--orange) 12%,var(--panel))', borderColor: 'color-mix(in srgb,var(--orange) 35%,transparent)' }}>
          <span className="ai" style={{ background: 'color-mix(in srgb,var(--orange) 22%,transparent)', color: 'var(--orange)' }}><Icon name="alert" s={18} /></span>
          <div style={{ flex: 1, fontSize: 13.5 }}><b>{abiertas.length} mesa(s) siguen abiertas.</b> Ciérralas antes de cerrar el turno: {abiertas.map(m => m.name).join(', ')}.</div>
        </div>
      )}

      <div className="card chart">
        <div className="chart-h">Cómo te pagaron esta noche</div>
        {byPay.length ? <PayBars data={byPay} total={total} /> : <p className="muted" style={{ fontSize: 13 }}>Aún no has cobrado mesas en este turno.</p>}
      </div>

      <button className="btn danger lg block" style={{ marginTop: 18 }} disabled={abiertas.length > 0} onClick={() => setClosing(true)}>
        <Icon name="power" /> Cerrar turno
      </button>
      {abiertas.length > 0 && <p className="muted" style={{ textAlign: 'center', fontSize: 12.5, marginTop: 8 }}>Cierra todas las mesas para poder cerrar el turno.</p>}

      {closing && (
        <Modal icon="power" title="Cierre de turno" onClose={() => setClosing(false)}
          footer={<><button className="btn ghost" onClick={() => setClosing(false)}>Seguir abierto</button>
            <button className="btn pri block" onClick={() => { st.closeShift(); setClosing(false); toast('Turno cerrado · reporte enviado al admin', 'check'); }}><Icon name="check" /> Confirmar cierre</button></>}>
          <div className="card" style={{ padding: 18, marginBottom: 14, textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Total recaudado</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.03em' }}>{COP(total)}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{st.sales.length} mesas cobradas</div>
          </div>
          {byPay.map(p => (
            <div className="trow" key={p.id} style={{ padding: '0 4px 10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="dotc" style={{ background: p.color }} />{p.name}</span>
              <b className="tnum" style={{ color: 'var(--ink)' }}>{COP(p.v)}</b>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Al confirmar se genera el reporte del turno con el detalle de mesas y se envía al administrador.</p>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- vista HISTORIAL ---------------- */
function EmpHistorial() {
  const st = useRumba();
  const pm = id => RUMBA.PAYMENTS.find(p => p.id === id) || { name: id, color: '#888' };
  const doCSV = () => exportCSV('mi-turno-ventas.csv', [
    ['Mi historial · ' + st.shift.by], [],
    ['Hora', 'Mesa', 'Alias', 'Ítems', 'Método', 'Total'],
    ...st.sales.map(v => [new Date(v.at).toLocaleTimeString('es-CO'), v.mesa, v.alias, v.items.reduce((s, i) => s + i.qty, 0), pm(v.payment).name, v.total]),
  ]);
  return (
    <div>
      <div className="section-h" style={{ marginTop: 0 }}>
        <div><h2>Este turno</h2><span className="sub">{st.sales.length} mesas cobradas</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={doCSV} disabled={!st.sales.length}><Icon name="download" s={15} /> CSV</button>
          <button className="btn sm pri" onClick={() => printPDF('Mi historial de ventas · ' + st.shift.by, '')}><Icon name="download" s={15} /> PDF</button>
        </div>
      </div>
      <div className="card">
        {st.sales.length === 0 ? <p className="muted" style={{ padding: 22, fontSize: 13.5 }}>Todavía no hay ventas registradas en este turno.</p> :
          st.sales.map(v => (
            <div className="hist-row" key={v.id}>
              <span className="hic" style={{ color: pm(v.payment).color }}><Icon name="receipt" s={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{v.mesa} · {v.alias}</div>
                <div className="muted" style={{ fontSize: 12 }}>{v.items.reduce((s, i) => s + i.qty, 0)} ítems · {new Date(v.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}{v.evidence ? ' · 📎 evidencia' : ''}</div>
              </div>
              <span className="badge" style={{ background: pm(v.payment).color + '22', color: pm(v.payment).color }}>{pm(v.payment).name}</span>
              <b className="tnum" style={{ fontSize: 14 }}>{COP(v.total)}</b>
            </div>
          ))}
      </div>

      <div className="section-h" style={{ marginTop: 26 }}><h2>Turnos anteriores</h2></div>
      <div className="card">
        {RUMBA.PAST_SHIFTS.filter(s => s.emp === st.shift.by).concat(RUMBA.PAST_SHIFTS.slice(0, 2)).slice(0, 3).map((s, i) => (
          <div className="hist-row" key={i}>
            <span className="hic" style={{ color: 'var(--accent)' }}><Icon name="history" s={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.date}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s.open} – {s.close} · {s.tables} mesas · {s.sales} ventas</div>
            </div>
            <b className="tnum" style={{ fontSize: 14 }}>{COP(s.total)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { EmpMesas, EmpTurno, EmpHistorial });
