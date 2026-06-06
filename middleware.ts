import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@/types/roles';
import { ROLE_ROUTES } from '@/types/roles';
import { OPERATE_COOKIE, verifyOperateToken } from '@/lib/operate-token';

const PUBLIC_PATHS = ['/login', '/suspendido', '/terminos', '/privacidad', '/reset-password'];

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, activo, super_admin_id, comercio_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return redirectWithError(request, 'perfil_no_disponible');
  }

  if (!profile) {
    return redirectWithError(request, 'perfil_no_encontrado');
  }

  if (!profile.activo) {
    return redirectWithError(request, 'cuenta_suspendida');
  }

  // cascade suspension: if super_admin is suspended, block downstream users
  if (profile.super_admin_id) {
    const { data: sa, error: saError } = await supabase
      .from('profiles')
      .select('activo')
      .eq('id', profile.super_admin_id)
      .maybeSingle();
    if (saError) {
      return redirectWithError(request, 'perfil_no_disponible');
    }
    if (!sa) {
      return redirectWithError(request, 'super_admin_no_encontrado');
    }
    if (!sa.activo) {
      return redirectWithError(request, 'cuenta_suspendida');
    }
  }

  const role = profile.role as Role;

  // subscription check — super_super_admin siempre pasa
  if (role !== 'super_super_admin' && profile.comercio_id) {
    const { data: comercio } = await supabase
      .from('comercios')
      .select('subscription_status')
      .eq('id', profile.comercio_id)
      .maybeSingle();
    if (comercio && ['suspended', 'cancelled'].includes(comercio.subscription_status)) {
      return NextResponse.redirect(new URL('/suspendido', request.url));
    }
  }

  const base = ROLE_ROUTES[role];
  if (!base) {
    return redirectWithError(request, 'rol_no_valido');
  }

  // redirect root to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(base, request.url));
  }

  // guard role areas
  const roleAreas: Record<Role, string[]> = {
    super_super_admin: ['/super-root'],
    super_admin: ['/super'],
    admin: ['/admin'],
    empleado: ['/empleado'],
  };
  if (pathname.startsWith('/admin') && ['super_super_admin', 'super_admin'].includes(role)) {
    const operate = await verifyOperateToken(
      request.cookies.get(OPERATE_COOKIE)?.value,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    if (operate?.actorId === user.id && operate.actorRole === role) return response;
  }
  const allowed = roleAreas[role];
  const inAllowed = allowed.some(a => pathname.startsWith(a));
  if (!inAllowed) {
    return NextResponse.redirect(new URL(base, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|maylo.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
