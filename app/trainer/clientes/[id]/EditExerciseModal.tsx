'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';

type Exercise = {
  id: string;
  sets: number;
  reps: string;
  weightKg: string | null;
  restSeconds: number | null;
  notes: string | null;
  nameEs: string;
};

export default function EditExerciseModal({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState(exercise.sets);
  const [reps, setReps] = useState(exercise.reps);
  const [weight, setWeight] = useState(exercise.weightKg ?? '');
  const [rest, setRest] = useState(exercise.restSeconds?.toString() ?? '90');
  const [notes, setNotes] = useState(exercise.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSets(exercise.sets);
    setReps(exercise.reps);
    setWeight(exercise.weightKg ?? '');
    setRest(exercise.restSeconds?.toString() ?? '90');
    setNotes(exercise.notes ?? '');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const weightNum = weight === '' ? null : Number(weight);
      const res = await fetch(`/api/trainer/routine-exercise/${exercise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets,
          reps,
          weightKg: weightNum,
          restSeconds: Number(rest),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
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
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-md text-ink-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        aria-label="Editar ejercicio"
        title="Editar"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">Editar ejercicio</p>
                <h3 className="font-bold text-lg mt-0.5">{exercise.nameEs}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-700 text-2xl leading-none -mt-2 -mr-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Series</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    className="input"
                    value={sets}
                    onChange={(e) => setSets(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Repeticiones</label>
                  <input
                    type="text"
                    className="input"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="8-12"
                    maxLength={40}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    className="input"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="libre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Descanso (s)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={600}
                    className="input"
                    value={rest}
                    onChange={(e) => setRest(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Notas (opcional)</label>
                <textarea
                  className="input min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tempo, técnica, RIR..."
                  maxLength={500}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => { resetForm(); setOpen(false); }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}