import { NextRequest, NextResponse } from 'next/server';
import { loginTrainer, createSession } from '@/lib/auth';
import { z } from 'zod';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = Body.parse(await req.json());
    const user = await loginTrainer(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }
    await createSession({ userId: user.id, role: 'trainer' });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error' }, { status: 400 });
  }
}