import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const PatchBody = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(6).max(100).optional(),
  // Requerido siempre que se cambie email o password
  currentPassword: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const body = PatchBody.parse(await req.json());

    const wantsSensitive = !!(body.email || body.newPassword);
    if (wantsSensitive && !body.currentPassword) {
      return NextResponse.json(
        { error: 'Contraseña actual requerida para cambiar email o contraseña' },
        { status: 400 },
      );
    }

    // Verificar contraseña actual si hay cambios sensibles
    if (wantsSensitive) {
      const ok = verifyPassword(body.currentPassword ?? '', trainer.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
      }
    }

    const updates: Partial<{
      email: string;
      passwordHash: string;
      fullName: string;
      phone: string | null;
    }> = {};

    if (body.email && body.email !== trainer.email) {
      // Verificar que el email no esté en uso por otro usuario
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .limit(1);
      if (existing && existing.id !== trainer.id) {
        return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 });
      }
      updates.email = body.email.toLowerCase();
    }

    if (body.newPassword) {
      updates.passwordHash = hashPassword(body.newPassword);
    }

    if (body.fullName && body.fullName !== trainer.fullName) {
      updates.fullName = body.fullName;
    }

    if (body.phone !== undefined && body.phone !== trainer.phone) {
      updates.phone = body.phone || null;
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