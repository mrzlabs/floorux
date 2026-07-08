import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

/* ============================================================
   Webhook de mensajes entrantes de WhatsApp.
   URL a registrar en Meta/Wasapi:
     https://<app>/api/integrations/whatsapp/webhook?comercio=<uuid>&token=<WA_WEBHOOK_TOKEN>

   GET  → verificación de webhook estilo Meta (hub.challenge).
   POST → mensaje entrante. Acepta dos formatos:
     1. Meta Cloud API (entry[].changes[].value.messages[])
     2. Simple (Wasapi / integraciones propias): { phone, name?, body, source? }
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
  // Verificación de webhook (Meta): responde hub.challenge si el verify_token coincide
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

  const comercioId = req.nextUrl.searchParams.get('comercio');
  if (!comercioId) return NextResponse.json({ error: 'missing comercio' }, { status: 400 });

  const admin = createAdminClient();
  const { data: comercio } = await admin.from('comercios').select('id,status').eq('id', comercioId).maybeSingle();
  if (!comercio) return NextResponse.json({ error: 'comercio not found' }, { status: 404 });

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'invalid json' }, { status: 400 });

  // Normalizar: formato Meta Cloud API o formato simple
  const inbound: { phone: string; name?: string; body: string; source: 'whatsapp' | 'app'; wa_message_id?: string }[] = [];

  const metaMessages = payload?.entry?.[0]?.changes?.[0]?.value;
  if (metaMessages?.messages?.length) {
    const contactName: string | undefined = metaMessages.contacts?.[0]?.profile?.name;
    for (const m of metaMessages.messages) {
      if (m.type === 'text' && m.text?.body) {
        inbound.push({ phone: String(m.from), name: contactName, body: String(m.text.body).slice(0, 4000), source: 'whatsapp', wa_message_id: m.id });
      }
    }
  } else {
    const parsed = simpleSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });
    inbound.push(parsed.data);
  }

  if (inbound.length === 0) return NextResponse.json({ ok: true, stored: 0 });

  let stored = 0;
  for (const msg of inbound) {
    const phone = msg.phone.replace(/[^\d+]/g, '');
    // upsert de contacto por (comercio, teléfono)
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
