/**
 * Seed: crea el entrenador + 2 clientes con data completa.
 *
 * Ejecutar con: npm run db:seed
 *
 * Crea:
 *  - 1 entrenador
 *  - 2 clientes (Carlos Mendoza M, Ana Quispe F) con:
 *      · 5 progress entries (4 meses de evolución)
 *      · Rutina activa de 4 días con ejercicios
 *      · Exercise logs con progresión (8 sesiones por ejercicio)
 *      · 7 daily check-ins (última semana)
 *      · Plan nutricional activo con 5 comidas/día
 *      · Historial de pagos
 *  - Catálogo de ~60 ejercicios
 *
 * Es idempotente en el sentido de que limpia todo antes de insertar.
 */
import 'dotenv/config';
import postgres from 'postgres';
import crypto from 'node:crypto';
import dns from 'node:dns';
import { SEED_EXERCISES } from '../lib/exercises/catalog';

dns.setDefaultResultOrder('ipv4first');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada en .env');
  process.exit(1);
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw + ':personalizados-salt').digest('hex');
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function isoTimestamp(daysAgo: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ───────────────────────────────────────────────────────────
// Datos de los 2 clientes demo
// ───────────────────────────────────────────────────────────
interface DemoClient {
  name: string;
  email: string;
  gender: 'male' | 'female';
  goal: 'hypertrophy' | 'fat_loss' | 'strength';
  level: 'beginner' | 'intermediate' | 'advanced';
  fee: number;
  heightCm: number;
  birthDate: string;
  notes: string;
  // Progresión de medidas (4 meses de evolución → actual)
  progress: Array<{
    daysAgo: number;
    weightKg: number;
    neck: number;
    chest: number;
    waist: number;
    hips?: number;
    shoulders: number;
    bicepFlex: number;
    bicepRelaxed: number;
    forearm: number;
    thigh: number;
    calf: number;
    notes: string;
  }>;
  // Plan nutricional
  mealPlan: {
    title: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    meals: Array<{ day: string; type: string; time: string; name: string; description: string; calories: number; protein: number; carbs: number; fats: number; order: number }>;
  };
  // Pesos iniciales por ejercicio (luego se aplica progresión)
  startingWeights: Record<string, number>;
}

const DEMO_CLIENTS: DemoClient[] = [
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@demo.pe',
    gender: 'male',
    goal: 'hypertrophy',
    level: 'intermediate',
    fee: 280,
    heightCm: 178,
    birthDate: '1992-03-15',
    notes: 'Cliente dedicado, busca hipertrofia. Entrena 4 días/sem.',
    progress: [
      { daysAgo: 120, weightKg: 82.5, neck: 39, chest: 105, waist: 91, shoulders: 118, bicepFlex: 37, bicepRelaxed: 34, forearm: 30, thigh: 59, calf: 38, notes: 'Inicio del plan' },
      { daysAgo: 90,  weightKg: 83.8, neck: 39.2, chest: 107, waist: 89, shoulders: 119, bicepFlex: 38, bicepRelaxed: 34.5, forearm: 30.5, thigh: 60, calf: 38.5, notes: 'Ganando masa' },
      { daysAgo: 60,  weightKg: 85.2, neck: 39.5, chest: 109, waist: 87, shoulders: 120, bicepFlex: 39, bicepRelaxed: 35.5, forearm: 31, thigh: 60.5, calf: 39, notes: 'Subí pesos en press banca' },
      { daysAgo: 30,  weightKg: 86.5, neck: 39.8, chest: 111, waist: 86, shoulders: 121, bicepFlex: 40, bicepRelaxed: 36, forearm: 31.5, thigh: 61, calf: 39, notes: 'Me siento más fuerte' },
      { daysAgo: 0,   weightKg: 87.0, neck: 40, chest: 112, waist: 85, shoulders: 122, bicepFlex: 40.5, bicepRelaxed: 36.5, forearm: 32, thigh: 61, calf: 39, notes: 'Buen estado de forma' },
    ],
    mealPlan: {
      title: 'Volumen limpio 3000 kcal',
      calories: 3000,
      proteinG: 180,
      carbsG: 380,
      fatsG: 85,
      meals: [
        { day: 'monday', type: 'breakfast', time: '07:30', name: 'Avena con plátano', description: '80g avena, 1 plátano, 200ml leche, 30g whey', calories: 550, protein: 40, carbs: 80, fats: 10, order: 1 },
        { day: 'monday', type: 'lunch',     time: '13:00', name: 'Pollo con arroz', description: '200g pechuga, 150g arroz, ensalada', calories: 700, protein: 55, carbs: 90, fats: 12, order: 2 },
        { day: 'monday', type: 'snack',     time: '16:30', name: 'Yogurt con frutos secos', description: '200g yogurt griego, 30g almendras', calories: 350, protein: 20, carbs: 20, fats: 22, order: 3 },
        { day: 'monday', type: 'dinner',    time: '20:00', name: 'Salmón con camote', description: '200g salmón, 200g camote, vegetales', calories: 750, protein: 45, carbs: 80, fats: 28, order: 4 },
        { day: 'monday', type: 'extra',     time: '22:00', name: 'Caseína', description: '30g caseína con agua', calories: 150, protein: 25, carbs: 5, fats: 2, order: 5 },
      ],
    },
    startingWeights: {
      'Press banca plano': 70,
      'Press mancuernas inclinado': 28,
      'Aperturas con mancuernas': 16,
      'Remo con barra': 65,
      'Jalón al pecho en polea': 55,
      'Remo en polea baja': 50,
      'Sentadilla con barra': 100,
      'Extensión de cuádriceps': 60,
      'Curl femoral acostado': 45,
      'Press militar de pie': 50,
      'Elevaciones laterales': 12,
      'Curl de bíceps con barra': 38,
      'Extensión de tríceps en polea': 32,
    },
  },
  {
    name: 'Ana Quispe',
    email: 'ana.quispe@demo.pe',
    gender: 'female',
    goal: 'fat_loss',
    level: 'beginner',
    fee: 220,
    heightCm: 162,
    birthDate: '1996-08-22',
    notes: 'Principiante, busca perder grasa manteniendo músculo.',
    progress: [
      { daysAgo: 120, weightKg: 72.0, neck: 33, chest: 95, waist: 82, hips: 105, shoulders: 105, bicepFlex: 30, bicepRelaxed: 28, forearm: 25, thigh: 58, calf: 36, notes: 'Inicio del plan' },
      { daysAgo: 90,  weightKg: 70.5, neck: 33, chest: 94, waist: 80, hips: 103, shoulders: 105, bicepFlex: 30.5, bicepRelaxed: 28, forearm: 25, thigh: 57.5, calf: 36, notes: 'Adherencia buena' },
      { daysAgo: 60,  weightKg: 69.0, neck: 32.8, chest: 93, waist: 78, hips: 101, shoulders: 104, bicepFlex: 30.5, bicepRelaxed: 28, forearm: 25, thigh: 57, calf: 35.5, notes: 'Bajando bien' },
      { daysAgo: 30,  weightKg: 67.8, neck: 32.5, chest: 92, waist: 76, hips: 100, shoulders: 104, bicepFlex: 31, bicepRelaxed: 28.5, forearm: 25, thigh: 56.5, calf: 35.5, notes: 'Más energía' },
      { daysAgo: 0,   weightKg: 66.5, neck: 32.3, chest: 91, waist: 74, hips: 99, shoulders: 103, bicepFlex: 31, bicepRelaxed: 28.5, forearm: 25, thigh: 56, calf: 35, notes: 'Muy conforme con resultados' },
    ],
    mealPlan: {
      title: 'Déficit moderado 1900 kcal',
      calories: 1900,
      proteinG: 130,
      carbsG: 200,
      fatsG: 60,
      meals: [
        { day: 'monday', type: 'breakfast', time: '07:30', name: 'Tortilla de claras', description: '3 claras + 1 huevo, espinaca, tomate', calories: 280, protein: 28, carbs: 8, fats: 14, order: 1 },
        { day: 'monday', type: 'lunch',     time: '13:00', name: 'Pollo con quinoa', description: '150g pechuga, 100g quinoa, ensalada grande', calories: 480, protein: 45, carbs: 55, fats: 10, order: 2 },
        { day: 'monday', type: 'snack',     time: '16:30', name: 'Manzana con mantequilla de maní', description: '1 manzana, 15g mantequilla de maní', calories: 200, protein: 5, carbs: 28, fats: 9, order: 3 },
        { day: 'monday', type: 'dinner',    time: '20:00', name: 'Atún con vegetales', description: '1 lata atún, mix de vegetales al vapor', calories: 380, protein: 35, carbs: 30, fats: 12, order: 4 },
        { day: 'monday', type: 'extra',     time: '22:00', name: 'Yogurt griego', description: '150g yogurt griego natural', calories: 120, protein: 15, carbs: 8, fats: 3, order: 5 },
      ],
    },
    startingWeights: {
      'Sentadilla con barra': 40,
      'Prensa de piernas': 80,
      'Extensión de cuádriceps': 30,
      'Curl femoral acostado': 25,
      'Peso muerto rumano': 35,
      'Press mancuernas plano': 12,
      'Remo con mancuerna a un brazo': 14,
      'Jalón al pecho en polea': 25,
      'Press de mancuernas sentado': 8,
      'Elevaciones laterales': 5,
      'Curl de bíceps con mancuernas': 8,
      'Fondos para tríceps': 0,
      'Plancha frontal': 0,
    },
  },
];

