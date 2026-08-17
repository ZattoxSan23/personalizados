import { NextResponse, type NextRequest } from 'next/server';
import { getEdgeSession } from './lib/auth-edge';

const PUBLIC_ROUTES = ['/login', '/portal', '/api/auth/login', '/api/auth/client-login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/' ||
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Verificar sesión
  const session = getEdgeSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Proteger rutas según rol
  if (pathname.startsWith('/trainer') || pathname.startsWith('/api/ai') || pathname.startsWith('/api/trainer')) {
    if (session.role !== 'trainer') {
      return NextResponse.redirect(new URL('/portal/hoy', req.url));
    }
  }

  if (pathname.startsWith('/portal') || pathname.startsWith('/api/client')) {
    if (session.role !== 'client') {
      return NextResponse.redirect(new URL('/trainer', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};