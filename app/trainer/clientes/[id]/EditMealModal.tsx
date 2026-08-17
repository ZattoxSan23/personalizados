'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Plus } from 'lucide-react';

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
};

const MEAL_TYPE_OPTIONS = [
  { value: 'desayuno', label: '🌅 Desayuno' },
  { value: 'almuerzo', label: '🍱 Almuerzo' },
  { value: 'cena', label: '🌙 Cena' },
  { value: 'snack1', label: '🥜 Snack AM' },
  { value: 'snack2', label: '🥜 Snack PM' },
];

export default function EditMealModal({ meal, onDelete }: { meal: Meal; onDelete?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mealType, setMealType] = useState(meal.mealType);
  const [scheduledTime, setScheduledTime] = useState(meal.scheduledTime ?? '');
  const [name, setName] = useState(meal.name);
  const [description, setDescription] = useState(meal.description ?? '');
  const [calories, setCalories] = useState(meal.calories?.toString() ?? '');
  const [protein, setProtein] = useState(meal.proteinG ?? '');
  const [carbs, setCarbs] = useState(meal.carbsG ?? '');
  const [fats, setFats] = useState(meal.fatsG ?? '');

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/meal/${meal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          scheduledTime: scheduledTime || null,
          name,
          description: description || null,
          calories: calories ? Number(calories) : null,
          proteinG: protein ? Number(protein) : null,
          carbsG: carbs ? Number(carbs) : null,
          fatsG: fats ? Number(fats) : null,
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

  async function deleteMeal() {
    if (!confirm(`¿Eliminar "${meal.name}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/meal/${meal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setOpen(false);
      if (onDelete) onDelete();
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-md text-ink-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        aria-label="Editar comida"
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
                <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">Editar comida</p>
                <p className="text-[10px] text-ink-400 mt-0.5 capitalize">{meal.dayOfWeek}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-700 text-2xl leading-none -mt-2 -mr-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Tipo</label>
                  <select
                    className="input"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                  >
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Hora</label>
                  <input
                    type="time"
                    className="input"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="07:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Descripción</label>
                <input
                  type="text"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ej: 2 huevos + 1/2 palta + tomate"
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Calorías</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wide">P (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    className="input text-sm py-1.5"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wide">C (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    className="input text-sm py-1.5"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-ink-700 uppercase tracking-wide">G (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    className="input text-sm py-1.5"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    placeholder="20"
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
                  onClick={deleteMeal}
                  disabled={deleting}
                  className="btn-ghost text-red-600 hover:bg-red-50"
                  title="Eliminar comida"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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

export function AddMealButton({
  mealPlanId,
  dayOfWeek,
  onAdded,
}: {
  mealPlanId: string;
  dayOfWeek: string;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mealType, setMealType] = useState('snack1');
  const [scheduledTime, setScheduledTime] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');

  async function add() {
    if (!name.trim()) {
      setError('Nombre requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/meal-plan/${mealPlanId}/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek,
          mealType,
          scheduledTime: scheduledTime || null,
          name: name.trim(),
          description: description || null,
          calories: calories ? Number(calories) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setOpen(false);
      setName('');
      setDescription('');
      setCalories('');
      setScheduledTime('');
      if (onAdded) onAdded();
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
        onClick={() => setOpen(true)}
        className="w-full text-xs text-primary-700 hover:text-primary-800 font-semibold inline-flex items-center justify-center gap-1 py-2 rounded-md border border-dashed border-ink-300 hover:border-primary-400 hover:bg-primary-50/40 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar comida
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
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">Nueva comida</p>
                <p className="text-[10px] text-ink-400 mt-0.5 capitalize">{dayOfWeek}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-700 text-2xl leading-none -mt-2 -mr-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Tipo</label>
                  <select
                    className="input"
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                  >
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Hora</label>
                  <input
                    type="time"
                    className="input"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="16:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Yogurt griego con arándanos"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Descripción (opcional)</label>
                <input
                  type="text"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="200g yogurt + arándanos + granola"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-ink-700">Calorías (opcional)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="ej: 250"
                />
              </div>

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
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}