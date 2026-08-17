import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { routineExercises, routineDays, routines } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const Body = z.object({
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.string().min(1).max(40).optional(),
  weightKg: z.number().nullable().optional(),
  restSeconds: z.number().int().min(10).max(600).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    // Validar propiedad: el ejercicio pertenece a una rutina del trainer
    const [ownership] = await db
      .select({ id: routineExercises.id })
      .from(routineExercises)
      .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
      .innerJoin(routines, eq(routines.id, routineDays.routineId))
      .where(and(
        eq(routineExercises.id, params.id),
        eq(routines.trainerId, trainer.id),
      ))
      .limit(1);
    if (!ownership) {
      return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.sets !== undefined) updates.sets = body.sets;
    if (body.reps !== undefined) updates.reps = body.reps;
    if (body.weightKg !== undefined) updates.weightKg = body.weightKg != null ? String(body.weightKg) : null;
    if (body.restSeconds !== undefined) updates.restSeconds = body.restSeconds;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, message: 'Sin cambios' });
    }

    await db.update(routineExercises).set(updates).where(eq(routineExercises.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}