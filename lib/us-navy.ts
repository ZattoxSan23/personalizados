/**
 * Fórmulas para estimar porcentaje de grasa corporal y composición.
 *
 * US Navy (Hodgdon-Beckett 1984) — más precisa (±3-4% vs DEXA), NO usa edad.
 *   Hombres:  BF% = 495 / (1.0324 − 0.19077·log10(cintura−cuello) + 0.15456·log10(altura)) − 450
 *   Mujeres:  BF% = 495 / (1.29579 − 0.35004·log10(cintura+cadera−cuello) + 0.22100·log10(altura)) − 450
 *
 * Deurenberg (1991) — menos precisa (±4% vs DEXA), SÍ usa edad + BMI + sexo.
 *   BF% = 1.20·BMI + 0.23·edad − 10.8·sexo − 5.4    (sexo: hombre=1, mujer=0)
 *
 * Relación Cintura-Cadera (RCC) — métrica de riesgo cardiovascular según OMS.
 *   Hombres: <0.90 bajo · 0.90–0.99 moderado · ≥1.00 alto
 *   Mujeres: <0.85 bajo · 0.85–0.99 moderado · ≥1.00 alto
 *
 * Todas las medidas en CENTÍMETROS. Peso en KILOGRAMOS. Edad en AÑOS.
 *
 * Limitaciones generales:
 * - Aproximaciones, no sustituyen DEXA ni BodPod
 * - No aptas para menores de 18 ni para BMI extremos (<18.5 o >35)
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
  /** % grasa por US Navy (más preciso, sin edad). */
  bodyFatPct: number | null;
  /** % grasa por Deurenberg (menos preciso, usa edad + BMI). */
  deurenbergBodyFatPct: number | null;
  /** Edad calculada desde birthDate. */
  ageYears: number | null;
  /** IMC. */
  bmi: number | null;
  /** Masa grasa (kg). */
  fatMassKg: number | null;
  /** Masa magra (kg). */
  leanMassKg: number | null;
  /** Categoría ACE basada en US Navy (si está disponible). */
  category: 'essential' | 'athletes' | 'fitness' | 'average' | 'obese';
  /** Relación cintura / cadera. */
  waistHipRatio: number | null;
  /** Riesgo cardiovascular según OMS basado en RCC + sexo. */
  whrRisk: 'low' | 'moderate' | 'high' | 'unknown';
}

/**
 * Calcula la edad exacta en años desde una fecha de nacimiento (YYYY-MM-DD).
 * Devuelve null si la fecha es inválida o no está presente.
 */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  refDate: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  // birthDate está guardado como "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const birth = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (Number.isNaN(birth.getTime())) return null;

  let age = refDate.getUTCFullYear() - birth.getUTCFullYear();
  const mDiff = refDate.getUTCMonth() - birth.getUTCMonth();
  if (mDiff < 0 || (mDiff === 0 && refDate.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
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
 * Calcula % grasa con la fórmula Deurenberg (1991).
 * Usa BMI + edad + sexo. Útil cuando NO se tienen circunferencias.
 * Devuelve null si falta BMI o edad.
 */
export function calcBodyFatDeurenberg(input: {
  gender: Gender | null | undefined;
  bmi: number | null | undefined;
  ageYears: number | null | undefined;
}): number | null {
  const { gender, bmi, ageYears } = input;
  if (!gender || bmi == null || ageYears == null) return null;
  if (bmi <= 0 || ageYears < 18 || ageYears > 100) return null;
  const sexFactor = gender === 'male' ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * ageYears - 10.8 * sexFactor - 5.4;
  return clamp(bf, 3, 60);
}

/**
 * Relación cintura / cadera. Devuelve null si falta cintura o cadera.
 */
export function calcWaistHipRatio(input: {
  waistCm: number | null | undefined;
  hipsCm: number | null | undefined;
}): number | null {
  const { waistCm, hipsCm } = input;
  if (!waistCm || !hipsCm) return null;
  if (waistCm <= 0 || hipsCm <= 0) return null;
  return +(waistCm / hipsCm).toFixed(2);
}

/**
 * Riesgo cardiovascular según OMS basado en RCC + sex.
 *   Hombres: <0.90 bajo · 0.90–0.99 moderado · ≥1.00 alto
 *   Mujeres: <0.85 bajo · 0.85–0.99 moderado · ≥1.00 alto
 */
export function whrRiskCategory(
  gender: Gender | null | undefined,
  ratio: number | null,
): BodyComposition['whrRisk'] {
  if (ratio == null || !gender) return 'unknown';
  if (gender === 'male') {
    if (ratio < 0.9) return 'low';
    if (ratio < 1.0) return 'moderate';
    return 'high';
  }
  // female
  if (ratio < 0.85) return 'low';
  if (ratio < 1.0) return 'moderate';
  return 'high';
}

export const WHR_RISK_LABELS: Record<BodyComposition['whrRisk'], string> = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  unknown: '—',
};

/**
 * Calcula composición corporal completa (US Navy + Deurenberg + RCC + BMI + edad).
 * Si no se puede calcular BF (faltan datos), solo devuelve lo que esté disponible.
 */
export function calcBodyComposition(
  input: NavyInput & { ageYears?: number | null; birthDate?: string | null },
  weightKg: number | null | undefined,
): BodyComposition | null {
  const bmi = computeBmi(weightKg, input.heightCm);
  const navy = calcBodyFatNavy(input);
  const ageYears = input.ageYears ?? ageFromBirthDate(input.birthDate ?? null);
  const deurenberg = calcBodyFatDeurenberg({
    gender: input.gender,
    bmi,
    ageYears,
  });
  const whr = calcWaistHipRatio({
    waistCm: input.waistCm,
    hipsCm: input.hipsCm,
  });
  const risk = whrRiskCategory(input.gender, whr);

  // Sin nada útil, no devolvemos objeto
  if (navy == null && deurenberg == null && bmi == null && whr == null && ageYears == null) {
    return null;
  }

  const bfSource = navy ?? deurenberg;
  const fatMass = bfSource != null && weightKg ? +(weightKg * bfSource / 100).toFixed(2) : null;
  const leanMass = bfSource != null && weightKg ? +(weightKg - weightKg * bfSource / 100).toFixed(2) : null;

  return {
    bodyFatPct: navy,
    deurenbergBodyFatPct: deurenberg,
    ageYears,
    bmi,
    fatMassKg: fatMass,
    leanMassKg: leanMass,
    category: navy != null ? bmiCategory(input.gender, navy) : 'average',
    waistHipRatio: whr,
    whrRisk: risk,
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