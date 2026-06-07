'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk } from '@/lib/utils';
import type { Mesa, Product, Shift } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: 'var(--green)' },
  { id: 'transferencia', name: 'Transferencia', color: 'var(--blue)' },
  { id: 'qr', name: 'QR', color: 'var(--accent3)' },
  { id: 'datafono', name: 'Datáfono', color: 'var(--accent2)' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: 'var(--yellow)' },
];

const CAT_COLORS: Record<string, string> = {
  licor: 'var(--accent)',
  bebida: 'var(--accent2)',
  coctel: 'var(--accent3)',
  'cóctel': 'var(--accent3)',
  snack: 'var(--yellow)',
  cigarro: 'var(--muted)',
};

const catColor = (c: string) => CAT_COLORS[c.toLowerCase()] ?? 'var(--accent2)';

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
  tracked: boolean;
}

interface LocalMesa extends Mesa {
  items: CartItem[];
}

interface EmpMesasProps {
  comercioId: string;
  empleadoId: string;
  shiftId: string | null;
}

export function EmpMesas({ comercioId, empleadoId, shiftId }: EmpMesasProps) {
  const toast = useToast();
  const [mesas, setMesas] = useState<LocalMesa[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [filter, setFilter] = useState<'all' | 'abiertas' | 'libres'>('all');
  const [selectedMesa, setSelectedMesa] = useState<LocalMesa | null>(null);
  const [openingMesa, setOpeningMesa] = useState<LocalMesa | null>(null);
  const [alias, setAlias] = useState('');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState<'order' | 'pay'>('order');
  const [payment, setPayment] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newMesaName, setNewMesaName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [mesaOrder, setMesaOrder] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadMesas();
    loadProducts();
    if (shiftId) loadShift();

    // Realtime para mesas
    const mesasChannel = supabase
      .channel(`mesas-emp:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesas',
        filter: `comercio_id=eq.${comercioId}`,
      }, () => loadMesas())
      .subscribe();

    // Realtime para mesa_items
    const itemsChannel = supabase
      .channel(`mesa-items-emp:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesa_items',
      }, () => loadMesas())
      .subscribe();

    return () => {
      supabase.removeChannel(mesasChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [comercioId, shiftId]);

  // Restaurar orden de localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem(`mesa-order-${comercioId}`);
    if (savedOrder) {
      try {
        setMesaOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Error parsing mesa order:', e);
      }
    }
  }, [comercioId]);

  async function loadMesas() {
    const { data } = await supabase
      .from('mesas')
      .select('*, mesa_items(*, products(*))')
      .eq('comercio_id', comercioId)
      .order('name');

    if (data) {
      const mesasData = data.map((m: any) => ({
        ...m,
        items: (m.mesa_items || []).map((i: any) => ({
          product_id: i.product_id,
          name: i.products?.name ?? '',
          price: i.unit_price,
          cost: i.unit_cost,
          qty: i.qty,
          tracked: (i.products?.min_stock ?? 0) > 0,
        })),
      }));
      setMesas(mesasData);
    }
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .order('name');
    if (data) setProducts(data as Product[]);
  }

  async function loadShift() {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();
    if (data) setShift(data as Shift);
  }

  async function openMesa(mesa: LocalMesa, mesaAlias: string) {
    if (!shiftId) {
      toast('Abre tu turno primero', 'alert');
      return;
    }
    await supabase
      .from('mesas')
      .update({
        status: 'ocupada',
        alias: mesaAlias || 'Cliente',
        opened_at: new Date().toISOString(),
        opened_by: empleadoId,
      })
      .eq('id', mesa.id);
    setOpeningMesa(null);
    setAlias('');
    toast('Mesa abierta', 'check');
  }

  async function createMesa() {
    if (!newMesaName.trim()) {
      toast('Escribe un nombre para la mesa', 'alert');
      return;
    }
    const { error } = await supabase.from('mesas').insert({
      comercio_id: comercioId,
      name: newMesaName.trim(),
      status: 'libre',
    });
    if (error) {
      toast('Error al crear mesa', 'alert');
    } else {
      toast('Mesa creada', 'check');
      setCreating(false);
      setNewMesaName('');
    }
  }

  async function addToCart(product: Product) {
    if (!selectedMesa) return;
    if (product.stock <= 0) {
      toast('Producto agotado', 'alert');
      return;
    }

    // Verificar si ya existe en cart
    const existing = selectedMesa.items.find(i => i.product_id === product.id);
    if (existing) {
      // Incrementar qty
      const newQty = existing.qty + 1;
      await supabase
        .from('mesa_items')
        .update({ qty: newQty })
        .eq('mesa_id', selectedMesa.id)
        .eq('product_id', product.id);
    } else {
      // Crear nuevo item
      await supabase.from('mesa_items').insert({
        mesa_id: selectedMesa.id,
        product_id: product.id,
        qty: 1,
        unit_price: product.price,
        unit_cost: product.cost,
      });
    }
  }

  async function updateItemQty(item: CartItem, delta: number) {
    if (!selectedMesa) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      await supabase
        .from('mesa_items')
        .delete()
        .eq('mesa_id', selectedMesa.id)
        .eq('product_id', item.product_id);
    } else {
      await supabase
        .from('mesa_items')
        .update({ qty: newQty })
        .eq('mesa_id', selectedMesa.id)
        .eq('product_id', item.product_id);
    }
  }

  async function removeItem(item: CartItem) {
    if (!selectedMesa) return;
    await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', item.product_id);
  }

  async function cobrarMesa() {
    if (!selectedMesa || !payment || !shiftId) return;

    const total = selectedMesa.items.reduce((sum, i) => sum + i.price * i.qty, 0);

    // Crear venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        comercio_id: comercioId,
        shift_id: shiftId,
        payment_method: payment,
        total,
        closed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saleError || !sale) {
      toast('Error al crear la venta', 'alert');
      return;
    }

    // Crear sale_items
    const saleItems = selectedMesa.items.map(i => ({
      sale_id: sale.id,
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.price,
      unit_cost: i.cost,
    }));

    await supabase.from('sale_items').insert(saleItems);

    // Actualizar stock de productos
    for (const item of selectedMesa.items) {
      if (item.tracked) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock - item.qty })
            .eq('id', item.product_id);
        }
      }
    }

    // Eliminar mesa_items
    await supabase.from('mesa_items').delete().eq('mesa_id', selectedMesa.id);

    // Actualizar mesa a libre
    await supabase
      .from('mesas')
      .update({ status: 'libre', alias: null, opened_at: null, opened_by: null })
      .eq('id', selectedMesa.id);

    toast('Mesa cobrada', 'check');
    setSelectedMesa(null);
    setPhase('order');
    setPayment(null);
  }

  async function cerrarSinCobrar() {
    if (!selectedMesa) return;

    // Eliminar mesa_items
    await supabase.from('mesa_items').delete().eq('mesa_id', selectedMesa.id);

    // Actualizar mesa a libre
    await supabase
      .from('mesas')
      .update({ status: 'libre', alias: null, opened_at: null, opened_by: null })
      .eq('id', selectedMesa.id);

    toast('Mesa cerrada', 'check');
    setSelectedMesa(null);
    setPhase('order');
  }

  // Drag and drop
  function handleDragStart(mesaId: string) {
    setDraggedId(mesaId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const newOrder = mesaOrder.length > 0 ? [...mesaOrder] : mesas.map(m => m.id);
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setMesaOrder(newOrder);
    localStorage.setItem(`mesa-order-${comercioId}`, JSON.stringify(newOrder));
    setDraggedId(null);
  }

  // Filtros
  const mesasAbiertas = mesas.filter(m => m.status === 'ocupada');
  const mesasLibres = mesas.filter(m => m.status === 'libre');
  const mesasFiltradas =
    filter === 'abiertas'
      ? mesasAbiertas
      : filter === 'libres'
      ? mesasLibres
      : mesas;

  // Ordenar según mesaOrder
  const mesasOrdenadas = mesaOrder.length > 0
    ? [...mesasFiltradas].sort((a, b) => {
        const aIndex = mesaOrder.indexOf(a.id);
        const bIndex = mesaOrder.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
    : mesasFiltradas;

  // Cálculos
  const totalAcumulado = mesasAbiertas.reduce((sum, m) =>
    sum + m.items.reduce((s, i) => s + i.price * i.qty, 0), 0
  );
  const totalItems = mesasAbiertas.reduce((sum, m) =>
    sum + m.items.reduce((s, i) => s + i.qty, 0), 0
  );

  // Cronómetro del turno
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  useEffect(() => {
    if (!shift?.started_at) return;
    const interval = setInterval(() => {
      const start = new Date(shift.started_at).getTime();
      const now = Date.now();
      const diff = now - start;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [shift]);

  // Productos filtrados
  const cats = ['all', ...Array.from(new Set(products.map(p => p.cat)))];
  const prodsFiltrados = products.filter(p => {
    if (cat !== 'all' && p.cat !== cat) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Header con barra de progreso */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, flex: 1 }}>Mesas</h1>
          <Chip color="var(--green)">
            <span className="live-dot">●</span> En vivo
          </Chip>
        </div>

        {/* Barra de progreso */}
        <div
          style={{
            background: 'var(--panel2)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                VENTA DE LA NOCHE
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>
                {COP(totalAcumulado)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Chip color="var(--green)">
                <span className="live-dot">●</span> EN VIVO
              </Chip>
              <span style={{ fontSize: 18, fontWeight: 700, fontFeatureSettings: '"tnum"' }}>
                {elapsedTime}
              </span>
            </div>
          </div>

          {/* Barra de progreso visual */}
          <div style={{ height: 8, background: 'var(--panel)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min((totalAcumulado / 1000000) * 100, 100)}%`,
                background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {mesasAbiertas.length} cobradas · {mesasLibres.length} abiertas
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={'fchip' + (filter === 'all' ? ' on' : '')}
            style={filter === 'all' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#0b0a12' } : undefined}
            onClick={() => setFilter('all')}
          >
            Todas ({mesas.length})
          </button>
          <button
            className={'fchip' + (filter === 'abiertas' ? ' on' : '')}
            style={filter === 'abiertas' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#0b0a12' } : undefined}
            onClick={() => setFilter('abiertas')}
          >
            Abiertas ({mesasAbiertas.length})
          </button>
          <button
            className={'fchip' + (filter === 'libres' ? ' on' : '')}
            style={filter === 'libres' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#0b0a12' } : undefined}
            onClick={() => setFilter('libres')}
          >
            Libres ({mesasLibres.length})
          </button>
        </div>
        <button className="btn sm" onClick={() => setCreating(true)}>
          <Icon name="plus" s={14} /> Crear mesa
        </button>
      </div>

      {/* Grid de mesas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        {mesasOrdenadas.map(mesa => (
          <div
            key={mesa.id}
            draggable
            onDragStart={() => handleDragStart(mesa.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(mesa.id)}
            className="card"
            style={{
              padding: 16,
              cursor: mesa.status === 'libre' ? 'pointer' : 'pointer',
              background:
                mesa.status === 'ocupada'
                  ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--panel)) 0%, var(--panel) 100%)'
                  : 'var(--panel)',
              border:
                mesa.status === 'ocupada'
                  ? '2px solid var(--accent)'
                  : '1px solid var(--line)',
              boxShadow:
                mesa.status === 'ocupada'
                  ? '0 0 20px -8px var(--accent)'
                  : undefined,
              position: 'relative',
            }}
            onClick={() => {
              if (mesa.status === 'libre') {
                setOpeningMesa(mesa);
              } else {
                setSelectedMesa(mesa);
                setPhase('order');
              }
            }}
          >
            {/* Badge status */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                fontSize: 9,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 999,
                background:
                  mesa.status === 'ocupada'
                    ? 'var(--accent)'
                    : 'var(--muted2)',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {mesa.status === 'ocupada' ? 'ABIERTA' : 'LIBRE'}
            </div>

            {/* Nombre de la mesa */}
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {mesa.name}
            </div>

            {mesa.status === 'ocupada' ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  {mesa.alias}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>
                  {COP(mesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                  {mesa.items.reduce((s, i) => s + i.qty, 0)} ítems
                </div>

                {/* Chips de productos */}
                {mesa.items.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {mesa.items.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: 'var(--panel2)',
                          color: 'var(--muted)',
                        }}
                      >
                        {item.qty}x {item.name}
                      </span>
                    ))}
                    {mesa.items.length > 3 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: 'var(--accent)',
                          color: '#fff',
                        }}
                      >
                        +{mesa.items.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
                <Icon name="plus" s={32} />
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>Abrir</div>
              </div>
            )}
          </div>
        ))}

        {/* Tarjeta nueva mesa */}
        <div
          className="card"
          style={{
            padding: 16,
            cursor: 'pointer',
            border: '2px dashed var(--line2)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 180,
          }}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" s={32} />
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
            Nueva mesa
          </div>
        </div>
      </div>

      {/* Modal: Abrir mesa */}
      {openingMesa && (
        <Modal title={`Abrir ${openingMesa.name}`} onClose={() => setOpeningMesa(null)}>
          <Field label="Alias del cliente">
            <input
              type="text"
              placeholder="Ej: Juan, Mesa 5, etc."
              value={alias}
              onChange={e => setAlias(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') openMesa(openingMesa, alias);
              }}
              autoFocus
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setOpeningMesa(null)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => openMesa(openingMesa, alias)}
              style={{ flex: 1 }}
            >
              Abrir mesa
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Crear mesa */}
      {creating && (
        <Modal title="Nueva mesa" onClose={() => setCreating(false)}>
          <Field label="Nombre de la mesa">
            <input
              type="text"
              placeholder="Ej: Mesa 1, VIP, Terraza, etc."
              value={newMesaName}
              onChange={e => setNewMesaName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createMesa();
              }}
              autoFocus
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setCreating(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn primary" onClick={createMesa} style={{ flex: 1 }}>
              Crear
            </button>
          </div>
        </Modal>
      )}

      {/* Modal POS */}
      {selectedMesa && phase === 'order' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedMesa(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 1200,
              maxHeight: '90vh',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 0,
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Columna izquierda: Productos */}
            <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {selectedMesa.name} · {selectedMesa.alias}
                    </div>
                  </div>
                  <button className="icon-btn" onClick={() => setSelectedMesa(null)}>
                    <Icon name="close" s={20} />
                  </button>
                </div>

                <Field label="">
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                  />
                </Field>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {cats.map(c => (
                    <button
                      key={c}
                      className={'fchip' + (cat === c ? ' on' : '')}
                      style={cat === c ? {
                        background: catColor(c),
                        borderColor: catColor(c),
                        color: '#fff',
                      } : undefined}
                      onClick={() => setCat(c)}
                    >
                      {c === 'all' ? 'Todas' : c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {prodsFiltrados.map(p => (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        padding: 12,
                        cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                        opacity: p.stock === 0 ? 0.5 : 1,
                        position: 'relative',
                      }}
                      onClick={() => p.stock > 0 && addToCart(p)}
                    >
                      {p.stock === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          AGOTADO
                        </div>
                      )}

                      {/* Badge stock */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background:
                            p.stock === 0
                              ? 'var(--red)'
                              : p.stock <= p.min_stock
                              ? 'var(--yellow)'
                              : 'var(--muted2)',
                          color: '#fff',
                        }}
                      >
                        {p.stock}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        {p.sub} · {p.unit}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>
                        {COP(p.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: Consumo */}
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              {/* Header sticky con botones */}
              <div
                style={{
                  padding: 20,
                  borderBottom: '1px solid var(--line)',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--panel)',
                  zIndex: 10,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>CONSUMO</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>
                    {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} ítems
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    className="btn primary"
                    style={{ width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 700 }}
                    disabled={selectedMesa.items.length === 0}
                    onClick={() => setPhase('pay')}
                  >
                    Cobrar mesa
                  </button>
                  <button
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 700,
                      background: 'var(--red)',
                      borderColor: 'var(--red)',
                      color: '#fff',
                    }}
                    onClick={() => {
                      if (confirm('¿Cerrar sin cobrar?')) {
                        cerrarSinCobrar();
                      }
                    }}
                  >
                    Cerrar sin cobrar
                  </button>
                </div>
              </div>

              {/* Lista de ítems */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {selectedMesa.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Agrega productos al consumo
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedMesa.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="card"
                        style={{
                          padding: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            className="icon-btn sm"
                            onClick={() => updateItemQty(item, -1)}
                          >
                            <Icon name="minus" s={14} />
                          </button>
                          <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                            {item.qty}
                          </span>
                          <button
                            className="icon-btn sm"
                            onClick={() => updateItemQty(item, 1)}
                          >
                            <Icon name="plus" s={14} />
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {COP(item.price)} c/u
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {COP(item.price * item.qty)}
                        </div>

                        <button
                          className="icon-btn sm"
                          style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}
                          onClick={() => {
                            if (confirm(`¿Eliminar ${item.name}?`)) {
                              removeItem(item);
                            }
                          }}
                        >
                          <Icon name="close" s={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cobro */}
      {selectedMesa && phase === 'pay' && (
        <Modal
          title="Cobrar mesa"
          onClose={() => setPhase('order')}
          wide
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Resumen del consumo</div>
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              {selectedMesa.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx < selectedMesa.items.length - 1 ? '1px solid var(--line)' : undefined,
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {item.qty}x {item.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {COP(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>TOTAL A COBRAR</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', marginBottom: 20 }}>
              {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Método de pago</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {PAYMENTS.map(p => (
                <button
                  key={p.id}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    background: payment === p.id ? p.color : 'var(--panel2)',
                    borderColor: payment === p.id ? p.color : 'var(--line)',
                    color: payment === p.id ? '#fff' : 'var(--ink)',
                  }}
                  onClick={() => setPayment(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setPhase('order')} style={{ flex: 1 }}>
                Volver
              </button>
              <button
                className="btn primary"
                onClick={cobrarMesa}
                disabled={!payment}
                style={{ flex: 1 }}
              >
                Confirmar cobro
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
