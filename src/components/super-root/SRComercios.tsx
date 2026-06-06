'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import type { Comercio } from '@/types/db';
import { COP } from '@/lib/utils';

export function SRComercios() {
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  async function operate(comercioId: string) {
    const response = await fetch('/api/operate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comercioId }),
    });
    if (response.ok) window.location.assign('/admin/resumen');
  }

  useEffect(() => {
    supabase.from('comercios').select('*').order('name').then(({ data, error: queryError }) => {
      setComercios((data ?? []) as Comercio[]);
      setError(queryError?.message ?? '');
    });
  }, []);

  const filtered = comercios.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.city.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mesas-top" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Todos los comercios ({comercios.length})</h2>
        <input className="inp" style={{ width: 240 }} placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {error && <div className="alert-banner">No se pudieron cargar los comercios: {error}</div>}
      <div className="biz-grid">
        {filtered.map(c => (
          <div className={'biz' + (c.status === 'inactivo' ? ' off' : '')} key={c.id}>
            <div className="biz-top">
              <Avatar name={c.name} color={c.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bn">{c.name}</div>
                <div className="bc">{c.type} · {c.city}</div>
              </div>
            </div>
            <div className="biz-row"><span>Plan</span><b>{c.plan}</b></div>
            <div className="biz-row"><span>Costo</span><b>{COP(c.plan_cost ?? 0)}</b></div>
            <div className="biz-row"><span>Inicio</span><b>{c.subscription_start ?? c.since}</b></div>
            <div className="biz-row"><span>Fin</span><b>{c.subscription_end ?? 'Sin fin'}</b></div>
            <div className="biz-row"><span>Renovación</span><b>Día {c.renewal_day ?? '—'}</b></div>
            <div className="biz-row"><span>Suscripción</span><Chip color={c.subscription_status === 'active' ? 'var(--green)' : 'var(--orange)'}>{c.subscription_status ?? 'active'}</Chip></div>
            <div className="biz-row"><span>Tipo</span><span className={'kind-pill ' + (c.kind === 'Principal' ? 'princ' : 'fran')}>{c.kind}</span></div>
            <div className="biz-row"><span>Estado</span><Chip color={c.status === 'activo' ? 'var(--green)' : 'var(--red)'}>{c.status}</Chip></div>
            <button className="btn pri block" disabled={c.status !== 'activo'} onClick={() => operate(c.id)}>
              <Icon name="admin" s={15} /> Operar negocio
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
