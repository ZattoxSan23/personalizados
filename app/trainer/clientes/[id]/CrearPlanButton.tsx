'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from '@/app/components/Toast';

export default function CrearPlanButton({
  clienteId,
  hasActivePlan,
}: {
  clienteId: string;
  hasActivePlan: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para 'lazy days' (con IA) usamos search params del IA
  const [title, setTitle] = useState('Plan personalizado');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  function reset() {
    setTitle('Plan personalizado');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setError(null);
  }

  function openWith(mode: 'manual' | 'ai') {
    if (mode === 'ai') {
      router.push(`/trainer/ia?cliente=${clienteId}&modo=meal`);
      return;
    }
    setOpen(true);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/cliente/${clienteId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Plan personalizado',
          dailyCalories: calories ? Number(calories) : null,
          dailyProteinG: protein ? Number(protein) : null,
          dailyCarbsG: carbs ? Number(carbs) : null,
          dailyFatsG: fats ? Number(fats) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast('success', 'Plan creado. Agrega las comidas.');
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Botón principal: dropdown "Crear plan" con IA o manual */}
      <div className="relative group">
        <button
          type="button"
          className="btn-primary text-sm w-full"
        >
          <Plus className="w-4 h-4" /> Crear plan
        </button>
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-lg shadow-popover opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
          <button
            type="button"
            onClick={() => openWith('ai')}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ink-50 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary-600" />
            <div className="flex-1">
              <p className="font-semibold text-ink-900">Con IA</p>
              <p className="text-[10px] text-ink-500">Más rápido, lleno de rotación</p>
            </div>
            <ArrowRight className="w-3 h-3 text-ink-400" />
          </button>
          <div className="border-t border-ink-100" />
          <button
            type="button"
            onClick={() => openWith('manual')}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ink-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-ink-600" />
            <div className="flex-1">
              <p className="font-semibold text-ink-900">Manual</p>
              <p className="text-[10px] text-ink-500">Control total de macros y comidas</p>
            </div>
            <ArrowRight className="w-3 h-3 text-ink-400" />
          </button>
        </div>
      </div>

      {/* Modal manual */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">
                  Plan manual
                </p>
                <h3 className="font-bold text-lg">Crear plan nutricional</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {hasActivePlan && (
              <div className="rounded-lg bg-accent-50 border border-accent-200 p-2 text-xs text-accent-800 mb-3">
                ⚠️ Este cliente ya tiene un plan activo. Al crear este, el anterior se desactivará.
              </div>
            )}

            <form onSubmit={submit} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Título</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej: Plan Hipertrofia 3000 kcal"
                  required
                  maxLength={120}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Calorías / día</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="2500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Proteína (g)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Carbos (g)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="350"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Grasas (g)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    placeholder="70"
                  />
                </div>
              </div>

              <p className="text-[10px] text-ink-500 -mt-1">
                💡 Los macros son opcionales. Podrás editarlos después de agregar las comidas.
              </p>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Crear plan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}