'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type MuscleKey = 'pecho' | 'espalda' | 'pierna' | 'hombro' | 'brazo' | 'core';

export type MuscleTrend = 'up' | 'down' | 'flat' | 'unknown';

export interface MuscleDatum {
  /** 'up' o 'down' indica dirección del cambio; 'flat' cuando el delta es < umbral. */
  trend: MuscleTrend;
  /** Cambio absoluto (en cm o %) con signo (+/-). */
  delta: number | null;
  /** Etiqueta legible, p.ej. '+1.5 cm' o '-0.8 kg'. */
  label: string;
  /** Mensaje motivador. */
  message: string;
  /** false cuando no hay datos suficientes. */
  hasData: boolean;
}

export interface HumanBodySVGProps {
  data: Partial<Record<MuscleKey, MuscleDatum>>;
}

const MUSCLE_COLORS: Record<MuscleKey, string> = {
  pecho: '#fca5a5',    // base rosado suave
  espalda: '#93c5fd',
  pierna: '#86efac',
  hombro: '#fcd34d',
  brazo: '#c4b5fd',
  core: '#f9a8d4',
};

const MUSCLE_LABEL: Record<MuscleKey, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  pierna: 'Pierna',
  hombro: 'Hombro',
  brazo: 'Brazo',
  core: 'Core / Cintura',
};

function trendColor(trend: MuscleTrend, hasData: boolean): string {
  if (!hasData) return '#e5e7eb'; // gris claro: sin datos
  if (trend === 'up') return '#22c55e'; // verde
  if (trend === 'down') return '#3b82f6'; // azul (down para cintura/grasa es bueno)
  return '#fbbf24'; // amarillo: flat
}

function trendAccent(trend: MuscleTrend, hasData: boolean): string {
  if (!hasData) return '#9ca3af';
  if (trend === 'up') return '#16a34a';
  if (trend === 'down') return '#2563eb';
  return '#d97706';
}

