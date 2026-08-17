import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no configurada. Agrégala en .env',
  );
}

// Conexión a Supabase Postgres.
// Usamos el pooler (PgBouncer) en producción, por lo que desactivamos
// prepared statements — PgBouncer en modo "transaction" no los soporta
// entre transacciones. En local también funciona, así dejamos una sola
// configuración para los dos entornos.
const queryClient = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
export { schema };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function uid(prefix = ''): string {
  const u = globalThis.crypto.randomUUID();
  return prefix ? `${prefix}_${u}` : u;
}