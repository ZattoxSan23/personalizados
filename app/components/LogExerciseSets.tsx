'use client';

import { useMemo, useState } from 'react';
import {
  Check, Plus, Trash2, Loader2, TrendingUp, Trophy, Activity, CalendarDays,
} from 'lucide-react';
import { toast } from '@/app/components/Toast';
import type { ExerciseSetEntry } from '@/lib/db/schema';
import { localDatetimeInputValueLima, localInputToIso } from '@/lib/date';

interface Props {
  routineExerciseId: string;
  exerciseName: string;
  suggestedSets: number;
  /** Repeticiones objetivo (p.ej. "8-12"). Null cuando el ejercicio es por tiempo. */
  suggestedReps: string | null;
  /** Duración objetivo en segundos (solo cuando trackingType='time'). */
  suggestedDurationSeconds?: number | null;
  /** Tipo de tracking. Default 'reps'. Si es 'time' el input muestra segundos. */
  trackingType?: 'reps' | 'time';
  suggestedWeightKg?: number | null;
  /** Si false, oculta el badge de meta sugerida (p.ej. cuando se renderiza dentro de un card ya con meta). */
  showSuggestion?: boolean;
}

interface SessionAnalysis {
  sessions: Array<{
    id: string;
    date: Date | string;
    avgWeight: number;
    volume: number;
    setsCompleted: number;
    totalSets: number;
    topSet: { w: number; r: number } | null;
    rpe: number | null;
  }>;
  prsByRepRange: Record<number, number>;
  allTimePR: { weight: number; reps: number; date: Date | string | null } | null;
  lastSession: {
    id: string;
    date: Date | string;
    avgWeight: number;
    volume: number;
    setsCompleted: number;
    totalSets: number;
    topSet: { w: number; r: number } | null;
    rpe: number | null;
  } | null;
  totalSessions: number;
}

const TRAINER_API = '/api/trainer/exercise-log';

