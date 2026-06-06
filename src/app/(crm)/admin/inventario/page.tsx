import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminInventario } from '@/components/admin/AdminInventario';

export default async function InventarioPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  const { data: prods } = await supabase.from('products').select('min_stock, stock').eq('comercio_id', profile.comercio_id);
  const lowCount = (prods ?? []).filter((p: any) => p.min_stock > 0 && p.stock <= p.min_stock).length;
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="inventario" lowStockCount={lowCount} operating={operating} returnPath={returnPath}>
      <AdminInventario comercioId={profile.comercio_id!} />
    </AdminShell>
  );
}
