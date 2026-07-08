import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/* ============================================================
   Envío de respuestas de WhatsApp — API oficial de Meta
   (WhatsApp Cloud API, sin intermediarios).

   Configuración:
   - Env WHATSAPP_ACCESS_TOKEN: token permanente del system user
     de la cuenta Meta Business de OperUX (una sola WABA puede
     alojar los números de todos los comercios).
   - Por comercio: settings.integrations.whatsapp.phoneNumberId
     (el phone_number_id que Meta asigna al número del comercio;
     lo registra OperUX al activar la conexión).

   Responder a un cliente dentro de la ventana de 24 h desde su
   último mensaje no tiene costo en Meta. Si faltan credenciales,
   el mensaje queda 'queued' y se despacha al completar la conexión.
   ============================================================ */

const GRAPH_VERSION = 'v20.0';

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

  // phone_number_id del comercio (lo registra OperUX al activar la conexión)
  const { data: comercio } = await admin
    .from('comercios')
    .select('settings')
    .eq('id', contact.comercio_id)
    .maybeSingle();
  const waSettings = (comercio?.settings as Record<string, any>)?.integrations?.whatsapp ?? {};
  const phoneNumberId: string | undefined = waSettings.phoneNumberId;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // Despacho directo vía Meta Cloud API si la conexión está completa
  let status: 'queued' | 'sent' | 'failed' = 'queued';
  let waMessageId: string | null = null;
  if (phoneNumberId && accessToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: contact.phone.replace(/[^\d]/g, ''),
          type: 'text',
          text: { body: parsed.data.body },
        }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        waMessageId = json?.messages?.[0]?.id ?? null;
        status = 'sent';
      } else {
        status = 'failed';
      }
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
      wa_message_id: waMessageId,
      sender_profile_id: user.id,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message });
}
