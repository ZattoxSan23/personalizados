'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Dumbbell, UtensilsCrossed, LineChart, Lightbulb } from 'lucide-react';
import EditExerciseModal from './EditExerciseModal';
import EditMealModal, { AddMealButton } from './EditMealModal';
import LogExerciseSets from '@/app/components/LogExerciseSets';
import ExerciseAnalysis from '@/app/components/ExerciseAnalysis';
import CrearPlanButton from './CrearPlanButton';
import RutinaBuilder from './RutinaBuilder';

type Ejercicio = {
  id: string;
  sets: number;
  trackingType?: 'reps' | 'time';
  reps: string | null;
  durationSeconds: number | null;
  weightKg: string | null;
  restSeconds: number | null;
  notes: string | null;
  nameEs: string;
  orderIndex: number;
};

type Dia = {
  id: string;
  dayOfWeek: string;
  name: string | null;
  orderIndex: number;
  ejercicios: Ejercicio[];
};

type Rutina = {
  id: string;
  title: string;
  weeksDuration: number | null;
  createdViaAi: boolean | null;
};

type Meal = {
  id: string;
  dayOfWeek: string;
  mealType: string;
  scheduledTime: string | null;
  name: string;
  description: string | null;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatsG: string | null;
  orderIndex: number;
};

type MealPlan = {
  id: string;
  title: string;
  dailyCalories: number | null;
  dailyProteinG: number | null;
  dailyCarbsG: number | null;
  dailyFatsG: number | null;
};

type Progress = {
  weightKg: string | null;
  waistCm: string | null;
  bodyFatPct: string | null;
  recordedAt: string | null;
};

type TabKey = 'rutina' | 'plan' | 'progreso';

const TABS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'rutina', label: 'Rutina', icon: Dumbbell },
  { key: 'plan', label: 'Nutrición', icon: UtensilsCrossed },
  { key: 'progreso', label: 'Progreso', icon: LineChart },
];

