import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/* ============================================================
   Acciones de OperUX (super root) sobre integraciones de comercios:
   - activate:   pendiente → activa (para WhatsApp registra phoneNumberId)
   - deactivate: activa → pendiente
   - unlink:     elimina la integración del comercio
   ============================================================ */

const actionSchema = z.object({
  comercio_id: z.string().uuid(),
  integration_id: z.string().min(2).max(40),
  action: z.enum(['activate', 'deactivate', 'unlink']),
  phone_number_id: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'super_super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: comercio } = await admin
    .from('comercios')
    .select('id, settings')
    .eq('id', parsed.data.comercio_id)
    .maybeSingle();
  if (!comercio) return NextResponse.json({ error: 'comercio not found' }, { status: 404 });

  const settings = (comercio.settings as Record<string, unknown>) ?? {};
  const integrations = { ...((settings.integrations as Record<string, Record<string, unknown>>) ?? {}) };
  const current = integrations[parsed.data.integration_id];
  if (!current) return NextResponse.json({ error: 'integration not requested' }, { status: 404 });

  if (parsed.data.action === 'unlink') {
    delete integrations[parsed.data.integration_id];
  } else if (parsed.data.action === 'activate') {
    integrations[parsed.data.integration_id] = {
      ...current,
      status: 'activa',
      activatedAt: new Date().toISOString(),
      ...(parsed.data.phone_number_id ? { phoneNumberId: parsed.data.phone_number_id } : {}),
    };
  } else {
    integrations[parsed.data.integration_id] = { ...current, status: 'pendiente' };
  }

  const nextSettings = { ...settings, integrations };
  const { error } = await admin.from('comercios').update({ settings: nextSettings }).eq('id', comercio.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, settings: nextSettings });
}
