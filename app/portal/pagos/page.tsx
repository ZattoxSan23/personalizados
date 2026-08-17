import Link from 'next/link';
import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, clients, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { CreditCard, Smartphone, Wallet, Camera, CheckCircle2 } from 'lucide-react';

export default async function PagosPage() {
  const { clientId } = await requireClient();

  const [cliente] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const [trainer] = cliente
    ? await db.select().from(users).where(eq(users.id, cliente.trainerId)).limit(1)
    : [null];

  const misPagos = await db.select().from(payments)
    .where(eq(payments.clientId, clientId))
    .orderBy(desc(payments.createdAt));

  const pendiente = misPagos.find((p) => p.status === 'pending');

  return (
    <div className="space-y-5 pb-32">
      <header className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
          <CreditCard className="w-5 h-5" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Mis pagos</h1>
      </header>

      {trainer && (
        <section className="card bg-ink-50 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-ink-500" /> Datos para pagar a tu coach
          </p>
          {trainer.yapeNumber && (
            <div className="flex justify-between">
              <span className="text-ink-600 inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Yape:
              </span>
              <span className="font-mono font-semibold">{trainer.yapeNumber}</span>
            </div>
          )}
          {trainer.plinNumber && (
            <div className="flex justify-between">
              <span className="text-ink-600 inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Plin:
              </span>
              <span className="font-mono font-semibold">{trainer.plinNumber}</span>
            </div>
          )}
        </section>
      )}

      {pendiente && (
        <section className="card border-amber-300 bg-gradient-to-br from-amber-50 to-accent-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="badge-yellow inline-block mb-2">Pendiente</span>
              <p className="text-sm text-amber-900 font-medium">
                Período: {pendiente.periodMonth}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Código:{' '}
                <code className="font-mono font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                  {pendiente.referenceCode}
                </code>
              </p>
            </div>
            <p className="text-2xl font-extrabold text-amber-900 tabular-nums whitespace-nowrap">
              S/ {Number(pendiente.amountPen).toFixed(2)}
            </p>
          </div>
          <Link
            href={`/portal/pagos/${pendiente.id}/comprobante`}
            className="btn-primary w-full mt-3 text-sm"
          >
            <Camera className="w-4 h-4" /> Subir comprobante de Yape
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Historial
        </p>
        {misPagos.length === 0 ? (
          <div className="empty-state">
            <span className="h-14 w-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-ink-400" />
            </span>
            <p className="text-sm font-medium text-ink-700">Sin pagos aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {misPagos.map((p) => (
              <article key={p.id} className="card flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink-900">{p.periodMonth}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {p.referenceCode} · {p.method.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm tabular-nums">S/ {Number(p.amountPen).toFixed(2)}</p>
                  <span
                    className={
                      p.status === 'validated'
                        ? 'badge-green inline-flex items-center gap-1'
                        : p.status === 'pending'
                        ? 'badge-yellow inline-flex items-center gap-1'
                        : 'badge-red inline-flex items-center gap-1'
                    }
                  >
                    {p.status === 'validated' && <CheckCircle2 className="w-3 h-3" />}
                    {p.status === 'validated' ? 'validado' : p.status === 'pending' ? 'pendiente' : 'rechazado'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}