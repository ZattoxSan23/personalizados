import Link from 'next/link';
import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function SubirComprobantePage({ params }: { params: { id: string } }) {
  const { clientId } = await requireClient();
  const [pago] = await db.select().from(payments)
    .where(and(eq(payments.id, params.id), eq(payments.clientId, clientId)))
    .limit(1);

  if (!pago) notFound();

  return (
    <div className="space-y-4">
      <Link href="/portal/pagos" className="text-sm text-ink-500 inline-block">
        ← Pagos
      </Link>

      <div>
        <h1 className="text-2xl font-bold mb-1">Subir comprobante</h1>
        <p className="text-sm text-ink-600">
          Pago de {pago.periodMonth} · S/ {Number(pago.amountPen).toFixed(2)}
        </p>
      </div>

      <div className="card border-amber-200 bg-amber-50 text-sm space-y-2">
        <p className="font-semibold text-amber-900">📱 Pasos para pagar:</p>
        <ol className="text-xs text-amber-900 space-y-1 list-decimal list-inside">
          <li>Abre Yape o Plin</li>
          <li>Transfiere S/ {Number(pago.amountPen).toFixed(2)}</li>
          <li>Toma captura del comprobante</li>
          <li>Sube la imagen aquí abajo</li>
          <li>Espera a que tu coach valide</li>
        </ol>
        <p className="text-xs text-amber-800 mt-2">
          🔑 Código de referencia: <span className="font-mono font-bold">{pago.referenceCode}</span>
        </p>
      </div>

      <div className="card">
        <p className="text-sm text-ink-600 text-center">
          💡 Para esta versión inicial, el comprobante se gestiona enviándolo por WhatsApp a tu coach.
          En una próxima versión podrás subir la foto directamente.
        </p>
        <a
          href={`https://wa.me/?text=Hola%20coach!%20Acabo%20de%20pagar%20S/%20${Number(pago.amountPen).toFixed(2)}%20(${pago.referenceCode})%20del%20mes%20${pago.periodMonth}.%20Te%20adjunto%20mi%20comprobante`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full mt-3"
        >
          💬 Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}