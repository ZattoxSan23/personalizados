import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await destroySession();
  // Si viene del form HTML (acepta text/html), redirigir a /login
  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
  }
  return NextResponse.json({ ok: true });
}