export default function LogExerciseSets({
  routineExerciseId,
  exerciseName,
  suggestedSets,
  suggestedReps,
  suggestedDurationSeconds = null,
  trackingType = 'reps',
  suggestedWeightKg = null,
  showSuggestion = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const initialSet = trackingType === 'time'
    ? { weight: 0, reps: 0, durationSeconds: 0, completed: false }
    : { weight: 0, reps: 0, completed: false };
  const [sets, setSets] = useState<ExerciseSetEntry[]>(() =>
    Array.from({ length: suggestedSets }, () => ({ ...initialSet })),
  );
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [performedAt, setPerformedAt] = useState(localDatetimeInputValueLima());
  const [saving, setSaving] = useState(false);

  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisLoaded, setAnalysisLoaded] = useState(false);

  const summary = useMemo(() => calcSummary(sets), [sets]);

  async function loadAnalysis() {
    setLoadingAnalysis(true);
    try {
      const res = await fetch(`${TRAINER_API}?routineExerciseId=${routineExerciseId}`);
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data);
        setAnalysisLoaded(true);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAnalysis(false);
    }
  }

  function updateSet(idx: number, patch: Partial<ExerciseSetEntry>) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function markComplete(idx: number, completed: boolean) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, completed } : s)));
  }

  function addSet() {
    setSets((prev) => [...prev, { ...initialSet }]);
  }

  function removeSet(idx: number) {
    if (sets.length <= 1) return;
    setSets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    // Validación: una serie es válida si está marcada como completada y
    // tiene el dato requerido (reps para reps, duración para tiempo).
    // El peso es OPCIONAL en ambos casos (peso corporal, plancha con peso, etc.).
    const isValid = trackingType === 'time'
      ? (s: ExerciseSetEntry) => s.completed && s.durationSeconds != null && s.durationSeconds > 0
      : (s: ExerciseSetEntry) => s.completed && s.reps > 0;
    const validSets = sets.filter(isValid);
    if (validSets.length === 0) {
      toast('error', trackingType === 'time'
        ? 'Completa al menos una serie con duración'
        : 'Completa al menos una serie con reps');
      return;
    }
    const performedAtIso = localInputToIso(performedAt);
    if (performedAt && !performedAtIso) {
      toast('error', 'Fecha inválida');
      return;
    }
    setSaving(true);
    try {
      const prevTop = analysis?.lastSession?.topSet ?? null;
      const prevVolume = analysis?.lastSession?.volume ?? 0;
      const prevPRWeight = analysis?.allTimePR?.weight ?? 0;
      const prevPRReps = analysis?.allTimePR?.reps ?? 0;

      const res = await fetch(TRAINER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routineExerciseId,
          trackingType,
          sets: sets.map((s) => {
            const base = {
              weight: s.weight || 0,
              reps: trackingType === 'time' ? 0 : (s.reps || 0),
              completed: isValid(s),
            } as ExerciseSetEntry;
            if (trackingType === 'time') {
              base.durationSeconds = s.durationSeconds ?? 0;
            }
            return base;
          }),
          rpe,
          notes: notes.trim() || null,
          performedAt: performedAtIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');

      const newTop = data.summary?.topSet ?? null;
      const newVolume = data.summary?.volume ?? 0;

      const main = `Guardado · ${newVolume} kg·volumen total`;

      const deltas: string[] = [];
      if (prevTop && newTop) {
        const kg = +(newTop.weight - prevTop.w).toFixed(2);
        if (Math.abs(kg) >= 0.5) {
          deltas.push(kg > 0 ? `top set +${kg}kg` : `top set ${kg}kg`);
        }
      } else if (newTop && !prevTop) {
        deltas.push('primera sesión');
      }
      if (prevVolume > 0) {
        const v = newVolume - prevVolume;
        if (Math.abs(v) >= 5) {
          deltas.push(v > 0 ? `vol +${v}kg` : `vol ${v}kg`);
        }
      }

      // ¿Nuevo PR? Solo si YA existía un PR previo (no aplica a primera sesión)
      // y el nuevo top es ESTRICTAMENTE mayor en peso, o igual peso con más reps.
      const isNewPR =
        newTop &&
        prevPRWeight > 0 &&
        (newTop.weight > prevPRWeight ||
          (newTop.weight === prevPRWeight && newTop.reps > prevPRReps));

      if (isNewPR) {
        toast('success', `${main} · Nuevo PR ${newTop.weight}×${newTop.reps}`);
      } else if (!prevPRWeight && newTop) {
        toast('success', `${main} · Primera sesión registrada`);
      } else if (deltas.length > 0) {
        toast('success', `${main} · ${deltas.join(' · ')}`);
      } else {
        toast('success', main);
      }

      // LogExerciseSets también muestra el PR histórico arriba (header con trophy)
      // — el top set histórico usa los campos del análisis, no necesitamos tocarlo.

      // Aviso extra: el cliente ya puede ver este registro
      setTimeout(() => {
        toast('info', 'El cliente ya puede ver este registro en su portal');
      }, 400);

      setNotes('');
      setRpe(null);
      setSets(
        Array.from({ length: suggestedSets }, () => ({ ...initialSet })),
      );

      setAnalysisLoaded(false);
      loadAnalysis();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 -mx-1">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            if (!analysisLoaded) loadAnalysis();
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        className="text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
      >
        {loadingAnalysis ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Activity className="w-3.5 h-3.5" />
        )}
        Registrar sesión
      </button>

      {open && (
        <div className="mt-2 bg-white border border-ink-200 rounded-lg overflow-hidden">
          {/* Header con análisis histórico */}
          {analysis && analysis.totalSessions > 0 && (
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/60 px-3 py-2 border-b border-primary-200/50">
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {analysis.allTimePR && analysis.allTimePR.weight > 0 && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-ink-600">PR:</span>
                    <span className="font-bold tabular-nums">
                      {analysis.allTimePR.weight}kg × {analysis.allTimePR.reps}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-ink-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{analysis.totalSessions} sesiones</span>
                </div>
              </div>
              {analysis.lastSession && (
                <p className="text-[10px] text-ink-500 mt-1">
                  Última vez: top{' '}
                  <span className="font-semibold">
                    {analysis.lastSession.topSet
                      ? `${analysis.lastSession.topSet.w}×${analysis.lastSession.topSet.r}`
                      : '—'}
                  </span>{' '}
                  · vol{' '}
                  <span className="font-semibold">{analysis.lastSession.volume}kg</span>
                </p>
              )}
            </div>
          )}

          {/* Series — modo 100% manual */}
          <div className="px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] text-ink-500 uppercase tracking-wide font-semibold mb-1">
              {exerciseName}{' '}
              <span className="font-normal normal-case text-ink-400">
                · {trackingType === 'time'
                  ? `meta ${suggestedDurationSeconds ?? '—'}s`
                  : `${suggestedReps ?? '—'} reps objetivo`}
                {showSuggestion && suggestedWeightKg != null && (
                  <> · meta {suggestedWeightKg}kg</>
                )}
              </span>
            </p>
            {sets.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => markComplete(idx, !s.completed)}
                  className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                    s.completed
                      ? 'bg-success text-white'
                      : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
                  }`}
                  aria-label={s.completed ? 'Completada' : 'Pendiente'}
                >
                  {s.completed && <Check className="w-4 h-4" strokeWidth={3} />}
                </button>
                <span className="text-[10px] text-ink-500 font-semibold w-8 flex-shrink-0 tabular-nums">
                  Set {idx + 1}
                </span>
                <div className="flex items-center gap-1 flex-1">
                  {/* Peso solo si NO es ejercicio por tiempo. Para plancha/caminata
                      el peso no tiene sentido — solo duración en segundos. */}
                  {trackingType !== 'time' && (
                    <>
                      <input
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        value={s.weight || ''}
                        onChange={(e) => updateSet(idx, { weight: Number(e.target.value) || 0 })}
                        className="input text-sm py-1 px-2 w-16 tabular-nums text-center"
                        placeholder="kg"
                      />
                      <span className="text-ink-400 text-xs">×</span>
                    </>
                  )}
                  {/* Reps o Tiempo según trackingType */}
                  {trackingType === 'time' ? (
                    <input
                      type="number"
                      step="5"
                      inputMode="numeric"
                      min={5}
                      value={s.durationSeconds || ''}
                      onChange={(e) => updateSet(idx, { durationSeconds: Number(e.target.value) || 0 })}
                      className="input text-sm py-1 px-2 flex-1 tabular-nums text-center"
                      placeholder="seg"
                      aria-label="Duración en segundos"
                    />
                  ) : (
                    <input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={s.reps || ''}
                      onChange={(e) => updateSet(idx, { reps: Number(e.target.value) || 0 })}
                      className="input text-sm py-1 px-2 w-14 tabular-nums text-center"
                      placeholder="reps"
                    />
                  )}
                </div>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(idx)}
                    className="h-7 w-7 rounded-md text-ink-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center flex-shrink-0"
                    aria-label="Eliminar serie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addSet}
              className="text-[11px] text-primary-700 hover:text-primary-800 inline-flex items-center gap-1 px-1 py-1 mt-1"
            >
              <Plus className="w-3 h-3" /> Añadir serie
            </button>
          </div>

          {/* Live summary */}
          <div className="bg-ink-50 px-3 py-2 border-t border-ink-100">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold tabular-nums">
                  {summary.completedCount}/{sets.length}
                </p>
                <p className="text-[9px] text-ink-500 uppercase tracking-wide">Series ✓</p>
              </div>
              <div>
                <p className="text-sm font-bold tabular-nums">{summary.volume}</p>
                <p className="text-[9px] text-ink-500 uppercase tracking-wide">Volumen kg</p>
              </div>
              <div>
                <p className="text-sm font-bold tabular-nums">
                  {summary.topSet
                    ? trackingType === 'time'
                      ? `${summary.topSet.w}kg · ${summary.topSet.d ?? 0}s`
                      : `${summary.topSet.w}×${summary.topSet.r}`
                    : '—'}
                </p>
                <p className="text-[9px] text-ink-500 uppercase tracking-wide">Top set</p>
              </div>
            </div>
          </div>

          {/* Fecha retroactiva + RPE + notes */}
          <div className="px-3 py-2 border-t border-ink-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-500 uppercase tracking-wide font-semibold inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Fecha
              </span>
              <input
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                className="input text-xs py-1 px-2 flex-1 tabular-nums"
                max={localDatetimeInputValueLima()}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-500 uppercase tracking-wide font-semibold">
                RPE
              </span>
              <div className="flex gap-0.5">
                {[6, 7, 8, 9, 10].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRpe(rpe === v ? null : v)}
                    className={`h-6 w-6 rounded text-[11px] font-semibold tabular-nums transition-colors ${
                      rpe === v
                        ? 'bg-primary-600 text-white'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)..."
              className="input text-xs py-1 px-2"
              maxLength={500}
            />
          </div>

          {/* Save button */}
          <div className="px-3 py-2 border-t border-ink-100 bg-ink-50">
            <button
              type="button"
              onClick={save}
              disabled={saving || summary.completedCount === 0}
              className="btn-primary w-full text-xs py-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function calcSummary(sets: ExerciseSetEntry[]) {
  // Una serie cuenta como completada si:
  //   - tiene check verde (s.completed)
  //   - y tiene datos válidos (reps para reps, duración para tiempo)
  // El peso es opcional: en ejercicios por tiempo el peso es 0 por diseño,
  // y en ejercicios por reps puede ser 0 si no se trabaja con peso (peso corporal).
  const completed = sets.filter(
    (s) => s.completed && (s.reps > 0 || (s.durationSeconds ?? 0) > 0),
  );
  const volume = completed.reduce(
    (sum, s) => sum + s.weight * (s.reps > 0 ? s.reps : 0),
    0,
  );
  // Top set: mayor peso; si nadie tiene peso, mayor duración
  const topSet = completed.reduce<{ w: number; r: number; d?: number } | null>(
    (best, s) => {
      // Prioridad 1: mayor peso
      if (s.weight > 0 && (!best || s.weight > best.w)) {
        return { w: s.weight, r: s.reps, d: s.durationSeconds };
      }
      // Prioridad 2: si nadie tiene peso, mayor duración
      if (!best && (s.durationSeconds ?? 0) > 0) {
        return { w: 0, r: 0, d: s.durationSeconds };
      }
      return best;
    },
    null,
  );
  return {
    completedCount: completed.length,
    volume: Math.round(volume),
    topSet,
  };
}