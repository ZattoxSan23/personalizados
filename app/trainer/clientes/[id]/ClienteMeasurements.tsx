'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Ruler, Calendar } from 'lucide-react';
import {
  calcBodyFatNavy, calcBodyComposition,
  CATEGORY_LABELS, WHR_RISK_LABELS,
} from '@/lib/us-navy';

type Measurements = {
  weightKg: number | null;
  neckCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  shoulderCm: number | null;
  chestCm: number | null;
  bicepFlexCm: number | null;
  bicepRelaxedCm: number | null;
  forearmCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  bodyFatPct: number | null;
};

const MEASURE_LABELS: Array<{ key: keyof Measurements; label: string; star?: boolean }> = [
  { key: 'weightKg', label: 'Peso' },
  { key: 'neckCm', label: 'Cuello', star: true },
  { key: 'shoulderCm', label: 'Hombros' },
  { key: 'chestCm', label: 'Pecho' },
  { key: 'waistCm', label: 'Cintura', star: true },
  { key: 'hipsCm', label: 'Cadera', star: true },
  { key: 'bicepFlexCm', label: 'Bícep flex' },
  { key: 'bicepRelaxedCm', label: 'Bícep relaj' },
  { key: 'forearmCm', label: 'Antebrazo' },
  { key: 'thighCm', label: 'Muslo' },
  { key: 'calfCm', label: 'Pantorrilla' },
  { key: 'bodyFatPct', label: '% Grasa' },
];

export default function ClienteMeasurements({
  clienteId,
  measurements,
  gender,
  heightCm,
  birthDate,
}: {
  clienteId: string;
  measurements: Measurements | null;
  gender: string | null;
  heightCm: number | null;
  birthDate?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Measurements>(measurements ?? {
    weightKg: null, neckCm: null, waistCm: null, hipsCm: null, shoulderCm: null,
    chestCm: null, bicepFlexCm: null, bicepRelaxedCm: null, forearmCm: null,
    thighCm: null, calfCm: null, bodyFatPct: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Auto-calc US Navy + Deurenberg + RCC + IMC en vivo
  const calc = useMemo(() => {
    const g = (gender as 'male' | 'female' | null) ?? null;
    const navy = calcBodyFatNavy({
      gender: g,
      heightCm,
      neckCm: draft.neckCm,
      waistCm: draft.waistCm,
      hipsCm: draft.hipsCm,
    });
    const composition = calcBodyComposition(
      {
        gender: g,
        heightCm,
        neckCm: draft.neckCm,
        waistCm: draft.waistCm,
        hipsCm: draft.hipsCm,
        birthDate: birthDate ?? null,
      },
      draft.weightKg,
    );
    return { navy, composition };
  }, [gender, heightCm, birthDate, draft.neckCm, draft.waistCm, draft.hipsCm, draft.weightKg]);

  function startEdit() {
    setDraft(measurements ?? draft);
    setEditing(true);
    setError(null);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/cliente/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createProgressEntry: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const hasAny = measurements && Object.values(measurements).some((v) => v != null);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold">Medidas corporales</h2>
          {hasAny && measurements?.bodyFatPct != null && (
            <span className="badge-green text-[10px]">
              {measurements.bodyFatPct.toFixed(1)}% grasa
            </span>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="btn-secondary text-xs"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      {!editing ? (
        !hasAny ? (
          <div className="text-center py-6 text-sm text-ink-500">
            <p>Aún no hay medidas registradas.</p>
            <button
              type="button"
              onClick={startEdit}
              className="btn-primary text-xs mt-3 inline-flex"
            >
              Registrar primera medición
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {MEASURE_LABELS.map((m) => {
              const value = measurements![m.key];
              return (
                <div key={m.key} className="bg-ink-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wide">
                    {m.star && '⭐ '}{m.label}
                  </p>
                  <p className="text-sm font-bold tabular-nums mt-0.5">
                    {value != null ? (
                      <>
                        {value.toFixed(1)}
                        <span className="text-[10px] font-normal text-ink-500 ml-0.5">
                          {m.key === 'weightKg' ? 'kg' : m.key === 'bodyFatPct' ? '%' : 'cm'}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3 animate-fade-in">
          {/* Grid de inputs */}
          <div className="grid grid-cols-2 gap-2">
            {MEASURE_LABELS.map((m) => (
              <div key={m.key}>
                <label className="block text-[10px] font-medium mb-0.5 text-ink-700 uppercase tracking-wide">
                  {m.star && <span className="text-primary-600">⭐</span>} {m.label}
                </label>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  className="input text-sm py-1.5"
                  value={draft[m.key] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft({ ...draft, [m.key]: v === '' ? null : Number(v) });
                  }}
                  placeholder="—"
                />
              </div>
            ))}
          </div>

          {/* US Navy + Deurenberg + RCC live */}
          {(calc.navy != null || calc.composition?.deurenbergBodyFatPct != null || calc.composition?.waistHipRatio != null) && (
            <div className="rounded-lg bg-primary-50 border border-primary-200 p-2 text-xs text-primary-800 space-y-1">
              {calc.navy != null && (
                <p>✨ US Navy: <strong>{calc.navy}%</strong> grasa</p>
              )}
              {calc.composition?.deurenbergBodyFatPct != null && (
                <p>📊 Deurenberg: <strong>{calc.composition.deurenbergBodyFatPct}%</strong> grasa (BMI + edad)</p>
              )}
              {calc.composition?.waistHipRatio != null && (
                <p>📏 RCC: <strong>{calc.composition.waistHipRatio}</strong> (cintura/cadera) · {WHR_RISK_LABELS[calc.composition.whrRisk]}</p>
              )}
              {calc.composition?.ageYears != null && (
                <p>🎂 <strong>{calc.composition.ageYears}</strong> años</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-ink-100">
            <button type="button" onClick={cancel} className="btn-secondary flex-1 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary flex-1 text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}