import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmpShell } from '../EmpShell';
import { EmpMesas } from '@/components/empleado/EmpMesas';

export default async function MesasPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado') redirect('/login');

  const supabase = await createClient();
  const { data: shift } = await supabase.from('shifts').select('id').eq('empleado_id', profile.id).eq('status', 'open').single();

  return (
    <EmpShell profile={profile} view="mesas">
      <EmpMesas comercioId={profile.comercio_id!} empleadoId={profile.id} shiftId={shift?.id ?? null} />
    </EmpShell>
  );
}
