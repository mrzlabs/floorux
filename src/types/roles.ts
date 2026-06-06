export type Role = 'super_super_admin' | 'super_admin' | 'admin' | 'empleado';

export const ROLE_ROUTES: Record<Role, string> = {
  super_super_admin: '/super-root',
  super_admin: '/super',
  admin: '/admin',
  empleado: '/empleado/mesas',
};
