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

export async function GET(_: NextRequest, { params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('comercios')
    .select('id, name, type, city, address, phone, color, photo_url, commercial_settings, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !data || data.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

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
      commercial: data.commercial_settings ?? {},
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
    .select('id, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !comercio || comercio.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (parsed.data.type === 'login') {
    const { data: customer } = await admin
      .from('public_customers')
      .select('*')
      .eq('comercio_id', params.comercioId)
      .eq('email', parsed.data.email.toLowerCase())
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: 'not_registered' }, { status: 404 });
    return NextResponse.json({ customer });
  }

  const now = new Date().toISOString();

  if (parsed.data.type === 'register') {
    const { data: customer, error: upsertError } = await admin
      .from('public_customers')
      .upsert({
        comercio_id: params.comercioId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        birthday: parsed.data.birthday,
        last_login: now,
      }, { onConflict: 'comercio_id,email' })
      .select()
      .single();
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json({ customer });
  }

  const reservationData = parsed.data as ReservationInput;

  const { data: customer, error: customerError } = await admin
    .from('public_customers')
    .upsert({
      comercio_id: params.comercioId,
      name: reservationData.name,
      email: reservationData.email.toLowerCase(),
      phone: reservationData.phone,
      last_login: now,
    }, { onConflict: 'comercio_id,email' })
    .select()
    .single();
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

  const { data: reservation, error: reservationError } = await admin
    .from('public_reservations')
    .insert({
      comercio_id: params.comercioId,
      customer_id: customer.id,
      name: reservationData.name,
      email: reservationData.email.toLowerCase(),
      phone: reservationData.phone,
      date: reservationData.date,
      time: reservationData.time,
      party_size: reservationData.partySize,
      notes: reservationData.notes,
    })
    .select()
    .single();
  if (reservationError) return NextResponse.json({ error: reservationError.message }, { status: 500 });

  return NextResponse.json({ reservation, customer });
}
