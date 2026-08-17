import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Body = z.object({
  fullName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).nullable().optional(),
  newPassword: z.string().min(6).max(100).optional(),
  currentPassword: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = Body.parse(await req.json());

    const wantsSensitive = !!(body.newPassword || body.email);

    // Si va a cambiar email o password, pedir contraseña actual
    if (wantsSensitive) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: 'Contraseña actual requerida' },
          { status: 400 },
        );
      }
      const ok = verifyPassword(body.currentPassword, trainer.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
      }
    }

    const updates: Record<string, unknown> = {};

    if (body.fullName !== undefined && body.fullName !== trainer.fullName) {
      updates.fullName = body.fullName;
    }

    if (body.email !== undefined && body.email !== trainer.email) {
      const newEmail = body.email.toLowerCase();
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, newEmail))
        .limit(1);
      if (existing && existing.id !== trainer.id) {
        return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 });
      }
      updates.email = newEmail;
    }

    if (body.phone !== undefined && body.phone !== (trainer.phone ?? '')) {
      updates.phone = body.phone || null;
    }

    if (body.newPassword) {
      updates.passwordHash = hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, message: 'Sin cambios' });
    }

    await db.update(users).set(updates).where(eq(users.id, trainer.id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 500 });
  }
}