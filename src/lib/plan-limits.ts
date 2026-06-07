export const PLAN_LIMITES: Record<string, { comercios: number; empleados: number }> = {
  basico:     { comercios: 1,   empleados: 3   },
  pro:        { comercios: 1,   empleados: 999 },
  red:        { comercios: 5,   empleados: 999 },
  enterprise: { comercios: 999, empleados: 999 },
};

// Normaliza el plan_name de la DB ("Básico", "Pro", etc.) a la clave del mapa
export function planKey(plan: string | null | undefined): string {
  return (plan ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function getLimites(plan: string | null | undefined) {
  return PLAN_LIMITES[planKey(plan)] ?? { comercios: 1, empleados: 3 };
}

export function limitError(recurso: 'comercio' | 'empleado', plan: string, limite: number) {
  const nombre = plan || 'actual';
  return limite === 999
    ? null
    : `Tu plan ${nombre} permite máximo ${limite} ${recurso === 'comercio' ? `comercio${limite !== 1 ? 's' : ''}` : `empleado${limite !== 1 ? 's' : ''}`}. Actualiza tu plan para agregar más.`;
}
