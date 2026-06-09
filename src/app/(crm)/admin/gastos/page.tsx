import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { ExpensesManager } from '@/components/expenses/ExpensesManager';

export default async function GastosPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase
    .from('comercios')
    .select('*')
    .eq('id', profile.comercio_id)
    .single();
  if (!comercio) redirect('/login');

  return (
    <AdminShell
      profile={profile}
      comercio={comercio}
      view="gastos"
      operating={operating}
      returnPath={returnPath}
    >
      <ExpensesManager comercioId={profile.comercio_id!} userId={profile.id} isAdmin />
    </AdminShell>
  );
}

