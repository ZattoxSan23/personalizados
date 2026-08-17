import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, mealPlans } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'node:crypto';

const Body = z.object({
  title: z.string().min(1).max(120),
  dailyCalories: z.number().int().min(0).max(10000).nullable().optional(),
  dailyProteinG: z.number().int().min(0).max(500).nullable().optional(),
  dailyCarbsG: z.number().int().min(0).max(1000).nullable().optional(),
  dailyFatsG: z.number().int().min(0).max(500).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    // Validar propiedad del cliente
    const [cliente] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, params.id), eq(clients.trainerId, trainer.id)))
      .limit(1);
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Desactivar planes anteriores
    await db.update(mealPlans)
      .set({ isActive: false })
      .where(eq(mealPlans.clientId, cliente.id));

    const id = `mp_${crypto.randomUUID()}`;
    await db.insert(mealPlans).values({
      id,
      clientId: cliente.id,
      trainerId: trainer.id,
      title: body.title,
      dailyCalories: body.dailyCalories ?? null,
      dailyProteinG: body.dailyProteinG ?? null,
      dailyCarbsG: body.dailyCarbsG ?? null,
      dailyFatsG: body.dailyFatsG ?? null,
      isActive: true,
    } as any);

    revalidateTag('clientes');
    revalidateTag('trainer-dashboard');

    return NextResponse.json({ ok: true, planId: id });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}