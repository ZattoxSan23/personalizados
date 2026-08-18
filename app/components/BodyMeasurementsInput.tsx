'use client';

import { useEffect, useMemo } from 'react';
import {
  calcBodyFatNavy, calcBodyComposition,
  CATEGORY_LABELS, WHR_RISK_LABELS,
} from '@/lib/us-navy';

export interface Measurements {
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
  bodyFatPct: number | null; // solo lectura — siempre viene de US Navy
}

export const emptyMeasurements: Measurements = {
  weightKg: null,
  neckCm: null,
  waistCm: null,
  hipsCm: null,
  shoulderCm: null,
  chestCm: null,
  bicepFlexCm: null,
  bicepRelaxedCm: null,
  forearmCm: null,
  thighCm: null,
  calfCm: null,
  bodyFatPct: null,
};

interface Props {
  gender: string | null;
  heightCm: number | null;
  /** Fecha de nacimiento YYYY-MM-DD (opcional). Si está, se calcula edad. */
  birthDate?: string | null;
  value: Measurements;
  onChange: (m: Measurements) => void;
}

const NumberField = ({
  label,
  star,
  value,
  onChange,
  hint,
}: {
  label: string;
  star?: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1 text-ink-700">
      {star && <span className="text-primary-600 mr-1">⭐</span>}
      {label}
    </label>
    <input
      type="number"
      step="0.1"
      inputMode="decimal"
      className="input"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(null);
        else onChange(Number(v));
      }}
      placeholder={hint ?? '—'}
    />
  </div>
);

