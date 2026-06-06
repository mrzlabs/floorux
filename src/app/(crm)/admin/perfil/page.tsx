import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminPerfil } from '@/components/admin/AdminPerfil';

export default async function PerfilPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="perfil" operating={operating} returnPath={returnPath}>
      <AdminPerfil profile={profile} comercio={comercio} operating={operating} />
    </AdminShell>
  );
}
