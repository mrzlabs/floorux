'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { Mesa, Product } from '@/types/db';

const MOTIVOS_AGREGAR = [
  'Cortesía del establecimiento',
  'Error de pedido',
  'Invitación',
  'Otro'
];

const MOTIVOS_ELIMINAR = [
  'Error de pedido',
  'Cortesía',
  'Devolución',
  'Otro'
];

const MOTIVOS_CERRAR = [
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
  admin_modified?: boolean;
}

interface AdminMesasProps {
  comercioId: string;
  adminId: string;
}

export function AdminMesas({ comercioId, adminId }: AdminMesasProps) {
  const toast = useToast();
  const [mesas, setMesas] = useState<LocalMesa[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'abiertas' | 'libres'>('all');

  // Modal: POS
  const [selectedMesa, setSelectedMesa] = useState<LocalMesa | null>(null);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  // Modal: Agregar con nota
  const [showAddNota, setShowAddNota] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addMotivo, setAddMotivo] = useState('');
  const [addMotivoCustom, setAddMotivoCustom] = useState('');

  // Modal: Eliminar con nota
  const [showRemoveNota, setShowRemoveNota] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [removeMotivo, setRemoveMotivo] = useState('');
  const [removeMotivoCustom, setRemoveMotivoCustom] = useState('');

  // Modal: Cerrar mesa con nota
  const [showCerrarNota, setShowCerrarNota] = useState(false);
  const [cerrarMotivo, setCerrarMotivo] = useState('');
  const [cerrarMotivoCustom, setCerrarMotivoCustom] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadMesas();
    loadProducts();

    const mesasChannel = supabase
      .channel(`mesas-admin:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesas',
        filter: `comercio_id=eq.${comercioId}`,
      }, () => loadMesas())
      .subscribe();

    const itemsChannel = supabase
      .channel(`mesa-items-admin:${comercioId}`)
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
  }, [comercioId]);

  async function loadMesas() {
    const { data } = await supabase
      .from('mesas')
      .select('*, mesa_items(*, products(*))')
      .eq('comercio_id', comercioId)
      .order('name');

    if (data) {
      // Verificar si mesa tiene modificaciones de admin
      const mesasWithAudit = await Promise.all(
        data.map(async (m: any) => {
          const { count } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('table_name', 'mesa_items')
            .eq('record_id', m.id)
            .in('action', ['ADD_ITEM_ADMIN', 'REMOVE_ITEM_ADMIN']);

          return {
            ...m,
            items: (m.mesa_items || []).map((i: any) => ({
              product_id: i.product_id,
              name: i.products?.name ?? '',
              price: i.unit_price,
              cost: i.unit_cost,
              qty: i.qty,
              tracked: (i.products?.min_stock ?? 0) > 0,
            })),
            admin_modified: (count ?? 0) > 0,
          };
        })
      );
      setMesas(mesasWithAudit);
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

  function openAddNota(product: Product) {
    setSelectedProduct(product);
    setAddQty(1);
    setAddMotivo('');
    setAddMotivoCustom('');
    setShowAddNota(true);
  }

  async function confirmarAgregar() {
    if (!selectedMesa || !selectedProduct) return;

    const motivoFinal = addMotivo === 'Otro' ? addMotivoCustom : addMotivo;
    if (!motivoFinal.trim()) {
      toast('El motivo es obligatorio', 'alert');
      return;
    }

    if (selectedProduct.stock < addQty) {
      toast('Stock insuficiente', 'alert');
      return;
    }

    // Descontar stock
    await supabase
      .from('products')
      .update({ stock: selectedProduct.stock - addQty })
      .eq('id', selectedProduct.id);

    // Agregar o actualizar mesa_items
    const existing = selectedMesa.items.find(i => i.product_id === selectedProduct.id);
    if (existing) {
      await supabase
        .from('mesa_items')
        .update({ qty: existing.qty + addQty })
        .eq('mesa_id', selectedMesa.id)
        .eq('product_id', selectedProduct.id);
    } else {
      await supabase.from('mesa_items').insert({
        mesa_id: selectedMesa.id,
        product_id: selectedProduct.id,
        qty: addQty,
        unit_price: selectedProduct.price,
        unit_cost: selectedProduct.cost,
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'ADD_ITEM_ADMIN',
      table_name: 'mesa_items',
      record_id: selectedMesa.id,
      payload: {
        product_name: selectedProduct.name,
        qty: addQty,
        motivo: motivoFinal,
        mesa_name: selectedMesa.name,
        empleado_id: selectedMesa.opened_by,
      },
    });

    toast('Producto agregado con nota de auditoría', 'check');
    setShowAddNota(false);
  }

  function openRemoveNota(item: CartItem) {
    setSelectedItem(item);
    setRemoveMotivo('');
    setRemoveMotivoCustom('');
    setShowRemoveNota(true);
  }

  async function confirmarEliminar() {
    if (!selectedMesa || !selectedItem) return;

    const motivoFinal = removeMotivo === 'Otro' ? removeMotivoCustom : removeMotivo;
    if (!motivoFinal.trim()) {
      toast('El motivo es obligatorio', 'alert');
      return;
    }

    // Devolver stock
    const product = products.find(p => p.id === selectedItem.product_id);
    if (product) {
      await supabase
        .from('products')
        .update({ stock: product.stock + selectedItem.qty })
        .eq('id', selectedItem.product_id);
    }

    // Eliminar mesa_items
    await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', selectedItem.product_id);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'REMOVE_ITEM_ADMIN',
      table_name: 'mesa_items',
      record_id: selectedMesa.id,
      payload: {
        product_name: selectedItem.name,
        qty: selectedItem.qty,
        motivo: motivoFinal,
        mesa_name: selectedMesa.name,
        empleado_id: selectedMesa.opened_by,
      },
    });

    toast('Producto eliminado con nota de auditoría', 'check');
    setShowRemoveNota(false);
  }

  async function openCerrarNota() {
    setCerrarMotivo('');
    setCerrarMotivoCustom('');
    setShowCerrarNota(true);
  }

  async function confirmarCerrar() {
    if (!selectedMesa) return;

    const motivoFinal = cerrarMotivo === 'Otro' ? cerrarMotivoCustom : cerrarMotivo;
    if (!motivoFinal.trim()) {
      toast('El motivo es obligatorio', 'alert');
      return;
    }

    const total = selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0);

    // Eliminar items
    await supabase.from('mesa_items').delete().eq('mesa_id', selectedMesa.id);

    // Liberar mesa
    await supabase
      .from('mesas')
      .update({ status: 'libre', alias: null, opened_at: null, opened_by: null })
      .eq('id', selectedMesa.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      actor_role: 'admin',
      action: 'CLOSE_MESA_ADMIN',
      table_name: 'mesas',
      record_id: selectedMesa.id,
      payload: {
        mesa_name: selectedMesa.name,
        total,
        items_count: selectedMesa.items.length,
        motivo: motivoFinal,
        empleado_id: selectedMesa.opened_by,
      },
    });

    toast('Mesa cerrada con nota de auditoría', 'check');
    setShowCerrarNota(false);
    setSelectedMesa(null);
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

  const totalAcumulado = mesasAbiertas.reduce((sum, m) =>
    sum + m.items.reduce((s, i) => s + i.price * i.qty, 0), 0
  );

  // Productos filtrados
  const cats = ['all', ...Array.from(new Set(products.map(p => p.cat)))];
  const prodsFiltrados = products.filter(p => {
    if (cat !== 'all' && p.cat !== cat) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Header resumen */}
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
                CONSUMO ACUMULADO
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>
                {COP(totalAcumulado)}
              </div>
            </div>
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
        {mesasFiltradas.map(mesa => (
          <div
            key={mesa.id}
            className="card"
            style={{
              padding: 16,
              cursor: mesa.status === 'ocupada' ? 'pointer' : 'default',
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
              if (mesa.status === 'ocupada') {
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

            {/* Badge ADM si fue modificada por admin */}
            {mesa.admin_modified && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  fontSize: 8,
                  fontWeight: 800,
                  padding: '3px 7px',
                  borderRadius: 999,
                  background: 'var(--accent3)',
                  color: '#fff',
                  letterSpacing: '.06em',
                }}
              >
                ADM
              </div>
            )}

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
                  {mesa.items.reduce((s, i) => s + i.qty, 0)} ítems
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                <Icon name="table" s={32} />
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Libre</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal POS Admin */}
      {selectedMesa && !showAddNota && !showRemoveNota && !showCerrarNota && (
        <div
          className="scrim"
          style={{ padding: 20 }}
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
                    {selectedMesa.admin_modified && (
                      <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--accent3)', color: '#fff' }}>
                        MODIFICADA POR ADMIN
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn sm danger" onClick={openCerrarNota}>
                      <Icon name="close" s={14} /> Cerrar mesa
                    </button>
                    <button className="icon-btn" onClick={() => setSelectedMesa(null)}>
                      <Icon name="close" s={20} />
                    </button>
                  </div>
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
                      onClick={() => p.stock > 0 && openAddNota(p)}
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
              </div>

              {/* Lista de ítems */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {selectedMesa.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No hay productos en esta mesa
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
                        <div style={{ fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                          {item.qty}×
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
                          onClick={() => openRemoveNota(item)}
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

      {/* Modal: Agregar con nota */}
      {showAddNota && selectedProduct && (
        <Modal title="Agregar producto (Admin)" onClose={() => setShowAddNota(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              {selectedProduct.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Stock disponible: {selectedProduct.stock}
            </div>
          </div>

          <Field label="Cantidad">
            <input
              className="inp"
              type="number"
              min="1"
              max={selectedProduct.stock}
              value={addQty}
              onChange={e => setAddQty(parseInt(e.target.value) || 1)}
            />
          </Field>

          <Field label="Motivo (obligatorio)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {MOTIVOS_AGREGAR.map(m => (
                <button
                  key={m}
                  className={'fchip' + (addMotivo === m ? ' on' : '')}
                  style={addMotivo === m ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
                  onClick={() => setAddMotivo(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {addMotivo === 'Otro' && (
              <input
                className="inp"
                type="text"
                placeholder="Escribe el motivo..."
                value={addMotivoCustom}
                onChange={e => setAddMotivoCustom(e.target.value)}
              />
            )}
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setShowAddNota(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn pri" onClick={confirmarAgregar} style={{ flex: 1 }}>
              Confirmar y agregar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Eliminar con nota */}
      {showRemoveNota && selectedItem && (
        <Modal title="Eliminar producto (Admin)" onClose={() => setShowRemoveNota(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              {selectedItem.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Cantidad: {selectedItem.qty}
            </div>
          </div>

          <Field label="Motivo (obligatorio)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {MOTIVOS_ELIMINAR.map(m => (
                <button
                  key={m}
                  className={'fchip' + (removeMotivo === m ? ' on' : '')}
                  style={removeMotivo === m ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
                  onClick={() => setRemoveMotivo(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {removeMotivo === 'Otro' && (
              <input
                className="inp"
                type="text"
                placeholder="Escribe el motivo..."
                value={removeMotivoCustom}
                onChange={e => setRemoveMotivoCustom(e.target.value)}
              />
            )}
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setShowRemoveNota(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn danger" onClick={confirmarEliminar} style={{ flex: 1 }}>
              Confirmar y eliminar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Cerrar mesa con nota */}
      {showCerrarNota && (
        <Modal title="Cerrar mesa (Admin)" onClose={() => setShowCerrarNota(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              {selectedMesa?.name} · {selectedMesa?.alias}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Total: {COP(selectedMesa?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {selectedMesa?.items.reduce((s, i) => s + i.qty, 0)} productos
            </div>
          </div>

          <Field label="Motivo (obligatorio)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {MOTIVOS_CERRAR.map(m => (
                <button
                  key={m}
                  className={'fchip' + (cerrarMotivo === m ? ' on' : '')}
                  style={cerrarMotivo === m ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
                  onClick={() => setCerrarMotivo(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            {cerrarMotivo === 'Otro' && (
              <input
                className="inp"
                type="text"
                placeholder="Escribe el motivo..."
                value={cerrarMotivoCustom}
                onChange={e => setCerrarMotivoCustom(e.target.value)}
              />
            )}
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setShowCerrarNota(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn danger" onClick={confirmarCerrar} style={{ flex: 1 }}>
              Confirmar y cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
