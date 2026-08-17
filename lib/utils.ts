/**
 * Helpers para guardar la rutina/plan estructurado que devuelve Claude en la DB.
 */
import { db } from './db';
import {
  routines, routineDays, routineExercises,
  mealPlans, meals, exercises,
} from './db/schema';
import { eq, inArray, or, like } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface AIGeneratedRoutine {
  title: string;
  weeks_duration?: number;
  days: Array<{
    day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    name: string;
    exercises: Array<{
      exercise_id: string;
      sets: number;
      reps: string;
      weight_kg?: number | null;
      rest_seconds: number;
      notes?: string;
    }>;
  }>;
}

export interface AIGeneratedMealPlan {
  title: string;
  daily_calories: number;
  daily_protein_g?: number;
  daily_carbs_g?: number;
  daily_fats_g?: number;
  days: Array<{
    day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    meals: Array<{
      meal_type: string;
      scheduled_time?: string;
      name: string;
      description?: string;
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fats_g?: number;
    }>;
  }>;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

/**
 * Normaliza un valor que la IA pudo haber enviado como string ("null", "undefined",
 * "", "NaN") a null real, o convierte strings numéricos ("12.5") a número.
 * Esto protege a PostgreSQL de errores tipo "invalid input syntax for type numeric".
 */
function sanitizeNumeric(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '' || s === 'null' || s === 'undefined' || s === 'nan') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Normaliza un string que la IA pudo haber enviado como literal "null"/"undefined" a
 * null real. Vacíos se conservan como string vacío, no se sobreescriben.
 */
function sanitizeNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return String(v);
  const s = v.trim().toLowerCase();
  if (s === 'null' || s === 'undefined') return null;
  return v;
}

/**
 * Resuelve un exercise_id enviado por la IA a un ID real de la BD.
 *
 * La IA a veces trunca los IDs largos del catálogo (ej. envía "ca_plano" cuando el
 * real es "ex_press_banca_plano"). Esta función hace match en este orden:
 *   1) Exacto
 *   2) Sufijo único (case-insensitive): el id enviado aparece al final de UN solo id real
 *   3) Substring único (case-insensitive): el id enviado aparece dentro de UN solo id real
 *   4) Sin match → null
 *
 * Devuelve el ID real o null si no se pudo resolver.
 */
async function resolveExerciseId(sentId: string | null | undefined): Promise<string | null> {
  if (!sentId || typeof sentId !== 'string') return null;
  const sent = sentId.trim();
  if (!sent) return null;

  // Traemos todos los IDs (son ~60, no es costoso)
  const all = await db.select({ id: exercises.id }).from(exercises);
  const ids = all.map((r) => r.id);

  // 1) Exacto
  if (ids.includes(sent)) return sent;

  const sentLower = sent.toLowerCase();
  // 2) Sufijo
  const suffixMatches = ids.filter((id) => id.toLowerCase().endsWith(sentLower));
  if (suffixMatches.length === 1) return suffixMatches[0];

  // 3) Substring (case-insensitive)
  const subMatches = ids.filter((id) => id.toLowerCase().includes(sentLower));
  if (subMatches.length === 1) return subMatches[0];

  return null;
}

export async function saveRoutineFromAI(
  routine: AIGeneratedRoutine,
  params: { clientId: string; trainerId: string; aiPrompt: string },
): Promise<string> {
  await db.update(routines)
    .set({ isActive: false })
    .where(eq(routines.clientId, params.clientId));

  const routineId = uid('rt');
  await db.insert(routines).values({
    id: routineId,
    clientId: params.clientId,
    trainerId: params.trainerId,
    title: routine.title,
    weeksDuration: routine.weeks_duration ?? 4,
    isActive: true,
    createdViaAi: true,
    aiPromptLog: params.aiPrompt,
  } as any);

  // Cache de IDs resueltos para no volver a la BD en cada ejercicio
  const idCache = new Map<string, string | null>();

  for (let dayIdx = 0; dayIdx < routine.days.length; dayIdx++) {
    const day = routine.days[dayIdx];
    const dayId = uid('rd');
    await db.insert(routineDays).values({
      id: dayId,
      routineId,
      dayOfWeek: day.day_of_week,
      name: day.name,
      orderIndex: dayIdx,
    } as any);

    for (let exIdx = 0; exIdx < day.exercises.length; exIdx++) {
      const ex = day.exercises[exIdx];

      // Resolver exercise_id: la IA suele truncarlo, hacemos fuzzy match.
      let resolvedId = idCache.get(ex.exercise_id);
      if (resolvedId === undefined) {
        resolvedId = await resolveExerciseId(ex.exercise_id);
        idCache.set(ex.exercise_id, resolvedId);
      }
      if (!resolvedId) {
        console.warn(`[saveRoutineFromAI] No se pudo resolver exercise_id="${ex.exercise_id}", se omite.`);
        continue;
      }

      const weightKg = sanitizeNumeric(ex.weight_kg);
      await db.insert(routineExercises).values({
        id: uid('re'),
        routineDayId: dayId,
        exerciseId: resolvedId,
        orderIndex: exIdx,
        sets: ex.sets,
        reps: ex.reps,
        weightKg: weightKg != null ? String(weightKg) : null,
        restSeconds: ex.rest_seconds,
        notes: sanitizeNullableString(ex.notes),
      } as any);
    }
  }

  return routineId;
}

export async function saveMealPlanFromAI(
  plan: AIGeneratedMealPlan,
  params: { clientId: string; trainerId: string; aiPrompt: string },
): Promise<string> {
  await db.update(mealPlans)
    .set({ isActive: false })
    .where(eq(mealPlans.clientId, params.clientId));

  const planId = uid('mp');
  await db.insert(mealPlans).values({
    id: planId,
    clientId: params.clientId,
    trainerId: params.trainerId,
    title: plan.title,
    dailyCalories: sanitizeNumeric(plan.daily_calories),
    dailyProteinG: sanitizeNumeric(plan.daily_protein_g),
    dailyCarbsG: sanitizeNumeric(plan.daily_carbs_g),
    dailyFatsG: sanitizeNumeric(plan.daily_fats_g),
    isActive: true,
  } as any);

  for (const day of plan.days) {
    for (let idx = 0; idx < day.meals.length; idx++) {
      const meal = day.meals[idx];
      const protein = sanitizeNumeric(meal.protein_g);
      const carbs = sanitizeNumeric(meal.carbs_g);
      const fats = sanitizeNumeric(meal.fats_g);
      await db.insert(meals).values({
        id: uid('ml'),
        mealPlanId: planId,
        dayOfWeek: day.day_of_week,
        mealType: meal.meal_type,
        scheduledTime: sanitizeNullableString(meal.scheduled_time),
        orderIndex: idx,
        name: meal.name,
        description: sanitizeNullableString(meal.description),
        calories: sanitizeNumeric(meal.calories),
        proteinG: protein != null ? String(protein) : null,
        carbsG: carbs != null ? String(carbs) : null,
        fatsG: fats != null ? String(fats) : null,
      } as any);
    }
  }

  return planId;
}