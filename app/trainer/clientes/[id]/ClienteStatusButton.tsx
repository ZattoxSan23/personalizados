'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PowerOff, Power, Loader2 } from 'lucide-react';
import { toast } from '@/app/components/Toast';

export default function ClienteStatusButton({
  clienteId,
  clienteName,
  active,
}: {
  clienteId: string;
  clienteName: string;
  active: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticActive, setOptimisticActive] = useState(active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Sincronizar el estado optimista cuando cambia el prop del servidor
  if (optimisticActive !== active && !loading) {
    setOptimisticActive(active);
  }

  async function toggle() {
    const nextActive = !optimisticActive;
    setLoading(true);
    setError(null);
    // OPTIMISTIC: cambiar UI inmediatamente
    setOptimisticActive(nextActive);
    setConfirming(false);

    try {
      const res = await fetch(`/api/trainer/cliente/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');

      // Re-sync silencioso con el servidor (en transición para no bloquear UI)
      startTransition(() => {
        router.refresh();
      });

      // Toast un poco después para que se vea el cambio de UI primero
      setTimeout(() => {
        toast(
          'success',
          nextActive
            ? `${clienteName} rehabilitado`
            : `${clienteName} inhabilitado`,
        );
      }, 100);
    } catch (e: any) {
      // Revertir el cambio optimista si falla
      setOptimisticActive(!nextActive);
      setError(e.message);
      toast('error', e.message);
    } finally {
      setLoading(false);
    }
  }

  // Usar el estado optimista en lugar del prop del servidor
  const isActive = optimisticActive;

  if (isActive) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn-ghost text-xs text-red-600 hover:bg-red-50 transition-all"
          title="Inhabilitar cliente"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PowerOff className="w-3.5 h-3.5" />
          )}
          Inhabilitar
        </button>

        {confirming && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setConfirming(false)}
          >
            <div
              className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                  <PowerOff className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-ink-900">¿Inhabilitar a {clienteName}?</h3>
                  <p className="text-sm text-ink-500 mt-1">
                    El cliente no podrá iniciar sesión en el portal y dejará de ver su rutina, plan y progreso.
                    Puedes rehabilitarlo cuando quieras.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700 mb-3">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={loading}
                  className="btn flex-1 bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Inhabilitar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Inactivo → botón para rehabilitar
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="btn-ghost text-xs text-primary-600 hover:bg-primary-50 transition-all"
      title="Rehabilitar cliente"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          <Power className="w-3.5 h-3.5" />
          Rehabilitar
        </>
      )}
    </button>
  );
}