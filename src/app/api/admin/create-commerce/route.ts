import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_CATALOG } from '@/lib/default-catalog';
import { writeAuditLog } from '@/lib/audit';
import { getLimites, limitError } from '@/lib/plan-limits';

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(['Discoteca', 'Taberna', 'Bar']),
  city: z.string().min(2),
  kind: z.enum(['Principal', 'Franquicia']),
  plan: z.enum(['Básico', 'Pro', 'Red', 'Enterprise']),
  tables_count: z.coerce.number().int().min(1).max(500),
  plan_cost: z.coerce.number().min(0),
  billing_cycle: z.enum(['mensual', 'anual']).default('mensual'),
  renewal_day: z.coerce.number().int().min(1).max(28).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7F77DD'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: actor } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!actor) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (actor.role === 'admin') {
    return NextResponse.json({ error: 'Los administradores no pueden crear comercios. Solo el Super Admin puede hacerlo.' }, { status: 403 });
  }
  if (!['super_super_admin', 'super_admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.format() }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validar límite de comercios del plan solo para super_admin
  if (actor.role === 'super_admin') {
    const [{ data: planes }, { count: totalComercios }] = await Promise.all([
      admin.from('comercios').select('plan').eq('super_admin_id', user.id).limit(1).maybeSingle(),
      admin.from('comercios').select('*', { count: 'exact', head: true }).eq('super_admin_id', user.id),
    ]);
    const planActual = (planes as { plan?: string } | null)?.plan ?? null;
    const { comercios: maxComercios } = getLimites(planActual);
    const msg = limitError('comercio', planActual ?? '', maxComercios);
    if (msg && (totalComercios ?? 0) >= maxComercios) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
  }
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);
  const payload = {
    ...parsed.data,
    super_admin_id: user.id,
    status: 'activo',
    subscription_status: 'trial',
    subscription_start: now.toISOString().slice(0, 10),
    subscription_end: trialEnd.toISOString().slice(0, 10),
    settings: {},
  };
  const { data: comercio, error } = await admin
    .from('comercios')
    .insert(payload)
    .select('*')
    .single();
  if (error || !comercio) {
    return NextResponse.json({ error: error?.message ?? 'create_failed' }, { status: 500 });
  }

  const products = DEFAULT_CATALOG.map(product => ({
    ...product,
    comercio_id: comercio.id,
    initial_stock: product.stock,
  }));
  const { error: productsError } = await admin.from('products').insert(products);
  if (productsError) {
    await admin.from('comercios').delete().eq('id', comercio.id);
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const { error: historyError } = await admin.from('subscription_history').insert({
    comercio_id: comercio.id,
    plan: comercio.plan,
    cost: comercio.plan_cost,
    starts_at: comercio.subscription_start,
    ends_at: comercio.subscription_end,
    status: 'active',
    notes: 'Suscripción inicial',
    created_by: user.id,
  });
  if (historyError) {
    await admin.from('comercios').delete().eq('id', comercio.id);
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: user.id,
    actor_role: actor.role,
    action: 'CREATE',
    table_name: 'comercios',
    record_id: comercio.id,
    payload: { name: comercio.name, plan: comercio.plan, catalog_items: products.length },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ comercio, catalogItems: products.length });
}