// ───────────────────────────────────────────────────────────
// Rutinas — 4 días split (Pecho/Espalda/Pierna/Hombro+brazo)
// ───────────────────────────────────────────────────────────
const ROUTINE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday'] as const;

type ExerciseDef = { nameEs: string; sets: number; reps: string; rest: number };

// Usamos nameEs (el nombre humano del catálogo) en vez de slugs calculados a
// mano, porque el catálogo genera los IDs con reglas de normalización que
// pueden cambiar. Resolvemos nameEs → id real en runtime desde SEED_EXERCISES.
const ROUTINE_TEMPLATES: Record<string, ExerciseDef[]> = {
  monday: [
    { nameEs: 'Press banca plano',                  sets: 4, reps: '6-8',  rest: 120 },
    { nameEs: 'Press mancuernas inclinado',         sets: 3, reps: '8-10', rest: 90 },
    { nameEs: 'Aperturas con mancuernas',           sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Fondos en paralelas',                sets: 3, reps: '8-12', rest: 90 },
  ],
  tuesday: [
    { nameEs: 'Remo con barra',                     sets: 4, reps: '6-8',  rest: 120 },
    { nameEs: 'Jalón al pecho en polea',            sets: 3, reps: '8-10', rest: 90 },
    { nameEs: 'Remo en polea baja',                 sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Pullover con mancuerna',             sets: 3, reps: '12-15', rest: 60 },
  ],
  wednesday: [
    { nameEs: 'Sentadilla con barra',               sets: 4, reps: '6-8',  rest: 150 },
    { nameEs: 'Extensión de cuádriceps',            sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Curl femoral acostado',              sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Prensa de piernas',                  sets: 3, reps: '12-15', rest: 90 },
  ],
  thursday: [
    { nameEs: 'Press militar de pie',               sets: 4, reps: '6-8',  rest: 120 },
    { nameEs: 'Elevaciones laterales',              sets: 4, reps: '12-15', rest: 60 },
    { nameEs: 'Curl de bíceps con barra',           sets: 3, reps: '8-10', rest: 60 },
    { nameEs: 'Extensión de tríceps en polea',      sets: 3, reps: '10-12', rest: 60 },
  ],
};

const FEMALE_ROUTINE: Record<string, ExerciseDef[]> = {
  monday: [
    { nameEs: 'Sentadilla con barra',               sets: 4, reps: '10-12', rest: 90 },
    { nameEs: 'Prensa de piernas',                  sets: 3, reps: '12-15', rest: 90 },
    { nameEs: 'Extensión de cuádriceps',            sets: 3, reps: '12-15', rest: 60 },
    { nameEs: 'Curl femoral acostado',              sets: 3, reps: '12-15', rest: 60 },
  ],
  tuesday: [
    { nameEs: 'Peso muerto rumano',                 sets: 4, reps: '10-12', rest: 90 },
    { nameEs: 'Remo con mancuerna a un brazo',      sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Jalón al pecho en polea',            sets: 3, reps: '12-15', rest: 60 },
  ],
  wednesday: [
    { nameEs: 'Press mancuernas plano',             sets: 4, reps: '10-12', rest: 90 },
    { nameEs: 'Press de mancuernas sentado',        sets: 3, reps: '12-15', rest: 60 },
    { nameEs: 'Elevaciones laterales',              sets: 3, reps: '12-15', rest: 60 },
  ],
  thursday: [
    { nameEs: 'Curl de bíceps con mancuernas',      sets: 3, reps: '12-15', rest: 60 },
    { nameEs: 'Fondos para tríceps',               sets: 3, reps: '10-12', rest: 60 },
    { nameEs: 'Plancha frontal',                    sets: 3, reps: '30-45s', rest: 45 },
  ],
};

// ───────────────────────────────────────────────────────────
// Patrones de progresión (8 sesiones)
// ───────────────────────────────────────────────────────────
function progression(start: number, increment: number, session: number): number {
  return +(start + increment * session).toFixed(2);
}

async function main() {
  console.log('🌱 Sembrando datos completos en Supabase...');
  const sql = postgres(DATABASE_URL!, { max: 1 });

  console.log('🧹 Limpiando datos existentes...');
  // Limpiar en orden inverso al FK cascade
  await sql`DELETE FROM ai_chat_messages`;
  await sql`DELETE FROM ai_chat_sessions`;
  await sql`DELETE FROM exercise_logs`;
  await sql`DELETE FROM daily_checkins`;
  await sql`DELETE FROM progress_entries`;
  await sql`DELETE FROM routine_exercises`;
  await sql`DELETE FROM routine_days`;
  await sql`DELETE FROM routines`;
  await sql`DELETE FROM meals`;
  await sql`DELETE FROM meal_plans`;
  await sql`DELETE FROM payments`;
  await sql`DELETE FROM clients`;
  await sql`DELETE FROM exercises`;
  await sql`DELETE FROM users`;

  // ── Trainer
  const trainerEmail = process.env.SEED_TRAINER_EMAIL ?? 'entrenador@personalizados.pe';
  const trainerPassword = process.env.SEED_TRAINER_PASSWORD ?? 'entrenador123';
  const trainerName = process.env.SEED_TRAINER_NAME ?? 'Coach Demo';
  const trainerId = uid('u');
  await sql`
    INSERT INTO users (id, email, password_hash, role, full_name, phone, yape_number, plin_number)
    VALUES (${trainerId}, ${trainerEmail}, ${hashPassword(trainerPassword)}, 'trainer',
            ${trainerName}, '999888777', '999888777', '999888777')
  `;
  console.log(`✅ Entrenador: ${trainerEmail} / ${trainerPassword}`);

  // ── Ejercicios
  console.log(`📚 Insertando ${SEED_EXERCISES.length} ejercicios...`);
  for (const ex of SEED_EXERCISES) {
    await sql`
      INSERT INTO exercises (id, name_es, muscle_group, equipment, difficulty)
      VALUES (${ex.id}, ${ex.nameEs}, ${ex.muscleGroup}, ${ex.equipment}, ${ex.difficulty})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // ── Clientes demo
  console.log(`👥 Creando ${DEMO_CLIENTS.length} clientes con data completa...`);

  const createdClients: Array<{ name: string; inviteCode: string }> = [];

  for (const c of DEMO_CLIENTS) {
    const clientId = uid('cl');
    const userId = uid('u');
    const initials = c.name.split(' ').map((w) => w[0] || '').join('').toUpperCase();
    const inviteCode = `${initials}-${Math.floor(1000 + Math.random() * 9000)}`;

    // User account del cliente (login con inviteCode)
    await sql`
      INSERT INTO users (id, email, password_hash, role, full_name)
      VALUES (${userId}, ${c.email}, ${hashPassword(inviteCode)}, 'client', ${c.name})
    `;

    // Cliente
    await sql`
      INSERT INTO clients (
        id, trainer_id, invite_code, full_name, email, gender,
        birth_date, height_cm, goal, experience_level,
        monthly_fee_pen, payment_due_day, active, notes
      )
      VALUES (
        ${clientId}, ${trainerId}, ${inviteCode}, ${c.name}, ${c.email}, ${c.gender},
        ${c.birthDate}, ${String(c.heightCm)}, ${c.goal}, ${c.level},
        ${String(c.fee)}, 1, TRUE, ${c.notes}
      )
    `;

    // ── Progress entries (5 mediciones)
    console.log(`  📊 ${c.name}: insertando 5 progress entries...`);
    for (const p of c.progress) {
      await sql`
        INSERT INTO progress_entries (
          id, client_id, recorded_at, weight_kg, neck_cm, shoulder_cm, chest_cm,
          waist_cm, hips_cm, bicep_flex_cm, bicep_relaxed_cm, forearm_cm, thigh_cm,
          calf_cm, notes
        )
        VALUES (
          ${uid('pe')}, ${clientId}, ${isoDate(p.daysAgo)},
          ${String(p.weightKg)}, ${String(p.neck)}, ${String(p.shoulders)},
          ${String(p.chest)}, ${String(p.waist)}, ${p.hips ? String(p.hips) : null},
          ${String(p.bicepFlex)}, ${String(p.bicepRelaxed)}, ${String(p.forearm)},
          ${String(p.thigh)}, ${String(p.calf)}, ${p.notes}
        )
      `;
    }

    // ── Rutina activa (4 días, con pesos iniciales)
    console.log(`  💪 ${c.name}: creando rutina activa de 4 días...`);
    const routineId = uid('r');
    const template = c.gender === 'female' ? FEMALE_ROUTINE : ROUTINE_TEMPLATES;
    await sql`
      INSERT INTO routines (id, client_id, trainer_id, title, goal, weeks_duration, is_active, start_date)
      VALUES (${routineId}, ${clientId}, ${trainerId},
              ${c.gender === 'female' ? 'Tono + definición 4 días' : 'Hipertrofia 4 días split'},
              ${c.goal}, 8, TRUE, ${isoDate(60)})
    `;

    // routine_days + routine_exercises
    for (let i = 0; i < ROUTINE_DAYS.length; i++) {
      const day = ROUTINE_DAYS[i];
      const dayId = uid('rd');
      await sql`
        INSERT INTO routine_days (id, routine_id, day_of_week, name, order_index)
        VALUES (${dayId}, ${routineId}, ${day},
                ${day === 'monday' ? 'Pecho' : day === 'tuesday' ? 'Espalda' : day === 'wednesday' ? 'Pierna' : 'Hombro+Brazo'},
                ${i})
      `;
      const exercises = template[day] ?? [];
      for (let j = 0; j < exercises.length; j++) {
        const ex = exercises[j];
        // Resolver nameEs → id real del catálogo
        const exerciseId = SEED_EXERCISES.find((e) => e.nameEs === ex.nameEs)?.id;
        if (!exerciseId) {
          throw new Error(`Ejercicio "${ex.nameEs}" no encontrado en el catálogo. Añádelo a SEED_EXERCISES o actualiza ROUTINE_TEMPLATES.`);
        }
        const initialWeight = c.startingWeights[ex.nameEs] ?? null;
        await sql`
          INSERT INTO routine_exercises (id, routine_day_id, exercise_id, order_index, sets, reps, weight_kg, rest_seconds, notes)
          VALUES (
            ${uid('re')}, ${dayId}, ${exerciseId}, ${j}, ${ex.sets}, ${ex.reps},
            ${initialWeight != null ? String(initialWeight) : null},
            ${ex.rest},
            ${initialWeight != null ? `Peso inicial referencial` : null}
          )
        `;
      }
    }

    // ── Exercise logs (8 sesiones por ejercicio a lo largo de 2 meses)
    console.log(`  📈 ${c.name}: insertando exercise logs con progresión...`);
    const routineExerciseRows = await sql`
      SELECT re.id, re.exercise_id, re.sets, re.reps, re.weight_kg
      FROM routine_exercises re
      JOIN routine_days rd ON rd.id = re.routine_day_id
      WHERE rd.routine_id = ${routineId}
    `;

    let logCount = 0;
    for (const reRow of routineExerciseRows) {
      // Resolver exercise_id → nameEs del catálogo para buscar el peso inicial
      const exerciseDef = SEED_EXERCISES.find((e) => e.id === reRow.exercise_id);
      const start = exerciseDef ? (c.startingWeights[exerciseDef.nameEs] ?? 0) : 0;
      const increment = start > 50 ? 2.5 : start > 20 ? 2.5 : 1;
      // 8 sesiones cada ~8 días hacia atrás
      for (let i = 0; i < 8; i++) {
        const weight = progression(start, increment, i);
        const repsNum = parseInt(String(reRow.reps).match(/\d+/)?.[0] ?? '8');
        await sql`
          INSERT INTO exercise_logs (
            id, client_id, routine_exercise_id, performed_at,
            top_set_weight_kg, top_set_reps, sets_completed, rpe
          )
          VALUES (
            ${uid('el')}, ${clientId}, ${reRow.id}, ${isoTimestamp(56 - i * 8, 18)},
            ${weight > 0 ? String(weight) : null},
            ${weight === 0 ? repsNum : Math.max(3, repsNum - Math.floor(i / 3))},
            ${reRow.sets}, ${6 + Math.floor(i / 2)}
          )
        `;
        logCount++;
      }
    }
    console.log(`    ✓ ${logCount} exercise logs`);

    // ── Daily check-ins (últimos 7 días)
    console.log(`  📅 ${c.name}: insertando 7 check-ins...`);
    const checkins = [
      { adherence: 90, water: 3.2, sleep: 7.5, mood: 4, energy: 4 },
      { adherence: 85, water: 2.8, sleep: 7.0, mood: 3, energy: 3 },
      { adherence: 95, water: 3.5, sleep: 8.0, mood: 5, energy: 5 },
      { adherence: 80, water: 2.5, sleep: 6.5, mood: 3, energy: 3 },
      { adherence: 100, water: 3.8, sleep: 7.5, mood: 5, energy: 5 },
      { adherence: 90, water: 3.0, sleep: 7.0, mood: 4, energy: 4 },
      { adherence: 85, water: 3.2, sleep: 7.5, mood: 4, energy: 4 },
    ];
    for (let i = 0; i < checkins.length; i++) {
      const ck = checkins[i];
      await sql`
        INSERT INTO daily_checkins (id, client_id, checkin_date, water_liters, sleep_hours, mood, energy, adherence_pct)
        VALUES (${uid('ci')}, ${clientId}, ${isoDate(6 - i)},
                ${String(ck.water)}, ${String(ck.sleep)}, ${ck.mood}, ${ck.energy}, ${ck.adherence})
      `;
    }

    // ── Plan nutricional activo
    console.log(`  🥗 ${c.name}: insertando plan nutricional...`);
    const mealPlanId = uid('mp');
    await sql`
      INSERT INTO meal_plans (id, client_id, trainer_id, title, daily_calories, daily_protein_g, daily_carbs_g, daily_fats_g, is_active)
      VALUES (${mealPlanId}, ${clientId}, ${trainerId}, ${c.mealPlan.title},
              ${c.mealPlan.calories}, ${c.mealPlan.proteinG}, ${c.mealPlan.carbsG}, ${c.mealPlan.fatsG}, TRUE)
    `;
    for (const m of c.mealPlan.meals) {
      await sql`
        INSERT INTO meals (id, meal_plan_id, day_of_week, meal_type, scheduled_time, order_index, name, description, calories, protein_g, carbs_g, fats_g)
        VALUES (${uid('me')}, ${mealPlanId}, ${m.day}, ${m.type}, ${m.time}, ${m.order},
                ${m.name}, ${m.description}, ${m.calories}, ${m.protein}, ${m.carbs}, ${m.fats})
      `;
    }

    // ── Pagos (últimos 4 meses pagados)
    console.log(`  💰 ${c.name}: insertando historial de pagos...`);
    for (let i = 0; i < 4; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() - i);
      dueDate.setDate(c.fee > 250 ? 5 : 1);
      const paidDate = new Date(dueDate);
      paidDate.setDate(paidDate.getDate() + 2);
      const ref = `YAPE-${Math.floor(100000 + Math.random() * 900000)}`;
      await sql`
        INSERT INTO payments (id, client_id, trainer_id, amount_pen, method, reference_code, period_month, due_date, paid_at, status, validated_at, validated_by)
        VALUES (${uid('pay')}, ${clientId}, ${trainerId}, ${String(c.fee)}, 'yape', ${ref},
                ${dueDate.toISOString().slice(0, 7)}, ${dueDate.toISOString().split('T')[0]},
                ${paidDate.toISOString()}, 'validated', ${paidDate.toISOString()}, ${trainerId})
      `;
    }

    console.log(`  ✅ ${c.name} listo. Login portal: código "${inviteCode}"`);
    createdClients.push({ name: c.name, inviteCode });
  }

  console.log('\n🎉 Seed completo!\n');
  console.log('─────────────────────────────────────────────');
  console.log('🔑 TRAINER:');
  console.log(`   Email: ${trainerEmail}`);
  console.log(`   Password: ${trainerPassword}`);
  console.log('   → http://localhost:3000/login');
  console.log('─────────────────────────────────────────────');
  console.log('👥 CLIENTES (login portal con código = contraseña):');
  for (const c of createdClients) {
    console.log(`   ${c.name}: "${c.inviteCode}"`);
  }
  console.log('   → http://localhost:3000/portal');
  console.log('─────────────────────────────────────────────');

  await sql.end();
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});