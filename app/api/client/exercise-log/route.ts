import { NextRequest, NextResponse } from 'next/server';
import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import { exerciseLogs, routineExercises, routineDays, routines } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { deriveAnalysis, type RawLog } from '@/lib/exerciseAnalysis';

export async function GET(req: NextRequest) {
  try {
    const { clientId } = await requireClient();
    const routineExerciseId = req.nextUrl.searchParams.get('routineExerciseId');
    if (!routineExerciseId) {
      return NextResponse.json({ error: 'routineExerciseId requerido' }, { status: 400 });
    }

    const [ownership] = await db
      .select({ id: routineExercises.id })
      .from(routineExercises)
      .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
      .innerJoin(routines, eq(routines.id, routineDays.routineId))
      .where(and(
        eq(routineExercises.id, routineExerciseId),
        eq(routines.clientId, clientId),
      ))
      .limit(1);
    if (!ownership) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(exerciseLogs)
      .where(and(
        eq(exerciseLogs.clientId, clientId),
        eq(exerciseLogs.routineExerciseId, routineExerciseId),
      ))
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

    return NextResponse.json(deriveAnalysis(rawLogs));
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}
