import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { saveRoutineFromAI, saveMealPlanFromAI } from '@/lib/utils';
import { z } from 'zod';

const Body = z.object({
  clientId: z.string(),
  toolName: z.enum(['create_routine', 'create_meal_plan']),
  payload: z.any(),
  aiPrompt: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    if (body.toolName === 'create_routine') {
      const id = await saveRoutineFromAI(body.payload, {
        clientId: body.clientId,
        trainerId: trainer.id,
        aiPrompt: body.aiPrompt,
      });
      return NextResponse.json({ ok: true, routineId: id });
    }

    if (body.toolName === 'create_meal_plan') {
      const id = await saveMealPlanFromAI(body.payload, {
        clientId: body.clientId,
        trainerId: trainer.id,
        aiPrompt: body.aiPrompt,
      });
      return NextResponse.json({ ok: true, mealPlanId: id });
    }

    return NextResponse.json({ error: 'Tool no soportada' }, { status: 400 });
  } catch (err: any) {
    console.error('AI publish error:', err);
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error al publicar' }, { status: 500 });
  }
}