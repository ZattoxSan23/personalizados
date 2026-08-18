/**
 * Script de migración: crea todas las tablas en Supabase Postgres.
 * Ejecutar con: npm run db:migrate
 */
import 'dotenv/config';
import postgres from 'postgres';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada en .env');
  process.exit(1);
}

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('trainer','client')),
    full_name TEXT NOT NULL,
    phone TEXT,
    yape_number TEXT,
    plin_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    birth_date TEXT,
    gender TEXT,
    height_cm NUMERIC(5,2),
    goal TEXT,
    experience_level TEXT,
    monthly_fee_pen NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_due_day INTEGER DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_clients_trainer ON clients(trainer_id)`,
  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name_es TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT,
    difficulty TEXT DEFAULT 'beginner',
    demo_video_url TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group)`,
  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal TEXT,
    weeks_duration INTEGER DEFAULT 4,
    start_date TEXT,
    end_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_via_ai BOOLEAN DEFAULT FALSE,
    ai_prompt_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS routine_days (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    name TEXT,
    order_index INTEGER NOT NULL,
    UNIQUE(routine_id, day_of_week)
  )`,
  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY,
    routine_day_id TEXT NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    order_index INTEGER NOT NULL,
    sets INTEGER NOT NULL CHECK (sets > 0),
    reps TEXT NOT NULL,
    weight_kg NUMERIC(6,2),
    rest_seconds INTEGER DEFAULT 90,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    daily_calories INTEGER,
    daily_protein_g INTEGER,
    daily_carbs_g INTEGER,
    daily_fats_g INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    scheduled_time TEXT,
    order_index INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    calories INTEGER,
    protein_g NUMERIC(6,2),
    carbs_g NUMERIC(6,2),
    fats_g NUMERIC(6,2)
  )`,
  `CREATE TABLE IF NOT EXISTS progress_entries (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    recorded_at TEXT NOT NULL,
    weight_kg NUMERIC(5,2),
    body_fat_pct NUMERIC(4,2),
    chest_cm NUMERIC(5,2),
    waist_cm NUMERIC(5,2),
    hips_cm NUMERIC(5,2),
    arm_cm NUMERIC(5,2),
    thigh_cm NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_progress_client_date ON progress_entries(client_id, recorded_at DESC)`,
  `CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    checkin_date TEXT NOT NULL,
    water_liters NUMERIC(3,1),
    sleep_hours NUMERIC(3,1),
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),
    energy INTEGER CHECK (energy BETWEEN 1 AND 5),
    adherence_pct INTEGER CHECK (adherence_pct BETWEEN 0 AND 100),
    notes TEXT,
    UNIQUE(client_id, checkin_date)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_pen NUMERIC(10,2) NOT NULL,
    method TEXT NOT NULL DEFAULT 'yape',
    reference_code TEXT NOT NULL,
    period_month TEXT NOT NULL,
    due_date TEXT,
    paid_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    validated_at TIMESTAMPTZ,
    validated_by TEXT REFERENCES users(id),
    trainer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trainer_id, reference_code)
  )`,
  `CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id TEXT PRIMARY KEY,
    trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_client_id TEXT REFERENCES clients(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    structured_payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Fix: la migración original creó target_client_id SIN ON DELETE CASCADE,
  // lo que bloqueaba el borrado de clientes. Recreamos la FK con CASCADE.
  // CREATE TABLE IF NOT EXISTS es no-op si la tabla ya existe, así que
  // este ALTER se ejecuta siempre para reparar la constraint en BDs viejas.
  `ALTER TABLE ai_chat_sessions
    DROP CONSTRAINT IF EXISTS ai_chat_sessions_target_client_id_fkey,
    ADD CONSTRAINT ai_chat_sessions_target_client_id_fkey
      FOREIGN KEY (target_client_id) REFERENCES clients(id) ON DELETE CASCADE`,
  // Per-set logging: cada session guarda un array de series con weight/reps/completed.
  // Los campos topSet* y setsCompleted se mantienen como resumen derivado para
  // queries rápidas y compatibilidad con datos viejos.
  `ALTER TABLE exercise_logs
    ADD COLUMN IF NOT EXISTS sets JSONB NOT NULL DEFAULT '[]'::jsonb`,

  // === Series por tiempo (2026-08-17) ===
  // tracking_type vive en routine_exercises (no en el catálogo exercises) para
  // que el trainer elija por ejercicio: 'reps' (default) o 'time' (segundos).
  // reps se vuelve nullable; duration_seconds se añade nullable. La UI valida
  // que exactamente uno de los dos esté presente.
  `ALTER TABLE routine_exercises
    ADD COLUMN IF NOT EXISTS tracking_type TEXT NOT NULL DEFAULT 'reps'
    CHECK (tracking_type IN ('reps','time'))`,
  `ALTER TABLE routine_exercises
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER
    CHECK (duration_seconds IS NULL OR duration_seconds > 0)`,
  `ALTER TABLE routine_exercises
    ALTER COLUMN reps DROP NOT NULL`,
  `ALTER TABLE exercise_logs
    ADD COLUMN IF NOT EXISTS tracking_type TEXT
    CHECK (tracking_type IS NULL OR tracking_type IN ('reps','time'))`,
  `ALTER TABLE exercise_logs
    ALTER COLUMN top_set_reps DROP NOT NULL`,
];

async function main() {
  console.log('🔧 Ejecutando migraciones en Supabase...');
  // Forzamos ssl:'require' igual que lib/db/index.ts — Supabase pooler
  // siempre exige SSL aunque el query string no lo pida.
  const sql = postgres(DATABASE_URL!, { max: 1, ssl: 'require' });

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
    } catch (e: any) {
      console.error('❌ Error en:', stmt.slice(0, 80) + '...');
      console.error('   ', e.message);
      await sql.end();
      process.exit(1);
    }
  }

  console.log('✅ Tablas creadas/verificadas');
  await sql.end();
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});