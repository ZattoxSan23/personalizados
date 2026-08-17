import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, progressEntries } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { localDateString } from '@/lib/date';
import { z } from 'zod';
import crypto from 'node:crypto';

const InitialMeasurements = z.object({
  weightKg: z.number().nullable().optional(),
  neckCm: z.number().nullable().optional(),
  waistCm: z.number().nullable().optional(),
  hipsCm: z.number().nullable().optional(),
  bodyFatPct: z.number().nullable().optional(),
}).optional();

const Body = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  goal: z.enum(['hypertrophy', 'strength', 'fat_loss', 'maintenance', 'recomp']).nullable().optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  heightCm: z.number().nullable().optional(),
  monthlyFeePen: z.number().min(0).default(0),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().nullable().optional(),
  initialMeasurements: InitialMeasurements,
});

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    // Generar invite_code único
    const initials = body.fullName
      .split(' ')
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 3);
    let inviteCode = '';
    for (let i = 0; i < 10; i++) {
      const candidate = `${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [exists] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.inviteCode, candidate))
        .limit(1);
      if (!exists) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      return NextResponse.json({ error: 'No se pudo generar código' }, { status: 500 });
    }

    const id = `cl_${crypto.randomUUID()}`;
    await db.insert(clients).values({
      id,
      trainerId: trainer.id,
      inviteCode,
      fullName: body.fullName,
      email: body.email ?? null,
      birthDate: body.birthDate ?? null,
      gender: body.gender ?? null,
      heightCm: body.heightCm != null ? String(body.heightCm) : null,
      goal: body.goal ?? null,
      experienceLevel: body.experienceLevel ?? null,
      monthlyFeePen: String(body.monthlyFeePen),
      paymentDueDay: body.paymentDueDay ?? 1,
      active: true,
      notes: body.notes ?? null,
    } as any);

    // Crear progress entry inicial si hay medidas
    const im = body.initialMeasurements;
    if (im && (im.weightKg != null || im.neckCm != null || im.waistCm != null || im.hipsCm != null || im.bodyFatPct != null)) {
      await db.insert(progressEntries).values({
        id: `pe_${crypto.randomUUID()}`,
        clientId: id,
        recordedAt: localDateString(),
        weightKg: im.weightKg != null ? String(im.weightKg) : null,
        bodyFatPct: im.bodyFatPct != null ? String(im.bodyFatPct) : null,
        neckCm: im.neckCm != null ? String(im.neckCm) : null,
        waistCm: im.waistCm != null ? String(im.waistCm) : null,
        hipsCm: im.hipsCm != null ? String(im.hipsCm) : null,
        notes: 'Registro inicial',
      } as any);
    }

    return NextResponse.json({ ok: true, id, inviteCode });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}