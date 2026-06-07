'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { Profile, Shift } from '@/types/db';

const TEMP_PASS = 'Temporal2026!';
const PAGE_SIZE = 20;

type EmpRow = Profile & { comercio_name: string; turnos: number };
type ShiftRow = Shift & { emp_name: string; comercio_name: string; recaudo: number };

interface SaleDetail {
  id: string;
  mesa_name: string;
  mesa_alias: string | null;
  total: number;
  payment_method: string;
  sale_items: Array<{ product_name: string; qty: number; unit_price: number }>;
}

/* ── Formatters ─────────────────────────────────────────── */
function fmtLogin(ts: string | null): string {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 864e5);
  const time = new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Hoy ${time}`;
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start: string, end: string | null): string {
  const mins = Math.round(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m}min`;
}

interface AdminEmpleadosProps {
  comercioId: string;
}

export function AdminEmpleados({ comercioId }: AdminEmpleadosProps) {
  const toast = useToast();
  const [empleados,    setEmpleados]    = useState<EmpRow[]>([]);
  const [comercioName, setComercioName] = useState('');
  const [shifts,       setShifts]       = useState<ShiftRow[]>([]);
  const [adding,       setAdding]       = useState(false);
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [shiftDetails,    setShiftDetails]    = useState<Record<string, SaleDetail[]>>({});
  const [form,            setForm]            = useState({ name: '', email: '', password: '' });

  // Empleados filters
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'inactivo'>('all');

  // Turnos filters + pagination
  const [shiftEmp,      setShiftEmp]      = useState('');
  const [shiftFrom,     setShiftFrom]     = useState('');
  const [shiftTo,       setShiftTo]       = useState('');
  const [shiftPage,     setShiftPage]     = useState(0);

  const supabase = createClient();

  useEffect(() => { load(); }, [comercioId]);

  async function load() {
    const [{ data: com }, { data: emps }, { data: rawShifts }, { data: closedShifts }] = await Promise.all([
      supabase.from('comercios').select('name').eq('id', comercioId).single(),
      supabase.from('profiles').select('*').eq('comercio_id', comercioId).eq('role', 'empleado').order('full_name'),
      supabase.from('shifts').select('*').eq('comercio_id', comercioId).order('started_at', { ascending: false }).limit(100),
      supabase.from('shifts').select('empleado_id').eq('comercio_id', comercioId).eq('status', 'closed'),
    ]);

    const name = (com as { name: string } | null)?.name ?? '';
    setComercioName(name);

    const turnosByEmp: Record<string, number> = {};
    (closedShifts ?? []).forEach((s: { empleado_id: string }) => {
      turnosByEmp[s.empleado_id] = (turnosByEmp[s.empleado_id] ?? 0) + 1;
    });

    const empRows = ((emps ?? []) as Profile[]).map(e => ({
      ...e, comercio_name: name, turnos: turnosByEmp[e.id] ?? 0,
    }));
    setEmpleados(empRows);

    const shiftList = (rawShifts ?? []) as Shift[];
    if (shiftList.length) {
      const { data: salesData } = await supabase.from('sales').select('shift_id, total').in('shift_id', shiftList.map(s => s.id));
      const totals: Record<string, number> = {};
      (salesData ?? []).forEach((s: { shift_id: string; total: number }) => {
        totals[s.shift_id] = (totals[s.shift_id] ?? 0) + s.total;
      });
      const empMap: Record<string, string> = {};
      empRows.forEach(e => { empMap[e.id] = e.full_name; });
      setShifts(shiftList.map(s => ({
        ...s,
        emp_name: empMap[s.empleado_id] ?? '—',
        comercio_name: name,
        recaudo: totals[s.id] ?? 0,
      })));
    } else {
      setShifts([]);
    }
  }

  async function createEmpleado() {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'empleado', comercio_id: comercioId }),
    });
    const result = await res.json();
    if (!res.ok) { toast(result.error ?? 'Error al crear el empleado', 'alert'); return; }
    toast('Empleado creado', 'check');
    setAdding(false);
    setForm({ name: '', email: '', password: '' });
    await load();
  }

  async function toggleActivo(e: EmpRow) {
    const res = await fetch('/api/admin/user-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: e.id, action: e.activo ? 'suspend' : 'activate' }),
    });
    if (!res.ok) { toast('No se pudo cambiar el estado', 'alert'); return; }
    toast(`${e.full_name} ${e.activo ? 'desactivado' : 'activado'}`, e.activo ? 'lock' : 'check');
    await load();
  }

  async function resetPass(e: EmpRow) {
    const res = await fetch('/api/admin/user-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: e.id, action: 'reset_password', password: TEMP_PASS }),
    });
    if (!res.ok) { toast('No se pudo reiniciar la clave', 'alert'); return; }
    toast(`Clave temporal: ${TEMP_PASS} — pídele que la cambie`, 'check');
  }

  async function loadShiftDetail(shiftId: string) {
    if (shiftDetails[shiftId]) return;
    const { data } = await supabase
      .from('sales')
      .select('id, mesa_name, mesa_alias, total, payment_method, sale_items(product_name, qty, unit_price)')
      .eq('shift_id', shiftId);
    setShiftDetails(prev => ({ ...prev, [shiftId]: (data ?? []) as SaleDetail[] }));
  }

  /* ── Filtered data ──────────────────────────────────────── */
  const filteredEmps = useMemo(() => empleados.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.full_name.toLowerCase().includes(q) && !(e.alias ?? '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'activo'   && !e.activo) return false;
    if (statusFilter === 'inactivo' &&  e.activo) return false;
    return true;
  }), [empleados, search, statusFilter]);

  const filteredShifts = useMemo(() => shifts.filter(s => {
    if (shiftEmp && s.empleado_id !== shiftEmp) return false;
    const d = s.started_at.slice(0, 10);
    if (shiftFrom && d < shiftFrom) return false;
    if (shiftTo   && d > shiftTo)   return false;
    return true;
  }), [shifts, shiftEmp, shiftFrom, shiftTo]);

  const totalPages   = Math.ceil(filteredShifts.length / PAGE_SIZE);
  const pageShifts   = filteredShifts.slice(shiftPage * PAGE_SIZE, (shiftPage + 1) * PAGE_SIZE);

  /* ── Shared row style helper ───────────────────────────── */
  const row = (i: number) => i % 2 === 1 ? { background: 'var(--panel2)' } : undefined;

  /* ── Filter bar style ──────────────────────────────────── */
  const filterBar: React.CSSProperties = {
    display: 'flex', gap: 10, padding: '12px 16px',
    borderBottom: '1px solid var(--line)', flexWrap: 'wrap',
  };

  return (
    <div>
      {/* Header */}
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Empleados</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            {empleados.filter(e => e.activo).length} activos · {empleados.length} total
          </p>
        </div>
        <button className="btn pri" onClick={() => setAdding(true)}><Icon name="plus" /> Agregar empleado</button>
      </div>

      {/* ═══════ TABLA EMPLEADOS ═══════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={filterBar}>
          <div className="searchbox" style={{ flex: '1 1 180px', minWidth: 150 }}>
            <Icon name="search" s={15} />
            <input placeholder="Buscar por nombre o alias…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sel" style={{ fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Alias</th>
                <th>Comercio</th>
                <th>Teléfono</th>
                <th>Último login</th>
                <th>Turnos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 13 }}>Sin empleados</td></tr>
              )}
              {filteredEmps.map((e, i) => (
                <React.Fragment key={e.id}>
                  <tr style={row(i)}>
                    <td><Avatar name={e.full_name} color={e.color} size="sm" img={e.avatar_url ?? undefined} /></td>
                    <td><b style={{ fontSize: 13 }}>{e.full_name}</b></td>
                    <td className="muted" style={{ fontSize: 13 }}>{e.alias ?? '—'}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{e.comercio_name}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{e.phone ?? '—'}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtLogin(e.last_login)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: e.turnos > 0 ? 'var(--ink)' : 'var(--muted)', fontSize: 13 }}>
                        <Icon name="clock" s={13} />
                        <b>{e.turnos}</b>
                      </div>
                    </td>
                    <td><Chip color={e.activo ? 'var(--green)' : 'var(--muted)'}>{e.activo ? 'Activo' : 'Inactivo'}</Chip></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <button className={'sw' + (e.activo ? ' on' : '')} onClick={() => toggleActivo(e)} title={e.activo ? 'Desactivar' : 'Activar'} />
                        <button className="btn sm" onClick={() => resetPass(e)} title="Reiniciar clave a Temporal2026!">
                          <Icon name="lock" s={13} />
                        </button>
                        <button className="btn sm" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)} title="Ver detalle">
                          <span style={{ display: 'inline-flex', transform: expandedId === e.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: '.15s' }}>
                            <Icon name="chev" s={13} />
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === e.id && (
                    <tr>
                      <td colSpan={9} style={{ background: 'color-mix(in srgb, var(--accent) 6%, var(--panel2))', padding: '10px 20px' }}>
                        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span><b style={{ color: 'var(--ink)' }}>Email:</b> {e.email}</span>
                          {e.phone && <span><b style={{ color: 'var(--ink)' }}>Tel:</b> {e.phone}</span>}
                          <span>
                            <b style={{ color: 'var(--ink)' }}>Color: </b>
                            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: e.color, verticalAlign: 'middle', marginLeft: 4, border: '1px solid var(--line)' }} />
                          </span>
                          <span className="muted"><b style={{ color: 'var(--ink)' }}>ID:</b> {e.id.slice(0, 12)}…</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════ TABLA TURNOS ═══════ */}
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Registro de turnos</h3>
      <div className="card">
        <div style={filterBar}>
          <select className="sel" style={{ fontSize: 13, minWidth: 160 }} value={shiftEmp} onChange={e => { setShiftEmp(e.target.value); setShiftPage(0); }}>
            <option value="">Todos los empleados</option>
            {empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input className="inp" type="date" style={{ maxWidth: 160, fontSize: 13 }} value={shiftFrom}
            onChange={e => { setShiftFrom(e.target.value); setShiftPage(0); }} title="Desde" />
          <input className="inp" type="date" style={{ maxWidth: 160, fontSize: 13 }} value={shiftTo}
            onChange={e => { setShiftTo(e.target.value); setShiftPage(0); }} title="Hasta" />
          {(shiftFrom || shiftTo || shiftEmp) && (
            <button className="btn sm ghost" onClick={() => { setShiftFrom(''); setShiftTo(''); setShiftEmp(''); setShiftPage(0); }}>
              <Icon name="close" s={13} /> Limpiar
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Comercio</th>
                <th>Fecha</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Duración</th>
                <th style={{ textAlign: 'right' }}>Recaudo</th>
              </tr>
            </thead>
            <tbody>
              {pageShifts.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)', fontSize: 13 }}>Sin turnos registrados</td></tr>
              )}
              {pageShifts.map((s, i) => {
                const isOpen = expandedShiftId === s.id;
                const detail = shiftDetails[s.id];
                return (
                  <React.Fragment key={s.id}>
                    <tr style={{ ...row(i), cursor: 'pointer' }}
                      onClick={() => {
                        const next = isOpen ? null : s.id;
                        setExpandedShiftId(next);
                        if (next) loadShiftDetail(next);
                      }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-flex', transform: isOpen ? 'rotate(90deg)' : 'none', transition: '.15s', color: 'var(--muted)' }}>
                            <Icon name="chev" s={12} />
                          </span>
                          <b style={{ fontSize: 13 }}>{s.emp_name}</b>
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>{s.comercio_name}</td>
                      <td className="muted" style={{ fontSize: 13 }}>{fmtDate(s.started_at)}</td>
                      <td style={{ fontSize: 13 }}>{fmtTime(s.started_at)}</td>
                      <td style={{ fontSize: 13 }}>
                        {s.closed_at ? fmtTime(s.closed_at) : <Chip color="var(--green)">En curso</Chip>}
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>{fmtDuration(s.started_at, s.closed_at)}</td>
                      <td style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{COP(s.recaudo)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--panel2))', padding: '14px 20px' }}>
                          {!detail ? (
                            <span className="muted" style={{ fontSize: 13 }}>Cargando…</span>
                          ) : detail.length === 0 ? (
                            <span className="muted" style={{ fontSize: 13 }}>Sin ventas registradas en este turno.</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {/* Resumen rápido */}
                              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                                <span>
                                  <b>Mesas: </b>
                                  <span className="muted">
                                    {Array.from(new Set(detail.map(d => d.mesa_alias ?? d.mesa_name))).join(', ')}
                                  </span>
                                </span>
                                <span>
                                  <b>Métodos de pago: </b>
                                  <span className="muted">
                                    {Array.from(new Set(detail.map(d => d.payment_method))).join(', ')}
                                  </span>
                                </span>
                                <span>
                                  <b>Ventas: </b>
                                  <span className="muted">{detail.length}</span>
                                </span>
                              </div>
                              {/* Productos agregados */}
                              {(() => {
                                const prod: Record<string, { qty: number; price: number }> = {};
                                detail.forEach(sale =>
                                  sale.sale_items.forEach(it => {
                                    if (!prod[it.product_name]) prod[it.product_name] = { qty: 0, price: it.unit_price };
                                    prod[it.product_name].qty += it.qty;
                                  })
                                );
                                const entries = Object.entries(prod).sort((a, b) => b[1].qty - a[1].qty);
                                if (!entries.length) return null;
                                return (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ color: 'var(--muted2)' }}>
                                        <th style={{ textAlign: 'left', paddingBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Producto</th>
                                        <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Cant.</th>
                                        <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>P. unit.</th>
                                        <th style={{ textAlign: 'right', paddingBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entries.map(([name, { qty, price }]) => (
                                        <tr key={name} style={{ borderTop: '1px solid var(--line)' }}>
                                          <td style={{ padding: '5px 0', color: 'var(--ink)' }}>{name}</td>
                                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{qty}</td>
                                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{COP(price)}</td>
                                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{COP(qty * price)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <button className="btn sm ghost" disabled={shiftPage === 0} onClick={() => setShiftPage(p => p - 1)}>
              <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chev" s={14} /></span> Anterior
            </button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Pág. {shiftPage + 1} / {totalPages} · {filteredShifts.length} turnos
            </span>
            <button className="btn sm ghost" disabled={shiftPage >= totalPages - 1} onClick={() => setShiftPage(p => p + 1)}>
              Siguiente <Icon name="chev" s={14} />
            </button>
          </div>
        )}
      </div>

      {/* Modal crear empleado */}
      {adding && (
        <Modal title="Agregar empleado" icon="users" onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setAdding(false)}>Cancelar</button>
              <button className="btn pri block" disabled={!form.name || !form.email || form.password.length < 6} onClick={createEmpleado}>
                <Icon name="check" /> Crear empleado
              </button>
            </>
          }>
          <Field label="Nombre completo">
            <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className="inp" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Contraseña temporal">
            <input className="inp" type="password" placeholder="Mínimo 6 caracteres" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
