import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { cookies } from 'next/headers';
import { OPERATE_COOKIE, verifyOperateToken } from './operate-token';
import type { Profile } from '@/types/db';
import type { Role } from '@/types/roles';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(`profile_query_failed: ${error.message}`);
  return data as Profile | null;
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new Error('unauthenticated');
  if (!roles.includes(profile.role)) throw new Error('forbidden');
  return profile;
}

export interface AdminContext {
  profile: Profile;
  actor: Profile;
  operating: boolean;
  returnPath: string | null;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const actor = await getProfile();
  if (!actor) return null;
  if (actor.role === 'admin') {
    return { profile: actor, actor, operating: false, returnPath: null };
  }
  if (!['super_super_admin', 'super_admin'].includes(actor.role)) return null;

  const cookieStore = await cookies();
  const token = await verifyOperateToken(
    cookieStore.get(OPERATE_COOKIE)?.value,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  if (!token || token.actorId !== actor.id || token.actorRole !== actor.role) return null;

  const admin = createAdminClient();
  const { data: comercio } = await admin
    .from('comercios')
    .select('id, super_admin_id, status, deleted_at')
    .eq('id', token.comercioId)
    .maybeSingle();
  if (!comercio || comercio.deleted_at || comercio.status !== 'activo') return null;
  if (actor.role === 'super_admin' && comercio.super_admin_id !== actor.id) return null;

  return {
    actor,
    operating: true,
    returnPath: token.returnPath,
    profile: {
      ...actor,
      role: 'admin',
      comercio_id: comercio.id,
    },
  };
}
