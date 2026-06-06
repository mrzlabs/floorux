import type { Role } from './roles';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  super_admin_id: string | null;
  comercio_id: string | null;
  activo: boolean;
  color: string;
  alias: string | null;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comercio {
  id: string;
  super_admin_id: string;
  name: string;
  type: 'Discoteca' | 'Taberna' | 'Bar';
  city: string;
  address: string | null;
  phone: string | null;
  nit: string | null;
  plan: 'Básico' | 'Pro';
  kind: 'Principal' | 'Franquicia';
  status: 'activo' | 'inactivo';
  color: string;
  tables_count: number;
  since: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  comercio_id: string;
  name: string;
  dist: string | null;
  cat: string;
  sub: string | null;
  unit: string | null;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Mesa {
  id: string;
  comercio_id: string;
  name: string;
  alias: string | null;
  status: 'libre' | 'ocupada';
  opened_at: string | null;
  opened_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MesaItem {
  id: string;
  mesa_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  created_at: string;
}

export interface Shift {
  id: string;
  comercio_id: string;
  empleado_id: string;
  started_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  comercio_id: string;
  shift_id: string | null;
  mesa_name: string;
  mesa_alias: string | null;
  total: number;
  cost: number;
  payment_method: string;
  evidence: boolean;
  closed_at: string;
  closed_by: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  created_at: string;
}

export interface Message {
  id: string;
  comercio_id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SUSPEND';
  table_name: string | null;
  record_id: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  ts: string;
}

/* joined types for UI */
export interface MesaWithItems extends Mesa {
  items: (MesaItem & { product: Product })[];
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  closed_by_profile?: Profile;
}

export interface ProfileWithComercio extends Profile {
  comercio?: Comercio;
}
