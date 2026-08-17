-- =====================================================
-- Row Level Security (OPCIONAL pero recomendado)
-- =====================================================
-- Esta migración habilita RLS en Supabase.
-- IMPORTANTE: Como nuestra app usa su propia auth (cookies firmadas)
-- y se conecta con el rol `postgres` (superuser), RLS no aplica.
-- Este script es para defense-in-depth: si en el futuro quieres
-- exponer la DB directamente al cliente, RLS protegerá los datos.
--
-- Para aplicar: copia este archivo en Supabase → SQL Editor → Run
-- O usa: psql $DATABASE_URL < scripts/setup-rls.sql
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Política genérica: clientes solo ven sus propios datos
-- (Asume que auth.uid() de Supabase coincide con users.id)
CREATE POLICY "clients_self_select" ON clients
  FOR SELECT USING (
    auth.uid()::text = user_id  -- ⚠️ Necesitas agregar user_id a clients o ajustar
  );

-- Para que esta política funcione realmente, necesitamos que el cliente
-- tenga un auth.users.id que referencie users.id.
-- En nuestra app actual NO usamos Supabase Auth, usamos cookies propias.
-- Por eso RLS no aplica en el flujo actual.

-- =====================================================
-- RECOMENDACIÓN PARA PRODUCCIÓN:
-- =====================================================
-- 1. Crear un rol de aplicación limitado (no superuser):
--    CREATE ROLE app_user LOGIN PASSWORD 'algo_seguro';
--    GRANT CONNECT ON DATABASE postgres TO app_user;
--    GRANT USAGE ON SCHEMA public TO app_user;
--    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
--
-- 2. Cambiar DATABASE_URL para usar app_user en vez de postgres
--
-- 3. Habilitar RLS en cada tabla (descomentar arriba)
--
-- 4. Definir policies según roles (trainer vs client)
-- =====================================================

SELECT '✅ RLS habilitado (sin policies para cookie-based auth). Aplica defense-in-depth en producción.' AS info;