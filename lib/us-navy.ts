/**
 * Fórmulas del Método US Navy para estimar porcentaje de grasa corporal.
 *
 * Referencias:
 * - Hodgdon & Beckett (1984) — Prediction of percent body fat for U.S. Navy
 *   men and women from body circumferences and height
 *   https://pubmed.ncbi.nlm.nih.gov/6736260/
 *
 * Fórmula (DENSIDAD → %BF por Siri/Brozek):
 *   Hombres: BF% = 495 / (1.0324 − 0.19077·log10(cintura−cuello) + 0.15456·log10(altura)) − 450
 *   Mujeres: BF% = 495 / (1.29579 − 0.35004·log10(cintura+cadera−cuello) + 0.22100·log10(altura)) − 450
 *
 * Todas las medidas en CENTÍMETROS.
 *
 * Limitaciones:
 * - Aproximación, error típico de ±3-4% vs DEXA
 * - No apta para menores de 18 ni para personas con BMI extremos (<18.5 o >35)
 */

export type Gender = 'male' | 'female';

export interface NavyInput {
  gender: Gender | null | undefined;
  heightCm: number | null | undefined;
  neckCm: number | null | undefined;
  waistCm: number | null | undefined;
  hipsCm?: number | null | undefined; // requerido solo para mujeres
}

export interface BodyComposition {
  bodyFatPct: number;
  fatMassKg: number | null;
  leanMassKg: number | null;
  bmi: number | null;
  category: 'essential' | 'athletes' | 'fitness' | 'average' | 'obese';
}

/**
 * Calcula el % de grasa corporal con el método US Navy (Hodgdon-Beckett).
 * Devuelve null si faltan datos necesarios.
 */
export function calcBodyFatNavy(input: NavyInput): number | null {
  const { gender, heightCm, neckCm, waistCm, hipsCm } = input;
  if (!gender || !heightCm || !neckCm || !waistCm) return null;
  if (heightCm <= 0 || neckCm <= 0 || waistCm <= 0) return null;

  if (gender === 'male') {
    const diff = waistCm - neckCm;
    if (diff <= 0) return null;
    const density =
      1.0324 -
      0.19077 * Math.log10(diff) +
      0.15456 * Math.log10(heightCm);
    if (density <= 0) return null;
    const bf = 495 / density - 450;
    return clamp(bf, 2, 60);
  }

  if (gender === 'female') {
    if (!hipsCm || hipsCm <= 0) return null;
    const sum = waistCm + hipsCm - neckCm;
    if (sum <= 0) return null;
    const density =
      1.29579 -
      0.35004 * Math.log10(sum) +
      0.22100 * Math.log10(heightCm);
    if (density <= 0) return null;
    const bf = 495 / density - 450;
    return clamp(bf, 5, 60);
  }

  return null;
}

/**
 * Calcula composición corporal completa (BF%, masa grasa, masa magra, BMI, categoría).
 * Si no se puede calcular BF (faltan datos), solo devuelve BMI si hay peso+altura.
 */
export function calcBodyComposition(
  input: NavyInput,
  weightKg: number | null | undefined,
): BodyComposition | null {
  const bf = calcBodyFatNavy(input);
  const bmi = computeBmi(weightKg, input.heightCm);

  // Sin BF ni BMI no hay nada útil que devolver
  if (bf == null && bmi == null) return null;

  const fatMass = bf != null && weightKg ? +(weightKg * bf / 100).toFixed(2) : null;
  const leanMass = bf != null && weightKg ? +(weightKg - weightKg * bf / 100).toFixed(2) : null;

  return {
    bodyFatPct: bf ?? 0,
    fatMassKg: fatMass,
    leanMassKg: leanMass,
    bmi,
    category: bf != null ? bmiCategory(input.gender, bf) : 'average',
  };
}

/**
 * IMC = peso / altura²  (altura en metros)
 */
export function computeBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  if (heightM <= 0) return null;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}

/**
 * Categoría de grasa corporal según ACE (American Council on Exercise):
 *  Mujeres: essential <14, athletes 14-20, fitness 21-24, average 25-31, obese >=32
 *  Hombres: essential <6,  athletes 6-13,  fitness 14-17, average 18-24, obese >=25
 */
export function bmiCategory(
  gender: Gender | null | undefined,
  bodyFatPct: number,
): BodyComposition['category'] {
  if (gender === 'female') {
    if (bodyFatPct < 14) return 'essential';
    if (bodyFatPct < 21) return 'athletes';
    if (bodyFatPct < 25) return 'fitness';
    if (bodyFatPct < 32) return 'average';
    return 'obese';
  }
  if (gender === 'male') {
    if (bodyFatPct < 6) return 'essential';
    if (bodyFatPct < 14) return 'athletes';
    if (bodyFatPct < 18) return 'fitness';
    if (bodyFatPct < 25) return 'average';
    return 'obese';
  }
  return 'average';
}

export const CATEGORY_LABELS: Record<BodyComposition['category'], string> = {
  essential: 'Esencial',
  athletes: 'Atlético',
  fitness: 'Fitness',
  average: 'Promedio',
  obese: 'Alto',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, +n.toFixed(2)));
}