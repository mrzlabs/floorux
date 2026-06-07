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

const MOTIVOS_REDUCIR = [
  'Error del empleado',
  'Cliente cambió pedido',
  'Producto equivocado',
  'Otro'
];

const MOTIVOS_ELIMINAR = [
  'Error de pedido',
  'Cortesía',
  'Devolución',
  'Otro'
];

const MOTIVOS_CANCELAR = [
  'Cobro externo',
  'Cortesía total',
  'Error operativo',
  'Otro'
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
  isAdmin?: boolean;
}

export function EmpMesas({ comercioId, empleadoId, shiftId, isAdmin = false }: EmpMesasProps) {
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

  // Modal: Reducir cantidad (admin)
  const [showReduceNota, setShowReduceNota] = useState(false);
  const [reduceItem, setReduceItem] = useState<CartItem | null>(null);
  const [reduceQty, setReduceQty] = useState(1);
  const [reduceMotivo, setReduceMotivo] = useState('');
  const [reduceMotivoCustom, setReduceMotivoCustom] = useState('');

  // Modal: Eliminar ítem (admin)
  const [showRemoveNota, setShowRemoveNota] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [removeMotivo, setRemoveMotivo] = useState('');
  const [removeMotivoCustom, setRemoveMotivoCustom] = useState('');

  // Modal: Cancelar mesa (admin)
  const [showCancelarNota, setShowCancelarNota] = useState(false);
  const [cancelarMotivo, setCancelarMotivo] = useState('');
  const [cancelarMotivoCustom, setCancelarMotivoCustom] = useState('');

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'catalogo' | 'consumo'>('catalogo');

  // Animaciones
  const [totalFlash, setTotalFlash] = useState(false);

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

    // 1. Optimistic update: descontar inmediatamente del estado local
    setProducts(prev => prev.map(p =>
      p.id === product.id
        ? { ...p, stock: p.stock - 1 }
        : p
    ));

    // 2. Persistir en BD (async con validación)
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: product.stock - 1 })
      .eq('id', product.id)
      .gt('stock', 0);

    if (stockError) {
      // 3. Revertir si falla
      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, stock: p.stock + 1 }
          : p
      ));
      toast('Error al actualizar inventario', 'alert');
      return;
    }

    // 4. Agregar a mesa_items
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

    // 5. Trigger animación productAdd
    const card = document.querySelector(`[data-product-id="${product.id}"]`);
    if (card) {
      card.classList.add('product-add-animation');
      setTimeout(() => card.classList.remove('product-add-animation'), 200);
    }

    // 6. Trigger total flash
    setTotalFlash(true);
    setTimeout(() => setTotalFlash(false), 300);
  }

  async function updateItemQty(item: CartItem, delta: number) {
    if (!selectedMesa) return;

    // EMPLEADO: solo puede aumentar cantidad, NO reducir
    if (!isAdmin && delta < 0) {
      toast('Contacta al administrador para reducir cantidades', 'alert');
      return;
    }

    // ADMIN: puede aumentar o reducir
    if (isAdmin && delta < 0) {
      // Abrir modal de reducir cantidad
      setReduceItem(item);
      setShowReduceNota(true);
      return;
    }

    const newQty = item.qty + delta;

    // Obtener producto actual para calcular nuevo stock
    const product = products.find(p => p.id === item.product_id);
    if (!product) return;

    // Aumentando cantidad: descontar del inventario
    if (product.stock <= 0) {
      toast('Producto agotado', 'alert');
      return;
    }

    // Optimistic update
    setProducts(prev => prev.map(p =>
      p.id === item.product_id
        ? { ...p, stock: p.stock - 1 }
        : p
    ));

    const { error } = await supabase
      .from('products')
      .update({ stock: product.stock - 1 })
      .eq('id', item.product_id)
      .gt('stock', 0);

    if (error) {
      // Revertir
      setProducts(prev => prev.map(p =>
        p.id === item.product_id
          ? { ...p, stock: p.stock + 1 }
          : p
      ));
      toast('Error al actualizar inventario', 'alert');
      return;
    }

    await supabase
      .from('mesa_items')
      .update({ qty: newQty })
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', item.product_id);
  }

  async function removeItem(item: CartItem, motivo: string) {
    if (!selectedMesa || !isAdmin) return;

    // 1. Optimistic update: restaurar stock inmediatamente
    setProducts(prev => prev.map(p =>
      p.id === item.product_id
        ? { ...p, stock: p.stock + item.qty }
        : p
    ));

    // 2. Obtener producto actual para calcular nuevo stock
    const product = products.find(p => p.id === item.product_id);
    if (!product) return;

    // 3. Persistir en BD
    await supabase
      .from('products')
      .update({ stock: product.stock + item.qty })
      .eq('id', item.product_id);

    // 4. Eliminar de mesa_items
    await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', item.product_id);

    // 5. Audit log
    await supabase.from('mesa_audit_log').insert({
      mesa_id: selectedMesa.id,
      action: 'remove_item',
      product_id: item.product_id,
      qty: item.qty,
      motivo,
      admin_id: empleadoId,
    });

    toast('Producto eliminado', 'check');
  }

  async function reducirCantidad(item: CartItem, qty: number, motivo: string) {
    if (!selectedMesa || !isAdmin) return;

    const newQty = item.qty - qty;

    if (newQty <= 0) {
      // Si llega a 0, eliminar el ítem
      removeItem(item, motivo);
      return;
    }

    // 1. Optimistic update: restaurar stock
    setProducts(prev => prev.map(p =>
      p.id === item.product_id
        ? { ...p, stock: p.stock + qty }
        : p
    ));

    // 2. Obtener producto actual
    const product = products.find(p => p.id === item.product_id);
    if (!product) return;

    // 3. Persistir en BD
    await supabase
      .from('products')
      .update({ stock: product.stock + qty })
      .eq('id', item.product_id);

    // 4. Actualizar mesa_items
    await supabase
      .from('mesa_items')
      .update({ qty: newQty })
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', item.product_id);

    // 5. Audit log
    await supabase.from('mesa_audit_log').insert({
      mesa_id: selectedMesa.id,
      action: 'reduce_qty',
      product_id: item.product_id,
      qty,
      motivo,
      admin_id: empleadoId,
    });

    toast(`Cantidad reducida: -${qty}`, 'check');
  }

  async function cancelarMesa(motivo: string) {
    if (!selectedMesa || !isAdmin) return;

    // 1. Acumular TODOS los cambios de stock
    const stockChanges = new Map<string, number>();
    selectedMesa.items.forEach(item => {
      stockChanges.set(item.product_id, item.qty);
    });

    // 2. UN SOLO setProducts con todos los cambios
    setProducts(prev => prev.map(p => {
      const qtyToRestore = stockChanges.get(p.id);
      return qtyToRestore
        ? { ...p, stock: p.stock + qtyToRestore }
        : p;
    }));

    // 3. Persistir cada producto en BD
    for (const [productId, qty] of stockChanges) {
      const product = products.find(p => p.id === productId);
      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock + qty })
          .eq('id', productId);
      }
    }

    // 4. Eliminar todos los items
    await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', selectedMesa.id);

    // 5. Liberar mesa
    await supabase
      .from('mesas')
      .update({
        status: 'libre',
        alias: null,
        opened_at: null,
        opened_by: null
      })
      .eq('id', selectedMesa.id);

    // 6. Audit log
    await supabase.from('mesa_audit_log').insert({
      mesa_id: selectedMesa.id,
      action: 'cancel_mesa',
      motivo,
      admin_id: empleadoId,
    });

    setSelectedMesa(null);
    toast('Mesa cancelada y stock restaurado', 'check');
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

    // El stock ya fue descontado al agregar items — NO descontar de nuevo

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
      {/* Header venta de la noche - 3 zonas */}
      <div style={{
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
        padding: '16px 20px',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }} className="header-strip">
          {/* Zona Izquierda */}
          <div>
            <div style={{
              fontSize: 11,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 4,
            }}>
              VENTA DE LA NOCHE
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--accent)',
              marginBottom: 4,
            }}>
              {COP(totalAcumulado)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {mesasAbiertas.length} abiertas · {mesasLibres.length} libres
            </div>
          </div>

          {/* Zona Centro - Barra de barras proporcional */}
          <div style={{
            display: 'flex',
            gap: 3,
            maxWidth: 400,
            height: 32,
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--panel)',
          }}>
            {mesasAbiertas.map((mesa) => {
              const mesaTotal = mesa.items.reduce((s, i) => s + i.price * i.qty, 0);
              const percentage = totalAcumulado > 0 ? (mesaTotal / totalAcumulado) * 100 : 0;
              return (
                <div
                  key={mesa.id}
                  style={{
                    display: 'inline-block',
                    height: '100%',
                    width: `${percentage}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  }}
                  title={`${mesa.name}: ${COP(mesaTotal)}`}
                />
              );
            })}
          </div>

          {/* Zona Derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {shift && (
              <div style={{
                background: 'color-mix(in srgb, var(--green) 20%, transparent)',
                color: 'var(--green)',
                padding: '6px 12px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span className="live-dot">●</span> EN VIVO
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                fontFeatureSettings: '"tnum"',
              }}>
                {elapsedTime}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                turno en curso
              </div>
            </div>
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
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
            className={`mesa-card ${draggedId === mesa.id ? 'dragging' : ''}`}
            style={{
              borderRadius: 'var(--r-lg)',
              padding: 16,
              cursor: 'pointer',
              background: mesa.status === 'ocupada'
                ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                : 'var(--panel)',
              border: mesa.status === 'ocupada'
                ? '2px solid var(--accent)'
                : '1px solid var(--line)',
              boxShadow: mesa.status === 'ocupada'
                ? '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 8px 32px color-mix(in srgb, var(--accent) 20%, transparent)'
                : 'none',
              position: 'relative',
              minHeight: 160,
              overflow: 'hidden',
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
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 99,
                background: mesa.status === 'ocupada' ? 'var(--accent)' : 'var(--panel3)',
                color: mesa.status === 'ocupada' ? '#fff' : 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              {mesa.status === 'ocupada' ? 'ABIERTA' : 'LIBRE'}
            </div>

            {/* Nombre */}
            <div style={{
              position: 'absolute',
              top: 10,
              left: 12,
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--ink)',
            }}>
              {mesa.name}
            </div>

            {mesa.status === 'ocupada' ? (
              <>
                {/* Barra de progreso */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${Math.min((mesa.items.reduce((s, i) => s + i.price * i.qty, 0) / 200000) * 100, 100)}%`,
                  background: 'linear-gradient(to right, var(--accent), var(--accent2))',
                }} />

                {/* Contenido mesa abierta */}
                <div style={{ paddingTop: 36 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                    {mesa.alias}
                  </div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    letterSpacing: '-0.03em',
                    marginBottom: 6,
                  }}>
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
                      return `⏱ ${hours}h ${minutes}m · ${itemCount} ítems`;
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
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 99,
                            background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                            color: 'var(--accent)',
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
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
                            borderRadius: 99,
                            background: 'var(--accent)',
                            color: '#fff',
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          +{mesa.items.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                paddingTop: 30,
                gap: 8,
              }}>
                <Icon name="plus" s={32} color="var(--muted)" />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Abrir</div>
              </div>
            )}
          </div>
        ))}

        {/* Tarjeta nueva mesa */}
        <div
          className="mesa-card"
          style={{
            borderRadius: 'var(--r-lg)',
            padding: 16,
            cursor: 'pointer',
            border: '2px dashed var(--line2)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 160,
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
              maxHeight: '88vh',
              height: '88vh',
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: 0,
              overflow: 'hidden',
              background: 'var(--panel)',
              borderRadius: 22,
              border: '1px solid var(--line2)',
              color: 'var(--ink)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{
              gridColumn: '1 / -1',
              height: 56,
              background: 'var(--panel2)',
              borderBottom: '1px solid var(--line)',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
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

            {/* Tabs mobile */}
            <div className="mobile-tabs" style={{
              display: 'none',
              gridColumn: '1 / -1',
            }}>
              <button
                className={mobileTab === 'catalogo' ? 'active' : ''}
                onClick={() => setMobileTab('catalogo')}
              >
                Catálogo
              </button>
              <button
                className={mobileTab === 'consumo' ? 'active' : ''}
                onClick={() => setMobileTab('consumo')}
              >
                Consumo ({selectedMesa.items.reduce((s, i) => s + i.qty, 0)})
              </button>
            </div>

            {/* Columna izquierda: Catálogo */}
            <div className="catalogo-column" style={{
              borderRight: '1px solid var(--line)',
              display: mobileTab === 'catalogo' ? 'flex' : 'none',
              flexDirection: 'column',
              maxHeight: '88vh',
              background: 'var(--bg2)',
            }}>
              {/* Barra de búsqueda */}
              <div style={{ padding: 14 }}>
                <div style={{
                  position: 'relative',
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 14px',
                }}>
                  <Icon
                    name="search"
                    s={16}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted)',
                    }}
                  />
                  <input
                    className="inp"
                    type="text"
                    placeholder="Buscar producto..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    style={{
                      paddingLeft: 36,
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                    }}
                  />
                </div>
              </div>

              {/* Chips de categoría */}
              <div style={{
                display: 'flex',
                gap: 8,
                padding: '0 14px 12px',
                overflowX: 'auto',
              }}>
                {cats.map(c => (
                  <button
                    key={c}
                    className={'cat-chip' + (cat === c ? ' active' : '')}
                    style={{
                      height: 32,
                      padding: '0 16px',
                      borderRadius: 'var(--r-md)',
                      fontSize: 13,
                      fontWeight: cat === c ? 700 : 600,
                      background: cat === c ? 'var(--accent)' : 'var(--panel)',
                      border: cat === c ? 'none' : '1px solid var(--line)',
                      color: cat === c ? '#fff' : 'var(--muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setCat(c)}
                  >
                    {c === 'all' ? 'Todas' : c}
                  </button>
                ))}
              </div>

              {/* Grid de productos */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}>
                  {prodsFiltrados.map(p => (
                    <div
                      key={p.id}
                      data-product-id={p.id}
                      className="product-card"
                      style={{
                        background: p.stock === 0
                          ? 'color-mix(in srgb, var(--red) 5%, var(--panel))'
                          : 'var(--panel)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r-md)',
                        padding: 12,
                        cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                        position: 'relative',
                      }}
                      onClick={() => p.stock > 0 && addToCart(p)}
                    >
                      {/* Overlay agotado */}
                      {p.stock === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--r-md)',
                            fontSize: 13,
                            fontWeight: 800,
                            color: 'var(--red)',
                            background: 'color-mix(in srgb, var(--red) 12%, transparent)',
                            border: '1px solid var(--red)',
                            pointerEvents: 'none',
                            opacity: 0.6,
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
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            p.stock === 0
                              ? 'var(--red)'
                              : p.stock <= p.min_stock
                              ? '#f59e42'
                              : 'var(--panel3)',
                          color:
                            p.stock === 0 || p.stock <= p.min_stock
                              ? '#fff'
                              : 'var(--ink)',
                        }}
                      >
                        {p.stock}
                      </div>

                      {/* Contenido */}
                      <div style={{
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 4,
                        opacity: p.stock === 0 ? 0.4 : 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {p.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        marginBottom: 6,
                      }}>
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
            <div className="consumo-column" style={{
              display: mobileTab === 'consumo' ? 'flex' : 'none',
              flexDirection: 'column',
              maxHeight: '88vh',
              background: 'var(--panel)',
            }}>
              {/* Header sticky */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  background: 'var(--panel)',
                  borderBottom: '1px solid var(--line)',
                  padding: '16px 20px',
                  zIndex: 10,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: 6,
                  }}>
                    CONSUMO
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    marginBottom: 10,
                  }}>
                    {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} ítems
                  </div>
                  <div className={totalFlash ? 'total-flash' : ''} style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: 'var(--accent)',
                    letterSpacing: '-0.03em',
                    marginBottom: 16,
                  }}>
                    {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
                  </div>
                </div>

                <button
                  className="btn primary"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: 15,
                    fontWeight: 800,
                    background: 'var(--accent)',
                    borderColor: 'var(--accent)',
                    color: '#fff',
                    height: 48,
                    borderRadius: 'var(--r-md)',
                  }}
                  disabled={selectedMesa.items.length === 0}
                  onClick={() => setShowingCobro(true)}
                >
                  Cerrar mesa y cobrar
                </button>

                {/* Botón cancelar mesa (solo admin) */}
                {isAdmin && (
                  <button
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 700,
                      marginTop: 8,
                      color: 'var(--red)',
                      borderColor: 'var(--red)',
                      height: 44,
                      borderRadius: 'var(--r-md)',
                    }}
                    disabled={selectedMesa.items.length === 0}
                    onClick={() => setShowCancelarNota(true)}
                  >
                    Cancelar mesa sin cobro
                  </button>
                )}
              </div>

              {/* Lista de ítems */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                {selectedMesa.items.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--muted)',
                  }}>
                    Agrega productos al consumo
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}>
                      {selectedMesa.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="card"
                          style={{
                            padding: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          {/* Solo admin tiene botón [-] */}
                          {isAdmin && (
                            <button
                              className="icon-btn sm"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--panel2)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setReduceItem(item);
                                setShowReduceNota(true);
                              }}
                            >
                              <Icon name="minus" s={14} />
                            </button>
                          )}

                          {/* Cantidad */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            <span style={{
                              fontSize: 20,
                              fontWeight: 700,
                              minWidth: 28,
                              textAlign: 'center',
                            }}>
                              {item.qty}×
                            </span>
                            <button
                              className="icon-btn sm"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--panel2)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() => updateItemQty(item, 1)}
                            >
                              <Icon name="plus" s={14} />
                            </button>
                          </div>

                          {/* Info producto */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {COP(item.price)} c/u
                            </div>
                          </div>

                          {/* Total */}
                          <div style={{ fontWeight: 800, fontSize: 14 }}>
                            {COP(item.price * item.qty)}
                          </div>

                          {/* Solo admin tiene botón [X] */}
                          {isAdmin && (
                            <button
                              className="icon-btn sm"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                color: 'var(--red)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setSelectedItem(item);
                                setShowRemoveNota(true);
                              }}
                            >
                              <Icon name="close" s={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Solo empleados ven mensaje de contactar admin */}
                    {!isAdmin && (
                      <p style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        marginTop: 12,
                        textAlign: 'center',
                        padding: '12px 0',
                        borderTop: '1px solid var(--line)',
                      }}>
                        ¿Agregaste algo por error? Avisa al administrador.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal reducir cantidad (admin) */}
      {isAdmin && showReduceNota && reduceItem && (
        <Modal title={`Reducir cantidad: ${reduceItem.name}`} onClose={() => {
          setShowReduceNota(false);
          setReduceItem(null);
          setReduceQty(1);
          setReduceMotivo('');
          setReduceMotivoCustom('');
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 10,
            }}>
              Motivo de la acción
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {MOTIVOS_REDUCIR.map((motivo) => (
                <div
                  key={motivo}
                  style={{
                    padding: '12px 16px',
                    border: reduceMotivo === motivo
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: reduceMotivo === motivo
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                      : 'var(--panel)',
                  }}
                  onClick={() => setReduceMotivo(motivo)}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: reduceMotivo === motivo ? 700 : 600,
                  }}>
                    {motivo}
                  </div>
                </div>
              ))}
            </div>

            {reduceMotivo === 'Otro' && (
              <Field label="Especifica el motivo" style={{ marginTop: 12 }}>
                <textarea
                  className="inp"
                  placeholder="Escribe el motivo..."
                  value={reduceMotivoCustom}
                  onChange={(e) => setReduceMotivoCustom(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    resize: 'vertical',
                  }}
                  autoFocus
                />
              </Field>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              className="btn"
              onClick={() => {
                setShowReduceNota(false);
                setReduceItem(null);
                setReduceQty(1);
                setReduceMotivo('');
                setReduceMotivoCustom('');
              }}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const finalMotivo = reduceMotivo === 'Otro' ? reduceMotivoCustom : reduceMotivo;
                if (finalMotivo.trim()) {
                  reducirCantidad(reduceItem, reduceQty, finalMotivo);
                  setShowReduceNota(false);
                  setReduceItem(null);
                  setReduceQty(1);
                  setReduceMotivo('');
                  setReduceMotivoCustom('');
                }
              }}
              disabled={!reduceMotivo || (reduceMotivo === 'Otro' && !reduceMotivoCustom.trim())}
              style={{
                flex: 1,
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal eliminar ítem (admin) */}
      {isAdmin && showRemoveNota && selectedItem && (
        <Modal title={`Eliminar: ${selectedItem.name}`} onClose={() => {
          setShowRemoveNota(false);
          setSelectedItem(null);
          setRemoveMotivo('');
          setRemoveMotivoCustom('');
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 10,
            }}>
              Motivo de la acción
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {MOTIVOS_ELIMINAR.map((motivo) => (
                <div
                  key={motivo}
                  style={{
                    padding: '12px 16px',
                    border: removeMotivo === motivo
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: removeMotivo === motivo
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                      : 'var(--panel)',
                  }}
                  onClick={() => setRemoveMotivo(motivo)}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: removeMotivo === motivo ? 700 : 600,
                  }}>
                    {motivo}
                  </div>
                </div>
              ))}
            </div>

            {removeMotivo === 'Otro' && (
              <Field label="Especifica el motivo" style={{ marginTop: 12 }}>
                <textarea
                  className="inp"
                  placeholder="Escribe el motivo..."
                  value={removeMotivoCustom}
                  onChange={(e) => setRemoveMotivoCustom(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    resize: 'vertical',
                  }}
                  autoFocus
                />
              </Field>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              className="btn"
              onClick={() => {
                setShowRemoveNota(false);
                setSelectedItem(null);
                setRemoveMotivo('');
                setRemoveMotivoCustom('');
              }}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const finalMotivo = removeMotivo === 'Otro' ? removeMotivoCustom : removeMotivo;
                if (finalMotivo.trim()) {
                  removeItem(selectedItem, finalMotivo);
                  setShowRemoveNota(false);
                  setSelectedItem(null);
                  setRemoveMotivo('');
                  setRemoveMotivoCustom('');
                }
              }}
              disabled={!removeMotivo || (removeMotivo === 'Otro' && !removeMotivoCustom.trim())}
              style={{
                flex: 1,
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal cancelar mesa (admin) */}
      {isAdmin && showCancelarNota && selectedMesa && (
        <Modal title={`Cancelar mesa: ${selectedMesa.name}`} onClose={() => {
          setShowCancelarNota(false);
          setCancelarMotivo('');
          setCancelarMotivoCustom('');
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 10,
            }}>
              Motivo de la acción
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {MOTIVOS_CANCELAR.map((motivo) => (
                <div
                  key={motivo}
                  style={{
                    padding: '12px 16px',
                    border: cancelarMotivo === motivo
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: cancelarMotivo === motivo
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                      : 'var(--panel)',
                  }}
                  onClick={() => setCancelarMotivo(motivo)}
                >
                  <div style={{
                    fontSize: 14,
                    fontWeight: cancelarMotivo === motivo ? 700 : 600,
                  }}>
                    {motivo}
                  </div>
                </div>
              ))}
            </div>

            {cancelarMotivo === 'Otro' && (
              <Field label="Especifica el motivo" style={{ marginTop: 12 }}>
                <textarea
                  className="inp"
                  placeholder="Escribe el motivo..."
                  value={cancelarMotivoCustom}
                  onChange={(e) => setCancelarMotivoCustom(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    resize: 'vertical',
                  }}
                  autoFocus
                />
              </Field>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              className="btn"
              onClick={() => {
                setShowCancelarNota(false);
                setCancelarMotivo('');
                setCancelarMotivoCustom('');
              }}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const finalMotivo = cancelarMotivo === 'Otro' ? cancelarMotivoCustom : cancelarMotivo;
                if (finalMotivo.trim()) {
                  cancelarMesa(finalMotivo);
                  setShowCancelarNota(false);
                  setCancelarMotivo('');
                  setCancelarMotivoCustom('');
                }
              }}
              disabled={!cancelarMotivo || (cancelarMotivo === 'Otro' && !cancelarMotivoCustom.trim())}
              style={{
                flex: 1,
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de cobro */}
      {selectedMesa && showingCobro && (
        <Modal title="" onClose={() => setShowingCobro(false)} wide>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {selectedMesa.name} · {selectedMesa.alias}
              </div>
            </div>

            {/* Card de total */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              padding: 24,
              textAlign: 'center',
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--muted)',
                marginBottom: 8,
              }}>
                Total a cobrar
              </div>
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: 'var(--accent)',
                marginBottom: 10,
              }}>
                {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} productos · {selectedMesa.name} · {selectedMesa.alias}
              </div>
            </div>

            {/* ¿Cómo pagó? */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
              }}>
                ¿Cómo pagó?
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}>
                {PAYMENTS.map(p => (
                  <button
                    key={p.id}
                    className="btn"
                    style={{
                      height: 52,
                      borderRadius: 'var(--r-md)',
                      fontSize: 14,
                      fontWeight: payment === p.id ? 800 : 700,
                      background: payment === p.id
                        ? `color-mix(in srgb, ${p.color} 12%, var(--panel))`
                        : 'var(--panel2)',
                      borderColor: payment === p.id ? p.color : 'var(--line)',
                      borderWidth: payment === p.id ? '2px' : '1.5px',
                      color: payment === p.id ? p.color : 'var(--ink)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
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
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
              }}>
                Evidencia (opcional)
              </div>
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
                <div style={{
                  fontSize: 12,
                  color: 'var(--green)',
                  marginTop: 6,
                }}>
                  ✓ {evidenceFile.name}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                onClick={() => setShowingCobro(false)}
                style={{ flex: 1 }}
              >
                &gt; Volver
              </button>
              <button
                className="btn primary"
                onClick={cobrarMesa}
                disabled={!payment}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  fontWeight: 800,
                }}
              >
                ✓ Confirmar cobro y liberar mesa
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .live-dot {
          display: inline-block;
          animation: pulse-live 2s ease-in-out infinite;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .mesa-card {
          transition: all 0.3s ease;
        }
        .mesa-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .mesa-card.dragging {
          opacity: 0.5;
        }
        .product-card {
          transition: all 0.12s ease;
        }
        .product-card:hover:not([style*="not-allowed"]) {
          border-color: var(--accent);
          transform: scale(1.02);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .product-card:active:not([style*="not-allowed"]) {
          transform: scale(0.97);
          background: color-mix(in srgb, var(--accent) 12%, var(--panel));
        }
        .product-add-animation {
          animation: productAdd 200ms ease;
        }
        @keyframes productAdd {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          75% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .total-flash {
          animation: totalFlash 300ms ease;
        }
        @keyframes totalFlash {
          0% { color: var(--ink); }
          50% { color: var(--accent); }
          100% { color: var(--ink); }
        }
        .btn.primary:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .icon-btn.sm {
          transition: all 0.15s;
        }
        .icon-btn.sm:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .icon-btn.sm[style*="var(--red)"]:hover {
          background: var(--red);
          color: white;
          border-color: var(--red);
        }
        .mobile-tabs {
          border-bottom: 1px solid var(--line);
          background: var(--panel);
        }
        .mobile-tabs button {
          flex: 1;
          padding: 12px;
          text-align: center;
          font-weight: 700;
          border: none;
          background: transparent;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mobile-tabs button.active {
          border-bottom-color: var(--accent);
          color: var(--accent);
        }
        @media (max-width: 768px) {
          .header-strip {
            flex-direction: column !important;
            gap: 12px;
            align-items: flex-start !important;
          }
          .header-strip > div:nth-child(2) {
            max-width: 100% !important;
          }
          .mesa-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .pos-modal {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            grid-template-columns: 1fr !important;
          }
          .mobile-tabs {
            display: flex !important;
          }
          .catalogo-column,
          .consumo-column {
            display: flex !important;
          }
          .product-card {
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
