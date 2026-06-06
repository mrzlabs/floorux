import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminReportes } from '@/components/admin/AdminReportes';

export default async function ReportesPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="reportes" operating={operating} returnPath={returnPath}>
      <AdminReportes comercioId={profile.comercio_id!} comercioName={comercio.name} />
    </AdminShell>
  );
}
