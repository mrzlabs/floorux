'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Stat } from '@/components/ui/Stat';
import { useToast } from '@/components/ui/ToastContext';
import { COP } from '@/lib/utils';
import type { InventoryMovement, Mesa, Product } from '@/types/db';

interface MovementRow extends InventoryMovement {
  product: Pick<Product, 'id' | 'name'> | null;
}

interface EmpInventarioProps {
  comercioId: string;
  empleadoId: string;
}

function stockColor(stock: number, min: number) {
  if (stock === 0 || min > 0 && stock <= min) return 'var(--red)';
  if (min > 0 && stock <= min * 2) return 'var(--orange)';
  return 'var(--green)';
}

export function EmpInventario({ comercioId, empleadoId }: EmpInventarioProps) {
  const toast = useToast();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [adding, setAdding] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [assigning, setAssigning] = useState<Product | null>(null);
  const [selectedMesa, setSelectedMesa] = useState('');
  const [quantity, setQuantity] = useState('');
  const [observation, setObservation] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cat: '',
    sub: '',
    unit: '',
    price: '',
  });

  useEffect(() => {
    load();
  }, [comercioId, empleadoId]);

  async function load() {
    const [{ data: productRows }, { data: movementRows }, { data: mesaRows }] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('comercio_id', comercioId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('inventory_movements')
        .select('*, product:products(id,name)')
        .eq('comercio_id', comercioId)
        .eq('actor_id', empleadoId)
        .gt('delta', 0)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('mesas')
        .select('*')
        .eq('comercio_id', comercioId)
        .eq('status', 'ocupada')
        .order('name'),
    ]);

    setProducts((productRows ?? []) as Product[]);
    setMovements((movementRows ?? []) as unknown as MovementRow[]);
    setMesas((mesaRows ?? []) as Mesa[]);
  }

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map(product => product.cat))).sort()],
    [products],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(product =>
      (cat === 'all' || product.cat === cat)
      && (!term
        || product.name.toLowerCase().includes(term)
        || product.cat.toLowerCase().includes(term)
        || product.sub?.toLowerCase().includes(term)),
    );
  }, [products, q, cat]);

  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = products.filter(product => product.min_stock > 0 && product.stock <= product.min_stock);

  function resetCreate() {
    setAdding(false);
    setForm({ name: '', cat: '', sub: '', unit: '', price: '' });
  }

  async function createProduct() {
    const price = Number(form.price);
    const stock = 0;
    if (!form.name.trim() || !form.cat.trim() || !Number.isFinite(price) || price <= 0) {
      toast('Completa nombre, categoría y precio mayor a cero', 'alert');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('products').insert({
      comercio_id: comercioId,
      name: form.name.trim(),
      cat: form.cat.trim(),
      sub: form.sub.trim() || null,
      unit: form.unit.trim() || null,
      price,
      cost: 0,
      stock,
      initial_stock: stock,
      min_stock: 0,
      dist: null,
      created_by: empleadoId,
    });
    setSaving(false);

    if (error) {
      toast('No se pudo crear el producto', 'alert');
      return;
    }

    resetCreate();
    await load();
    toast('Producto creado con existencias en cero', 'check');
  }

  async function restock() {
    if (!restocking) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast('La cantidad debe ser un entero mayor a cero', 'alert');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('restock_product', {
      p_product_id: restocking.id,
      p_quantity: qty,
      p_observation: observation.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast('No se pudo agregar existencias', 'alert');
      return;
    }

    setRestocking(null);
    setQuantity('');
    setObservation('');
    await load();
    toast(`${restocking.name} +${qty}`, 'check');
  }

  async function addToMesa() {
    if (!assigning || !selectedMesa) {
      toast('Selecciona una mesa ocupada', 'alert');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('add_product_to_mesa', {
      p_mesa_id: selectedMesa,
      p_product_id: assigning.id,
    });
    setSaving(false);

    if (error) {
      toast(error.message.includes('insufficient_stock') ? 'Producto agotado' : 'No se pudo agregar a la mesa', 'alert');
      return;
    }

    setAssigning(null);
    setSelectedMesa('');
    await load();
    toast('Producto agregado a la mesa', 'check');
  }

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Stat label="Productos" value={products.length} icon="box" color="var(--accent)" />
        <Stat label="Unidades disponibles" value={totalStock} icon="cash" color="var(--accent2)" />
        <Stat label="Alertas de stock" value={lowStock.length} icon="alert" color={lowStock.length ? 'var(--red)' : 'var(--green)'} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="searchbox" style={{ flex: '1 1 220px' }}>
          <Icon name="search" s={16} />
          <input placeholder="Buscar producto o categoría" value={q} onChange={event => setQ(event.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(category => (
            <button
              key={category}
              className={'fchip' + (cat === category ? ' on' : '')}
              onClick={() => setCat(category)}
            >
              {category === 'all' ? 'Todas' : category}
            </button>
          ))}
        </div>
        <Link className="btn ghost" href="/empleado/mesas">
          <Icon name="mesas" s={15} /> Ir a mesas
        </Link>
        <button className="btn pri" onClick={() => setAdding(true)}>
          <Icon name="plus" s={15} /> Crear producto
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th style={{ textAlign: 'right' }}>Precio</th>
              <th>Existencias</th>
              <th>Acciones permitidas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, index) => {
              const color = stockColor(product.stock, product.min_stock);
              return (
                <tr key={product.id} style={index % 2 ? { background: 'var(--panel2)' } : undefined}>
                  <td>
                    <b style={{ fontSize: 13 }}>{product.name}</b>
                    {product.sub && <div className="muted" style={{ fontSize: 11 }}>{product.sub}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{product.cat}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{product.unit || 'Unidad'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{COP(product.price)}</td>
                  <td style={{ minWidth: 110 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color }}>{product.stock}</span>
                    {product.stock === 0 && <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--red)' }}>AGOTADO</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="btn sm"
                        onClick={() => {
                          setRestocking(product);
                          setQuantity('');
                          setObservation('');
                        }}
                      >
                        <Icon name="plus" s={13} /> Agregar existencias
                      </button>
                      <button
                        className="btn sm ghost"
                        disabled={product.stock <= 0}
                        onClick={() => {
                          setAssigning(product);
                          setSelectedMesa('');
                        }}
                      >
                        <Icon name="mesas" s={13} /> Agregar a mesa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ padding: 28, textAlign: 'center' }}>Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', fontWeight: 800 }}>
          Historial de entradas propias
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Producto</th>
              <th>Cantidad agregada</th>
              <th>Existencia anterior</th>
              <th>Existencia resultante</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(movement => (
              <tr key={movement.id}>
                <td className="muted" style={{ fontSize: 12 }}>{new Date(movement.created_at).toLocaleString('es-CO')}</td>
                <td style={{ fontWeight: 700 }}>{movement.product?.name ?? 'Producto'}</td>
                <td style={{ color: 'var(--green)', fontWeight: 800 }}>+{movement.delta}</td>
                <td>{movement.previous_stock}</td>
                <td>{movement.new_stock}</td>
                <td className="muted">{movement.observation || 'Sin observación'}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ padding: 24, textAlign: 'center' }}>Sin entradas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal
          title="Crear producto"
          icon="box"
          onClose={resetCreate}
          footer={
            <>
              <button className="btn ghost" onClick={resetCreate}>Cancelar</button>
              <button className="btn pri block" onClick={createProduct} disabled={saving}>
                <Icon name="check" /> Guardar producto
              </button>
            </>
          }
        >
          <div className="row2">
            <Field label="Nombre">
              <input className="inp" value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} />
            </Field>
            <Field label="Categoría">
              <input className="inp" value={form.cat} onChange={event => setForm(value => ({ ...value, cat: event.target.value }))} />
            </Field>
          </div>
          <div className="row2">
            <Field label="Subcategoría">
              <input className="inp" value={form.sub} onChange={event => setForm(value => ({ ...value, sub: event.target.value }))} />
            </Field>
            <Field label="Unidad de venta">
              <input className="inp" placeholder="Botella, vaso, unidad" value={form.unit} onChange={event => setForm(value => ({ ...value, unit: event.target.value }))} />
            </Field>
          </div>
          <Field label="Precio de venta">
            <input className="inp" type="number" min="1" value={form.price} onChange={event => setForm(value => ({ ...value, price: event.target.value }))} />
          </Field>
          <div className="muted" style={{ fontSize: 12 }}>
            El producto se crea con costo, existencias y mínimo en cero. Estos campos administrativos no pueden modificarse desde esta vista.
          </div>
        </Modal>
      )}

      {restocking && (
        <Modal
          title={`Agregar existencias · ${restocking.name}`}
          icon="box"
          onClose={() => setRestocking(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setRestocking(null)}>Cancelar</button>
              <button className="btn pri block" onClick={restock} disabled={saving || Number(quantity) <= 0}>
                <Icon name="check" /> Registrar entrada
              </button>
            </>
          }
        >
          <div className="biz-row"><span>Existencias actuales</span><b>{restocking.stock}</b></div>
          <Field label="Cantidad positiva">
            <input className="inp" type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} />
          </Field>
          <Field label="Observación opcional">
            <textarea className="inp" rows={3} value={observation} onChange={event => setObservation(event.target.value)} />
          </Field>
          {Number(quantity) > 0 && (
            <div className="muted" style={{ fontSize: 13 }}>
              Existencia resultante: <b style={{ color: 'var(--green)' }}>{restocking.stock + Number(quantity)}</b>
            </div>
          )}
        </Modal>
      )}

      {assigning && (
        <Modal
          title={`Agregar a mesa · ${assigning.name}`}
          icon="mesas"
          onClose={() => setAssigning(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setAssigning(null)}>Cancelar</button>
              <button className="btn pri block" onClick={addToMesa} disabled={saving || !selectedMesa}>
                <Icon name="check" /> Agregar una unidad
              </button>
            </>
          }
        >
          {mesas.length ? (
            <Field label="Mesa ocupada">
              <select className="inp" value={selectedMesa} onChange={event => setSelectedMesa(event.target.value)}>
                <option value="">Selecciona una mesa</option>
                {mesas.map(mesa => (
                  <option key={mesa.id} value={mesa.id}>
                    {mesa.name}{mesa.alias ? ` · ${mesa.alias}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>
              No hay mesas ocupadas. Abre una mesa antes de asignar productos.
            </div>
          )}
          <div className="biz-row"><span>Existencias disponibles</span><b>{assigning.stock}</b></div>
        </Modal>
      )}
    </div>
  );
}
