import Link from 'next/link';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ArrowLeft, Receipt, Smartphone, Sparkles } from 'lucide-react';
import crypto from 'node:crypto';

async function crearPago(formData: FormData) {
  'use server';
  const trainer = await requireTrainer();
  const clientId = formData.get('clientId') as string;
  const amount = formData.get('amount') as string;
  const month = formData.get('month') as string;

  if (!clientId || !amount || !month) throw new Error('Datos incompletos');

  const [cliente] = await db.select().from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainer.id)))
    .limit(1);
  if (!cliente) throw new Error('Cliente no encontrado');

  const initials = cliente.fullName.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 3);
  const refCode = `${initials}-${month.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;

  await db.insert(payments).values({
    id: crypto.randomUUID(),
    clientId,
    trainerId: trainer.id,
    amountPen: amount,
    method: 'yape',
    referenceCode: refCode,
    periodMonth: month,
    dueDate: `${month}-${String(cliente.paymentDueDay ?? 1).padStart(2, '0')}`,
    status: 'pending',
  } as any);

  redirect('/trainer/pagos');
}

export default async function NuevoPagoPage() {
  const trainer = await requireTrainer();
  const trainerClients = await db.select().from(clients).where(eq(clients.trainerId, trainer.id));
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      <Link
        href="/trainer/pagos"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Cancelar
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Nuevo cobro</h1>
        </div>
        <p className="text-sm text-ink-500">Genera un código para que el cliente pague por Yape/Plin</p>
      </header>

      {trainerClients.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-ink-500">Necesitas tener al menos un cliente</p>
        </div>
      ) : (
        <form action={crearPago} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Cliente *</label>
            <select name="clientId" required className="input">
              <option value="">— Selecciona —</option>
              {trainerClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} (S/ {Number(c.monthlyFeePen).toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Monto (S/) *</label>
              <input name="amount" type="number" step="0.01" required className="input" placeholder="250" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Mes *</label>
              <input
                name="month"
                type="month"
                required
                className="input"
                defaultValue={defaultMonth}
              />
            </div>
          </div>

          <div className="card bg-amber-50 border-amber-200 text-sm">
            <p className="font-semibold mb-2 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-700" /> ¿Cómo funciona?
            </p>
            <ol className="space-y-1 text-xs text-amber-900 list-decimal list-inside">
              <li>Se genera un código único para este pago</li>
              <li>Tu cliente paga por Yape/Plin y sube el comprobante en su app</li>
              <li>Tú validas con 1 tap aquí</li>
            </ol>
          </div>

          <button type="submit" className="btn-primary w-full">
            Crear cobro
          </button>
        </form>
      )}
    </div>
  );
}