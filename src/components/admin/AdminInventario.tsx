'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk } from '@/lib/utils';
import type { Product } from '@/types/db';

interface AdminInventarioProps {
  comercioId: string;
}

export function AdminInventario({ comercioId }: AdminInventarioProps) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [form, setForm] = useState({ name: '', cat: '', sub: '', dist: '', unit: '', cost: '', price: '', stock: '', min_stock: '' });
  const supabase = createClient();

  useEffect(() => { load(); }, [comercioId]);

  async function load() {
    const { data } = await supabase.from('products').select('*').eq('comercio_id', comercioId).order('name');
    setProducts((data ?? []) as Product[]);
  }

  async function saveProduct() {
    const p = { name: form.name, cat: form.cat, sub: form.sub || null, dist: form.dist || null, unit: form.unit || null, cost: Number(form.cost), price: Number(form.price), stock: Number(form.stock), min_stock: Number(form.min_stock) };
    if (editing) {
      await supabase.from('products').update(p).eq('id', editing.id);
      toast('Producto actualizado', 'check');
    } else {
      await supabase.from('products').insert({ ...p, comercio_id: comercioId });
      toast('Producto creado', 'check');
    }
    setEditing(null); setAdding(false);
    await load();
  }

  async function doRestock() {
    if (!restocking || !restockQty) return;
    await supabase.from('products').update({ stock: restocking.stock + Number(restockQty) }).eq('id', restocking.id);
    toast(`${restocking.name} reabastecido +${restockQty}`, 'check');
    setRestocking(null); setRestockQty('');
    await load();
  }

  async function deleteProduct(id: string) {
    await supabase.from('products').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
    toast('Producto eliminado', 'trash');
    await load();
  }

  const cats = ['all', ...Array.from(new Set(products.map(p => p.cat)))];
  const filtered = products.filter(p => (cat === 'all' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const lowStock = products.filter(p => p.min_stock > 0 && p.stock <= p.min_stock);

  const openEdit = (p: Product) => {
    setForm({ name: p.name, cat: p.cat, sub: p.sub ?? '', dist: p.dist ?? '', unit: p.unit ?? '', cost: String(p.cost), price: String(p.price), stock: String(p.stock), min_stock: String(p.min_stock) });
    setEditing(p);
  };

  return (
    <div>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}><Icon name="box" s={15} sw={2} /></span>Total</div><div className="sv">{products.length}</div></div>
        <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--red)22', color: 'var(--red)' }}><Icon name="alert" s={15} sw={2} /></span>En alerta</div><div className="sv">{lowStock.length}</div></div>
        <div className="stat"><div className="sk"><span className="si" style={{ background: 'var(--yellow)22', color: 'var(--yellow)' }}><Icon name="cash" s={15} sw={2} /></span>Valor inventario</div><div className="sv">{COPk(products.reduce((s, p) => s + p.cost * p.stock, 0))}</div></div>
      </div>

      <div className="mesas-top" style={{ marginBottom: 12 }}>
        <div className="fbar" style={{ flex: 1 }}>
          <div className="searchbox"><Icon name="search" s={16} /><input placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} /></div>
          {cats.map(c => <button key={c} className={'fchip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c === 'all' ? 'Todos' : c}</button>)}
        </div>
        <button className="btn pri" onClick={() => { setForm({ name: '', cat: '', sub: '', dist: '', unit: '', cost: '', price: '', stock: '', min_stock: '0' }); setAdding(true); }}><Icon name="plus" /> Agregar</button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Producto</th><th>Cat.</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'right' }}>Precio</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td><b>{p.name}</b><div className="muted" style={{ fontSize: 11 }}>{p.sub}</div></td>
                <td><Chip>{p.cat}</Chip></td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ color: p.min_stock > 0 && p.stock <= p.min_stock ? 'var(--red)' : 'var(--ink)', fontWeight: 700 }}>{p.stock}</span>
                  {p.min_stock > 0 && <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>/ mín {p.min_stock}</span>}
                </td>
                <td className="tnum" style={{ textAlign: 'right' }}>{COP(p.cost)}</td>
                <td className="tnum" style={{ textAlign: 'right' }}>{COP(p.price)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn sm" onClick={() => { setRestocking(p); setRestockQty(''); }}><Icon name="plus" s={13} /></button>
                    <button className="btn sm" onClick={() => openEdit(p)}><Icon name="edit" s={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(adding || editing) && (
        <Modal title={editing ? `Editar: ${editing.name}` : 'Nuevo producto'} icon="box" onClose={() => { setAdding(false); setEditing(null); }}
          footer={<><button className="btn ghost" onClick={() => { setAdding(false); setEditing(null); }}>Cancelar</button><button className="btn pri block" onClick={saveProduct}><Icon name="check" /> Guardar</button></>}>
          <div className="row2">
            <Field label="Nombre"><input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Categoría"><input className="inp" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} /></Field>
          </div>
          <div className="row2">
            <Field label="Subcategoría"><input className="inp" value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} /></Field>
            <Field label="Distribuidor"><input className="inp" value={form.dist} onChange={e => setForm(f => ({ ...f, dist: e.target.value }))} /></Field>
          </div>
          <div className="row2">
            <Field label="Costo ($)"><input className="inp" type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></Field>
            <Field label="Precio venta ($)"><input className="inp" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
          </div>
          <div className="row2">
            <Field label="Stock inicial"><input className="inp" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></Field>
            <Field label="Mínimo (alerta)"><input className="inp" type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      {restocking && (
        <Modal title={`Reabastecer: ${restocking.name}`} icon="box" onClose={() => setRestocking(null)}
          footer={<><button className="btn ghost" onClick={() => setRestocking(null)}>Cancelar</button><button className="btn pri block" onClick={doRestock}><Icon name="check" /> Reabastecer</button></>}>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>Stock actual: <b>{restocking.stock}</b></p>
          <Field label="Cantidad a agregar">
            <input className="inp" type="number" autoFocus value={restockQty} onChange={e => setRestockQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && doRestock()} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
