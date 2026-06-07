'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { Mesa, Product, Shift } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: 'var(--green)' },
  { id: 'transferencia', name: 'Transferencia', color: 'var(--blue)' },
  { id: 'qr', name: 'QR', color: 'var(--accent3)' },
  { id: 'datafono', name: 'Datáfono', color: 'var(--accent2)' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: 'var(--yellow)' },
];

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

  // Modal: Abrir mesa
  const [openingMesa, setOpeningMesa] = useState<LocalMesa | null>(null);
  const [alias, setAlias] = useState('');

  // Modal: POS
  const [selectedMesa, setSelectedMesa] = useState<LocalMesa | null>(null);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  // Modal: Cobro
  const [showingCobro, setShowingCobro] = useState(false);
  const [payment, setPayment] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Crear mesa
  const [creating, setCreating] = useState(false);
  const [newMesaName, setNewMesaName] = useState('');

  // Drag & drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [mesaOrder, setMesaOrder] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    loadMesas();
    loadProducts();
    if (shiftId) loadShift();

    const mesasChannel = supabase
      .channel(`mesas-emp:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesas',
        filter: `comercio_id=eq.${comercioId}`,
      }, () => loadMesas())
      .subscribe();

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

    // Abrir directamente el modal POS
    const { data } = await supabase
      .from('mesas')
      .select('*, mesa_items(*, products(*))')
      .eq('id', mesa.id)
      .single();

    if (data) {
      const mesaData = {
        ...data,
        items: (data.mesa_items || []).map((i: any) => ({
          product_id: i.product_id,
          name: i.products?.name ?? '',
          price: i.unit_price,
          cost: i.unit_cost,
          qty: i.qty,
          tracked: (i.products?.min_stock ?? 0) > 0,
        })),
      };
      setSelectedMesa(mesaData);
    }

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

    const existing = selectedMesa.items.find(i => i.product_id === product.id);
    if (existing) {
      const newQty = existing.qty + 1;
      await supabase
        .from('mesa_items')
        .update({ qty: newQty })
        .eq('mesa_id', selectedMesa.id)
        .eq('product_id', product.id);
    } else {
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
    if (!selectedMesa || !payment) {
      toast('Selecciona un método de pago', 'alert');
      return;
    }

    let currentShiftId = shiftId;

    // Si no hay shift abierto, crear uno
    if (!currentShiftId) {
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          comercio_id: comercioId,
          empleado_id: empleadoId,
          started_at: new Date().toISOString(),
          status: 'open',
        })
        .select()
        .single();

      if (shiftError || !newShift) {
        toast('Error al crear turno', 'alert');
        return;
      }
      currentShiftId = newShift.id;
    }

    const total = selectedMesa.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cost = selectedMesa.items.reduce((sum, i) => sum + i.cost * i.qty, 0);

    // Subir evidencia si hay
    let evidenceUrl = null;
    if (evidenceFile) {
      const timestamp = Date.now();
      const fileName = `${timestamp}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(`sales/${comercioId}/${fileName}`, evidenceFile);

      if (!uploadError && uploadData) {
        evidenceUrl = uploadData.path;
      }
    }

    // Crear venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        comercio_id: comercioId,
        shift_id: currentShiftId,
        mesa_name: selectedMesa.name,
        mesa_alias: selectedMesa.alias,
        payment_method: payment,
        total,
        cost,
        evidence: !!evidenceUrl,
        closed_at: new Date().toISOString(),
        closed_by: empleadoId,
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
      product_name: i.name,
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

    // Liberar mesa
    await supabase
      .from('mesas')
      .update({ status: 'libre', alias: null, opened_at: null, opened_by: null })
      .eq('id', selectedMesa.id);

    toast('Mesa cobrada y liberada', 'check');
    setSelectedMesa(null);
    setShowingCobro(false);
    setPayment(null);
    setEvidenceFile(null);
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
      {/* Header venta de la noche */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            background: 'var(--panel2)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                VENTA DE LA NOCHE
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>
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

          {/* Barra de progreso */}
          <div style={{ height: 8, background: 'var(--panel)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
            {mesasAbiertas.map((mesa, idx) => {
              const mesaTotal = mesa.items.reduce((s, i) => s + i.price * i.qty, 0);
              const percentage = totalAcumulado > 0 ? (mesaTotal / totalAcumulado) * 100 : 0;
              return (
                <div
                  key={mesa.id}
                  style={{
                    display: 'inline-block',
                    height: '100%',
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%)`,
                  }}
                />
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {mesasAbiertas.length} abiertas · {mesasLibres.length} libres
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={'fchip' + (filter === 'all' ? ' on' : '')}
            style={filter === 'all' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
            onClick={() => setFilter('all')}
          >
            Todas ({mesas.length})
          </button>
          <button
            className={'fchip' + (filter === 'abiertas' ? ' on' : '')}
            style={filter === 'abiertas' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
            onClick={() => setFilter('abiertas')}
          >
            Abiertas ({mesasAbiertas.length})
          </button>
          <button
            className={'fchip' + (filter === 'libres' ? ' on' : '')}
            style={filter === 'libres' ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
        className="mesa-grid"
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
              cursor: 'pointer',
              background: mesa.status === 'ocupada'
                ? 'color-mix(in srgb, var(--accent) 10%, var(--panel))'
                : 'var(--panel)',
              border: mesa.status === 'ocupada'
                ? '2px solid var(--accent)'
                : '1px solid var(--line)',
              position: 'relative',
              minHeight: 180,
            }}
            onClick={() => {
              if (mesa.status === 'libre') {
                setOpeningMesa(mesa);
              } else {
                setSelectedMesa(mesa);
              }
            }}
          >
            {/* Badge status */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                fontSize: 9,
                fontWeight: 700,
                padding: '4px 9px',
                borderRadius: 999,
                background: mesa.status === 'ocupada' ? 'var(--accent)' : 'var(--muted2)',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {mesa.status === 'ocupada' ? 'ABIERTA' : 'LIBRE'}
            </div>

            {/* Nombre */}
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {mesa.name}
            </div>

            {mesa.status === 'ocupada' ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                  {mesa.alias}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>
                  {COP(mesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                  {(() => {
                    if (!mesa.opened_at) return '· ' + mesa.items.reduce((s, i) => s + i.qty, 0) + ' ítems';
                    const start = new Date(mesa.opened_at).getTime();
                    const now = Date.now();
                    const diff = now - start;
                    const hours = Math.floor(diff / 3600000);
                    const minutes = Math.floor((diff % 3600000) / 60000);
                    const itemCount = mesa.items.reduce((s, i) => s + i.qty, 0);
                    return `${hours}h ${minutes}m · ${itemCount} ítems`;
                  })()}
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
                          background: 'var(--accent2)',
                          color: '#fff',
                        }}
                      >
                        {item.name}
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
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                <Icon name="plus" s={32} />
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Abrir</div>
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
          <Icon name="plus" s={32} color="var(--muted)" />
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
            Nueva mesa
          </div>
        </div>
      </div>

      {/* Modal: Abrir mesa */}
      {openingMesa && (
        <Modal title="" onClose={() => setOpeningMesa(null)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icon name="table" s={20} />
              <span style={{ fontSize: 18, fontWeight: 800 }}>Abrir {openingMesa.name}</span>
            </div>
          </div>

          <Field label="Alias del cliente o grupo">
            <input
              className="inp"
              type="text"
              placeholder="Ej. Mesa del cumpleaños, Don Jorge..."
              value={alias}
              onChange={e => setAlias(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') openMesa(openingMesa, alias);
              }}
              autoFocus
            />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              🤖 pondremos nombre a la cuenta para identificarla mientras está abierta.
            </div>
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn" onClick={() => setOpeningMesa(null)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => openMesa(openingMesa, alias)}
              style={{ flex: 1 }}
            >
              <Icon name="play" s={14} /> Abrir mesa
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Crear mesa */}
      {creating && (
        <Modal title="Nueva mesa" onClose={() => setCreating(false)}>
          <Field label="Nombre de la mesa">
            <input
              className="inp"
              type="text"
              placeholder="Ej: Mesa 1, VIP, Terraza..."
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
      {selectedMesa && !showingCobro && (
        <div
          className="scrim"
          style={{
            padding: 20,
          }}
          onClick={() => setSelectedMesa(null)}
        >
          <div
            className="card pos-modal"
            style={{
              width: '100%',
              maxWidth: 1200,
              maxHeight: '90vh',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 0,
              overflow: 'hidden',
              background: 'var(--panel)',
              border: '1px solid var(--line2)',
              color: 'var(--ink)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Columna izquierda: Catálogo */}
            <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', background: 'var(--panel)' }}>
              <div style={{ padding: 20, borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="table" s={18} />
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {selectedMesa.name} · {selectedMesa.alias}
                    </div>
                  </div>
                  <button className="icon-btn" onClick={() => setSelectedMesa(null)}>
                    <Icon name="close" s={20} />
                  </button>
                </div>

                <Field label="">
                  <div style={{ position: 'relative' }}>
                    <Icon name="search" s={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input
                      className="inp"
                      type="text"
                      placeholder="Buscar producto..."
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </Field>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {cats.map(c => (
                    <button
                      key={c}
                      className={'fchip' + (cat === c ? ' on' : '')}
                      style={cat === c ? {
                        background: 'var(--accent2)',
                        borderColor: 'var(--accent2)',
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
                        position: 'relative',
                        background: p.stock === 0 ? 'color-mix(in srgb, var(--red) 5%, var(--panel))' : 'var(--panel)',
                      }}
                      onClick={() => p.stock > 0 && addToCart(p)}
                    >
                      {p.stock === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--red)',
                          }}
                        >
                          Agotado
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
                          padding: '4px 8px',
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

                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, opacity: p.stock === 0 ? 0.4 : 1 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        {p.cat} · {p.unit}
                      </div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: 'var(--accent)',
                        textDecoration: p.stock === 0 ? 'line-through' : 'none',
                        opacity: p.stock === 0 ? 0.4 : 1,
                      }}>
                        {COP(p.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna derecha: Consumo */}
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              {/* Header sticky */}
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
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                    CONSUMO
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                    {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} ítems
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', marginBottom: 16 }}>
                    {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
                  </div>
                </div>

                <button
                  className="btn primary"
                  style={{ width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 700, background: 'var(--accent)', borderColor: 'var(--accent)' }}
                  disabled={selectedMesa.items.length === 0}
                  onClick={() => setShowingCobro(true)}
                >
                  Cerrar mesa y cobrar
                </button>
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
                          <span style={{ fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
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
      {selectedMesa && showingCobro && (
        <Modal title="" onClose={() => setShowingCobro(false)} wide>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {selectedMesa.name} · {selectedMesa.alias}
            </div>
          </div>

          {/* Total a cobrar */}
          <div className="card" style={{ padding: 20, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              Total a cobrar
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', marginBottom: 10 }}>
              {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} productos · {selectedMesa.name} · {selectedMesa.alias}
            </div>
          </div>

          {/* ¿Cómo pagó? */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>¿Cómo pagó?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PAYMENTS.map(p => (
                <button
                  key={p.id}
                  className="btn"
                  style={{
                    flex: '1 1 calc(50% - 4px)',
                    minWidth: 140,
                    padding: '14px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    background: payment === p.id ? p.color : 'var(--panel2)',
                    borderColor: payment === p.id ? p.color : 'var(--line)',
                    color: payment === p.id ? '#fff' : 'var(--ink)',
                    border: payment === p.id ? '2px solid' : '1px solid',
                  }}
                  onClick={() => setPayment(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Evidencia (opcional) */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Evidencia (opcional)</div>
            <input
              className="inp"
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) setEvidenceFile(file);
              }}
              style={{ width: '100%' }}
            />
            {evidenceFile && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>
                ✓ {evidenceFile.name}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowingCobro(false)} style={{ flex: 1 }}>
              &gt; Volver
            </button>
            <button
              className="btn primary"
              onClick={cobrarMesa}
              disabled={!payment}
              style={{ flex: 1, background: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              ✓ Confirmar cobro y liberar mesa
            </button>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .live-dot {
          display: inline-block;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .mesa-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .pos-modal {
            grid-template-columns: 1fr !important;
            max-height: 95vh !important;
          }
        }
      `}</style>
    </div>
  );
}
