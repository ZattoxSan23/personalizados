import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { requireTrainer, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, clients, progressEntries, aiChatSessions } from '@/lib/db/schema';
import { localDateString } from '@/lib/date';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const Measurements = z.object({
  weightKg: z.number().nullable().optional(),
  bodyFatPct: z.number().nullable().optional(),
  neckCm: z.number().nullable().optional(),
  shoulderCm: z.number().nullable().optional(),
  chestCm: z.number().nullable().optional(),
  waistCm: z.number().nullable().optional(),
  hipsCm: z.number().nullable().optional(),
  bicepFlexCm: z.number().nullable().optional(),
  bicepRelaxedCm: z.number().nullable().optional(),
  forearmCm: z.number().nullable().optional(),
  thighCm: z.number().nullable().optional(),
  calfCm: z.number().nullable().optional(),
  armCm: z.number().nullable().optional(),
}).optional();

const Body = z.object({
  fullName: z.string().min(1).max(120).optional(),
  email: z.string().email().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  heightCm: z.number().nullable().optional(),
  goal: z.enum(['hypertrophy', 'strength', 'fat_loss', 'maintenance', 'recomp']).nullable().optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  monthlyFeePen: z.number().nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  newPassword: z.string().min(4).max(20).optional(),
  // Si se envía, crea un progress_entry nuevo con estas medidas
  createProgressEntry: Measurements,
});

function toStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, params.id), eq(clients.trainerId, trainer.id)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) updates.fullName = body.fullName;
    if (body.email !== undefined) updates.email = body.email || null;
    if (body.birthDate !== undefined) updates.birthDate = body.birthDate;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.heightCm !== undefined) updates.heightCm = body.heightCm != null ? String(body.heightCm) : null;
    if (body.goal !== undefined) updates.goal = body.goal;
    if (body.experienceLevel !== undefined) updates.experienceLevel = body.experienceLevel;
    if (body.monthlyFeePen !== undefined) updates.monthlyFeePen = body.monthlyFeePen != null ? String(body.monthlyFeePen) : null;
    if (body.paymentDueDay !== undefined) updates.paymentDueDay = body.paymentDueDay;
    if (body.active !== undefined) updates.active = body.active;
    if (body.notes !== undefined) updates.notes = body.notes;

    let passwordUpdated = false;
    if (body.newPassword) {
      const newCode = body.newPassword.toUpperCase();
      updates.inviteCode = newCode;
      passwordUpdated = true;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(clients).set(updates).where(eq(clients.id, existing.id));
    }

    if (passwordUpdated) {
      const userEmail = (body.email ?? existing.email)?.toLowerCase()
        ?? `${body.newPassword!.toUpperCase().toLowerCase()}@cliente.local`;
      const passwordHash = hashPassword(body.newPassword!);

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (existingUser) {
        await db.update(users).set({ passwordHash }).where(eq(users.id, existingUser.id));
      } else {
        await db.insert(users).values({
          id: crypto.randomUUID(),
          email: userEmail,
          passwordHash,
          role: 'client',
          fullName: body.fullName ?? existing.fullName,
        });
      }
    }

    // Si se envió createProgressEntry, crear un nuevo registro de progreso
    let createdProgressId: string | null = null;
    if (body.createProgressEntry) {
      const m = body.createProgressEntry;
      const hasAny = Object.values(m).some((v) => v != null);
      if (hasAny) {
        const peId = `pe_${crypto.randomUUID()}`;
        await db.insert(progressEntries).values({
          id: peId,
          clientId: existing.id,
          recordedAt: localDateString(),
          weightKg: toStr(m.weightKg),
          bodyFatPct: toStr(m.bodyFatPct),
          neckCm: toStr(m.neckCm),
          shoulderCm: toStr(m.shoulderCm),
          chestCm: toStr(m.chestCm),
          waistCm: toStr(m.waistCm),
          hipsCm: toStr(m.hipsCm),
          bicepFlexCm: toStr(m.bicepFlexCm),
          bicepRelaxedCm: toStr(m.bicepRelaxedCm),
          forearmCm: toStr(m.forearmCm),
          thighCm: toStr(m.thighCm),
          calfCm: toStr(m.calfCm),
          armCm: toStr(m.armCm),
          notes: 'Actualizado desde perfil',
        } as any);
        createdProgressId = peId;
      }
    }

    // Invalidar cache para que la UI vea los cambios al instante
    revalidateTag('clientes');

    return NextResponse.json({ ok: true, createdProgressId });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const trainer = await requireTrainer();

    // Verificar propiedad
    const [existing] = await db
      .select({
        id: clients.id,
        fullName: clients.fullName,
        email: clients.email,
        inviteCode: clients.inviteCode,
      })
      .from(clients)
      .where(and(eq(clients.id, params.id), eq(clients.trainerId, trainer.id)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Borrar el user account del cliente (si existe).
    // Match por email + role='client' para nunca tocar cuentas de trainers u
    // otros clientes con nombres iguales. Si el cliente no tiene email, derivamos
    // el email a partir del inviteCode (mismo esquema que el PATCH al crear/resetear
    // la contraseña).
    const userEmail =
      existing.email?.toLowerCase() ??
      `${existing.inviteCode.toLowerCase()}@cliente.local`;

    await db
      .delete(users)
      .where(and(eq(users.email, userEmail), eq(users.role, 'client')));

    // Borrar sesiones de chat IA asociadas al cliente. El FK target_client_id
    // en ai_chat_sessions NO tiene onDelete cascade (oversight del schema),
    // así que hay que limpiarlas manualmente antes de borrar al cliente.
    // ai_chat_messages cascadea sobre ai_chat_sessions, así que los mensajes
    // van solos.
    await db
      .delete(aiChatSessions)
      .where(eq(aiChatSessions.targetClientId, params.id));

    // Borrar cliente (cascada a rutinas, plan, progreso, logs, checkins)
    await db.delete(clients).where(eq(clients.id, params.id));

    // Invalidar TODOS los caches que puedan tener al cliente.
    // La lista de clientes usa el tag 'clientes-list' (mismatch histórico
    // con 'clientes'), así que hay que invalidar ambos. revalidatePath cubre
    // cualquier cache que no esté taggeado.
    revalidateTag('clientes');
    revalidateTag('clientes-list');
    revalidateTag('trainer-dashboard');
    revalidatePath('/trainer/clientes');
    revalidatePath('/trainer');

    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}