/**
 * Seed datos demo para Santos Mejia Vasquez.
 *
 * Genera:
 *  - 5 progress entries a lo largo de 4 meses (medidas corporales)
 *  - 8 exercise logs por ejercicio activo (progresión de pesos)
 *  - 7 daily check-ins (última semana)
 *
 * Idempotente: si ya hay datos demo, los reemplaza.
 *
 * Uso:  npx tsx scripts/seed-santos-demo.ts
 */

// Cargar .env antes que cualquier otra cosa
import 'dotenv/config';

import crypto from 'node:crypto';
import { db } from '../lib/db';
import {
  clients, routines, routineDays, routineExercises,
  progressEntries, dailyCheckins, exerciseLogs,
} from '../lib/db/schema';
import { and, eq, desc, gte } from 'drizzle-orm';

const SANTOS_ID = 'cl_5e73b4de-a339-4013-8554-4c1326f0e09f';

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

// ───────────────────────────────────────────────────────────
// PROGRESO (medidas corporales) — 5 mediciones a lo largo de 4 meses
// ───────────────────────────────────────────────────────────
const progressData = [
  // 4 meses atrás - punto de partida, peso más alto, %grasa más alto
  {
    daysAgo: 120,
    weight: 87.5,
    bodyFat: 22.0,
    neck: 39.5,
    shoulders: 119,
    chest: 106,
    waist: 92,
    bicepsFlex: 38,
    bicepsRelaxed: 35,
    forearm: 30.5,
    thigh: 60,
    calf: 39,
    notes: 'Inicio del plan',
  },
  // 3 meses atrás - bajando grasa, manteniendo músculo
  {
    daysAgo: 90,
    weight: 85.0,
    bodyFat: 19.5,
    neck: 39,
    shoulders: 118,
    chest: 104,
    waist: 88,
    bicepsFlex: 38.5,
    bicepsRelaxed: 35.5,
    forearm: 30.5,
    thigh: 60,
    calf: 39,
    notes: 'Buena adherencia',
  },
  // 2 meses atrás
  {
    daysAgo: 60,
    weight: 82.5,
    bodyFat: 17.0,
    neck: 38.5,
    shoulders: 117,
    chest: 103,
    waist: 86,
    bicepsFlex: 39,
    bicepsRelaxed: 36,
    forearm: 30.5,
    thigh: 60,
    calf: 39,
    notes: 'Subí pesos en press banca',
  },
  // 1 mes atrás
  {
    daysAgo: 30,
    weight: 81.0,
    bodyFat: 15.5,
    neck: 38,
    shoulders: 116,
    chest: 102,
    waist: 84,
    bicepsFlex: 39.5,
    bicepsRelaxed: 36,
    forearm: 30.5,
    thigh: 60,
    calf: 38.5,
    notes: 'Me siento más fuerte',
  },
  // Hoy (estado actual)
  {
    daysAgo: 0,
    weight: 80.0,
    bodyFat: 14.5,
    neck: 38,
    shoulders: 115,
    chest: 101,
    waist: 83,
    bicepsFlex: 40,
    bicepsRelaxed: 36,
    forearm: 30.5,
    thigh: 59.5,
    calf: 38.5,
    notes: 'Buen estado de forma',
  },
];

// ───────────────────────────────────────────────────────────
// CHECK-INS (últimos 7 días)
// ───────────────────────────────────────────────────────────
const checkinsData = [
  { daysAgo: 6, adherence: 90, water: 3.2, sleep: 7.5, mood: 4, energy: 4 },
  { daysAgo: 5, adherence: 85, water: 2.8, sleep: 7.0, mood: 3, energy: 3 },
  { daysAgo: 4, adherence: 95, water: 3.5, sleep: 8.0, mood: 5, energy: 5 },
  { daysAgo: 3, adherence: 80, water: 2.5, sleep: 6.5, mood: 3, energy: 3 },
  { daysAgo: 2, adherence: 100, water: 3.8, sleep: 7.5, mood: 5, energy: 5 },
  { daysAgo: 1, adherence: 90, water: 3.0, sleep: 7.0, mood: 4, energy: 4 },
  { daysAgo: 0, adherence: 85, water: 3.2, sleep: 7.5, mood: 4, energy: 4 },
];

