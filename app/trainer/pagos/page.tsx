import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, clients } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import PagoActions from './PagoActions';

export const revalidate = 30;

const getPagos = unstable_cache(
  async (trainerId: string) => {
    // Queries en paralelo (antes secuenciales)
    const [pending, validated] = await Promise.all([
      db.select({ payment: payments, client: clients })
        .from(payments)
        .innerJoin(clients, eq(payments.clientId, clients.id))
        .where(and(eq(payments.trainerId, trainerId), eq(payments.status, 'pending')))
        .orderBy(desc(payments.createdAt)),
      db.select({ payment: payments, client: clients })
        .from(payments)
        .innerJoin(clients, eq(payments.clientId, clients.id))
        .where(and(eq(payments.trainerId, trainerId), eq(payments.status, 'validated')))
        .orderBy(desc(payments.createdAt))
        .limit(10),
    ]);
    return { pending, validated };
  },
  ['trainer-pagos-v1'],
  { revalidate: 30, tags: ['trainer-pagos'] },
);

export default async function TrainerPagosPage() {
  const trainer = await requireTrainer();
  const { pending, validated } = await getPagos(trainer.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Pagos</h1>
        <p className="text-ink-600 text-sm">Valida los comprobantes de Yape/Plin</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">
            Pendientes de validar ({pending.length})
          </h2>
          <Link href="/trainer/pagos/nuevo" className="text-sm text-primary-700">
            + Crear cobro
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className="card text-center text-ink-500 py-8 text-sm">
            No hay pagos pendientes 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(({ payment, client }) => (
              <div key={payment.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{client.fullName}</p>
                    <p className="text-xs text-ink-500">
                      {payment.periodMonth} · código {payment.referenceCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">S/ {Number(payment.amountPen).toFixed(2)}</p>
                    <p className="text-xs text-ink-500 uppercase">{payment.method}</p>
                  </div>
                </div>
                <PagoActions paymentId={payment.id} clientName={client.fullName} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide mb-3">
          Recientes validados
        </h2>
        {validated.length === 0 ? (
          <div className="card text-center text-ink-400 py-6 text-sm">
            Aún sin pagos validados
          </div>
        ) : (
          <div className="space-y-2">
            {validated.map(({ payment, client }) => (
              <div key={payment.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{client.fullName}</p>
                  <p className="text-xs text-ink-500">
                    {payment.periodMonth} · {payment.referenceCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">S/ {Number(payment.amountPen).toFixed(2)}</p>
                  <span className="badge-green text-[10px]">validado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}