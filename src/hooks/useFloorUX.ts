'use client';
import { create } from 'zustand';
import type { Product, Mesa, MesaItem, Sale } from '@/types/db';

/* ---- seed data (mirrors data.js) ---- */
const PAYMENT_METHODS = ['efectivo','transferencia','qr','datafono','nequi'];

interface ShiftState {
  open: boolean;
  startedAt: number | null;
  shiftId: string | null;
  by: string;
}

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
  tracked: boolean;
}

interface LocalMesa {
  id: string;
  name: string;
  alias: string;
  status: 'libre' | 'ocupada';
  items: CartItem[];
  openedAt: number | null;
  by: string | null;
}

interface UIState {
  mode: 'dark' | 'light';
  palette: string[];
  radius: number;
  font: number;
}

interface FloorUXStore {
  inventory: Product[];
  mesas: LocalMesa[];
  shift: ShiftState;
  sales: Sale[];
  ui: UIState;

  setInventory: (inv: Product[]) => void;
  setMesas: (mesas: LocalMesa[]) => void;
  setShift: (shift: ShiftState) => void;
  setSales: (sales: Sale[]) => void;
  setUI: (patch: Partial<UIState>) => void;

  stockOf: (id: string) => number;
  adjustStock: (id: string, delta: number) => void;
  lowStock: () => Product[];

  startShift: () => void;
  closeShift: () => void;

  createMesa: (name: string) => void;
  openMesa: (id: string, alias: string) => void;
  addItem: (mesaId: string, prod: Product) => void;
  removeItem: (mesaId: string, prodId: string) => void;
  closeMesa: (mesaId: string, payment: string, evidence: boolean) => void;

  restock: (prodId: string, qty: number) => void;
  setStockTo: (prodId: string, v: number) => void;
}

const DEFAULT_UI: UIState = { mode: 'dark', palette: ['#7F77DD','#27C3D8','#B57BE0'], radius: 16, font: 14 };

export const useFloorUX = create<FloorUXStore>((set, get) => ({
  inventory: [],
  mesas: [],
  shift: { open: false, startedAt: null, shiftId: null, by: '' },
  sales: [],
  ui: DEFAULT_UI,

  setInventory: (inventory) => set({ inventory }),
  setMesas: (mesas) => set({ mesas }),
  setShift: (shift) => set({ shift }),
  setSales: (sales) => set({ sales }),
  setUI: (patch) => set(s => ({ ui: { ...s.ui, ...patch } })),

  stockOf: (id) => get().inventory.find(p => p.id === id)?.stock ?? 0,
  adjustStock: (id, delta) => set(s => ({
    inventory: s.inventory.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p),
  })),
  lowStock: () => get().inventory.filter(p => p.min_stock > 0 && p.stock <= p.min_stock),

  startShift: () => set(s => ({ shift: { ...s.shift, open: true, startedAt: Date.now() } })),
  closeShift: () => set(s => ({ shift: { ...s.shift, open: false, startedAt: null } })),

  createMesa: (name) => set(s => ({
    mesas: [...s.mesas, { id: 'm' + Date.now(), name, alias: '', status: 'libre', items: [], openedAt: null, by: null }],
  })),
  openMesa: (id, alias) => set(s => ({
    mesas: s.mesas.map(x => x.id === id
      ? { ...x, status: 'ocupada', alias, items: [], openedAt: Date.now(), by: s.shift.by }
      : x),
  })),
  addItem: (mesaId, prod) => {
    const { adjustStock, stockOf } = get();
    const stock = stockOf(prod.id);
    if (prod.min_stock > 0 && stock <= 0) return;
    if (prod.min_stock > 0) adjustStock(prod.id, -1);
    set(s => ({
      mesas: s.mesas.map(x => {
        if (x.id !== mesaId) return x;
        const ex = x.items.find(i => i.product_id === prod.id);
        const items = ex
          ? x.items.map(i => i.product_id === prod.id ? { ...i, qty: i.qty + 1 } : i)
          : [...x.items, { id: prod.id, product_id: prod.id, name: prod.name, price: prod.price, cost: prod.cost, qty: 1, tracked: prod.min_stock > 0 }];
        return { ...x, items };
      }),
    }));
  },
  removeItem: (mesaId, prodId) => {
    set(s => {
      const mesa = s.mesas.find(x => x.id === mesaId);
      if (!mesa) return s;
      const it = mesa.items.find(i => i.product_id === prodId);
      if (!it) return s;
      if (it.tracked) {
        const { adjustStock } = get();
        adjustStock(prodId, 1);
      }
      const items = it.qty > 1
        ? mesa.items.map(i => i.product_id === prodId ? { ...i, qty: i.qty - 1 } : i)
        : mesa.items.filter(i => i.product_id !== prodId);
      return { mesas: s.mesas.map(x => x.id === mesaId ? { ...x, items } : x) };
    });
  },
  closeMesa: (mesaId, payment, evidence) => {
    const mesa = get().mesas.find(x => x.id === mesaId);
    if (!mesa) return;
    const total = mesa.items.reduce((s, i) => s + i.price * i.qty, 0);
    const cost = mesa.items.reduce((s, i) => s + i.cost * i.qty, 0);
    const sale: Sale = {
      id: 'v' + Date.now(),
      comercio_id: '',
      shift_id: get().shift.shiftId,
      mesa_name: mesa.name,
      mesa_alias: mesa.alias || null,
      total, cost,
      payment_method: payment,
      evidence: !!evidence,
      closed_at: new Date().toISOString(),
      closed_by: null,
      created_at: new Date().toISOString(),
    };
    set(s => ({
      sales: [sale, ...s.sales],
      mesas: s.mesas.map(x => x.id === mesaId
        ? { ...x, status: 'libre', alias: '', items: [], openedAt: null, by: null }
        : x),
    }));
  },

  restock: (prodId, qty) => get().adjustStock(prodId, qty),
  setStockTo: (prodId, v) => set(s => ({
    inventory: s.inventory.map(p => p.id === prodId ? { ...p, stock: v } : p),
  })),
}));
