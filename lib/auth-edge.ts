/**
 * Helpers de auth para middleware (Edge Runtime).
 * Usa Web Crypto API (no node:crypto).
 */
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'personalizados_session';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-cambiar-en-prod-min-32-chars';

const enc = new TextEncoder();

// Helper para HMAC-SHA256 usando Web Crypto
async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(value: string): Promise<string> {
  const sig = await hmac(value);
  return `${value}.${sig.slice(0, 32)}`;
}

async function unsign(signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = (await hmac(value)).slice(0, 32);
  return sig === expected ? value : null;
}

export interface EdgeSession {
  userId: string;
  role: 'trainer' | 'client';
  clientId?: string;
}

/**
 * Versión síncrona usando crypto síncrono (compatible con Edge).
 * NOTA: requiere Web Crypto. No usar en Node.js runtime.
 */
export function getEdgeSession(): EdgeSession | null {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (!token) return null;
    // Edge runtime: solo validamos formato, la firma se valida en server actions
    const idx = token.lastIndexOf('.');
    if (idx === -1) return null;
    const value = token.slice(0, idx);
    return JSON.parse(value) as EdgeSession;
  } catch {
    return null;
  }
}