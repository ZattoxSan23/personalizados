import Link from 'next/link';
import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import { mealPlans, meals } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { UtensilsCrossed, Flame, Beef, Wheat, Droplet } from 'lucide-react';

const DAYS_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const MEAL_LABELS: Record<string, { label: string; icon: any }> = {
  desayuno: { label: 'Desayuno', icon: UtensilsCrossed },
  almuerzo: { label: 'Almuerzo', icon: UtensilsCrossed },
  cena: { label: 'Cena', icon: UtensilsCrossed },
  snack1: { label: 'Snack AM', icon: Flame },
  snack2: { label: 'Snack PM', icon: Flame },
};

export const revalidate = 60;

export default async function AlimentacionPage() {
  const { clientId } = await requireClient();

  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(and(eq(mealPlans.clientId, clientId), eq(mealPlans.isActive, true)))
    .limit(1);

  if (!plan) {
    return (
      <div className="space-y-4">
        <header className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Mi alimentación</h1>
        </header>
        <div className="empty-state">
          <span className="h-14 w-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-ink-400" />
          </span>
          <p className="text-sm font-medium text-ink-700">Sin plan activo</p>
          <p className="text-xs text-ink-500 max-w-xs mx-auto">
            Tu coach aún no ha creado un plan para ti. Te avisaremos cuando esté listo.
          </p>
        </div>
      </div>
    );
  }

  const allMeals = await db
    .select()
    .from(meals)
    .where(eq(meals.mealPlanId, plan.id))
    .orderBy(asc(meals.orderIndex));

  // Agrupar por día
  const mealsByDay = new Map<string, typeof allMeals>();
  for (const m of allMeals) {
    if (!mealsByDay.has(m.dayOfWeek)) mealsByDay.set(m.dayOfWeek, []);
    mealsByDay.get(m.dayOfWeek)!.push(m);
  }

  // Sumar kcal reales del día (si todas están definidas)
  function dayKcal(dayMeals: typeof allMeals): number | null {
    if (dayMeals.length === 0) return null;
    const defined = dayMeals.filter((m) => m.calories != null);
    if (defined.length === 0) return null;
    return defined.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Mi alimentación</h1>
          <p className="text-sm text-ink-500">{plan.title}</p>
        </div>
      </header>

      {/* Macros diarios */}
      <section className="card">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">Macros diarios</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-primary-50 py-2">
            <p className="text-xl font-extrabold text-primary-700 tabular-nums leading-none">
              {plan.dailyCalories ?? '—'}
            </p>
            <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1">kcal</p>
          </div>
          <div className="rounded-lg bg-ink-50 py-2">
            <p className="text-xl font-bold tabular-nums leading-none">
              {plan.dailyProteinG ?? '—'}
              <span className="text-[10px] font-normal text-ink-500">g</span>
            </p>
            <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1">Proteína</p>
          </div>
          <div className="rounded-lg bg-ink-50 py-2">
            <p className="text-xl font-bold tabular-nums leading-none">
              {plan.dailyCarbsG ?? '—'}
              <span className="text-[10px] font-normal text-ink-500">g</span>
            </p>
            <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1">Carbos</p>
          </div>
          <div className="rounded-lg bg-ink-50 py-2">
            <p className="text-xl font-bold tabular-nums leading-none">
              {plan.dailyFatsG ?? '—'}
              <span className="text-[10px] font-normal text-ink-500">g</span>
            </p>
            <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1">Grasas</p>
          </div>
        </div>
      </section>

      {/* Plan semanal por día */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Plan semanal</p>
        {DAYS_ORDER.map((dayKey, i) => {
          const dayMeals = mealsByDay.get(dayKey) ?? [];
          const kcal = dayKcal(dayMeals);
          return (
            <details key={dayKey} className="card group" open={dayKey === 'monday'}>
              <summary className="cursor-pointer flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:bg-ink-50/40 -m-4 p-4 rounded-xl">
                <h3 className="font-semibold text-ink-900 capitalize">{DAYS_FULL[i]}</h3>
                <span className="flex items-center gap-2">
                  {kcal != null && (
                    <span className="text-xs font-semibold text-primary-700 tabular-nums">{kcal} kcal</span>
                  )}
                  <span className="badge-gray text-[10px]">{dayMeals.length}</span>
                </span>
              </summary>
              <div className="mt-3 pt-3 border-t border-ink-100 space-y-2">
                {dayMeals.length === 0 ? (
                  <p className="text-sm text-ink-400 italic">Sin comidas registradas</p>
                ) : (
                  dayMeals.map((m) => {
                    const MealIcon = MEAL_LABELS[m.mealType]?.icon ?? UtensilsCrossed;
                    return (
                      <article key={m.id} className="bg-ink-50 rounded-md p-3 space-y-1.5">
                        <header className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-ink-700 uppercase tracking-wider flex items-center gap-1.5">
                              <MealIcon className="w-3 h-3" />
                              {MEAL_LABELS[m.mealType]?.label ?? m.mealType}
                            </p>
                            <p className="font-medium text-sm text-ink-900 mt-0.5">{m.name}</p>
                          </div>
                          {m.calories != null && (
                            <span className="text-[10px] font-bold text-primary-700 bg-primary-50 rounded px-2 py-0.5 whitespace-nowrap tabular-nums">
                              {m.calories} kcal
                            </span>
                          )}
                        </header>
                        {m.description && (
                          <p className="text-xs text-ink-600">{m.description}</p>
                        )}
                        {(m.scheduledTime || m.proteinG || m.carbsG || m.fatsG) && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {m.scheduledTime && (
                              <span className="bg-white rounded px-1.5 py-0.5 text-ink-700 font-medium">
                                ⏰ {m.scheduledTime}
                              </span>
                            )}
                            {m.proteinG && (
                              <span className="bg-white rounded px-1.5 py-0.5 text-ink-700 font-medium">
                                P {m.proteinG}g
                              </span>
                            )}
                            {m.carbsG && (
                              <span className="bg-white rounded px-1.5 py-0.5 text-ink-700 font-medium">
                                C {m.carbsG}g
                              </span>
                            )}
                            {m.fatsG && (
                              <span className="bg-white rounded px-1.5 py-0.5 text-ink-700 font-medium">
                                G {m.fatsG}g
                              </span>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </details>
          );
        })}
      </section>

      <div className="text-center pt-2">
        <Link href="/portal/hoy" className="text-sm text-primary-700 hover:text-primary-800 font-semibold inline-flex items-center gap-1">
          Ver comidas de hoy →
        </Link>
      </div>
    </div>
  );
}