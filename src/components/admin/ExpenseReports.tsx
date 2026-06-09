'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Stat } from '@/components/ui/Stat';
import { useToast } from '@/components/ui/ToastContext';
import { COP, exportCSV, isoDate } from '@/lib/utils';
import type { Expense, Profile } from '@/types/db';

interface ExpenseRow extends Expense {
  creator: Pick<Profile, 'id' | 'full_name' | 'color'> | null;
}

interface ExpenseReportsProps {
  comercioId: string;
  comercioName: string;
}

function reportRange(key: string) {
  const today = new Date();
  const from = new Date(today);
  if (key === 'semana') {
    const day = today.getDay() || 7;
    from.setDate(today.getDate() - day + 1);
  }
  if (key === 'mes') from.setDate(1);
  if (key === 'anio') from.setMonth(0, 1);
  return { from: isoDate(from), to: isoDate(today) };
}

export function ExpenseReports({ comercioId, comercioName }: ExpenseReportsProps) {
  const toast = useToast();
  const supabase = createClient();
  const [preset, setPreset] = useState('mes');
  const [range, setRange] = useState(reportRange('mes'));
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [employee, setEmployee] = useState('all');

  useEffect(() => {
    load();
  }, [comercioId, range]);

  async function load() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, creator:profiles!expenses_usuario_id_fkey(id,full_name,color)')
      .eq('comercio_id', comercioId)
      .gte('fecha', range.from)
      .lte('fecha', range.to)
      .order('fecha', { ascending: false });
    if (error) {
      setExpenses([]);
      toast('No se pudo cargar el reporte de gastos', 'alert');
      return;
    }
    setExpenses((data ?? []) as unknown as ExpenseRow[]);
  }

  const employees = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach(item => map.set(item.usuario_id, item.creator?.full_name ?? 'Usuario'));
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [expenses]);

  const filtered = useMemo(
    () => employee === 'all' ? expenses : expenses.filter(item => item.usuario_id === employee),
    [expenses, employee],
  );

  const total = filtered.reduce((sum, item) => sum + Number(item.valor), 0);
  const average = filtered.length ? total / filtered.length : 0;
  const max = filtered.length ? Math.max(...filtered.map(item => Number(item.valor))) : 0;
  const min = filtered.length ? Math.min(...filtered.map(item => Number(item.valor))) : 0;

  const byType = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach(item => {
      const current = map.get(item.tipo_gasto) ?? { total: 0, count: 0 };
      current.total += Number(item.valor);
      current.count += 1;
      map.set(item.tipo_gasto, current);
    });
    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        ...values,
        share: total ? values.total / total * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, total]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filtered.forEach(item => {
      const current = map.get(item.usuario_id) ?? {
        name: item.creator?.full_name ?? 'Usuario',
        total: 0,
        count: 0,
      };
      current.total += Number(item.valor);
      current.count += 1;
      map.set(item.usuario_id, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  function applyPreset(key: string) {
    setPreset(key);
    setRange(reportRange(key));
  }

  function doCSV() {
    exportCSV(`gastos-${range.from}_${range.to}.csv`, [
      [`FloorUX CRM · Gastos · ${comercioName}`],
      [`Período: ${range.from} a ${range.to}`],
      [],
      ['Fecha', 'Tipo', 'Valor', 'Empleado', 'Observación', 'Evidencia'],
      ...filtered.map(item => [
        item.fecha,
        item.tipo_gasto,
        Number(item.valor),
        item.creator?.full_name ?? 'Usuario',
        item.observacion ?? '',
        item.evidencia_nombre,
      ]),
    ]);
    toast('CSV de gastos descargado', 'check');
  }

  function doExcel() {
    const escapeXml = (value: string | number) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const cell = (value: string | number, type = 'String') =>
      `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
    const rows = filtered.map(item => (
      '<Row>'
      + cell(item.fecha)
      + cell(item.tipo_gasto)
      + cell(Number(item.valor), 'Number')
      + cell(item.creator?.full_name ?? 'Usuario')
      + cell(item.observacion ?? '')
      + cell(item.evidencia_nombre)
      + '</Row>'
    )).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Gastos">
  <Table>
   <Row>${cell(`FloorUX CRM · Gastos · ${comercioName}`)}</Row>
   <Row>${cell(`Período: ${range.from} a ${range.to}`)}</Row>
   <Row>${['Fecha', 'Tipo', 'Valor', 'Empleado', 'Observación', 'Evidencia'].map(value => cell(value)).join('')}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `gastos-${range.from}_${range.to}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Excel de gastos descargado', 'check');
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 14,
      }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>Reporte de gastos</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
            Indicadores globales, por tipo y por empleado
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm ghost" onClick={doCSV}><Icon name="download" s={14} /> CSV</button>
          <button className="btn sm pri" onClick={doExcel}><Icon name="download" s={14} /> Excel</button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          {[
            ['hoy', 'Hoy'],
            ['semana', 'Esta semana'],
            ['mes', 'Este mes'],
            ['anio', 'Este año'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={'fchip' + (preset === key ? ' on' : '')}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
          <label className="field">
            <span>Desde</span>
            <input
              className="inp"
              type="date"
              value={range.from}
              max={range.to}
              onChange={event => {
                setPreset('custom');
                setRange(value => ({ ...value, from: event.target.value }));
              }}
            />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input
              className="inp"
              type="date"
              value={range.to}
              min={range.from}
              onChange={event => {
                setPreset('custom');
                setRange(value => ({ ...value, to: event.target.value }));
              }}
            />
          </label>
          <label className="field">
            <span>Empleado</span>
            <select className="inp" value={employee} onChange={event => setEmployee(event.target.value)}>
              <option value="all">Todos</option>
              {employees.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Stat label="Total del período" value={COP(total)} icon="cash" color="var(--accent)" />
        <Stat label="Cantidad de gastos" value={filtered.length} icon="receipt" color="var(--accent2)" />
        <Stat label="Promedio por gasto" value={COP(average)} icon="chart" color="var(--accent3)" />
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Stat label="Valor máximo" value={COP(max)} icon="chart" color="var(--green)" />
        <Stat label="Valor mínimo" value={COP(min)} icon="chart" color="var(--yellow)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '14px 16px', fontWeight: 800, borderBottom: '1px solid var(--line)' }}>
            Gastos por tipo
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Tipo</th><th>Cantidad</th><th>Participación</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {byType.map(item => (
                <tr key={item.name}>
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  <td>{item.count}</td>
                  <td>{item.share.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{COP(item.total)}</td>
                </tr>
              ))}
              {byType.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '14px 16px', fontWeight: 800, borderBottom: '1px solid var(--line)' }}>
            Ranking por empleado
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Posición</th><th>Empleado</th><th>Cantidad</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {byEmployee.map((item, index) => (
                <tr key={item.name}>
                  <td>{index + 1}</td>
                  <td style={{ fontWeight: 700 }}>{item.name}</td>
                  <td>{item.count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{COP(item.total)}</td>
                </tr>
              ))}
              {byEmployee.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
