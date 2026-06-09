import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { EmpShell } from '../EmpShell';
import { EmpInventario } from '@/components/empleado/EmpInventario';

export default async function InventarioPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado' || !profile.comercio_id) redirect('/login');

  return (
    <EmpShell profile={profile} view="inventario">
      <EmpInventario comercioId={profile.comercio_id} empleadoId={profile.id} />
    </EmpShell>
  );
}

