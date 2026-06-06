'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import type { Comercio } from '@/types/db';
import { COP, COPk } from '@/lib/utils';

type SortKey = 'name' | 'status' | 'end' | 'cost';

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)', activo: 'var(--green)',
  trial: 'var(--yellow)',
  due: 'var(--orange)',
  suspended: 'var(--muted)', suspendido: 'var(--muted)',
  cancelled: 'var(--red)', vencido: 'var(--red)',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Activo', activo: 'Activo',
  trial: 'Trial',
  due: 'Vencido',
  suspended: 'Suspendido', suspendido: 'Suspendido',
  cancelled: 'Cancelado', vencido: 'Vencido',
};

function daysLeft(end?: string | null): string {
  if (!end) return '—';
  const d = Math.ceil((new Date(end).getTime() - Date.now()) / 864e5);
  if (d < 0) return `−${Math.abs(d)}d`;
  if (d === 0) return 'Hoy';
  return `${d}d`;
}

export function SRReportes() {
  const searchParams = useSearchParams();
  const comercioId = searchParams.get('id');

  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [sales, setSales] = useState<{ comercio_id: string; total: number }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const from = new Date(); from.setDate(1);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = new Date().toISOString().slice(0, 10);

    Promise.all([
      supabase.from('comercios').select('*').order('name'),
      supabase.from('sales').select('comercio_id, total').gte('closed_at', fromStr + 'T00:00:00').lte('closed_at', toStr + 'T23:59:59'),
    ]).then(([{ data: c }, { data: s }]) => {
      setComercios((c ?? []) as Comercio[]);
      setSales((s ?? []) as { comercio_id: string; total: number }[]);
    });
  }, []);

  const salesByComercio = useMemo(() => {
    const m: Record<string, number> = {};
    sales.forEach(s => { m[s.comercio_id] = (m[s.comercio_id] ?? 0) + s.total; });
    return m;
  }, [sales]);

  const scope = comercioId ? comercios.filter(c => c.id === comercioId) : comercios;
  const active = scope.filter(c => ['active', 'activo'].includes(c.subscription_status));
  const trial = scope.filter(c => (c.subscription_status as string) === 'trial');
  const expired = scope.filter(c => ['due', 'suspended', 'cancelled', 'vencido'].includes(c.subscription_status));

  const totalMensual = active.reduce((s, c) => s + (c.plan_cost ?? 0), 0);
  const totalAnual = totalMensual * 12;
  const totalVentasMes = scope.reduce((s, c) => s + (salesByComercio[c.id] ?? 0), 0);

  const sorted = [...scope].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'status') cmp = (a.subscription_status ?? '').localeCompare(b.subscription_status ?? '');
    else if (sortKey === 'end') cmp = (a.subscription_end ?? '9999').localeCompare(b.subscription_end ?? '9999');
    else if (sortKey === 'cost') cmp = (a.plan_cost ?? 0) - (b.plan_cost ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
  }

  const arrow = (k: SortKey) => sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : '';

  const F15 = { fontSize: 15 } as const;

  return (
    <div>
      {comercioId && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/super-root/reportes" className="btn sm ghost" style={F15}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chev" s={15} /></span> Todos los comercios
          </a>
          <span style={{ ...F15, fontWeight: 800 }}>
            {scope[0]?.name ?? 'Comercio'}
          </span>
        </div>
      )}

      {/* KPI globales */}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Facturación mensual (suscripciones)" value={COPk(totalMensual)} icon="cash" color="var(--green)" />
        <Stat label="Proyección anual" value={COPk(totalAnual)} icon="chart" color="var(--accent2)" />
        <Stat label="Ventas registradas (mes)" value={COPk(totalVentasMes)} icon="receipt" color="var(--accent)" />
        <Stat label="Total comercios" value={scope.length} icon="biz" color="var(--yellow)" />
      </div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600 }}>Activos</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{active.length}</div>
          </div>
        </div>
        <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600 }}>En trial</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--yellow)' }}>{trial.length}</div>
          </div>
        </div>
        <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600 }}>Vencidos / suspendidos</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{expired.length}</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>
            {comercioId ? 'Detalle del comercio' : 'Todos los comercios'}
          </span>
          <span className="muted" style={F15}>{sorted.length} registros</span>
        </div>
        <table className="tbl" style={F15}>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('name')} style={F15}>Comercio{arrow('name')}</th>
              <th style={F15}>Plan</th>
              <th className="sortable" onClick={() => toggleSort('cost')} style={F15}>Costo mensual{arrow('cost')}</th>
              <th className="sortable" onClick={() => toggleSort('status')} style={F15}>Estado{arrow('status')}</th>
              <th className="sortable" onClick={() => toggleSort('end')} style={F15}>Vencimiento{arrow('end')}</th>
              <th style={F15}>Días</th>
              <th style={{ ...F15, textAlign: 'right' }}>Ventas mes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const statusColor = STATUS_COLOR[c.subscription_status] ?? 'var(--muted)';
              const statusLabel = STATUS_LABEL[c.subscription_status] ?? c.subscription_status;
              const days = daysLeft(c.subscription_end);
              return (
                <tr key={c.id}>
                  <td style={F15}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar sm" style={{ background: c.color + '26', color: c.color, overflow: 'hidden', flexShrink: 0 }}>
                        {c.photo_url
                          ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())
                        }
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{c.type} · {c.city}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...F15, color: c.color, fontWeight: 700 }}>{c.plan}</td>
                  <td style={{ ...F15, fontWeight: 700 }}>{COP(c.plan_cost ?? 0)}</td>
                  <td><Chip color={statusColor}>{statusLabel}</Chip></td>
                  <td className="muted" style={F15}>{c.subscription_end ?? '—'}</td>
                  <td style={{ ...F15, fontWeight: 700, color: parseInt(days) < 8 && days !== '—' ? 'var(--orange)' : 'var(--ink)' }}>{days}</td>
                  <td style={{ ...F15, textAlign: 'right', fontWeight: 700 }}>{COPk(salesByComercio[c.id] ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
