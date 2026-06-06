import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { createOperateToken, OPERATE_COOKIE } from '@/lib/operate-token';

const schema = z.object({ comercioId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: actor } = await supabase
    .from('profiles')
    .select('role, activo')
    .eq('id', user.id)
    .maybeSingle();
  if (!actor?.activo || !['super_super_admin', 'super_admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const admin = createAdminClient();
  const { data: comercio } = await admin
    .from('comercios')
    .select('id, name, super_admin_id, status, deleted_at')
    .eq('id', parsed.data.comercioId)
    .maybeSingle();

  const ownsBusiness = actor.role === 'super_super_admin' || comercio?.super_admin_id === user.id;
  if (!comercio || comercio.deleted_at || comercio.status !== 'activo' || !ownsBusiness) {
    return NextResponse.json({ error: 'business_forbidden' }, { status: 403 });
  }

  const returnPath = actor.role === 'super_super_admin' ? '/super-root/comercios' : '/super';
  const token = await createOperateToken({
    actorId: user.id,
    actorRole: actor.role,
    comercioId: comercio.id,
    returnPath,
    exp: Date.now() + 4 * 60 * 60_000,
  }, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  await writeAuditLog({
    actor_id: user.id,
    actor_role: actor.role,
    action: 'LOGIN',
    table_name: 'comercios',
    record_id: comercio.id,
    payload: { mode: 'operate', comercio: comercio.name },
    ip: request.headers.get('x-forwarded-for') ?? 'unknown',
  });

  const response = NextResponse.json({ redirect: '/admin/resumen' });
  response.cookies.set(OPERATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 4 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OPERATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
