'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { COP } from '@/lib/utils';

interface MesaItemLike {
  price: number;
  qty: number;
  name?: string;
}

export interface MesaPlanLike {
  id: string;
  name: string;
  alias: string | null;
  status: 'libre' | 'ocupada';
  opened_at: string | null;
  items: MesaItemLike[];
  admin_modified?: boolean;
}

interface MesaLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round' | 'square' | 'oval' | 'bar';
}

const SHAPE_LABELS: Record<MesaLayout['shape'], string> = {
  rect: 'Rectángulo',
  round: 'Redonda',
  square: 'Cuadrada',
  oval: 'Ovalada',
  bar: 'Barra',
};

const SHAPE_RADIUS: Record<MesaLayout['shape'], string> = {
  rect: '16px',
  round: '999px',
  square: '12px',
  oval: '50%',
  bar: '10px',
};

interface MesaFloorPlanProps<T extends MesaPlanLike> {
  comercioId: string;
  mesas: T[];
  editable?: boolean;
  onMesaClick: (mesa: T) => void;
  onCreateMesa?: () => void;
}

const PLAN_W = 1000;
const PLAN_H = 620;
const MIN_W = 130;
const MIN_H = 110;

function defaultLayout(index: number): MesaLayout {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return {
    x: 40 + col * 180,
    y: 44 + row * 150,
    w: 150,
    h: 116,
    shape: 'rect',
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mesaTotal(mesa: MesaPlanLike) {
  return mesa.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function itemCount(mesa: MesaPlanLike) {
  return mesa.items.reduce((sum, item) => sum + item.qty, 0);
}

export function MesaFloorPlan<T extends MesaPlanLike>({
  comercioId,
  mesas,
  editable = false,
  onMesaClick,
  onCreateMesa,
}: MesaFloorPlanProps<T>) {
  const supabase = useMemo(() => createClient(), []);
  const planRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Record<string, MesaLayout>>({});
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const layoutRef = useRef<Record<string, MesaLayout>>({});

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    let alive = true;

    async function loadLayout() {
      const { data } = await supabase
        .from('mesa_layouts')
        .select('mesa_id, x, y, w, h, shape')
        .eq('comercio_id', comercioId);

      if (!alive) return;
      const next: Record<string, MesaLayout> = {};
      (data ?? []).forEach(row => {
        next[row.mesa_id] = { x: row.x, y: row.y, w: row.w, h: row.h, shape: row.shape as MesaLayout['shape'] };
      });
      setLayout(next);
    }

    loadLayout();

    const channel = supabase
      .channel(`mesa-floor-plan:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesa_layouts',
        filter: `comercio_id=eq.${comercioId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { mesa_id: string };
          setLayout(prev => {
            const next = { ...prev };
            delete next[oldRow.mesa_id];
            return next;
          });
          return;
        }
        const row = payload.new as { mesa_id: string; x: number; y: number; w: number; h: number; shape: string };
        setLayout(prev => ({
          ...prev,
          [row.mesa_id]: { x: row.x, y: row.y, w: row.w, h: row.h, shape: row.shape as MesaLayout['shape'] },
        }));
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [comercioId, supabase]);

  useEffect(() => {
    const missing = mesas.filter(mesa => !layout[mesa.id]);
    if (!missing.length) return;

    const additions: Record<string, MesaLayout> = {};
    missing.forEach((mesa) => {
      additions[mesa.id] = defaultLayout(mesas.findIndex(m => m.id === mesa.id));
    });

    setLayout(current => ({ ...current, ...additions }));
    void supabase
      .from('mesa_layouts')
      .upsert(
        Object.entries(additions).map(([mesa_id, entry]) => ({ mesa_id, comercio_id: comercioId, ...entry })),
        { onConflict: 'mesa_id' }
      );
  }, [mesas, layout, comercioId, supabase]);

  async function saveMesaLayout(id: string, entry: MesaLayout) {
    setSaving(true);
    await supabase
      .from('mesa_layouts')
      .upsert({ mesa_id: id, comercio_id: comercioId, ...entry }, { onConflict: 'mesa_id' });
    setSaving(false);
  }

  function patchMesa(id: string, patch: Partial<MesaLayout>, persist = true) {
    const nextEntry = { ...(layoutRef.current[id] ?? defaultLayout(mesas.findIndex(m => m.id === id))), ...patch };
    setLayout(current => ({ ...current, [id]: nextEntry }));
    if (persist) void saveMesaLayout(id, nextEntry);
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, mesa: T) {
    if (!editMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { id: mesa.id, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const plan = planRef.current;
    if (!drag || !plan) return;

    const rect = plan.getBoundingClientRect();
    const scaleX = PLAN_W / rect.width;
    const scaleY = PLAN_H / rect.height;
    const current = layout[drag.id] ?? defaultLayout(0);
    const x = clamp((event.clientX - rect.left - drag.dx) * scaleX, 0, PLAN_W - current.w);
    const y = clamp((event.clientY - rect.top - drag.dy) * scaleY, 0, PLAN_H - current.h);
    setLayout(prev => ({ ...prev, [drag.id]: { ...current, x, y } }));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const entry = layoutRef.current[drag.id];
    if (entry) void saveMesaLayout(drag.id, entry);
  }

  function setSize(size: 'sm' | 'md' | 'lg') {
    if (!selectedId) return;
    const sizes = {
      sm: { w: 130, h: 104 },
      md: { w: 158, h: 120 },
      lg: { w: 210, h: 146 },
    };
    patchMesa(selectedId, sizes[size]);
  }

  function setShape(shape: MesaLayout['shape']) {
    if (!selectedId) return;
    const current = layoutRef.current[selectedId] ?? defaultLayout(mesas.findIndex(m => m.id === selectedId));
    const patch: Partial<MesaLayout> = { shape };
    if (shape === 'square') {
      const side = Math.max(current.w, current.h);
      patch.w = side;
      patch.h = side;
    } else if (shape === 'bar') {
      patch.w = 240;
      patch.h = 88;
    }
    patchMesa(selectedId, patch);
  }

  async function resetLayout() {
    const next = Object.fromEntries(mesas.map((mesa, index) => [mesa.id, defaultLayout(index)]));
    setLayout(next);
    setSaving(true);
    await supabase
      .from('mesa_layouts')
      .upsert(
        mesas.map((mesa, index) => ({ mesa_id: mesa.id, comercio_id: comercioId, ...defaultLayout(index) })),
        { onConflict: 'mesa_id' }
      );
    setSaving(false);
  }

  const selected = selectedId ? layout[selectedId] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Croquis del local</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {editable ? 'Organiza mesas según la distribución física del comercio.' : 'Vista operativa según el plano definido por administración.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {editable && (
            <>
              <button className={'btn sm' + (editMode ? ' pri' : '')} onClick={() => setEditMode(!editMode)}>
                <Icon name="edit" s={14} /> {editMode ? 'Terminar edición' : 'Editar croquis'}
              </button>
              {editMode && (
                <button className="btn sm ghost" onClick={resetLayout}>
                  <Icon name="history" s={14} /> Reordenar
                </button>
              )}
            </>
          )}
          {onCreateMesa && (
            <button className="btn sm" onClick={onCreateMesa}>
              <Icon name="plus" s={14} /> Nueva mesa
            </button>
          )}
        </div>
      </div>

      {editable && editMode && (
        <div className="card" style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
            {selectedId ? `Mesa seleccionada: ${mesas.find(m => m.id === selectedId)?.name ?? ''}` : 'Selecciona una mesa'}
          </span>
          <button className="btn sm ghost" disabled={!selected} onClick={() => setSize('sm')}>Compacta</button>
          <button className="btn sm ghost" disabled={!selected} onClick={() => setSize('md')}>Media</button>
          <button className="btn sm ghost" disabled={!selected} onClick={() => setSize('lg')}>Grande</button>
          {(['rect', 'round', 'square', 'oval', 'bar'] as const).map(shape => (
            <button
              key={shape}
              className={'btn sm ghost' + (selected?.shape === shape ? ' pri' : '')}
              disabled={!selected}
              onClick={() => setShape(shape)}
            >
              {SHAPE_LABELS[shape]}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: saving ? 'var(--accent)' : 'var(--muted)' }}>
            {saving ? 'Guardando croquis...' : 'Croquis sincronizado'}
          </span>
        </div>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div
          ref={planRef}
          className="card floor-plan"
          style={{
            position: 'relative',
            minWidth: 720,
            aspectRatio: `${PLAN_W} / ${PLAN_H}`,
            overflow: 'hidden',
            background:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px), color-mix(in srgb, var(--panel2) 78%, transparent)',
            backgroundSize: '40px 40px',
            border: '1px solid var(--line2)',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 18,
            border: '2px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            borderRadius: 16,
            pointerEvents: 'none',
          }} />

          {mesas.map((mesa, index) => {
            const pos = layout[mesa.id] ?? defaultLayout(index);
            const total = mesaTotal(mesa);
            const count = itemCount(mesa);
            return (
              <div
                key={mesa.id}
                className="mesa-card"
                onPointerDown={(event) => {
                  setSelectedId(mesa.id);
                  startDrag(event, mesa);
                }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onClick={() => !editMode && onMesaClick(mesa)}
                style={{
                  position: 'absolute',
                  left: `${(pos.x / PLAN_W) * 100}%`,
                  top: `${(pos.y / PLAN_H) * 100}%`,
                  width: `${(Math.max(MIN_W, pos.w) / PLAN_W) * 100}%`,
                  height: `${(Math.max(MIN_H, pos.h) / PLAN_H) * 100}%`,
                  borderRadius: SHAPE_RADIUS[pos.shape],
                  padding: 12,
                  cursor: editMode ? 'grab' : 'pointer',
                  userSelect: 'none',
                  touchAction: 'none',
                  background: mesa.status === 'ocupada'
                    ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))'
                    : 'var(--panel)',
                  border: selectedId === mesa.id && editMode
                    ? '2px solid var(--accent2)'
                    : mesa.status === 'ocupada'
                    ? '2px solid var(--accent)'
                    : '1px solid var(--line)',
                  boxShadow: mesa.status === 'ocupada'
                    ? '0 12px 28px color-mix(in srgb, var(--accent) 18%, transparent)'
                    : '0 8px 20px rgba(0,0,0,.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mesa.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {mesa.status === 'ocupada' ? mesa.alias : 'Disponible'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '3px 7px',
                    borderRadius: 99,
                    background: mesa.status === 'ocupada' ? 'var(--accent)' : 'var(--panel3)',
                    color: mesa.status === 'ocupada' ? '#fff' : 'var(--muted)',
                  }}>
                    {mesa.status === 'ocupada' ? 'ABIERTA' : 'LIBRE'}
                  </span>
                </div>

                {mesa.status === 'ocupada' ? (
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>
                      {COP(total)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      {count} ítems
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>
                    <Icon name="plus" s={16} /> Abrir
                  </div>
                )}

                {mesa.admin_modified && (
                  <span style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    fontSize: 8,
                    fontWeight: 900,
                    padding: '2px 6px',
                    borderRadius: 99,
                    background: 'var(--accent3)',
                    color: '#fff',
                  }}>
                    ADM
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .floor-plan:before {
          content: 'ENTRADA';
          position: absolute;
          left: 34px;
          bottom: 20px;
          font-size: 10px;
          font-weight: 900;
          color: var(--muted);
          letter-spacing: .08em;
        }
        .mesa-card {
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .mesa-card:hover {
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .floor-plan {
            min-width: 680px !important;
          }
        }
      `}</style>
    </div>
  );
}
