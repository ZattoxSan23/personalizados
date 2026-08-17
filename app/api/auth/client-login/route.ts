import { NextRequest, NextResponse } from 'next/server';
import { loginClientWithInviteCode, createSession } from '@/lib/auth';
import { z } from 'zod';

const Body = z.object({ code: z.string().min(3).max(20) });

export async function POST(req: NextRequest) {
  try {
    const { code } = Body.parse(await req.json());
    const result = await loginClientWithInviteCode(code);
    if (!result) {
      return NextResponse.json({ error: 'Código inválido o cliente inactivo' }, { status: 401 });
    }
    await createSession({
      userId: result.user.id,
      role: 'client',
      clientId: result.clientId,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 400 });
  }
}