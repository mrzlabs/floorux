import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['super_admin', 'admin', 'empleado']),
  comercio_id: z.string().uuid().optional(),
  super_admin_id: z.string().uuid().optional(),
});

const RATE_LIMIT = new Map<string, number[]>();

function rateCheck(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const hits = (RATE_LIMIT.get(ip) ?? []).filter(t => now - t < window);
  hits.push(now);
  RATE_LIMIT.set(ip, hits);
  return hits.length <= 10;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!rateCheck(ip)) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: actor } = await supabase.from('profiles').select('role, comercio_id').eq('id', user.id).single();
  if (!actor || !['super_super_admin', 'super_admin', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation', details: parsed.error.format() }, { status: 400 });

  const { name, email, password, role, comercio_id, super_admin_id } = parsed.data;
  const admin = createAdminClient();
  let resolvedSuperAdminId = super_admin_id ?? null;

  if (['admin', 'empleado'].includes(role) && !comercio_id) {
    return NextResponse.json({ error: 'business_required' }, { status: 400 });
  }
  if (actor.role === 'admin' && (role !== 'empleado' || comercio_id !== actor.comercio_id)) {
    return NextResponse.json({ error: 'forbidden_scope' }, { status: 403 });
  }
  if (actor.role === 'super_admin' && role === 'super_admin') {
    return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
  }
  if (comercio_id) {
    const { data: comercio } = await admin
      .from('comercios')
      .select('super_admin_id')
      .eq('id', comercio_id)
      .maybeSingle();
    if (!comercio) return NextResponse.json({ error: 'business_not_found' }, { status: 404 });
    if (actor.role === 'super_admin' && comercio.super_admin_id !== user.id) {
      return NextResponse.json({ error: 'forbidden_scope' }, { status: 403 });
    }
    resolvedSuperAdminId = comercio.super_admin_id;
  } else if (role === 'super_admin') {
    resolvedSuperAdminId = null;
  }

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !newUser.user) return NextResponse.json({ error: error?.message ?? 'create_failed' }, { status: 500 });

  const { error: profileError } = await admin.from('profiles').insert({
    id: newUser.user.id,
    full_name: name,
    email,
    role,
    super_admin_id: resolvedSuperAdminId,
    comercio_id: comercio_id ?? null,
    activo: true,
    color: '#7F77DD',
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: user.id,
    actor_role: actor.role,
    action: 'CREATE',
    table_name: 'profiles',
    record_id: newUser.user.id,
    payload: { name, email, role },
    ip,
  });

  return NextResponse.json({ id: newUser.user.id });
}
