import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const createSchema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(5).max(4000),
  comercio_id: z.string().uuid().nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'closed']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, super_admin_id, comercio_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role === 'super_super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let superAdminId = profile.role === 'super_admin' ? user.id : profile.super_admin_id;
  const comercioId = parsed.data.comercio_id ?? profile.comercio_id;
  if (!superAdminId && comercioId) {
    const { data: comercio } = await admin.from('comercios').select('super_admin_id').eq('id', comercioId).maybeSingle();
    superAdminId = comercio?.super_admin_id ?? null;
  }
  if (!superAdminId) return NextResponse.json({ error: 'owner_not_found' }, { status: 400 });

  const { data, error } = await admin.from('support_tickets').insert({
    ...parsed.data,
    comercio_id: comercioId,
    super_admin_id: superAdminId,
    created_by: user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
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

  const { error } = await admin.from('support_tickets').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
