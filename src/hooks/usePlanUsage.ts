'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLimites } from '@/lib/plan-limits';

export interface PlanUsage {
  plan: string;
  comercios: number;
  maxComercios: number;
  empleados: number;
  maxEmpleados: number;
}

export function usePlanUsage(superAdminId: string): PlanUsage {
  const [usage, setUsage] = useState<PlanUsage>({
    plan: '', comercios: 0, maxComercios: 1, empleados: 0, maxEmpleados: 3,
  });
  const supabase = createClient();

  useEffect(() => {
    if (!superAdminId) return;

    async function load() {
      const [
        { data: comRows },
        { count: empCount },
      ] = await Promise.all([
        supabase.from('comercios').select('plan').eq('super_admin_id', superAdminId),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('super_admin_id', superAdminId).eq('role', 'empleado'),
      ]);

      const plan = (comRows as { plan: string }[] | null)?.[0]?.plan ?? '';
      const limites = getLimites(plan);
      setUsage({
        plan,
        comercios: (comRows ?? []).length,
        maxComercios: limites.comercios,
        empleados: empCount ?? 0,
        maxEmpleados: limites.empleados,
      });
    }

    load();

    // Refrescar cuando cambie comercios o profiles
    const channel = supabase.channel(`plan-usage:${superAdminId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comercios', filter: `super_admin_id=eq.${superAdminId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles',  filter: `super_admin_id=eq.${superAdminId}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [superAdminId]);

  return usage;
}
