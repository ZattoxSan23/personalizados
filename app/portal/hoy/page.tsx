import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  routines, routineDays, routineExercises, exercises,
  mealPlans, meals, exerciseLogs,
} from '@/lib/db/schema';
import { and, eq, desc, inArray, sql } from 'drizzle-orm';
import { dayOfWeekInLima, toLimaDateString, todayLabelLima } from '@/lib/date';
import SessionMode from './SessionMode';

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;

export const dynamic = 'force-dynamic';

type ExerciseForUI = {
  routineExerciseId: string;
  nameEs: string;
  muscleGroup: string | null;
  sets: number;
  trackingType: 'reps' | 'time';
  reps: string | null;
  durationSeconds: number | null;
  weightKg: string | null;
  restSeconds: number | null;
  notes: string | null;
  prWeight: number;
  lastWeight: number | null;
  lastReps: number | null;
  lastVolume: number;
  lastRpe: number | null;
  lastDate: string | null;
  trend: number | null;
  history: number[];
};

export default async function HoyPage() {
  const { clientId } = await requireClient();
  // ⚠️ Día actual en zona horaria Lima (no UTC del servidor).
  const todayKey = DAY_KEYS[dayOfWeekInLima()];

  const [rutina] = await db.select().from(routines)
    .where(and(eq(routines.clientId, clientId), eq(routines.isActive, true)))
    .limit(1);

  let ejercicios: ExerciseForUI[] = [];
  let diaRutina: { name: string | null } | null = null;

  if (rutina) {
    const [dia] = await db.select().from(routineDays)
      .where(and(eq(routineDays.routineId, rutina.id), eq(routineDays.dayOfWeek, todayKey)))
      .limit(1);
    diaRutina = dia ?? null;

    if (dia) {
      const rows = await db
        .select({
          routineExerciseId: routineExercises.id,
          nameEs: exercises.nameEs,
          muscleGroup: exercises.muscleGroup,
          sets: routineExercises.sets,
          trackingType: routineExercises.trackingType,
          reps: routineExercises.reps,
          durationSeconds: routineExercises.durationSeconds,
          weightKg: routineExercises.weightKg,
          restSeconds: routineExercises.restSeconds,
          notes: routineExercises.notes,
        })
        .from(routineExercises)
        .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
        .where(eq(routineExercises.routineDayId, dia.id))
        .orderBy(routineExercises.orderIndex);

      const reIds = rows.map((r) => r.routineExerciseId);
      let logsByRe: Record<string, Array<{
        weight: number; reps: number; date: string; volume: number; rpe: number | null;
      }>> = {};

      if (reIds.length > 0) {
        // Batch: hasta 12 sesiones por ejercicio, para PR + última + tendencia
        const allLogs = await db
          .select({
            routineExerciseId: exerciseLogs.routineExerciseId,
            topSetWeightKg: exerciseLogs.topSetWeightKg,
            topSetReps: exerciseLogs.topSetReps,
            sets: exerciseLogs.sets,
            performedAt: exerciseLogs.performedAt,
            rpe: exerciseLogs.rpe,
          })
          .from(exerciseLogs)
          .where(and(
            eq(exerciseLogs.clientId, clientId),
            inArray(exerciseLogs.routineExerciseId, reIds),
          ))
          .orderBy(desc(exerciseLogs.performedAt))
          .limit(reIds.length * 12);

        for (const log of allLogs) {
          const list = logsByRe[log.routineExerciseId] ?? [];
          if (list.length >= 8) continue;
          const w = log.topSetWeightKg ? Number(log.topSetWeightKg) : 0;
          const r = log.topSetReps; // puede ser null si el ejercicio es por tiempo
          const sets = (log.sets ?? []) as Array<{ weight: number; reps: number; durationSeconds?: number; completed: boolean }>;
          const completed = sets.filter((s) => s.completed);
          const volume = completed.reduce((sum, s) => sum + s.weight * s.reps, 0);
          list.push({
            weight: w,
            reps: r ?? 0,
            // ⚠️ Fecha del log en zona horaria Lima (no UTC del servidor).
            date: toLimaDateString(log.performedAt),
            volume: Math.round(volume),
            rpe: log.rpe,
          });
          logsByRe[log.routineExerciseId] = list;
        }
      }

      ejercicios = rows.map((row) => {
        const history = logsByRe[row.routineExerciseId] ?? [];
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const series = history.map((l) => l.weight).filter((w) => w > 0);
        const prWeight = series.length > 0 ? Math.max(...series) : 0;
        return {
          ...row,
          prWeight,
          lastWeight: last?.weight ?? null,
          lastReps: last?.reps ?? null,
          lastVolume: last?.volume ?? 0,
          lastRpe: last?.rpe ?? null,
          lastDate: last?.date ?? null,
          trend: last && prev && Math.abs(last.weight - prev.weight) >= 0.5 ? +(last.weight - prev.weight).toFixed(2) : null,
          history: series,
        };
      });
    }
  }

  let mealsHoy: Array<{
    id: string;
    mealType: string;
    scheduledTime: string | null;
    name: string;
    calories: number | null;
    proteinG: string | null;
    carbsG: string | null;
    fatsG: string | null;
  }> = [];
  const [planActivo] = await db.select().from(mealPlans)
    .where(and(eq(mealPlans.clientId, clientId), eq(mealPlans.isActive, true)))
    .limit(1);
  if (planActivo) {
    mealsHoy = await db.select().from(meals)
      .where(and(eq(meals.mealPlanId, planActivo.id), eq(meals.dayOfWeek, todayKey)))
      .orderBy(meals.scheduledTime);
  }

  const todayLabel = todayLabelLima();

  return (
    <SessionMode
      clientId={clientId}
      todayLabel={todayLabel}
      isRestDay={!rutina || ejercicios.length === 0}
      diaRutinaName={diaRutina?.name ?? null}
      ejercicios={ejercicios}
      meals={mealsHoy}
    />
  );
}