import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ticketSchema = z.object({
  asunto: z.string().min(3).max(120),
  body: z.string().min(5).max(4000),
  prioridad: z.enum(['normal', 'alta', 'urgente']).default('normal'),
});

const replySchema = z.object({
  type: z.literal('reply'),
  recipient_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['abierto', 'en_atencion', 'resuelto']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json();

  if (body.type === 'reply') {
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });
    const { data, error } = await admin.from('messages').insert({
      sender_id: user.id,
      recipient_id: parsed.data.recipient_id,
      body: parsed.data.body,
      ticket_type: 'soporte',
      comercio_id: null,
      sent_at: new Date().toISOString(),
    }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  }

  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const { data: profile } = await admin.from('profiles')
    .select('role, super_admin_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role === 'super_super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let recipientId: string | null = null;
  if (profile.role === 'super_admin') {
    const { data: sr } = await admin.from('profiles')
      .select('id').eq('role', 'super_super_admin').limit(1).maybeSingle();
    recipientId = sr?.id ?? null;
  } else if (profile.role === 'admin' || profile.role === 'empleado') {
    recipientId = profile.super_admin_id;
  }

  if (!recipientId) return NextResponse.json({ error: 'recipient_not_found' }, { status: 400 });

  const { data, error } = await admin.from('messages').insert({
    sender_id: user.id,
    recipient_id: recipientId,
    body: parsed.data.body,
    asunto: parsed.data.asunto,
    prioridad: parsed.data.prioridad,
    ticket_type: 'soporte',
    status: 'abierto',
    comercio_id: null,
    sent_at: new Date().toISOString(),
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'super_super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await admin.from('messages')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
