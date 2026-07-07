import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const registerSchema = z.object({
  type: z.literal('register'),
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().default(''),
  birthday: z.string().max(20).optional().default(''),
});

const loginSchema = z.object({
  type: z.literal('login'),
  email: z.string().email().max(160),
});

const reservationSchema = z.object({
  type: z.literal('reservation'),
  customerId: z.string().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().default(''),
  date: z.string().min(8).max(20),
  time: z.string().min(3).max(12),
  partySize: z.number().int().min(1).max(80),
  notes: z.string().max(600).optional().default(''),
});
type ReservationInput = z.infer<typeof reservationSchema>;

function publicCrm(settings: Record<string, unknown>) {
  const crm = (settings.publicCrm as Record<string, unknown>) ?? {};
  return {
    customers: Array.isArray(crm.customers) ? crm.customers as any[] : [],
    reservations: Array.isArray(crm.reservations) ? crm.reservations as any[] : [],
  };
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function GET(_: NextRequest, { params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('comercios')
    .select('id, name, type, city, address, phone, color, photo_url, settings, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !data || data.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const settings = (data.settings as Record<string, unknown>) ?? {};
  const commercial = (settings.commercial as Record<string, unknown>) ?? {};

  return NextResponse.json({
    comercio: {
      id: data.id,
      name: data.name,
      type: data.type,
      city: data.city,
      address: data.address,
      phone: data.phone,
      color: data.color,
      photo_url: data.photo_url,
      commercial,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = z.discriminatedUnion('type', [registerSchema, loginSchema, reservationSchema]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const { data: comercio, error } = await admin
    .from('comercios')
    .select('id, settings, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !comercio || comercio.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const settings = (comercio.settings as Record<string, unknown>) ?? {};
  const crm = publicCrm(settings);
  const now = new Date().toISOString();

  if (parsed.data.type === 'login') {
    const customer = crm.customers.find(c => String(c.email).toLowerCase() === parsed.data.email.toLowerCase());
    if (!customer) return NextResponse.json({ error: 'not_registered' }, { status: 404 });
    return NextResponse.json({ customer });
  }

  if (parsed.data.type === 'register') {
    const existing = crm.customers.find(c => String(c.email).toLowerCase() === parsed.data.email.toLowerCase());
    const customer = existing
      ? { ...existing, name: parsed.data.name, phone: parsed.data.phone, birthday: parsed.data.birthday, last_login: now }
      : {
          id: uid('cus'),
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone,
          birthday: parsed.data.birthday,
          visits: 0,
          total_spent: 0,
          created_at: now,
          last_login: now,
        };

    const customers = existing
      ? crm.customers.map(c => c.id === existing.id ? customer : c)
      : [customer, ...crm.customers].slice(0, 500);

    const nextSettings = { ...settings, publicCrm: { ...crm, customers } };
    const { error: updateError } = await admin.from('comercios').update({ settings: nextSettings }).eq('id', params.comercioId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ customer });
  }

  const reservationData = parsed.data as ReservationInput;
  const existing = crm.customers.find(c => String(c.email).toLowerCase() === reservationData.email.toLowerCase());
  const customer = existing ?? {
    id: reservationData.customerId || uid('cus'),
    name: reservationData.name,
    email: reservationData.email.toLowerCase(),
    phone: reservationData.phone,
    birthday: '',
    visits: 0,
    total_spent: 0,
    created_at: now,
    last_login: now,
  };
  const reservation = {
    id: uid('res'),
    customer_id: customer.id,
    name: reservationData.name,
    email: reservationData.email.toLowerCase(),
    phone: reservationData.phone,
    date: reservationData.date,
    time: reservationData.time,
    party_size: reservationData.partySize,
    notes: reservationData.notes,
    status: 'solicitada',
    created_at: now,
  };
  const customers = existing
    ? crm.customers.map(c => c.id === existing.id ? { ...c, name: reservationData.name, phone: reservationData.phone, last_login: now } : c)
    : [customer, ...crm.customers].slice(0, 500);
  const reservations = [reservation, ...crm.reservations].slice(0, 500);
  const nextSettings = { ...settings, publicCrm: { customers, reservations } };

  const { error: updateError } = await admin.from('comercios').update({ settings: nextSettings }).eq('id', params.comercioId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ reservation, customer });
}
