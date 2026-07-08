import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';

export default async function AdminIntegracionesPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  const tab = searchParams?.tab === 'chat' ? 'chat' : searchParams?.tab === 'redes' ? 'redes' : 'catalogo';
  return (
    <AdminShell profile={profile} comercio={comercio} view="integraciones" operating={operating} returnPath={returnPath}>
      <IntegrationsHub comercio={comercio} initialTab={tab} />
    </AdminShell>
  );
}
