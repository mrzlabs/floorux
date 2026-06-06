'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import { COP, COPk } from '@/lib/utils';
import type { Mesa, Product } from '@/types/db';

const PAYMENTS = [
  { id: 'efectivo', name: 'Efectivo', color: '#34d399' },
  { id: 'transferencia', name: 'Transferencia', color: '#5A82EE' },
  { id: 'qr', name: 'QR', color: '#B57BE0' },
  { id: 'datafono', name: 'Datáfono', color: '#27C3D8' },
  { id: 'nequi', name: 'Nequi / Daviplata', color: '#F5C400' },
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
  const [selectedMesa, setSelectedMesa] = useState<LocalMesa | null>(null);
  const [openingMesa, setOpeningMesa] = useState<LocalMesa | null>(null);
  const [alias, setAlias] = useState('');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState<'order' | 'pay'>('order');
  const [pay, setPay] = useState<string | null>(null);
  const [evi, setEvi] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newMesaName, setNewMesaName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadMesas();
    loadProducts();

    const channel = supabase
      .channel(`mesas:${comercioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas', filter: `comercio_id=eq.${comercioId}` },
        () => loadMesas())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comercioId]);

  async function loadMesas() {
    const { data } = await supabase
      .from('mesas')
      .select('*, mesa_items(*, products(*))')
      .eq('comercio_id', comercioId)
      .order('name');
    if (data) {
      setMesas(data.map((m: any) => ({
        ...m,
        items: (m.mesa_items || []).map((i: any) => ({
          product_id: i.product_id,
          name: i.products?.name ?? '',
          price: i.unit_price,
          cost: i.unit_cost,
          qty: i.qty,
          tracked: (i.products?.min_stock ?? 0) > 0,
        })),
      })));
    }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('comercio_id', comercioId).order('name');
    if (data) setProducts(data as Product[]);
  }

  async function openMesa(mesa: LocalMesa, mesaAlias: string) {
    if (!shiftId) { toast('Abre tu turno primero', 'alert'); return; }
    await supabase.from('mesas').update({
      status: 'ocupada', alias: mesaAlias || 'Cliente',
      opened_at: new Date().toISOString(), opened_by: empleadoId,
    }).eq('id', mesa.id);
    setOpeningMesa(null); setAlias('');
    await loadMesas();
  }

  async function addItem(prod: Product) {
    if (!selectedMesa) return;
    if (prod.min_stock > 0 && prod.stock <= 0) return;

    const existing = selectedMesa.items.find(i => i.product_id === prod.id);
    if (existing) {
      await supabase.from('mesa_items')
        .update({ qty: existing.qty + 1 })
        .eq('mesa_id', selectedMesa.id).eq('product_id', prod.id);
    } else {
      await supabase.from('mesa_items').insert({
        mesa_id: selectedMesa.id, product_id: prod.id,
        qty: 1, unit_price: prod.price, unit_cost: prod.cost,
      });
    }
    if (prod.min_stock > 0) {
      await supabase.from('products').update({ stock: Math.max(0, prod.stock - 1) }).eq('id', prod.id);
    }
    await loadMesas(); await loadProducts();
    const updated = (await supabase.from('mesas').select('*, mesa_items(*, products(*))').eq('id', selectedMesa.id).single()).data;
    if (updated) setSelectedMesa({ ...updated, items: (updated.mesa_items || []).map((i: any) => ({ product_id: i.product_id, name: i.products?.name, price: i.unit_price, cost: i.unit_cost, qty: i.qty, tracked: (i.products?.min_stock ?? 0) > 0 })) });
  }

  async function removeItem(prodId: string) {
    if (!selectedMesa) return;
    const it = selectedMesa.items.find(i => i.product_id === prodId);
    if (!it) return;
    if (it.qty > 1) {
      await supabase.from('mesa_items').update({ qty: it.qty - 1 }).eq('mesa_id', selectedMesa.id).eq('product_id', prodId);
    } else {
      await supabase.from('mesa_items').delete().eq('mesa_id', selectedMesa.id).eq('product_id', prodId);
    }
    if (it.tracked) {
      const prod = products.find(p => p.id === prodId);
      if (prod) await supabase.from('products').update({ stock: prod.stock + 1 }).eq('id', prodId);
    }
    await loadMesas(); await loadProducts();
    const updated = (await supabase.from('mesas').select('*, mesa_items(*, products(*))').eq('id', selectedMesa.id).single()).data;
    if (updated) setSelectedMesa({ ...updated, items: (updated.mesa_items || []).map((i: any) => ({ product_id: i.product_id, name: i.products?.name, price: i.unit_price, cost: i.unit_cost, qty: i.qty, tracked: (i.products?.min_stock ?? 0) > 0 })) });
  }

  async function closeMesa() {
    if (!selectedMesa || !pay) return;
    const total = selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost = selectedMesa.items.reduce((s, i) => s + i.cost * i.qty, 0);
    const { data: sale } = await supabase.from('sales').insert({
      comercio_id: comercioId, shift_id: shiftId,
      mesa_name: selectedMesa.name, mesa_alias: selectedMesa.alias,
      total, cost, payment_method: pay, evidence: !!evi,
      closed_at: new Date().toISOString(), closed_by: empleadoId,
    }).select().single();

    if (sale) {
      await supabase.from('sale_items').insert(
        selectedMesa.items.map(i => ({ sale_id: sale.id, product_id: i.product_id, product_name: i.name, qty: i.qty, unit_price: i.price, unit_cost: i.cost }))
      );
    }
    await supabase.from('mesa_items').delete().eq('mesa_id', selectedMesa.id);
    await supabase.from('mesas').update({ status: 'libre', alias: null, opened_at: null, opened_by: null }).eq('id', selectedMesa.id);
    setSelectedMesa(null); setPay(null); setEvi(null); setPhase('order');
    toast(`Mesa ${selectedMesa.name} cerrada · ${COP(total)}`, 'check');
    await loadMesas();
  }

  async function createMesa() {
    if (!newMesaName.trim()) return;
    await supabase.from('mesas').insert({ comercio_id: comercioId, name: newMesaName.trim() });
    setCreating(false); setNewMesaName('');
    await loadMesas();
    toast('Mesa creada', 'check');
  }

  const cats = [{ id: 'all', name: 'Todo' }, ...Array.from(new Set(products.map(p => p.cat))).map(c => ({ id: c, name: c }))];
  const filteredProducts = products.filter(p => (cat === 'all' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const live = selectedMesa ? mesas.find(m => m.id === selectedMesa.id) || selectedMesa : null;
  const total = live ? live.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;

  return (
    <div>
      <div className="mesas-top">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Mesas</h2>
          <p className="muted" style={{ fontSize: 13 }}>{mesas.filter(m => m.status === 'ocupada').length} ocupadas de {mesas.length}</p>
        </div>
        <button className="btn pri" onClick={() => setCreating(true)}><Icon name="plus" /> Crear mesa</button>
      </div>

      <div className="mesas-grid">
        {mesas.map(m => (
          <button key={m.id} className={'mesa' + (m.status === 'ocupada' ? ' hot' : '')}
            onClick={() => { setSelectedMesa(m); setPhase('order'); }}>
            <div className="mn">{m.name}</div>
            {m.alias && <div className="ma">{m.alias}</div>}
            <div className={'ms' + (m.status === 'ocupada' ? ' open' : '')}>{m.status === 'ocupada' ? 'Ocupada' : 'Libre'}</div>
            {m.status === 'ocupada' && <div className="mt">{COP(m.items.reduce((s, i) => s + i.price * i.qty, 0))}</div>}
          </button>
        ))}
      </div>

      {creating && (
        <Modal title="Crear mesa" icon="mesas" onClose={() => setCreating(false)}
          footer={<><button className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button><button className="btn pri block" onClick={createMesa}><Icon name="check" /> Crear</button></>}>
          <Field label="Nombre de la mesa">
            <input className="inp" autoFocus placeholder="Ej. Mesa 7, VIP 3, Barra 2" value={newMesaName} onChange={e => setNewMesaName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createMesa()} />
          </Field>
        </Modal>
      )}

      {openingMesa && (
        <Modal title={`Abrir ${openingMesa.name}`} icon="mesas" onClose={() => setOpeningMesa(null)}
          footer={<><button className="btn ghost" onClick={() => setOpeningMesa(null)}>Cancelar</button><button className="btn pri block" onClick={() => openMesa(openingMesa, alias)}><Icon name="play" /> Abrir mesa</button></>}>
          <Field label="Alias del cliente o grupo">
            <input className="inp" autoFocus placeholder="Ej. Cumpleaños, Don Jorge…" value={alias} onChange={e => setAlias(e.target.value)} onKeyDown={e => e.key === 'Enter' && openMesa(openingMesa, alias)} />
          </Field>
        </Modal>
      )}

      {selectedMesa && (
        <Modal wide icon="mesas" onClose={() => { setSelectedMesa(null); setPay(null); setEvi(null); setPhase('order'); }}
          title={<span>{live?.name}{live?.alias ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> · {live.alias}</span> : ''}</span>}>
          {selectedMesa.status === 'libre' ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p className="muted" style={{ marginBottom: 16 }}>Esta mesa está libre. ¿Quieres abrirla?</p>
              <button className="btn pri" onClick={() => { setSelectedMesa(null); setOpeningMesa(selectedMesa); }}><Icon name="play" /> Abrir mesa</button>
            </div>
          ) : phase === 'order' ? (
            <div className="pos">
              <div className="pos-pick">
                <div className="pos-cats">
                  <div className="searchbox" style={{ width: '100%', marginBottom: 4 }}>
                    <Icon name="search" s={16} />
                    <input placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
                  </div>
                  {cats.map(c => (
                    <button key={c.id} className={'catbtn' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.name}</button>
                  ))}
                </div>
                <div className="pick-list">
                  {filteredProducts.map(p => {
                    const out = p.min_stock > 0 && p.stock <= 0;
                    const low = p.min_stock > 0 && p.stock > 0 && p.stock <= p.min_stock;
                    return (
                      <button key={p.id} className="prod" disabled={out} onClick={() => addItem(p)}>
                        <span className={'pstk' + (out || low ? ' low' : '')}>{p.min_stock > 0 ? (out ? 'Agotado' : p.stock) : '∞'}</span>
                        <span className="pn">{p.name}</span>
                        <span className="pmeta">{p.sub} · {p.unit}</span>
                        <span className="pp">{COP(p.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pos-ticket">
                <div className="ticket-h">
                  <div className="ta">Consumo</div>
                  <div className="tn"><Icon name="receipt" s={18} /> {live?.items.length ?? 0} ítems</div>
                </div>
                {!live?.items.length ? (
                  <div className="ticket-empty"><Icon name="receipt" s={40} /><p>Toca un producto para despacharlo del inventario y sumarlo a la cuenta.</p></div>
                ) : (
                  <div className="ticket-lines">
                    {live?.items.map(i => (
                      <div className="tline" key={i.product_id}>
                        <div className="tqty">
                          <button className="qbtn" onClick={() => removeItem(i.product_id)}><Icon name="minus" s={14} sw={2.6} /></button>
                          <b className="tnum">{i.qty}</b>
                          <button className="qbtn" onClick={() => { const p = products.find(x => x.id === i.product_id); if (p) addItem(p); }}><Icon name="plus" s={14} sw={2.6} /></button>
                        </div>
                        <div className="tinfo"><b>{i.name}</b><span>{COP(i.price)} c/u</span></div>
                        <div className="tsum tnum">{COP(i.price * i.qty)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ticket-f">
                  <div className="trow tot"><span>Total</span><span className="tnum">{COP(total)}</span></div>
                  <button className="btn pri block lg" disabled={!live?.items.length} onClick={() => setPhase('pay')}>
                    <Icon name="cash" /> Cerrar mesa y cobrar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="modal-b" style={{ padding: '4px 2px' }}>
              <div className="card" style={{ padding: 18, marginBottom: 18, textAlign: 'center' }}>
                <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Total a cobrar</div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', marginTop: 4 }}>{COP(total)}</div>
              </div>
              <Field label="¿Cómo pagó?">
                <div className="pays">
                  {PAYMENTS.map(p => (
                    <button key={p.id} className={'pay' + (pay === p.id ? ' on' : '')} onClick={() => setPay(p.id)}>
                      <span className="pdot" style={{ background: p.color }} />{p.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Evidencia (opcional)">
                <div className="evidence" onClick={() => fileRef.current?.click()}>
                  {evi ? <img src={evi} alt="evidencia" /> : <Icon name="camera" s={22} />}
                  <span>{evi ? 'Comprobante cargado · toca para cambiar' : 'Cargar foto del comprobante'}</span>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setEvi(URL.createObjectURL(f)); }} />
                </div>
              </Field>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn ghost" onClick={() => setPhase('order')}><span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chev" s={16} /></span> Volver</button>
                <button className="btn pri block lg" disabled={!pay} onClick={closeMesa}><Icon name="check" /> Confirmar cobro y liberar mesa</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