// ───────────────────────────────────────────────────────────
// EJERCICIOS — progresión de pesos realista por ejercicio
// ───────────────────────────────────────────────────────────
// Patrones de progresión por tipo de ejercicio
const progressionPatterns: Record<string, number[]> = {
  // compound - suben más rápido
  press_banca_plano: [60, 62.5, 65, 65, 67.5, 67.5, 70, 72.5],
  press_banca_inclinado: [50, 52.5, 52.5, 55, 55, 57.5, 57.5, 60],
  press_mancuernas_plano: [24, 24, 26, 26, 26, 28, 28, 30],
  aperturas_con_mancuernas: [14, 14, 14, 15, 15, 16, 16, 16],
  fondos_en_paralelas: [0, 0, 5, 5, 5, 8, 8, 10],
  flexiones: [0, 0, 0, 0, 0, 0, 0, 0],
  cruce_de_poleas: [22, 22, 22, 24, 24, 24, 25, 25],
  press_en_m_quina: [50, 52.5, 55, 55, 57.5, 57.5, 60, 60],

  dominadas: [0, 0, 5, 5, 8, 8, 10, 12],
  remo_con_barra: [50, 52.5, 55, 55, 57.5, 60, 60, 62.5],
  remo_con_mancuerna: [24, 26, 26, 28, 28, 30, 30, 32],
  remo_en_polea_baja: [40, 42.5, 42.5, 45, 45, 47.5, 47.5, 50],
  jal_n_al_pecho: [45, 47.5, 47.5, 50, 50, 52.5, 52.5, 55],
  remo_en_m_quina: [40, 42.5, 42.5, 45, 45, 47.5, 47.5, 50],
  peso_muerto: [80, 85, 87.5, 90, 92.5, 95, 97.5, 100],
  remo_en_t: [45, 47.5, 47.5, 50, 50, 52.5, 52.5, 55],
  pullover: [20, 20, 22, 22, 22, 24, 24, 24],

  sentadilla: [80, 85, 87.5, 90, 92.5, 95, 97.5, 100],
  sentadilla_goblet: [24, 26, 26, 28, 28, 30, 30, 32],
  prensa: [120, 130, 135, 140, 145, 150, 155, 160],
  extensi_n_de_cu_drceps: [50, 55, 55, 60, 60, 62.5, 62.5, 65],
  curl_femoral: [35, 37.5, 40, 40, 42.5, 42.5, 45, 45],
  curl_femoral_sentado: [30, 32.5, 32.5, 35, 35, 37.5, 37.5, 40],
  hip_thrust: [80, 90, 95, 100, 105, 110, 115, 120],
  peso_muerto_rumano: [70, 75, 77.5, 80, 82.5, 85, 87.5, 90],
  zancadas: [16, 18, 18, 20, 20, 22, 22, 24],
  step_up: [12, 14, 14, 16, 16, 18, 18, 20],
  elevaci_n_de_gemelos: [60, 70, 75, 80, 80, 85, 90, 95],
  gemelos_sentado: [50, 55, 60, 60, 65, 70, 70, 75],
  sentadilla_b_lgara: [20, 22, 22, 24, 24, 26, 26, 28],
  abducci_n_de_cadera: [25, 30, 30, 35, 35, 40, 40, 45],

  press_militar: [40, 42.5, 42.5, 45, 45, 47.5, 47.5, 50],
  press_mancuernas_hombro: [16, 18, 18, 20, 20, 22, 22, 24],
  elevaciones_laterales: [8, 8, 9, 9, 10, 10, 10, 12],
  elevaciones_frontales: [8, 8, 8, 9, 9, 9, 10, 10],
  p_jaros: [10, 10, 12, 12, 12, 14, 14, 14],
  face_pull: [15, 17.5, 17.5, 20, 20, 22.5, 22.5, 25],
  encogimientos: [20, 22.5, 25, 25, 27.5, 27.5, 30, 30],

  curl_biceps_barra: [30, 32.5, 32.5, 35, 35, 37.5, 37.5, 40],
  curl_mancuernas: [14, 14, 16, 16, 16, 18, 18, 20],
  curl_martillo: [14, 16, 16, 18, 18, 20, 20, 22],
  curl_concentrado: [12, 12, 14, 14, 14, 16, 16, 18],
  press_franc_s: [30, 32.5, 32.5, 35, 35, 37.5, 37.5, 40],
  extensi_n_triceps_polea: [25, 27.5, 27.5, 30, 30, 32.5, 32.5, 35],
  fondos_triceps: [0, 0, 0, 0, 5, 5, 5, 8],
  patada_triceps: [10, 10, 12, 12, 12, 14, 14, 14],

  plancha: [0, 0, 0, 0, 0, 0, 0, 0],
  plancha_lateral: [0, 0, 0, 0, 0, 0, 0, 0],
  crunch: [0, 0, 0, 0, 0, 0, 0, 0],
  elevaci_n_piernas: [0, 0, 0, 0, 0, 0, 0, 0],
  russian_twist: [10, 10, 12, 12, 12, 14, 14, 16],
  abdominal_bicicleta: [0, 0, 0, 0, 0, 0, 0, 0],
  rueda_abdominal: [0, 0, 0, 0, 0, 0, 0, 0],
};

