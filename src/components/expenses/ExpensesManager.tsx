'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Stat } from '@/components/ui/Stat';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk, isoDate } from '@/lib/utils';
import type { Expense, Profile } from '@/types/db';

const PAGE_SIZE = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface ExpenseRow extends Expense {
  creator: Pick<Profile, 'id' | 'full_name' | 'color'> | null;
}

interface ExpensesManagerProps {
  comercioId: string;
  userId: string;
  isAdmin?: boolean;
}

const emptyForm = () => ({
  fecha: isoDate(new Date()),
  tipo_gasto: '',
  valor: '',
  observacion: '',
});

export function ExpensesManager({
  comercioId,
  userId,
  isAdmin = false,
}: ExpensesManagerProps) {
  const toast = useToast();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<ExpenseRow | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState('');
  const [exactDate, setExactDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, [comercioId, userId, isAdmin]);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('expenses')
      .select('*, creator:profiles!expenses_usuario_id_fkey(id,full_name,color)')
      .eq('comercio_id', comercioId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (!isAdmin) query = query.eq('usuario_id', userId);

    const { data, error } = await query;
    if (error) {
      toast('No se pudieron cargar los gastos', 'alert');
      setExpenses([]);
    } else {
      setExpenses((data ?? []) as unknown as ExpenseRow[]);
    }
    setLoading(false);
  }

  const types = useMemo(
    () => Array.from(new Set(expenses.map(item => item.tipo_gasto))).sort(),
    [expenses],
  );

  const employees = useMemo(() => {
    const map = new Map<string, ExpenseRow['creator']>();
    expenses.forEach(item => map.set(item.usuario_id, item.creator));
    return Array.from(map.entries())
      .map(([id, creator]) => ({ id, name: creator?.full_name ?? 'Usuario' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [expenses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return expenses.filter(item => {
      const matchesSearch = !term
        || item.tipo_gasto.toLowerCase().includes(term)
        || item.observacion?.toLowerCase().includes(term)
        || item.evidencia_nombre.toLowerCase().includes(term)
        || item.creator?.full_name.toLowerCase().includes(term);
      const matchesExact = !exactDate || item.fecha === exactDate;
      const matchesRange = (!from || item.fecha >= from) && (!to || item.fecha <= to);
      const matchesType = typeFilter === 'all' || item.tipo_gasto === typeFilter;
      const matchesEmployee = employeeFilter === 'all' || item.usuario_id === employeeFilter;
      return matchesSearch && matchesExact && matchesRange && matchesType && matchesEmployee;
    });
  }, [expenses, q, exactDate, from, to, typeFilter, employeeFilter]);

  useEffect(() => {
    setPage(1);
  }, [q, exactDate, from, to, typeFilter, employeeFilter]);

  const total = useMemo(() => filtered.reduce((sum, item) => sum + Number(item.valor), 0), [filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetModal() {
    setAdding(false);
    setFile(null);
    setForm(emptyForm());
    if (fileRef.current) fileRef.current.value = '';
  }

  function selectFile(next?: File) {
    if (!next) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(next.type)) {
      toast('Solo se permiten archivos JPG, PNG o PDF', 'alert');
      if (fileRef.current) fileRef.current.value = '';
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function saveExpense() {
    const value = Number(form.valor);
    if (!form.fecha || !form.tipo_gasto.trim() || !Number.isFinite(value) || value <= 0 || !file) {
      toast('Completa fecha, tipo, valor mayor a cero y evidencia', 'alert');
      return;
    }

    setSaving(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${comercioId}/${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('expense-evidence')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setSaving(false);
      toast('No se pudo subir la evidencia', 'alert');
      return;
    }

    const { error } = await supabase.from('expenses').insert({
      comercio_id: comercioId,
      fecha: form.fecha,
      tipo_gasto: form.tipo_gasto.trim(),
      valor: value,
      observacion: form.observacion.trim() || null,
      evidencia_path: path,
      evidencia_nombre: file.name,
      evidencia_tipo: file.type,
      usuario_id: userId,
    });

    if (error) {
      await supabase.storage.from('expense-evidence').remove([path]);
      setSaving(false);
      toast('No se pudo registrar el gasto', 'alert');
      return;
    }

    await load();
    setSaving(false);
    resetModal();
    toast('Gasto registrado', 'check');
  }

  async function signedUrl(item: ExpenseRow, download = false) {
    const { data, error } = await supabase.storage
      .from('expense-evidence')
      .createSignedUrl(
        item.evidencia_path,
        60,
        download ? { download: item.evidencia_nombre } : undefined,
      );
    if (error || !data?.signedUrl) {
      toast('No se pudo abrir la evidencia', 'alert');
      return null;
    }
    return data.signedUrl;
  }

  async function openEvidence(item: ExpenseRow) {
    const url = await signedUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function downloadEvidence(item: ExpenseRow) {
    const url = await signedUrl(item, true);
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.evidencia_nombre;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function clearFilters() {
    setQ('');
    setExactDate('');
    setFrom('');
    setTo('');
    setTypeFilter('all');
    setEmployeeFilter('all');
  }

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Stat label="Gastos filtrados" value={filtered.length} icon="receipt" color="var(--accent)" />
        <Stat label="Total registrado" value={COPk(total)} icon="cash" color="var(--accent2)" />
        <Stat
          label="Promedio"
          value={filtered.length ? COP(total / filtered.length) : COP(0)}
          icon="chart"
          color="var(--accent3)"
        />
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="searchbox" style={{ flex: '1 1 220px' }}>
            <Icon name="search" s={16} />
            <input
              placeholder="Buscar tipo, observación, usuario o evidencia"
              value={q}
              onChange={event => setQ(event.target.value)}
            />
          </div>
          <Field label="Fecha exacta">
            <input className="inp" type="date" value={exactDate} onChange={event => setExactDate(event.target.value)} />
          </Field>
          <Field label="Desde">
            <input className="inp" type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} />
          </Field>
          <Field label="Hasta">
            <input className="inp" type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className="inp" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="all">Todos</option>
              {types.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          {isAdmin && (
            <Field label="Empleado">
              <select className="inp" value={employeeFilter} onChange={event => setEmployeeFilter(event.target.value)}>
                <option value="all">Todos</option>
                {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </Field>
          )}
          <button className="btn sm ghost" onClick={clearFilters}>Limpiar</button>
          <button className="btn pri" style={{ marginLeft: 'auto' }} onClick={() => setAdding(true)}>
            <Icon name="plus" s={15} /> Nuevo gasto
          </button>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo de gasto</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th>Usuario creador</th>
              <th>Fecha de creación</th>
              <th>Evidencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
                  Sin gastos para los filtros aplicados
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
                  Cargando gastos
                </td>
              </tr>
            )}
            {rows.map((item, index) => (
              <tr key={item.id} style={index % 2 ? { background: 'var(--panel2)' } : undefined}>
                <td style={{ fontSize: 13 }}>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-CO')}</td>
                <td>
                  <b style={{ fontSize: 13 }}>{item.tipo_gasto}</b>
                  {item.observacion && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, maxWidth: 240 }}>
                      {item.observacion}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800 }}>{COP(Number(item.valor))}</td>
                <td style={{ fontSize: 13 }}>{item.creator?.full_name ?? 'Usuario'}</td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td>
                  <button className="btn sm ghost" onClick={() => openEvidence(item)}>
                    <Icon name="eye" s={13} /> {item.evidencia_nombre}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn sm" onClick={() => setDetail(item)} title="Ver detalle">
                      <Icon name="eye" s={13} />
                    </button>
                    <button className="btn sm ghost" onClick={() => downloadEvidence(item)} title="Descargar evidencia">
                      <Icon name="download" s={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
        }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {filtered.length} registros · Página {page} de {pageCount}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>
              Anterior
            </button>
            <button className="btn sm ghost" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {adding && (
        <Modal
          title="Nuevo gasto"
          icon="receipt"
          onClose={resetModal}
          footer={
            <>
              <button className="btn ghost" onClick={resetModal} disabled={saving}>Cancelar</button>
              <button className="btn pri block" onClick={saveExpense} disabled={saving || !file}>
                <Icon name="check" /> {saving ? 'Guardando' : 'Guardar gasto'}
              </button>
            </>
          }
        >
          <div className="row2">
            <Field label="Fecha">
              <input className="inp" type="date" value={form.fecha} onChange={event => setForm(value => ({ ...value, fecha: event.target.value }))} />
            </Field>
            <Field label="Tipo de gasto">
              <input
                className="inp"
                list="expense-types"
                placeholder="Servicios, transporte, mantenimiento"
                value={form.tipo_gasto}
                onChange={event => setForm(value => ({ ...value, tipo_gasto: event.target.value }))}
              />
              <datalist id="expense-types">
                {types.map(type => <option key={type} value={type} />)}
              </datalist>
            </Field>
          </div>
          <Field label="Valor">
            <input
              className="inp"
              type="number"
              min="1"
              step="1"
              value={form.valor}
              onChange={event => setForm(value => ({ ...value, valor: event.target.value }))}
            />
          </Field>
          <Field label="Observación">
            <textarea
              className="inp"
              rows={3}
              value={form.observacion}
              onChange={event => setForm(value => ({ ...value, observacion: event.target.value }))}
            />
          </Field>
          <Field label="Evidencia obligatoria">
            <input
              ref={fileRef}
              className="inp"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={event => selectFile(event.target.files?.[0])}
            />
          </Field>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            border: '1px solid var(--line)',
            borderRadius: 10,
            color: file ? 'var(--text)' : 'var(--muted)',
          }}>
            <Icon name={file?.type === 'application/pdf' ? 'receipt' : 'camera'} s={16} />
            <span style={{ fontSize: 13 }}>{file?.name ?? 'Selecciona un archivo JPG, PNG o PDF'}</span>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title="Detalle del gasto" icon="receipt" onClose={() => setDetail(null)}>
          <div className="biz-row"><span>Fecha</span><b>{new Date(`${detail.fecha}T00:00:00`).toLocaleDateString('es-CO')}</b></div>
          <div className="biz-row"><span>Tipo</span><b>{detail.tipo_gasto}</b></div>
          <div className="biz-row"><span>Valor</span><b>{COP(Number(detail.valor))}</b></div>
          <div className="biz-row"><span>Usuario</span><b>{detail.creator?.full_name ?? 'Usuario'}</b></div>
          <div className="biz-row"><span>Creación</span><b>{new Date(detail.created_at).toLocaleString('es-CO')}</b></div>
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 5 }}>Observación</div>
            <div style={{ fontSize: 13 }}>{detail.observacion || 'Sin observación'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn pri" onClick={() => openEvidence(detail)}>
              <Icon name="eye" s={14} /> Ver evidencia
            </button>
            <button className="btn ghost" onClick={() => downloadEvidence(detail)}>
              <Icon name="download" s={14} /> Descargar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
