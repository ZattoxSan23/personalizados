'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Sparkles, ArrowRight, Search, Trash2, X } from 'lucide-react';
import { toast } from '@/app/components/Toast';

type ExerciseCatalog = {
  id: string;
  nameEs: string;
  muscleGroup: string | null;
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function RutinaBuilder({
  clienteId,
  hasActiveRoutine,
  catalog,
}: {
  clienteId: string;
  hasActiveRoutine: boolean;
  catalog: ExerciseCatalog[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón principal: dropdown IA + Manual */}
      <div className="relative group">
        <button
          type="button"
          className="btn-primary text-sm w-full"
        >
          <Plus className="w-4 h-4" /> Crear rutina
        </button>
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-lg shadow-popover opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
          <button
            type="button"
            onClick={() => router.push(`/trainer/ia?cliente=${clienteId}&modo=routine`)}
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
            onClick={() => { setOpen(true); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ink-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-ink-600" />
            <div className="flex-1">
              <p className="font-semibold text-ink-900">Manual</p>
              <p className="text-[10px] text-ink-500">Control total de cada día</p>
            </div>
            <ArrowRight className="w-3 h-3 text-ink-400" />
          </button>
        </div>
      </div>

      {open && (
        <CreateRoutineModal
          clienteId={clienteId}
          catalog={catalog}
          hasActiveRoutine={hasActiveRoutine}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CreateRoutineModal({
  clienteId,
  catalog,
  hasActiveRoutine,
  onClose,
}: {
  clienteId: string;
  catalog: ExerciseCatalog[];
  hasActiveRoutine: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'create' | 'add-exercises'>('create');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [title, setTitle] = useState('Mi rutina');
  const [weeks, setWeeks] = useState('4');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para crear rutina
  async function createRoutine(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/cliente/${clienteId}/rutina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          weeksDuration: Number(weeks) || 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setRoutineId(data.routineId);
      setStep('add-exercises');
      toast('success', 'Rutina creada. Agrega ejercicios a cada día.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function finish() {
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={() => step === 'create' && onClose()}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'create' ? (
          <form onSubmit={createRoutine} className="p-5 space-y-4">
            <header className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">
                  Rutina manual
                </p>
                <h3 className="font-bold text-lg">Crear rutina</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-400 hover:text-ink-700 text-2xl leading-none"
              >
                ×
              </button>
            </header>

            {hasActiveRoutine && (
              <div className="rounded-lg bg-accent-50 border border-accent-200 p-2 text-xs text-accent-800">
                ⚠️ Este cliente ya tiene una rutina activa. Al crear esta, la anterior se desactivará.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Título</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej: Hipertrofia PPL 8 semanas"
                  required
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Duración (semanas)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={52}
                  className="input"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-ink-100">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={creating}
              >
                Cancelar
              </button>
              <button type="submit" disabled={creating} className="btn-primary flex-1">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear y agregar ejercicios →'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <header className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">
                  Paso 2 de 2
                </p>
                <h3 className="font-bold text-lg">Agregar ejercicios</h3>
                <p className="text-xs text-ink-500 mt-1">Selecciona el ejercicio, series, reps y peso para cada día.</p>
              </div>
            </header>

            <DayExerciseForms routineId={routineId!} />

            <div className="flex gap-2 pt-3 border-t border-ink-100">
              <button
                type="button"
                onClick={finish}
                className="btn-primary w-full"
              >
                Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayExerciseForms({ routineId }: { routineId: string }) {
  const [dayIds, setDayIds] = useState<Record<string, string>>({});
  const [loadingDays, setLoadingDays] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trainer/routine-day?routineId=${routineId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setDayIds(data.days ?? {});
          setLoadingDays(false);
        }
      })
      .catch(() => setLoadingDays(false));
    return () => { cancelled = true; };
  }, [routineId]);

  if (loadingDays) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {DAYS.map((dayKey) => {
        const dayId = dayIds[dayKey];
        if (!dayId) return null;
        return (
          <DayExerciseForm key={dayKey} dayKey={dayKey} dayId={dayId} />
        );
      })}
    </div>
  );
}

function DayExerciseForm({ dayKey, dayId }: { dayKey: string; dayId: string }) {
  const router = useRouter();
  const [exId, setExId] = useState('');
  const [search, setSearch] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8-12');
  const [weight, setWeight] = useState('');
  const [rest, setRest] = useState('90');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ExerciseCatalog[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch('/api/trainer/exercise-catalog')
      .then((r) => r.json())
      .then((data) => setCatalog(data.exercises ?? []))
      .catch(() => setCatalog([]));
  }, []);

  const filteredCatalog = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return catalog;
    return catalog.filter((e) => e.nameEs.toLowerCase().includes(s));
  }, [catalog, search]);

  const selectedEx = catalog.find((e) => e.id === exId);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!exId) {
      setError('Selecciona un ejercicio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/routine-day/${dayId}/exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exId,
          sets: Number(sets),
          reps,
          weightKg: weight ? Number(weight) : null,
          restSeconds: Number(rest),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast('success', `${selectedEx?.nameEs ?? 'Ejercicio'} agregado`);
      // Reset form
      setExId('');
      setWeight('');
      setNotes('');
      setShowPicker(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="card !p-0 overflow-hidden">
      <summary className="cursor-pointer flex items-center justify-between px-4 py-3 hover:bg-ink-50/60 list-none [&::-webkit-details-marker]:hidden">
        <span className="font-bold text-ink-900">{DAY_LABELS[dayKey]}</span>
        <Plus className="w-4 h-4 text-ink-500" />
      </summary>

      <form onSubmit={add} className="px-4 pb-4 pt-2 border-t border-ink-100 space-y-3">
        {/* Exercise picker */}
        <div>
          <label className="block text-xs font-medium mb-1 text-ink-700">Ejercicio</label>
          {selectedEx ? (
            <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
              <span className="flex-1 font-semibold text-sm text-ink-900">{selectedEx.nameEs}</span>
              <button
                type="button"
                onClick={() => { setExId(''); setShowPicker(true); }}
                className="text-ink-400 hover:text-ink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {!showPicker ? (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="w-full text-left text-sm text-ink-500 bg-ink-50 hover:bg-ink-100 rounded-lg px-3 py-2.5 transition-colors"
                >
                  Seleccionar ejercicio...
                </button>
              ) : (
                <div className="border border-ink-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-100 bg-ink-50">
                    <Search className="w-4 h-4 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio..."
                      className="flex-1 bg-transparent border-0 text-sm focus:outline-none"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCatalog.length === 0 ? (
                      <p className="text-xs text-ink-400 text-center py-3">Sin resultados</p>
                    ) : (
                      filteredCatalog.slice(0, 50).map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => { setExId(ex.id); setShowPicker(false); setSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between"
                        >
                          <span className="text-ink-900">{ex.nameEs}</span>
                          {ex.muscleGroup && (
                            <span className="text-[10px] text-ink-500 uppercase">{ex.muscleGroup}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wider">Series</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              className="input text-sm py-1.5"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wider">Reps</label>
            <input
              type="text"
              className="input text-sm py-1.5"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="8-12"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wider">Peso (kg)</label>
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              className="input text-sm py-1.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="libre"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wider">Descanso (s)</label>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={600}
              className="input text-sm py-1.5"
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wider">Notas</label>
          <input
            type="text"
            className="input text-sm py-1.5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="RIR 2, tempo 3-1-1..."
            maxLength={500}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!exId || saving}
          className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Agregar a {DAY_LABELS[dayKey]}</>}
        </button>
      </form>
    </details>
  );
}