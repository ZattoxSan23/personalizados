import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { routineExercises, routineDays, routines, exercises } from '@/lib/db/schema';
import { and, eq, asc, max } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'node:crypto';

const Body = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20).default(3),
  reps: z.string().min(1).max(40).default('8-12'),
  weightKg: z.number().nullable().optional(),
  restSeconds: z.number().int().min(10).max(600).default(90),
  notes: z.string().max(500).nullable().optional(),
});

function toStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    // Validar propiedad: el día pertenece a una rutina del trainer
    const [day] = await db
      .select({
        dayId: routineDays.id,
        routineId: routineDays.routineId,
      })
      .from(routineDays)
      .innerJoin(routines, eq(routines.id, routineDays.routineId))
      .where(and(eq(routineDays.id, params.id), eq(routines.trainerId, trainer.id)))
      .limit(1);
    if (!day) {
      return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
    }

    // Validar que el ejercicio existe
    const [ex] = await db
      .select({ id: exercises.id, nameEs: exercises.nameEs })
      .from(exercises)
      .where(eq(exercises.id, body.exerciseId))
      .limit(1);
    if (!ex) {
      return NextResponse.json({ error: 'Ejercicio no existe' }, { status: 400 });
    }

    // orderIndex = siguiente
    const [last] = await db
      .select({ maxOrder: max(routineExercises.orderIndex) })
      .from(routineExercises)
      .where(eq(routineExercises.routineDayId, params.id));
    const nextOrder = (last?.maxOrder ?? -1) + 1;

    const id = `re_${crypto.randomUUID()}`;
    await db.insert(routineExercises).values({
      id,
      routineDayId: params.id,
      exerciseId: body.exerciseId,
      orderIndex: nextOrder,
      sets: body.sets,
      reps: body.reps,
      weightKg: toStr(body.weightKg),
      restSeconds: body.restSeconds,
      notes: body.notes ?? null,
    } as any);

    revalidateTag('clientes');
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}