export default function HumanBodySVG({ data }: HumanBodySVGProps) {
  const [active, setActive] = useState<MuscleKey | null>(null);

  const activeData = active ? data[active] : null;

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6 items-center">
      {/* SVG cuerpo humano — vista frontal simple */}
      <div className="relative mx-auto" style={{ maxWidth: 240 }}>
        <svg
          viewBox="0 0 120 280"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-label="Diagrama corporal de mejoras"
        >
          {/* Cabeza */}
          <circle cx="60" cy="22" r="14" fill="#fde68a" stroke="#92400e" strokeWidth="1" />

          {/* Cuello */}
          <rect x="55" y="34" width="10" height="8" fill="#fde68a" stroke="#92400e" strokeWidth="1" />

          {/* Hombros */}
          <path
            id="muscle-hombro-izq"
            d="M30 50 Q45 42 55 50 L55 60 L30 60 Z"
            fill={trendColor(data.hombro?.trend ?? 'unknown', !!data.hombro?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('hombro')}
            onMouseLeave={() => setActive(null)}
          />
          <path
            id="muscle-hombro-der"
            d="M90 50 Q75 42 65 50 L65 60 L90 60 Z"
            fill={trendColor(data.hombro?.trend ?? 'unknown', !!data.hombro?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('hombro')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Pecho */}
          <path
            id="muscle-pecho"
            d="M40 60 L80 60 L82 90 Q60 96 38 90 Z"
            fill={trendColor(data.pecho?.trend ?? 'unknown', !!data.pecho?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('pecho')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Core / Cintura */}
          <path
            id="muscle-core"
            d="M40 92 Q60 98 80 92 L78 130 Q60 138 42 130 Z"
            fill={trendColor(data.core?.trend ?? 'unknown', !!data.core?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('core')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Espalda (representada como línea detrás, grisada) */}
          <path
            id="muscle-espalda"
            d="M40 60 L80 60 L78 92 Q60 96 42 92 Z"
            fill={trendColor(data.espalda?.trend ?? 'unknown', !!data.espalda?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            opacity="0.45"
            className="cursor-pointer transition-all hover:opacity-60"
            onMouseEnter={() => setActive('espalda')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Brazos */}
          <path
            id="muscle-brazo-izq"
            d="M22 50 L30 50 L30 110 L24 112 L18 60 Z"
            fill={trendColor(data.brazo?.trend ?? 'unknown', !!data.brazo?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('brazo')}
            onMouseLeave={() => setActive(null)}
          />
          <path
            id="muscle-brazo-der"
            d="M98 50 L90 50 L90 110 L96 112 L102 60 Z"
            fill={trendColor(data.brazo?.trend ?? 'unknown', !!data.brazo?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('brazo')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Piernas */}
          <path
            id="muscle-pierna-izq"
            d="M40 132 L60 132 L58 215 L42 215 Z"
            fill={trendColor(data.pierna?.trend ?? 'unknown', !!data.pierna?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('pierna')}
            onMouseLeave={() => setActive(null)}
          />
          <path
            id="muscle-pierna-der"
            d="M62 132 L80 132 L78 215 L62 215 Z"
            fill={trendColor(data.pierna?.trend ?? 'unknown', !!data.pierna?.hasData)}
            stroke="#78350f"
            strokeWidth="1"
            className="cursor-pointer transition-all hover:opacity-80"
            onMouseEnter={() => setActive('pierna')}
            onMouseLeave={() => setActive(null)}
          />

          {/* Línea central del cuerpo (sutil) */}
          <line x1="60" y1="60" x2="60" y2="215" stroke="#92400e" strokeWidth="0.5" opacity="0.3" />
        </svg>

        {/* Leyenda de colores */}
        <div className="flex justify-center gap-3 mt-2 text-[10px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} />
            mejora
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24' }} />
            igual
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e7eb' }} />
            sin datos
          </span>
        </div>
      </div>

      {/* Panel de detalle */}
      <div>
        {activeData && active ? (
          <MuscleDetail name={MUSCLE_LABEL[active]} datum={activeData} />
        ) : (
          <div className="text-sm text-ink-500 bg-ink-50 rounded-lg p-4 border border-ink-200">
            <p className="font-medium text-ink-700 mb-1">👆 Toca una zona del cuerpo</p>
            <p>
              Cada color muestra si esa parte <em>mejoró</em>, <em>se mantuvo</em> o
              aún <em>no tenemos datos</em>. La comparación es contra tu medición del
              mes pasado.
            </p>
          </div>
        )}

        {/* Mini-listado rápido */}
        <div className="grid grid-cols-2 gap-1.5 mt-4">
          {(Object.keys(MUSCLE_LABEL) as MuscleKey[]).map((key) => {
            const d = data[key];
            if (!d) return null;
            const c = trendAccent(d.trend, d.hasData);
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setActive(key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(key)}
                onBlur={() => setActive(null)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs border transition-colors text-left ${
                  active === key
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-ink-200 bg-white hover:bg-ink-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: c }}
                />
                <span className="font-medium text-ink-700">{MUSCLE_LABEL[key]}</span>
                <span className="ml-auto tabular-nums text-[10px] text-ink-500">
                  {d.hasData ? d.label : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MuscleDetail({ name, datum }: { name: string; datum: MuscleDatum }) {
  const Icon =
    !datum.hasData || datum.trend === 'flat'
      ? Minus
      : datum.trend === 'up'
        ? TrendingUp
        : TrendingDown;

  const color = trendAccent(datum.trend, datum.hasData);

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: color }}
        />
        <h3 className="font-bold text-ink-900">{name}</h3>
      </div>
      {datum.hasData ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold tabular-nums"
              style={{ color }}
            >
              {datum.delta != null && datum.delta > 0 ? '+' : ''}
              {datum.delta?.toFixed(1) ?? '0'}
            </span>
            <span className="text-sm text-ink-500">{datum.label.replace(/^[+-]/, '').trim()}</span>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="text-sm text-ink-600 mt-2">{datum.message}</p>
        </>
      ) : (
        <>
          <p className="text-base text-ink-500 mt-1">Aún sin datos</p>
          <p className="text-sm text-ink-500 mt-2">
            Pídele a tu coach que registre tus medidas este mes para ver cómo
            evoluciona esta zona.
          </p>
        </>
      )}
    </div>
  );
}

export { MUSCLE_LABEL };