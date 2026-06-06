'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Stat } from '@/components/ui/Stat';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk } from '@/lib/utils';
import type { Shift, Sale } from '@/types/db';

interface EmpTurnoProps {
  comercioId: string;
  empleadoId: string;
}

export function EmpTurno({ comercioId, empleadoId }: EmpTurnoProps) {
  const toast = useToast();
  const [shift, setShift] = useState<Shift | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const supabase = createClient();

  useEffect(() => { load(); }, [empleadoId]);

  async function load() {
    const { data: s } = await supabase.from('shifts').select('*').eq('empleado_id', empleadoId).eq('status', 'open').single();
    setShift(s as Shift | null);
    if (s) {
      const { data: v } = await supabase.from('sales').select('*').eq('shift_id', s.id).order('closed_at', { ascending: false });
      setSales((v ?? []) as Sale[]);
    }
  }

  async function startShift() {
    const { data } = await supabase.from('shifts').insert({ comercio_id: comercioId, empleado_id: empleadoId, started_at: new Date().toISOString(), status: 'open' }).select().single();
    setShift(data as Shift);
    toast('Turno iniciado', 'check');
  }

  async function closeShift() {
    if (!shift) return;
    await supabase.from('shifts').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', shift.id);
    setShift(null); setSales([]);
    toast('Turno cerrado', 'check');
  }

  const total = sales.reduce((s, v) => s + v.total, 0);
  const duration = shift ? Math.round((Date.now() - new Date(shift.started_at).getTime()) / 60000) : 0;

  return (
    <div>
      {!shift ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 24, fontSize: 15 }}>No tienes un turno activo. Inicia uno para comenzar a operar.</p>
          <button className="btn pri" style={{ fontSize: 16, padding: '14px 32px' }} onClick={startShift}>
            <Icon name="play" /> Iniciar turno
          </button>
        </div>
      ) : (
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Turno activo</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Iniciado: {new Date(shift.started_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {duration}m activo
              </div>
            </div>
            <button className="btn ghost" onClick={closeShift}><Icon name="stop" s={16} /> Cerrar turno</button>
          </div>

          <div className="grid g3" style={{ marginBottom: 16 }}>
            <Stat label="Ventas del turno" value={COP(total)} icon="cash" color="var(--green)" />
            <Stat label="Mesas cobradas" value={sales.length} icon="mesas" color="var(--accent)" />
            <Stat label="Ticket promedio" value={sales.length ? COP(Math.round(total / sales.length)) : '$0'} icon="receipt" color="var(--accent2)" />
          </div>

          {sales.length > 0 && (
            <div className="card">
              <div className="chart-h" style={{ marginBottom: 12 }}>Mesas cobradas hoy</div>
              <table className="tbl">
                <thead><tr><th>Mesa</th><th>Alias</th><th style={{ textAlign: 'right' }}>Total</th><th>Pago</th></tr></thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td>{s.mesa_name}</td>
                      <td className="muted">{s.mesa_alias ?? '—'}</td>
                      <td className="tnum" style={{ textAlign: 'right' }}>{COP(s.total)}</td>
                      <td><span className="chip">{s.payment_method}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
