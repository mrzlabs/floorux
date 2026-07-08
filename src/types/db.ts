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
  phone: string | null;
  panel_theme: Record<string, unknown>;
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
  plan: 'Básico' | 'Pro' | 'Red' | 'Enterprise';
  kind: 'Principal' | 'Franquicia';
  status: 'activo' | 'inactivo';
  color: string;
  photo_url: string | null;
  tables_count: number;
  since: string;
  plan_cost: number;
  billing_cycle: 'mensual' | 'anual';
  subscription_start: string;
  subscription_end: string | null;
  renewal_day: number | null;
  subscription_status: 'active' | 'trial' | 'due' | 'suspended' | 'cancelled';
  settings: Record<string, unknown>;
  commercial_settings: Record<string, unknown>;
  invoice_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* Clientes registrados desde la página pública del local */
export interface PublicCustomer {
  id: string;
  comercio_id: string;
  name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  visits: number;
  total_spent: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicReservation {
  id: string;
  comercio_id: string;
  customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  date: string;
  time: string;
  party_size: number;
  notes: string | null;
  status: 'solicitada' | 'confirmada' | 'cancelada';
  created_at: string;
}

/* Chat WhatsApp con clientes (migración 20260708000001_whatsapp_chat.sql) */
export interface WaContact {
  id: string;
  comercio_id: string;
  phone: string;
  name: string | null;
  source: 'whatsapp' | 'app';
  created_at: string;
}

export interface WaMessage {
  id: string;
  comercio_id: string;
  contact_id: string;
  direction: 'in' | 'out';
  body: string;
  status: 'received' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  wa_message_id: string | null;
  sender_profile_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  comercio_id: string;
  name: string;
  reference: string | null;
  dist: string | null;
  cat: string;
  sub: string | null;
  unit: string | null;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
  initial_stock: number;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: string;
  comercio_id: string;
  plan: string;
  cost: number;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'renewed' | 'expired' | 'suspended' | 'cancelled';
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  comercio_id: string;
  product_id: string;
  actor_id: string | null;
  delta: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  source: string;
  observation: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  comercio_id: string;
  fecha: string;
  tipo_gasto: string;
  valor: number;
  observacion: string | null;
  evidencia_path: string;
  evidencia_nombre: string;
  evidencia_tipo: 'image/jpeg' | 'image/png' | 'application/pdf';
  usuario_id: string;
  created_at: string;
  updated_at: string;
  creator?: Pick<Profile, 'id' | 'full_name' | 'color'> | null;
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

export interface MesaLayoutRow {
  mesa_id: string;
  comercio_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: string;
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
  comercio_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  read_at: string | null;
  sent_at: string;
  created_at: string;
  ticket_type: string | null;
  status: string | null;
  asunto: string | null;
  prioridad: string | null;
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