export default function ClienteTabs({
  clienteId,
  DAYS_FULL,
  rutina,
  diasRutina,
  planActivo,
  planDias,
  ultimoPeso,
}: {
  clienteId: string;
  DAYS_FULL: string[];
  rutina: Rutina | null;
  diasRutina: Dia[];
  planActivo: MealPlan | null;
  planDias: Meal[];
  ultimoPeso: Progress | null;
}) {
  const [tab, setTab] = useState<TabKey>('rutina');

  // Soporte de ?tab=plan|rutina|progreso en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'plan' || t === 'progreso' || t === 'rutina') {
      setTab(t as TabKey);
    }
  }, []);

  return (
    <>
      <div className="flex gap-1 border-b border-ink-200 -mx-5 px-5 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-600 text-primary-700 font-semibold'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in" key={tab}>
        {tab === 'rutina' && (
          <div className="space-y-3">
            {!rutina ? (
              <div className="space-y-3">
                <RutinaBuilder clienteId={clienteId} hasActiveRoutine={false} catalog={[]} />
                <div className="empty-state">
                  <span className="h-12 w-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-ink-400" />
                  </span>
                  <p className="text-sm font-medium text-ink-700">Sin rutina activa</p>
                  <p className="text-xs text-ink-500">Crea una con IA o manualmente arriba</p>
                </div>
              </div>
            ) : (
              <>
                <div className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">Rutina activa</p>
                    <p className="font-semibold text-ink-900 mt-1 truncate">{rutina.title}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {rutina.createdViaAi && '✨ Generada con IA'}
                      {rutina.createdViaAi && ' · '}
                      {rutina.weeksDuration} semanas
                    </p>
                  </div>
                  <RutinaBuilder clienteId={clienteId} hasActiveRoutine={true} catalog={[]} />
                </div>

                {diasRutina.length === 0 ? (
                  <div className="card text-center text-ink-500 py-8 text-sm">
                    Sin días configurados
                  </div>
                ) : (
                  diasRutina.map((d, i) => (
                    <div key={d.id} className="card space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold capitalize">
                            {DAYS_FULL[d.orderIndex] ?? d.dayOfWeek}
                          </h3>
                          {d.name && (
                            <p className="text-xs text-ink-500 mt-0.5">{d.name}</p>
                          )}
                        </div>
                        <span className="badge-gray text-[10px]">
                          {d.ejercicios.length} ejercicios
                        </span>
                      </div>
                      <ol className="space-y-2">
                        {d.ejercicios.map((ex, idx) => (
                          <li key={ex.id} className="flex items-start gap-2.5 py-1 group">
                            <span className="text-ink-400 text-xs font-mono w-5 mt-0.5 tabular-nums">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm">{ex.nameEs}</p>
                                <EditExerciseModal exercise={ex} />
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs">
                                <span className="bg-ink-100 rounded px-1.5 py-0.5 font-medium">
                                  {ex.trackingType === 'time' && ex.durationSeconds
                                    ? `${ex.sets} × ${formatSeconds(ex.durationSeconds)}`
                                    : `${ex.sets} × ${ex.reps ?? '—'}`}
                                </span>
                                {ex.weightKg && (
                                  <span className="bg-ink-100 rounded px-1.5 py-0.5">
                                    {ex.weightKg} kg
                                  </span>
                                )}
                                {ex.restSeconds != null && (
                                  <span className="text-ink-500">{ex.restSeconds}s</span>
                                )}
                              </div>
                              {ex.notes && (
                                <p className="text-xs text-ink-500 mt-1 italic inline-flex items-start gap-1">
                                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{ex.notes}</span>
                                </p>
                              )}
                              <LogExerciseSets
                                routineExerciseId={ex.id}
                                exerciseName={ex.nameEs}
                                suggestedSets={ex.sets}
                                trackingType={ex.trackingType ?? 'reps'}
                                suggestedReps={ex.reps}
                                suggestedDurationSeconds={ex.durationSeconds}
                                suggestedWeightKg={ex.weightKg ? Number(ex.weightKg) : null}
                                showSuggestion={false}
                              />
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {tab === 'plan' && (
          <div className="space-y-3">
            {!planActivo ? (
              <div className="empty-state">
                <span className="h-12 w-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-ink-400" />
                </span>
                <p className="text-sm font-medium text-ink-700">Sin plan activo</p>
                <CrearPlanButton clienteId={clienteId} hasActivePlan={false} />
              </div>
            ) : (
              <>
                <CrearPlanButton clienteId={clienteId} hasActivePlan={true} />
                <PlanDetail planActivo={planActivo} planDias={planDias} clienteId={clienteId} />
              </>
            )}
          </div>
        )}

        {tab === 'progreso' && (
          <div className="space-y-3">
            {!ultimoPeso && diasRutina.length === 0 ? (
              <div className="empty-state">
                <span className="h-12 w-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-ink-400" />
                </span>
                <p className="text-sm font-medium text-ink-700">Aún sin registros de progreso</p>
                <p className="text-xs text-ink-500">Empieza una rutina y registra tus pesos</p>
              </div>
            ) : (
              <>
                {/* Resumen corporal (si hay) */}
                {ultimoPeso && (
                  <div className="card">
                    <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">Último registro corporal</p>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {ultimoPeso.weightKg && (
                        <div>
                          <p className="text-xl font-bold">{ultimoPeso.weightKg}<span className="text-sm text-ink-500"> kg</span></p>
                          <p className="text-[10px] text-ink-500 uppercase tracking-wide mt-0.5">Peso</p>
                        </div>
                      )}
                      {ultimoPeso.bodyFatPct && (
                        <div>
                          <p className="text-xl font-bold">{ultimoPeso.bodyFatPct}<span className="text-sm text-ink-500">%</span></p>
                          <p className="text-[10px] text-ink-500 uppercase tracking-wide mt-0.5">Grasa</p>
                        </div>
                      )}
                      {ultimoPeso.waistCm && (
                        <div>
                          <p className="text-xl font-bold">{ultimoPeso.waistCm}<span className="text-sm text-ink-500"> cm</span></p>
                          <p className="text-[10px] text-ink-500 uppercase tracking-wide mt-0.5">Cintura</p>
                        </div>
                      )}
                    </div>
                    {ultimoPeso.recordedAt && (
                      <p className="text-xs text-ink-400 mt-3 pt-3 border-t border-ink-100">{ultimoPeso.recordedAt}</p>
                    )}
                  </div>
                )}

                {/* Análisis de entrenamiento */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="w-4 h-4 text-primary-600" />
                    <h2 className="font-semibold">Análisis de entrenamiento</h2>
                  </div>
                  <ExerciseAnalysis
                    exercises={diasRutina.flatMap((d) =>
                      d.ejercicios.map((ex) => ({
                        routineExerciseId: ex.id,
                        nameEs: ex.nameEs,
                        suggestedWeight: ex.weightKg ? Number(ex.weightKg) : null,
                      })),
                    )}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const MEAL_LABEL_MAP: Record<string, string> = {
  desayuno: '🌅 Desayuno',
  almuerzo: '🍱 Almuerzo',
  cena: '🌙 Cena',
  snack1: '🥜 Snack AM',
  snack2: '🥜 Snack PM',
};
const DAYS_ORDER_TAB = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAYS_SHORT_TAB = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function PlanDetail({
  planActivo,
  planDias,
  clienteId,
}: {
  planActivo: MealPlan;
  planDias: Meal[];
  clienteId: string;
}) {
  const groupedByDay = DAYS_ORDER_TAB.map((dayKey) => ({
    dayKey,
    meals: planDias.filter((m) => m.dayOfWeek === dayKey),
  }));
  const dayKcal = (meals: Meal[]) =>
    meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Header con macros */}
      <div className="card">
        <p className="font-semibold text-ink-900">{planActivo.title}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            { label: 'kcal', value: planActivo.dailyCalories, accent: 'text-primary-700' },
            { label: 'proteína', value: planActivo.dailyProteinG, suffix: 'g', accent: 'text-ink-900' },
            { label: 'carbs', value: planActivo.dailyCarbsG, suffix: 'g', accent: 'text-ink-900' },
            { label: 'grasas', value: planActivo.dailyFatsG, suffix: 'g', accent: 'text-ink-900' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className={`text-xl font-bold ${m.accent}`}>
                {m.value ?? '—'}{m.suffix ?? ''}
              </p>
              <p className="text-[10px] text-ink-500 mt-0.5 uppercase tracking-wide">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Días con comidas */}
      {groupedByDay.map(({ dayKey, meals }) => {
        const dayIndex = DAYS_ORDER_TAB.indexOf(dayKey);
        const kcal = dayKcal(meals);
        return (
          <details key={dayKey} className="card-interactive group" open={dayKey === 'monday'}>
            <summary className="cursor-pointer flex items-center justify-between font-semibold text-ink-900 select-none">
              <span className="flex items-center gap-2">
                <span className="text-[10px] text-ink-500 uppercase tracking-wider w-8 font-bold">
                  {DAYS_SHORT_TAB[dayIndex]}
                </span>
                <span className="capitalize">{dayKey}</span>
                <span className="text-[10px] text-ink-500 font-normal">
                  ({meals.length} comidas{meals.length > 0 ? ` · ${kcal} kcal` : ''})
                </span>
              </span>
              <span className="text-ink-400 group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <ul className="mt-3 pt-3 border-t border-ink-100 space-y-2">
              {meals.length === 0 ? (
                <li className="text-xs text-ink-400 italic">Sin comidas registradas</li>
              ) : (
                meals.map((m) => (
                  <li key={m.id} className="bg-ink-50 rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-ink-700 uppercase tracking-wide">
                          {MEAL_LABEL_MAP[m.mealType] ?? m.mealType}
                          {m.scheduledTime && (
                            <span className="text-ink-400 ml-1 font-normal normal-case">· {m.scheduledTime}</span>
                          )}
                        </p>
                        <p className="text-sm font-medium text-ink-900 mt-1">{m.name}</p>
                        {m.description && (
                          <p className="text-xs text-ink-600 mt-0.5">{m.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {m.calories != null && (
                          <span className="text-[10px] font-bold text-primary-700 bg-primary-50 rounded px-2 py-0.5 whitespace-nowrap tabular-nums">
                            {m.calories} kcal
                          </span>
                        )}
                        <EditMealModal meal={m} />
                      </div>
                    </div>
                    {(m.proteinG || m.carbsG || m.fatsG) && (
                      <div className="flex gap-1.5 mt-2 text-[10px] text-ink-600">
                        {m.proteinG && <span className="bg-white rounded px-1.5 py-0.5">P {m.proteinG}g</span>}
                        {m.carbsG && <span className="bg-white rounded px-1.5 py-0.5">C {m.carbsG}g</span>}
                        {m.fatsG && <span className="bg-white rounded px-1.5 py-0.5">G {m.fatsG}g</span>}
                      </div>
                    )}
                  </li>
                ))
              )}
              <li>
                <AddMealButton mealPlanId={planActivo.id} dayOfWeek={dayKey} />
              </li>
            </ul>
          </details>
        );
      })}
    </div>
  );
}

/** Formatea segundos como "30s" / "1:30" / "2:00:00". */
function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m < 60) return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}