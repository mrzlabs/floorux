import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PublicLocalPanel } from '@/components/public/PublicLocalPanel';

export default async function PublicLocalPage({ params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const { data: comercio } = await admin
    .from('comercios')
    .select('id, name, type, city, address, phone, color, photo_url, settings, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (!comercio || comercio.status !== 'activo') notFound();

  return <PublicLocalPanel comercio={comercio as any} />;
}
