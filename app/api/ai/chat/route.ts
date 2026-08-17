import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { chatWithClaude } from '@/lib/ai/claude';
import type { ClientContext } from '@/lib/ai/prompts';
import { db } from '@/lib/db';
import { aiChatSessions, aiChatMessages, clients, progressEntries } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'node:crypto';

const Body = z.object({
  message: z.string().min(1).max(4000),
  clientId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  mode: z.enum(['routine', 'meal_plan', 'auto']).optional(),
});

async function loadClientContext(
  clientId: string,
  trainerId: string,
): Promise<ClientContext | null> {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
    .limit(1);
  if (!row) return null;

  // Última medición corporal (si existe)
  const [latestProgress] = await db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.clientId, clientId))
    .orderBy(desc(progressEntries.recordedAt), desc(progressEntries.createdAt))
    .limit(1);

  return {
    fullName: row.fullName,
    goal: row.goal,
    experienceLevel: row.experienceLevel,
    gender: row.gender,
    heightCm: row.heightCm,
    birthDate: row.birthDate,
    notes: row.notes,
    latestMeasurements: latestProgress
      ? {
          recordedAt: latestProgress.recordedAt,
          weightKg: latestProgress.weightKg ? Number(latestProgress.weightKg) : null,
          bodyFatPct: latestProgress.bodyFatPct ? Number(latestProgress.bodyFatPct) : null,
          waistCm: latestProgress.waistCm ? Number(latestProgress.waistCm) : null,
          neckCm: latestProgress.neckCm ? Number(latestProgress.neckCm) : null,
          hipsCm: latestProgress.hipsCm ? Number(latestProgress.hipsCm) : null,
        }
      : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    let sessionId = body.sessionId;
    if (!sessionId) {
      sessionId = `s_${crypto.randomUUID()}`;
      await db.insert(aiChatSessions).values({
        id: sessionId,
        trainerId: trainer.id,
        targetClientId: body.clientId ?? null,
      });
    }

    await db.insert(aiChatMessages).values({
      id: `m_${crypto.randomUUID()}`,
      sessionId,
      role: 'user',
      content: body.message,
    });

    const historyRows = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId));

    const history = historyRows
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      .slice(0, -1);

    // Si hay cliente seleccionado, traer su info para inyectarla en el prompt.
    let clientContext: Awaited<ReturnType<typeof loadClientContext>> = null;
    if (body.clientId) {
      clientContext = await loadClientContext(body.clientId, trainer.id);
    }

    const response = await chatWithClaude({
      history,
      userMessage: body.message,
      mode: body.mode,
      clientContext,
    });

    const assistantContent = response.textReply || (response.toolUse ? 'Generé un plan. Revísalo abajo 👇' : '...');
    await db.insert(aiChatMessages).values({
      id: `m_${crypto.randomUUID()}`,
      sessionId,
      role: 'assistant',
      content: assistantContent,
      structuredPayload: response.toolUse ? JSON.stringify(response.toolUse.input) : null,
    });

    return NextResponse.json({
      sessionId,
      reply: assistantContent,
      tool: response.toolUse
        ? { name: response.toolUse.name, input: response.toolUse.input }
        : null,
    });
  } catch (err: any) {
    console.error('AI chat error:', err);
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message ?? 'Error al llamar a Claude' },
      { status: 500 },
    );
  }
}