async function main() {
  console.log('🌱 Seeding demo data para Santos...');

  // Limpiar datos existentes de demo (solo progress, logs, checkins)
  await db.delete(progressEntries).where(eq(progressEntries.clientId, SANTOS_ID));
  await db.delete(exerciseLogs).where(eq(exerciseLogs.clientId, SANTOS_ID));
  await db.delete(dailyCheckins).where(eq(dailyCheckins.clientId, SANTOS_ID));
  console.log('  ✓ Datos anteriores limpiados');

  // ── Progress entries
  console.log('  → Insertando 5 progress entries (4 meses de datos)...');
  for (const p of progressData) {
    const date = new Date();
    date.setDate(date.getDate() - p.daysAgo);
    const recordedAt = date.toISOString().split('T')[0];

    await db.insert(progressEntries).values({
      id: uid('pe'),
      clientId: SANTOS_ID,
      recordedAt,
      weightKg: String(p.weight),
      bodyFatPct: String(p.bodyFat),
      neckCm: String(p.neck),
      shoulderCm: String(p.shoulders),
      chestCm: String(p.chest),
      waistCm: String(p.waist),
      bicepFlexCm: String(p.bicepsFlex),
      bicepRelaxedCm: String(p.bicepsRelaxed),
      forearmCm: String(p.forearm),
      thighCm: String(p.thigh),
      calfCm: String(p.calf),
      notes: p.notes,
    } as any);
  }
  console.log(`    ✓ ${progressData.length} progress entries insertadas`);

  // ── Daily check-ins
  console.log('  → Insertando 7 daily check-ins...');
  for (const c of checkinsData) {
    const date = new Date();
    date.setDate(date.getDate() - c.daysAgo);
    const checkinDate = date.toISOString().split('T')[0];

    await db.insert(dailyCheckins).values({
      id: uid('ci'),
      clientId: SANTOS_ID,
      checkinDate,
      waterLiters: String(c.water),
      sleepHours: String(c.sleep),
      mood: c.mood,
      energy: c.energy,
      adherencePct: c.adherence,
    } as any);
  }
  console.log(`    ✓ ${checkinsData.length} check-ins insertados`);

  // ── Exercise logs
  console.log('  → Insertando exercise logs (8 sesiones por ejercicio)...');
  const allExercises = await db
    .select({
      id: routineExercises.id,
      nameEs: routineExercises.id, // placeholder
    })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
    .innerJoin(routines, eq(routines.id, routineDays.routineId))
    .where(eq(routines.clientId, SANTOS_ID));

  // Necesitamos el exercise_id real (no routine_exercise_id) para mapear progresión
  const exercisesWithRealId = await db
    .select({
      routineExerciseId: routineExercises.id,
      exerciseId: routineExercises.exerciseId,
      sets: routineExercises.sets,
      reps: routineExercises.reps,
    })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
    .innerJoin(routines, eq(routines.id, routineDays.routineId))
    .where(eq(routines.clientId, SANTOS_ID));

  let logCount = 0;
  for (const ex of exercisesWithRealId) {
    // Extraer "slug" del exercise_id (ej: ex_press_banca_plano -> press_banca_plano)
    const slug = ex.exerciseId.replace(/^ex_/, '').replace(/_/g, '_');
    const pattern = progressionPatterns[slug];
    if (!pattern) {
      // Si no hay patrón específico, generar progresión genérica
      for (let i = 0; i < 8; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (60 - i * 8));
        const baseWeight = (ex.sets ?? 3) * 12; // estimación genérica
        const weight = baseWeight + i * 2.5;
        const repsNum = parseInt(String(ex.reps).match(/\d+/)?.[0] ?? '8');
        await db.insert(exerciseLogs).values({
          id: uid('el'),
          clientId: SANTOS_ID,
          routineExerciseId: ex.routineExerciseId,
          performedAt: date,
          topSetWeightKg: String(weight.toFixed(2)),
          topSetReps: Math.max(2, repsNum - Math.floor(i / 3)),
          setsCompleted: ex.sets,
          rpe: 6 + Math.floor(i / 2),
        } as any);
        logCount++;
      }
      continue;
    }

    // 8 sesiones a lo largo de 2 meses (cada ~8 días)
    for (let i = 0; i < pattern.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (60 - i * 8));
      const weight = pattern[i];
      // Reps basadas en el patrón del ejercicio
      const repsNum = parseInt(String(ex.reps).match(/\d+/)?.[0] ?? '8');
      const reps = weight === 0 ? repsNum : Math.max(3, repsNum - Math.floor(i / 3));
      await db.insert(exerciseLogs).values({
        id: uid('el'),
        clientId: SANTOS_ID,
        routineExerciseId: ex.routineExerciseId,
        performedAt: date,
        topSetWeightKg: weight > 0 ? String(weight.toFixed(2)) : null,
        topSetReps: reps,
        setsCompleted: ex.sets,
        rpe: 6 + Math.floor(i / 2),
      } as any);
      logCount++;
    }
  }
  console.log(`    ✓ ${logCount} exercise logs insertados`);

  console.log('\n✅ Seed completo. Santos ahora tiene:');
  console.log(`   - 5 progress entries (4 meses de evolución)`);
  console.log(`   - 7 daily check-ins`);
  console.log(`   - ${logCount} exercise logs con progresión realista`);
  console.log('\n🔍 Ve a /trainer/clientes/Santos o /portal/rutina para ver los datos.');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});