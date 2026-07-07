import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminApariencia } from '@/components/admin/AdminApariencia';

export default async function AdminAparienciaPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="apariencia" operating={operating} returnPath={returnPath}>
      <AdminApariencia profile={profile} />
    </AdminShell>
  );
}
