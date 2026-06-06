import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { EmpShell } from '../EmpShell';
import { EmpHistorial } from '@/components/empleado/EmpHistorial';

export default async function HistorialPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado') redirect('/login');
  return (
    <EmpShell profile={profile} view="historial">
      <EmpHistorial empleadoId={profile.id} />
    </EmpShell>
  );
}