export default function BodyMeasurementsInput({ gender, heightCm, birthDate, value, onChange }: Props) {
  // Auto-calc US Navy + Deurenberg + RCC
  const calc = useMemo(() => {
    const g = (gender as 'male' | 'female' | null) ?? null;
    const navy = calcBodyFatNavy({
      gender: g,
      heightCm,
      neckCm: value.neckCm,
      waistCm: value.waistCm,
      hipsCm: value.hipsCm,
    });
    const composition = calcBodyComposition(
      {
        gender: g,
        heightCm,
        neckCm: value.neckCm,
        waistCm: value.waistCm,
        hipsCm: value.hipsCm,
        birthDate: birthDate ?? null,
      },
      value.weightKg,
    );
    return { navy, composition };
  }, [gender, heightCm, birthDate, value.neckCm, value.waistCm, value.hipsCm, value.weightKg]);

  const set = <K extends keyof Measurements>(k: K, v: Measurements[K]) =>
    onChange({ ...value, [k]: v });

  // Sincronizar el %grasa calculado por Navy con el estado, para que al
  // guardar se persista el valor derivado (no hay input manual del usuario).
  useEffect(() => {
    if (calc.navy !== value.bodyFatPct) {
      onChange({ ...value, bodyFatPct: calc.navy ?? null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.navy]);

  const navyMissing = !value.neckCm || !value.waistCm || (gender === 'female' && !value.hipsCm);
  const c = calc.composition;

  return (
    <div className="space-y-3">
      {/* Métricas calculadas: US Navy + Deurenberg + RCC + IMC */}
      <div className="rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-3 space-y-3">
        <p className="text-xs font-semibold text-primary-900 flex items-center gap-1.5">
          <span className="h-5 w-5 rounded bg-primary-600 text-white text-xs flex items-center justify-center font-bold">∑</span>
          Métricas calculadas
        </p>

        {/* Edad (solo si hay birthDate) */}
        {c?.ageYears != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-700 tabular-nums">{c.ageYears}</span>
            <span className="text-xs text-primary-800">años</span>
          </div>
        )}

        {calc.navy != null ? (
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary-700 tabular-nums">{calc.navy}%</span>
              <span className="text-xs text-primary-800">
                grasa US Navy · {CATEGORY_LABELS[c?.category ?? 'average']}
              </span>
            </div>
            <p className="text-[10px] text-ink-500">
              De {gender === 'female' ? 'cintura + cadera − cuello' : 'cintura − cuello'} y altura (±3-4% vs DEXA).
            </p>
          </div>
        ) : (
          <p className="text-xs text-ink-600">
            {navyMissing
              ? gender === 'female'
                ? 'Completa ⭐ cuello + cintura + cadera para US Navy'
                : 'Completa ⭐ cuello + cintura para US Navy'
              : 'Revisa que los valores sean válidos'}
          </p>
        )}

        {/* Deurenberg (si hay peso + altura + edad) */}
        {c?.deurenbergBodyFatPct != null && (
          <div className="flex items-baseline gap-2 pt-1 border-t border-primary-200/60">
            <span className="text-base font-semibold text-primary-800 tabular-nums">
              {c.deurenbergBodyFatPct}%
            </span>
            <span className="text-[10px] text-ink-500">
              Deurenberg (BMI + edad, ±4%)
            </span>
          </div>
        )}

        {/* Grid: BMI + RCC + masa grasa + masa magra */}
        {c && (c.bmi != null || c.waistHipRatio != null || c.fatMassKg != null) && (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-primary-200/60">
            {c.bmi != null && (
              <div>
                <p className="text-ink-500">IMC</p>
                <p className="font-semibold tabular-nums">{c.bmi}</p>
              </div>
            )}
            {c.waistHipRatio != null && (
              <div>
                <p className="text-ink-500">
                  RCC (cintura/cadera){' '}
                  <span className="text-[9px]">· {WHR_RISK_LABELS[c.whrRisk]}</span>
                </p>
                <p className="font-semibold tabular-nums">{c.waistHipRatio}</p>
              </div>
            )}
            {c.fatMassKg != null && (
              <div>
                <p className="text-ink-500">Masa grasa</p>
                <p className="font-semibold tabular-nums">{c.fatMassKg} kg</p>
              </div>
            )}
            {c.leanMassKg != null && (
              <div>
                <p className="text-ink-500">Masa magra</p>
                <p className="font-semibold tabular-nums">{c.leanMassKg} kg</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Básicos */}
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Peso" value={value.weightKg} onChange={(v) => set('weightKg', v)} hint="kg" />
        <div>
          <label className="block text-xs font-medium mb-1 text-ink-700">% Grasa</label>
          <div className="input bg-ink-50 text-ink-700 cursor-not-allowed flex items-center tabular-nums">
            {calc.navy != null ? `${calc.navy}%` : '—'}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-ink-500 -mt-2">
        ⭐ US Navy: cuello + cintura{value.hipsCm || gender === 'female' ? ' + cadera' : ''} + altura. Deurenberg: BMI + edad. RCC: cintura ÷ cadera.
      </p>

      {/* US Navy necesarios */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">⭐ Necesarias para US Navy</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField star label="Cuello" value={value.neckCm} onChange={(v) => set('neckCm', v)} hint="cm" />
          <NumberField star label="Cintura" value={value.waistCm} onChange={(v) => set('waistCm', v)} hint="cm" />
          {gender === 'female' && (
            <NumberField star label="Cadera" value={value.hipsCm} onChange={(v) => set('hipsCm', v)} hint="cm" />
          )}
        </div>
      </div>

      {/* Medidas completas */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Medidas corporales completas</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Hombros" value={value.shoulderCm} onChange={(v) => set('shoulderCm', v)} hint="cm" />
          <NumberField label="Pecho" value={value.chestCm} onChange={(v) => set('chestCm', v)} hint="cm" />
          <NumberField label="Bícep flexionado" value={value.bicepFlexCm} onChange={(v) => set('bicepFlexCm', v)} hint="cm" />
          <NumberField label="Bícep relajado" value={value.bicepRelaxedCm} onChange={(v) => set('bicepRelaxedCm', v)} hint="cm" />
          <NumberField label="Antebrazo" value={value.forearmCm} onChange={(v) => set('forearmCm', v)} hint="cm" />
          <NumberField label="Muslo" value={value.thighCm} onChange={(v) => set('thighCm', v)} hint="cm" />
          <NumberField label="Pantorrilla" value={value.calfCm} onChange={(v) => set('calfCm', v)} hint="cm" />
        </div>
      </div>
    </div>
  );
}