import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

/* ============================================================
   Webhook de mensajes entrantes — API oficial de Meta
   (WhatsApp Cloud API, sin intermediarios).

   Configurar en Meta App Dashboard → WhatsApp → Configuration:
     Callback URL:  https://<app>/api/integrations/whatsapp/webhook?token=<WA_WEBHOOK_TOKEN>
     Verify token:  <WA_WEBHOOK_TOKEN>
     Campo suscrito: messages

   Una sola URL sirve a todos los comercios: el payload de Meta
   trae metadata.phone_number_id y con él se resuelve el comercio
   (settings.integrations.whatsapp.phoneNumberId).

   También acepta un formato simple (registros desde la propia app
   u otras fuentes) con ?comercio=<uuid>:
     { phone, name?, body, source? }
   ============================================================ */

const simpleSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().max(120).optional(),
  body: z.string().min(1).max(4000),
  source: z.enum(['whatsapp', 'app']).default('whatsapp'),
  wa_message_id: z.string().max(128).optional(),
});

function authorized(req: NextRequest): boolean {
  const token = process.env.WA_WEBHOOK_TOKEN;
  if (!token) return false;
  return req.nextUrl.searchParams.get('token') === token;
}

export async function GET(req: NextRequest) {
  // Verificación de webhook de Meta: responde hub.challenge si el verify_token coincide
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const verifyToken = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (mode === 'subscribe' && verifyToken && verifyToken === process.env.WA_WEBHOOK_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'invalid json' }, { status: 400 });

  const inbound: { phone: string; name?: string; body: string; source: 'whatsapp' | 'app'; wa_message_id?: string }[] = [];
  let comercioId = req.nextUrl.searchParams.get('comercio');

  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  if (value?.messaging_product === 'whatsapp') {
    // Formato Meta Cloud API: resolver comercio por phone_number_id
    const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
    if (!comercioId && phoneNumberId) {
      const { data: match } = await admin
        .from('comercios')
        .select('id')
        .filter('settings->integrations->whatsapp->>phoneNumberId', 'eq', phoneNumberId)
        .maybeSingle();
      comercioId = match?.id ?? null;
    }
    const contactName: string | undefined = value.contacts?.[0]?.profile?.name;
    for (const m of value.messages ?? []) {
      if (m.type === 'text' && m.text?.body) {
        inbound.push({ phone: String(m.from), name: contactName, body: String(m.text.body).slice(0, 4000), source: 'whatsapp', wa_message_id: m.id });
      }
    }
    // Meta reenvía si no respondemos 200: estados (delivered/read) u otros tipos se aceptan sin guardar
    if (inbound.length === 0) return NextResponse.json({ ok: true, stored: 0 });
  } else {
    const parsed = simpleSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });
    inbound.push(parsed.data);
  }

  if (!comercioId) return NextResponse.json({ ok: true, stored: 0, note: 'comercio no resuelto' });

  const { data: comercio } = await admin.from('comercios').select('id').eq('id', comercioId).maybeSingle();
  if (!comercio) return NextResponse.json({ ok: true, stored: 0, note: 'comercio no existe' });

  let stored = 0;
  for (const msg of inbound) {
    const phone = msg.phone.replace(/[^\d+]/g, '');
    const { data: contact, error: cErr } = await admin
      .from('wa_contacts')
      .upsert(
        { comercio_id: comercioId, phone, name: msg.name ?? undefined, source: msg.source },
        { onConflict: 'comercio_id,phone', ignoreDuplicates: false },
      )
      .select('id')
      .single();
    if (cErr || !contact) continue;

    const { error: mErr } = await admin.from('wa_messages').insert({
      comercio_id: comercioId,
      contact_id: contact.id,
      direction: 'in',
      body: msg.body,
      status: 'received',
      wa_message_id: msg.wa_message_id ?? null,
    });
    if (!mErr) stored++;
  }

  return NextResponse.json({ ok: true, stored });
}
