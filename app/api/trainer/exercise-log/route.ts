import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  exerciseLogs, routineExercises, routineDays, routines, type ExerciseSetEntry,
} from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { deriveAnalysis, type RawLog } from '@/lib/exerciseAnalysis';

const SetSchema = z.object({
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(100),
  /** Duración en segundos (solo presente si el ejercicio es por tiempo). */
  durationSeconds: z.number().int().min(0).max(3600).optional(),
  completed: z.boolean(),
});

const Body = z.object({
  routineExerciseId: z.string().min(1),
  /** Tipo de tracking del ejercicio ('reps' o 'time'). Se persiste en el log. */
  trackingType: z.enum(['reps', 'time']).optional(),
  sets: z.array(SetSchema).min(1).max(20),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  performedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    const [ownership] = await db
      .select({
        reId: routineExercises.id,
        clientId: routines.clientId,
      })
      .from(routineExercises)
      .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
      .innerJoin(routines, eq(routines.id, routineDays.routineId))
      .where(and(
        eq(routineExercises.id, body.routineExerciseId),
        eq(routines.trainerId, trainer.id),
      ))
      .limit(1);

    if (!ownership) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    const completed = body.sets.filter((s) => s.completed);
    const topSet = body.sets.reduce<{ w: number; r: number; d?: number } | null>(
      (best, s) => {
        if (!s.completed) return best;
        const w = s.weight;
        if (!best || w > best.w) return { w, r: s.reps, d: s.durationSeconds };
        return best;
      },
      null,
    );

    const sets = body.sets.map<ExerciseSetEntry>((s) => {
      const entry: ExerciseSetEntry = {
        weight: s.weight,
        reps: s.reps,
        completed: s.completed,
      };
      if (s.durationSeconds != null) entry.durationSeconds = s.durationSeconds;
      return entry;
    });

    const logId = `el_${crypto.randomUUID()}`;
    await db.insert(exerciseLogs).values({
      id: logId,
      clientId: ownership.clientId,
      routineExerciseId: body.routineExerciseId,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
      trackingType: body.trackingType ?? null,
      topSetWeightKg: topSet ? String(topSet.w) : null,
      topSetReps: body.trackingType === 'time' ? null : (topSet?.r ?? 0),
      topSetDurationSeconds: body.trackingType === 'time' && topSet ? (topSet.d ?? 0) : null,
      setsCompleted: completed.length,
      rpe: body.rpe ?? null,
      notes: body.notes ?? null,
      sets,
    });

    revalidateTag('clientes');
    revalidateTag(`client-progress:${ownership.clientId}`);

    return NextResponse.json({
      ok: true,
      logId,
      summary: {
        setsCompleted: completed.length,
        totalSets: body.sets.length,
        topSet: topSet ? { weight: topSet.w, reps: topSet.r, durationSeconds: topSet.d } : null,
        volume: completed.reduce((sum, s) => sum + s.weight * s.reps, 0),
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const routineExerciseId = req.nextUrl.searchParams.get('routineExerciseId');

    if (!routineExerciseId) {
      return NextResponse.json({ error: 'routineExerciseId requerido' }, { status: 400 });
    }

    const [ownership] = await db
      .select({
        reId: routineExercises.id,
        clientId: routines.clientId,
      })
      .from(routineExercises)
      .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
      .innerJoin(routines, eq(routines.id, routineDays.routineId))
      .where(and(
        eq(routineExercises.id, routineExerciseId),
        eq(routines.trainerId, trainer.id),
      ))
      .limit(1);

    if (!ownership) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.routineExerciseId, routineExerciseId))
      .orderBy(desc(exerciseLogs.performedAt))
      .limit(50);

    const rawLogs: RawLog[] = rows.map((r) => ({
      id: r.id,
      performedAt: r.performedAt,
      topSetWeightKg: r.topSetWeightKg,
      topSetReps: r.topSetReps,
      setsCompleted: r.setsCompleted,
      rpe: r.rpe,
      notes: r.notes,
      sets: r.sets,
    }));

    return NextResponse.json({
      ...deriveAnalysis(rawLogs),
      clientId: ownership.clientId,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
