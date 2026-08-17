import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { routineDays, routines } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const routineId = req.nextUrl.searchParams.get('routineId');
    if (!routineId) {
      return NextResponse.json({ error: 'routineId requerido' }, { status: 400 });
    }

    // Validar propiedad
    const [own] = await db
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.trainerId, trainer.id)))
      .limit(1);
    if (!own) {
      return NextResponse.json({ error: 'Rutina no encontrada' }, { status: 404 });
    }

    const days = await db
      .select({ id: routineDays.id, dayOfWeek: routineDays.dayOfWeek })
      .from(routineDays)
      .where(eq(routineDays.routineId, routineId));

    const dayMap: Record<string, string> = {};
    for (const d of days) {
      dayMap[d.dayOfWeek] = d.id;
    }

    return NextResponse.json({ days: dayMap });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}