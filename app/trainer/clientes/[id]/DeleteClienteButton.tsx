'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/app/components/Toast';

export default function DeleteClienteButton({
  clienteId,
  clienteName,
}: {
  clienteId: string;
  clienteName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toLowerCase() === 'eliminar';

  function closeModal() {
    if (deleting) return;
    setConfirming(false);
    setConfirmText('');
    setError(null);
  }

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/cliente/${clienteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar');
      toast('success', `${clienteName} eliminado`);
      setConfirming(false);
      // El endpoint ya invalidó los cache tags y revalidatePath('/trainer/clientes').
      // router.push navega a la lista; el setTimeout(0) difiere el refresh al
      // siguiente tick para que aplique sobre la lista ya renderizada y no sobre
      // la página de detalle (que está desmontándose).
      router.push('/trainer/clientes');
      setTimeout(() => router.refresh(), 0);
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn-ghost text-xs text-red-600 hover:bg-red-50"
        title="Eliminar cliente permanentemente"
      >
        <Trash2 className="w-3.5 h-3.5" /> Eliminar
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-cliente-title"
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal();
              if (e.key === 'Enter' && canDelete && !deleting) handleDelete();
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 id="delete-cliente-title" className="font-bold text-ink-900">
                  ¿Eliminar a {clienteName}?
                </h3>
                <p className="text-sm text-ink-500 mt-1">
                  <strong className="text-red-600">Esta acción es permanente.</strong> Se borrarán:
                  rutina, plan nutricional, progreso, check-ins, logs de ejercicios y cuenta del cliente.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink-700" htmlFor="delete-confirm">
                Para confirmar, escribe <code className="bg-ink-100 px-1.5 py-0.5 rounded font-bold text-red-600">eliminar</code>
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="eliminar"
                className="input"
                disabled={deleting}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700 mt-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-ink-100 mt-4">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="btn flex-1 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
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