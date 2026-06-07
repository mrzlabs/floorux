'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import type { Comercio } from '@/types/db';
import { COP, COPk, MES_ES } from '@/lib/utils';

type SortKey = 'name' | 'plan' | 'cost' | 'billing' | 'status' | 'end' | 'renewal';

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

const PLAN_COLORS: Record<string, string> = {
  'Básico': '#7F77DD',
  'Pro': '#27C3D8',
  'Red': '#4CAF7D',
  'Enterprise': '#E8A838',
};
const PLANES = ['Básico', 'Pro', 'Red', 'Enterprise'];

function daysLeft(end?: string | null): string {
  if (!end) return '—';
  const d = Math.ceil((new Date(end).getTime() - Date.now()) / 864e5);
  if (d < 0) return `−${Math.abs(d)}d`;
  if (d === 0) return 'Hoy';
  return `${d}d`;
}

function daysLeftNum(end?: string | null): number {
  if (!end) return 9999;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 864e5);
}

export function SRReportes() {
  const searchParams = useSearchParams();
  const comercioId = searchParams.get('id');

  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('comercios').select('*').order('name').then(({ data }) => {
      setComercios((data ?? []) as Comercio[]);
    });
  }, []);

  const scope = comercioId ? comercios.filter(c => c.id === comercioId) : comercios;
  const active = scope.filter(c => ['active', 'activo'].includes(c.subscription_status));
  const trial = scope.filter(c => (c.subscription_status as string) === 'trial');
  const expired = scope.filter(c => ['due', 'suspended', 'cancelled', 'vencido'].includes(c.subscription_status));

  const mrr = active.reduce((s, c) => s + (c.plan_cost ?? 0), 0);
  const arr = mrr * 12;
  const churnRate = scope.length > 0 ? (expired.length / scope.length * 100) : 0;
  const ltv = active.length > 0 ? Math.round(mrr / active.length * 24) : 0;

  const planStats = useMemo(() => PLANES.map(plan => {
    const all = scope.filter(c => c.plan === plan);
    const paying = all.filter(c => ['active', 'activo', 'trial'].includes(c.subscription_status));
    const avg = paying.length > 0 ? paying.reduce((s, c) => s + (c.plan_cost ?? 0), 0) / paying.length : 0;
    return { plan, total: all.length, paying: paying.length, avg };
  }), [scope]);

  const maxPlanCount = Math.max(...planStats.map(p => p.total), 1);

  const projMonths = useMemo(() => [1, 2, 3].map(offset => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const renewing = [...active, ...trial].filter(c => c.subscription_end?.startsWith(monthStr));
    return {
      label: MES_ES[d.getMonth()] + ' ' + d.getFullYear(),
      count: renewing.length,
      revenue: renewing.reduce((s, c) => s + (c.plan_cost ?? 0), 0),
    };
  }), [comercios, comercioId]);

  const sorted = useMemo(() => [...scope].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name')    cmp = a.name.localeCompare(b.name);
    if (sortKey === 'plan')    cmp = (a.plan ?? '').localeCompare(b.plan ?? '');
    if (sortKey === 'cost')    cmp = (a.plan_cost ?? 0) - (b.plan_cost ?? 0);
    if (sortKey === 'billing') cmp = ((a.billing_cycle ?? '') as string).localeCompare((b.billing_cycle ?? '') as string);
    if (sortKey === 'status')  cmp = (a.subscription_status ?? '').localeCompare(b.subscription_status ?? '');
    if (sortKey === 'end')     cmp = (a.subscription_end ?? '9999').localeCompare(b.subscription_end ?? '9999');
    if (sortKey === 'renewal') cmp = (a.renewal_day ?? 99) - (b.renewal_day ?? 99);
    return sortAsc ? cmp : -cmp;
  }), [scope, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(true); }
  }
  const arrow = (k: SortKey) => sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : '';

  const F15 = { fontSize: 15 } as const;
  const F13 = { fontSize: 13 } as const;

  return (
    <div>
      {comercioId && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/super-root/reportes" className="btn sm ghost" style={F15}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chev" s={15} /></span> Todos los comercios
          </a>
          <span style={{ ...F15, fontWeight: 800 }}>{scope[0]?.name ?? 'Comercio'}</span>
        </div>
      )}

      {/* KPIs globales */}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="MRR" value={COPk(mrr)} icon="cash" color="var(--green)" />
        <Stat label="ARR proyectado" value={COPk(arr)} icon="chart" color="var(--accent2)" />
        <Stat label="Churn rate" value={`${churnRate.toFixed(1)}%`} icon="alert" color="var(--red)" />
        <Stat label="LTV promedio" value={COPk(ltv)} icon="fire" color="var(--yellow)" />
      </div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Activos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{active.length}</div>
        </div>
        <div className="stat">
          <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>En trial</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--yellow)' }}>{trial.length}</div>
        </div>
        <div className="stat">
          <div style={{ ...F15, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Vencidos / suspendidos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{expired.length}</div>
        </div>
      </div>

      {/* Distribución por plan + Proyección */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 800 }}>
            Distribución por plan
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {planStats.map(({ plan, total }) => {
              const color = PLAN_COLORS[plan] ?? 'var(--accent)';
              const pct = total / maxPlanCount * 100;
              return (
                <div key={plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ ...F13, fontWeight: 700, color }}>{plan}</span>
                    <span style={{ ...F13, color: 'var(--muted)' }}>{total} comercio{total !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, minWidth: total > 0 ? 6 : 0, borderRadius: 4, background: color, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 800 }}>
            Proyección — próximos 3 meses
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
            {projMonths.map(m => (
              <div key={m.label} style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{COPk(m.revenue)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {m.count} renovación{m.count !== 1 ? 'es' : ''}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 20px 12px' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Basado en vencimientos de comercios activos y en trial.</p>
          </div>
        </div>
      </div>

      {/* Ticket promedio por plan */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 800 }}>
          Ticket promedio por plan
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {planStats.map(({ plan, avg, paying }, i) => {
            const color = PLAN_COLORS[plan] ?? 'var(--accent)';
            return (
              <div key={plan} style={{ padding: '16px 20px', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ ...F13, color, fontWeight: 700, marginBottom: 4 }}>{plan}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{paying > 0 ? COPk(avg) : '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{paying} activo{paying !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla de comercios */}
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
              <th className="sortable" onClick={() => toggleSort('plan')} style={F15}>Plan{arrow('plan')}</th>
              <th className="sortable" onClick={() => toggleSort('cost')} style={F15}>Precio{arrow('cost')}</th>
              <th className="sortable" onClick={() => toggleSort('billing')} style={F15}>Modalidad{arrow('billing')}</th>
              <th className="sortable" onClick={() => toggleSort('status')} style={F15}>Estado{arrow('status')}</th>
              <th className="sortable" onClick={() => toggleSort('end')} style={F15}>Renovación{arrow('end')}</th>
              <th className="sortable" onClick={() => toggleSort('renewal')} style={F15}>Día renov.{arrow('renewal')}</th>
              <th style={F15}>Días restantes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const statusColor = STATUS_COLOR[c.subscription_status] ?? 'var(--muted)';
              const statusLabel = STATUS_LABEL[c.subscription_status] ?? c.subscription_status;
              const days = daysLeft(c.subscription_end);
              const daysNum = daysLeftNum(c.subscription_end);
              const urgentColor = daysNum < 8 && days !== '—' ? 'var(--orange)' : 'inherit';
              const billing = (c.billing_cycle as string | undefined) ?? 'mensual';
              return (
                <tr key={c.id}>
                  <td style={F15}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar sm" style={{ background: c.color + '26', color: c.color, overflow: 'hidden', flexShrink: 0 }}>
                        {c.photo_url
                          ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
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
                  <td>
                    <Chip color={billing === 'anual' ? 'var(--accent2)' : 'var(--muted)'}>
                      {billing === 'anual' ? 'Anual' : 'Mensual'}
                    </Chip>
                  </td>
                  <td><Chip color={statusColor}>{statusLabel}</Chip></td>
                  <td className="muted" style={F15}>{c.subscription_end ?? '—'}</td>
                  <td className="muted" style={F15}>{c.renewal_day ? `Día ${c.renewal_day}` : '—'}</td>
                  <td style={{ ...F15, fontWeight: 700, color: urgentColor }}>{days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
