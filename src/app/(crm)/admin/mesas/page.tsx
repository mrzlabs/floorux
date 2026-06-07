import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminMesas } from '@/components/admin/AdminMesas';

export default async function AdminMesasPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');

  return (
    <AdminShell profile={profile} comercio={comercio} view="mesas" operating={operating} returnPath={returnPath}>
      <AdminMesas comercioId={comercio.id} adminId={profile.id} />
    </AdminShell>
  );
}
