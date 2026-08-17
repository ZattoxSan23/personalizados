import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, routines, routineDays } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'node:crypto';

const Body = z.object({
  title: z.string().min(1).max(120),
  weeksDuration: z.number().int().min(1).max(52).default(4),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    // Validar propiedad
    const [cliente] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, params.id), eq(clients.trainerId, trainer.id)))
      .limit(1);
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Desactivar rutinas anteriores
    await db.update(routines)
      .set({ isActive: false })
      .where(eq(routines.clientId, cliente.id));

    // Crear rutina
    const routineId = `rt_${crypto.randomUUID()}`;
    await db.insert(routines).values({
      id: routineId,
      clientId: cliente.id,
      trainerId: trainer.id,
      title: body.title,
      weeksDuration: body.weeksDuration,
      isActive: true,
    } as any);

    // Crear los 7 días vacíos
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < DAYS.length; i++) {
      await db.insert(routineDays).values({
        id: `rd_${crypto.randomUUID()}`,
        routineId,
        dayOfWeek: DAYS[i],
        name: null,
        orderIndex: i,
      } as any);
    }

    revalidateTag('clientes');
    return NextResponse.json({ ok: true, routineId });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}