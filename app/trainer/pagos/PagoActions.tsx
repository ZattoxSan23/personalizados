'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PagoActions({ paymentId, clientName }: { paymentId: string; clientName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function validate(action: 'validated' | 'rejected') {
    if (action === 'rejected' && !confirm(`¿Rechazar el pago de ${clientName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/trainer/pagos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });
      if (!res.ok) throw new Error('Error');
      router.refresh();
    } catch (e) {
      alert('Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 pt-2 border-t border-ink-100">
      <button
        onClick={() => validate('validated')}
        disabled={loading}
        className="btn-primary flex-1 text-sm"
      >
        ✓ Validar
      </button>
      <button
        onClick={() => validate('rejected')}
        disabled={loading}
        className="btn-secondary text-sm"
      >
        Rechazar
      </button>
    </div>
  );
}