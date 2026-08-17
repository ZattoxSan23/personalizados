import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { users, clients, type User } from './db/schema';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'personalizados_session';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-cambiar-en-prod-min-32-chars';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + ':personalizados-salt').digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest('hex').slice(0, 32)}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = sign(value).slice(value.length + 1);
  return sig === expected ? value : null;
}

export interface SessionData {
  userId: string;
  role: 'trainer' | 'client';
  clientId?: string;
}

export async function createSession(data: SessionData): Promise<void> {
  const token = sign(JSON.stringify(data));
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const value = unsign(token);
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionData;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

export async function requireTrainer(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'trainer') {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireClient(): Promise<{ user: User; clientId: string }> {
  const session = await getSession();
  if (!session || session.role !== 'client' || !session.clientId) {
    throw new Error('UNAUTHORIZED');
  }
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) throw new Error('UNAUTHORIZED');
  return { user, clientId: session.clientId };
}

/**
 * Login del entrenador con email + password.
 */
export async function loginTrainer(email: string, password: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || user.role !== 'trainer') return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

/**
 * Login del cliente con código de invitación.
 */
export async function loginClientWithInviteCode(inviteCode: string): Promise<{ user: User; clientId: string } | null> {
  const code = inviteCode.trim().toUpperCase();
  const [client] = await db.select().from(clients).where(eq(clients.inviteCode, code)).limit(1);
  if (!client || !client.active) return null;

  let user = client.email
    ? (await db.select().from(users).where(eq(users.email, client.email.toLowerCase())).limit(1))[0]
    : null;

  if (!user) {
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email: client.email ?? `${client.inviteCode.toLowerCase()}@cliente.local`,
      passwordHash: hashPassword(code),
      role: 'client',
      fullName: client.fullName,
    });
    const [created] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!created) return null;
    user = created;
  }

  return { user, clientId: client.id };
}