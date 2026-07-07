import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/types/roles';

const THEME_ROLES: Role[] = ['super_super_admin', 'super_admin', 'admin'];

export function canCustomizeThemeByRole(role?: string | null): boolean {
  return THEME_ROLES.includes(role as Role);
}

export async function canCustomizeTheme(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  return canCustomizeThemeByRole(data?.role);
}
