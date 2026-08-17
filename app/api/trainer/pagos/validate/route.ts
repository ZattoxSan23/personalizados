import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const Body = z.object({
  paymentId: z.string(),
  action: z.enum(['validated', 'rejected']),
});

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const { paymentId, action } = Body.parse(await req.json());

    await db.update(payments)
      .set({
        status: action,
        validatedAt: new Date(),
        validatedBy: trainer.id,
      })
      .where(and(eq(payments.id, paymentId), eq(payments.trainerId, trainer.id)));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}