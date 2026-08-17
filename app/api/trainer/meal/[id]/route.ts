import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { meals, mealPlans } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const PatchBody = z.object({
  mealType: z.enum(['desayuno', 'almuerzo', 'cena', 'snack1', 'snack2']).optional(),
  scheduledTime: z.string().max(10).nullable().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  calories: z.number().int().min(0).max(5000).nullable().optional(),
  proteinG: z.number().nullable().optional(),
  carbsG: z.number().nullable().optional(),
  fatsG: z.number().nullable().optional(),
  orderIndex: z.number().int().min(0).max(20).optional(),
});

function toStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

async function verifyOwnership(mealId: string, trainerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: meals.id })
    .from(meals)
    .innerJoin(mealPlans, eq(mealPlans.id, meals.mealPlanId))
    .where(and(eq(meals.id, mealId), eq(mealPlans.trainerId, trainerId)))
    .limit(1);
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = PatchBody.parse(await req.json());

    if (!(await verifyOwnership(params.id, trainer.id))) {
      return NextResponse.json({ error: 'Comida no encontrada' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.mealType !== undefined) updates.mealType = body.mealType;
    if (body.scheduledTime !== undefined) updates.scheduledTime = body.scheduledTime;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.calories !== undefined) updates.calories = body.calories;
    if (body.proteinG !== undefined) updates.proteinG = toStr(body.proteinG);
    if (body.carbsG !== undefined) updates.carbsG = toStr(body.carbsG);
    if (body.fatsG !== undefined) updates.fatsG = toStr(body.fatsG);
    if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, message: 'Sin cambios' });
    }

    await db.update(meals).set(updates).where(eq(meals.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    if (!(await verifyOwnership(params.id, trainer.id))) {
      return NextResponse.json({ error: 'Comida no encontrada' }, { status: 404 });
    }
    await db.delete(meals).where(eq(meals.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}