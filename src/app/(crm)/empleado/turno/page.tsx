import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { EmpShell } from '../EmpShell';
import { EmpTurno } from '@/components/empleado/EmpTurno';

export default async function TurnoPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado') redirect('/login');
  return (
    <EmpShell profile={profile} view="turno">
      <EmpTurno comercioId={profile.comercio_id!} empleadoId={profile.id} />
    </EmpShell>
  );
}
