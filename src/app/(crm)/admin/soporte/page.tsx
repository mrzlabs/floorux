import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminSoporte } from '@/components/admin/AdminSoporte';

export default async function AdminSoportePage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="soporte" operating={operating} returnPath={returnPath}>
      <AdminSoporte profile={profile} />
    </AdminShell>
  );
}
