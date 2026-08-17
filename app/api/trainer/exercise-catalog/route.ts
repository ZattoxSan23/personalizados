import { NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { exercises } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    await requireTrainer();
    const rows = await db
      .select({
        id: exercises.id,
        nameEs: exercises.nameEs,
        muscleGroup: exercises.muscleGroup,
      })
      .from(exercises)
      .orderBy(asc(exercises.muscleGroup), asc(exercises.nameEs));
    return NextResponse.json({ exercises: rows });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}