import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { meals, mealPlans } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'node:crypto';

const Body = z.object({
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  mealType: z.enum(['desayuno', 'almuerzo', 'cena', 'snack1', 'snack2']).default('snack1'),
  scheduledTime: z.string().max(10).nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  calories: z.number().int().min(0).max(5000).nullable().optional(),
  proteinG: z.number().nullable().optional(),
  carbsG: z.number().nullable().optional(),
  fatsG: z.number().nullable().optional(),
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

    // Validar propiedad del plan
    const [plan] = await db
      .select({ id: mealPlans.id })
      .from(mealPlans)
      .where(and(eq(mealPlans.id, params.id), eq(mealPlans.trainerId, trainer.id)))
      .limit(1);
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Encontrar el siguiente orderIndex para ese día
    const existing = await db
      .select({ orderIndex: meals.orderIndex })
      .from(meals)
      .where(and(eq(meals.mealPlanId, params.id), eq(meals.dayOfWeek, body.dayOfWeek)))
      .orderBy(asc(meals.orderIndex));
    const nextOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.orderIndex)) + 1 : 0;

    const id = `ml_${crypto.randomUUID()}`;
    await db.insert(meals).values({
      id,
      mealPlanId: params.id,
      dayOfWeek: body.dayOfWeek,
      mealType: body.mealType,
      scheduledTime: body.scheduledTime ?? null,
      orderIndex: nextOrder,
      name: body.name,
      description: body.description ?? null,
      calories: body.calories ?? null,
      proteinG: toStr(body.proteinG),
      carbsG: toStr(body.carbsG),
      fatsG: toStr(body.fatsG),
    } as any);

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}