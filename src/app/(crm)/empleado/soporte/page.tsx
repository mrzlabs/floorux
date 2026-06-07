import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmpShell } from '../EmpShell';
import { EmpSoporte } from '@/components/empleado/EmpSoporte';
import type { Profile } from '@/types/db';

export default async function EmpSoportePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'empleado') redirect('/login');

  return (
    <EmpShell profile={profile as Profile} view="soporte">
      <EmpSoporte empleadoId={profile.id} />
    </EmpShell>
  );
}
