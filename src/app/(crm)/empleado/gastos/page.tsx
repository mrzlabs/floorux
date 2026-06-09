import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { EmpShell } from '../EmpShell';
import { ExpensesManager } from '@/components/expenses/ExpensesManager';

export default async function GastosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado' || !profile.comercio_id) redirect('/login');

  return (
    <EmpShell profile={profile} view="gastos">
      <ExpensesManager comercioId={profile.comercio_id} userId={profile.id} />
    </EmpShell>
  );
}

