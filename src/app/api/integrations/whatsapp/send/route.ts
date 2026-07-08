import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/* ============================================================
   Envío de respuestas de WhatsApp desde la plataforma.
   El mensaje queda guardado en la bandeja (direction: 'out').
   Si hay proveedor configurado (WHATSAPP_SEND_URL + WHATSAPP_API_KEY,
   p. ej. Wasapi), se despacha de inmediato; si no, queda 'queued'
   y lo despacha OperUX al activar la conexión.
   ============================================================ */

const sendSchema = z.object({
  contact_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const admin = createAdminClient();

  const { data: contact } = await admin
    .from('wa_contacts')
    .select('id, phone, comercio_id')
    .eq('id', parsed.data.contact_id)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 });

  // El remitente debe pertenecer al comercio (admin/empleado), ser su super_admin o super root
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, comercio_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let allowed = profile.role === 'super_super_admin' || profile.comercio_id === contact.comercio_id;
  if (!allowed) {
    const { data: owned } = await admin
      .from('comercios')
      .select('id')
      .eq('id', contact.comercio_id)
      .eq('super_admin_id', profile.id)
      .maybeSingle();
    allowed = Boolean(owned);
  }
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Despacho real si hay proveedor configurado
  let status: 'queued' | 'sent' | 'failed' = 'queued';
  const sendUrl = process.env.WHATSAPP_SEND_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (sendUrl && apiKey) {
    try {
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ to: contact.phone, body: parsed.data.body }),
      });
      status = res.ok ? 'sent' : 'failed';
    } catch {
      status = 'failed';
    }
  }

  const { data: message, error } = await admin
    .from('wa_messages')
    .insert({
      comercio_id: contact.comercio_id,
      contact_id: contact.id,
      direction: 'out',
      body: parsed.data.body,
      status,
      sender_profile_id: user.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message });
}
