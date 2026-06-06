import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['reset_password', 'suspend', 'activate', 'delete', 'assign_commerce']),
  password: z.string().min(8).optional(),
  comercioId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.format() }, { status: 400 });
  }
  if (parsed.data.action === 'reset_password' && !parsed.data.password) {
    return NextResponse.json({ error: 'password_required' }, { status: 400 });
  }
  if (parsed.data.action === 'assign_commerce' && !parsed.data.comercioId) {
    return NextResponse.json({ error: 'business_required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: actor }, { data: target }] = await Promise.all([
    admin.from('profiles').select('id, role, comercio_id').eq('id', user.id).maybeSingle(),
    admin.from('profiles').select('id, role, comercio_id, super_admin_id, full_name').eq('id', parsed.data.userId).maybeSingle(),
  ]);
  if (!actor || !target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!['super_super_admin', 'super_admin', 'admin'].includes(actor.role) || actor.id === target.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let allowed = actor.role === 'super_super_admin';
  if (actor.role === 'super_admin') {
    const { data: comercio } = target.comercio_id
      ? await admin.from('comercios').select('super_admin_id').eq('id', target.comercio_id).maybeSingle()
      : { data: null };
    allowed = target.super_admin_id === actor.id || comercio?.super_admin_id === actor.id;
  }
  if (actor.role === 'admin') {
    allowed = target.role === 'empleado' && target.comercio_id === actor.comercio_id;
  }
  if (!allowed) return NextResponse.json({ error: 'forbidden_scope' }, { status: 403 });

  const { action, password, userId, comercioId } = parsed.data;
  if (action === 'reset_password') {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      ban_duration: 'none',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === 'assign_commerce') {
    if (target.role !== 'admin' || !comercioId) {
      return NextResponse.json({ error: 'invalid_assignment' }, { status: 400 });
    }
    const { data: comercio } = await admin
      .from('comercios')
      .select('super_admin_id')
      .eq('id', comercioId)
      .maybeSingle();
    if (!comercio) return NextResponse.json({ error: 'business_not_found' }, { status: 404 });
    if (actor.role === 'super_admin' && comercio.super_admin_id !== actor.id) {
      return NextResponse.json({ error: 'forbidden_scope' }, { status: 403 });
    }
    const { error } = await admin
      .from('profiles')
      .update({
        comercio_id: comercioId,
        super_admin_id: comercio.super_admin_id,
        activo: true,
        deleted_at: null,
      })
      .eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  } else {
    const activo = action === 'activate';
    const deleted_at = action === 'delete' ? new Date().toISOString() : null;
    const { error: profileError } = await admin
      .from('profiles')
      .update({ activo, deleted_at })
      .eq('id', userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: activo ? 'none' : '876000h',
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: actor.id,
    actor_role: actor.role,
    action: action === 'delete' ? 'DELETE' : action === 'suspend' ? 'SUSPEND' : 'UPDATE',
    table_name: 'profiles',
    record_id: userId,
    payload: { operation: action, target: target.full_name, comercio_id: comercioId },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
