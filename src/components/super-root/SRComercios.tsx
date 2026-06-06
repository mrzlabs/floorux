'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import type { Comercio } from '@/types/db';
import { COP } from '@/lib/utils';

const PLAN_PRICE: Record<string, string> = {
  'Básico': '$89.000 COP',
  'basico': '$89.000 COP',
  'Pro': '$149.000 COP',
  'pro': '$149.000 COP',
  'Red': '$249.000 COP',
  'red': '$249.000 COP',
  'Enterprise': 'Cotización',
  'enterprise': 'Cotización',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  activo: 'var(--green)',
  trial: 'var(--yellow)',
  due: 'var(--orange)',
  vencido: 'var(--red)',
  suspended: 'var(--muted)',
  suspendido: 'var(--muted)',
  cancelled: 'var(--red)',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  activo: 'Activo',
  trial: 'Trial',
  due: 'Vencido',
  vencido: 'Vencido',
  suspended: 'Suspendido',
  suspendido: 'Suspendido',
  cancelled: 'Cancelado',
};

function daysLeft(end?: string | null): { label: string; color: string } {
  if (!end) return { label: 'Sin fin', color: 'var(--muted)' };
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 864e5);
  if (diff < 0) return { label: `Vencido hace ${Math.abs(diff)}d`, color: 'var(--red)' };
  if (diff === 0) return { label: 'Vence hoy', color: 'var(--orange)' };
  if (diff <= 7) return { label: `${diff}d restantes`, color: 'var(--orange)' };
  return { label: `${diff}d restantes`, color: 'var(--green)' };
}

export function SRComercios() {
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  async function operate(comercioId: string) {
    const res = await fetch('/api/operate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId }),
    });
    if (res.ok) window.location.assign('/admin/resumen');
  }

  useEffect(() => {
    supabase.from('comercios').select('*').order('name').then(({ data, error: e }) => {
      setComercios((data ?? []) as Comercio[]);
      setError(e?.message ?? '');
    });
  }, []);

  const filtered = comercios.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.city.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Todos los comercios</h2>
          <p className="muted" style={{ fontSize: 14 }}>{comercios.length} en el sistema</p>
        </div>
        <div className="searchbox" style={{ width: 260 }}>
          <Icon name="search" s={16} />
          <input placeholder="Buscar por nombre o ciudad…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {error && <div className="alert-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="biz-grid">
        {filtered.map(c => {
          const days = daysLeft(c.subscription_end);
          const statusColor = STATUS_COLOR[c.subscription_status] ?? 'var(--muted)';
          const statusLabel = STATUS_LABEL[c.subscription_status] ?? c.subscription_status;
          const planPrice = PLAN_PRICE[c.plan] ?? COP(c.plan_cost ?? 0);

          return (
            <div
              key={c.id}
              className={'biz' + (c.status !== 'activo' ? ' off' : '')}
              style={{ borderTopColor: c.color, borderTopWidth: 3 }}
            >
              {/* header */}
              <div className="biz-top">
                {c.photo_url ? (
                  <span className="avatar" style={{ background: c.color + '26', color: c.color, overflow: 'hidden' }}>
                    <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                ) : (
                  <Avatar name={c.name} color={c.color} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bn">{c.name}</div>
                  <div className="bc">{c.type} · {c.city}</div>
                </div>
                <Chip color={statusColor}>{statusLabel}</Chip>
              </div>

              {/* suscripción */}
              <div className="biz-row" style={{ fontSize: 14 }}><span>Plan</span><b style={{ color: c.color }}>{c.plan}</b></div>
              <div className="biz-row" style={{ fontSize: 14 }}><span>Costo mensual</span><b>{planPrice}</b></div>
              <div className="biz-row" style={{ fontSize: 14 }}><span>Costo BD</span><b>{COP(c.plan_cost ?? 0)}</b></div>
              <div className="biz-row" style={{ fontSize: 14 }}><span>Inicio</span><b>{c.subscription_start ?? c.since}</b></div>
              <div className="biz-row" style={{ fontSize: 14 }}>
                <span>Renovación</span>
                <b style={{ color: days.color }}>{days.label}</b>
              </div>
              <div className="biz-row" style={{ fontSize: 14 }}>
                <span>Tipo</span>
                <span className={'kind-pill ' + (c.kind === 'Principal' ? 'princ' : 'fran')}>{c.kind}</span>
              </div>

              {/* acciones */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn pri"
                  style={{ flex: 1, fontSize: 14 }}
                  disabled={c.status !== 'activo'}
                  onClick={() => operate(c.id)}
                >
                  <Icon name="admin" s={15} /> Operar
                </button>
                <a
                  href={`/super-root/reportes?id=${c.id}`}
                  className="btn"
                  style={{ flex: 1, fontSize: 14, textAlign: 'center', textDecoration: 'none' }}
                >
                  <Icon name="chart" s={15} /> Reportes
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
