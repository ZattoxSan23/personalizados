'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RotateCw } from 'lucide-react';

export type MuscleKey = 'pecho' | 'espalda' | 'pierna' | 'hombro' | 'brazo' | 'core';

export type MuscleTrend = 'up' | 'down' | 'flat' | 'unknown';

export interface MuscleDatum {
  trend: MuscleTrend;
  delta: number | null;
  label: string;
  currentValue: number | null;
  unit: string;
  message: string;
  hasData: boolean;
}

export interface HumanBodySVGProps {
  data: Partial<Record<MuscleKey, MuscleDatum>>;
}

const MUSCLE_LABEL: Record<MuscleKey, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  pierna: 'Pierna',
  hombro: 'Hombro',
  brazo: 'Brazo',
  core: 'Core',
};

const TREND_COLORS = {
  up:   { fill: '#22c55e', soft: '#bbf7d0', border: '#15803d' },
  down: { fill: '#3b82f6', soft: '#bfdbfe', border: '#1d4ed8' },
  flat: { fill: '#fbbf24', soft: '#fde68a', border: '#b45309' },
  unknown: { fill: '#e5e7eb', soft: '#f3f4f6', border: '#9ca3af' },
} as const;

function colors(trend: MuscleTrend, hasData: boolean) {
  if (!hasData) return TREND_COLORS.unknown;
  if (trend === 'up') return TREND_COLORS.up;
  if (trend === 'down') return TREND_COLORS.down;
  if (trend === 'flat') return TREND_COLORS.flat;
  return TREND_COLORS.unknown;
}

export default function HumanBodySVG({ data }: HumanBodySVGProps) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [active, setActive] = useState<MuscleKey | null>(null);

  const activeData = active ? data[active] : null;

  return (
    <div className="space-y-4">
      {/* Tabs front/back */}
      <div className="flex justify-center">
        <div className="inline-flex bg-ink-100 rounded-full text-xs font-medium">
          <button
            type="button"
            onClick={() => setView('front')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              view === 'front' ? 'bg-white shadow-xs text-primary-700' :'text-ink-500'
            }`}
          >
            Vista frontal
          </button>
          <button
            type="button"
            onClick={() => setView('back')}
            className={`px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1 ${
              view === 'back' ? 'bg-white shadow-xs text-primary-700' :'text-ink-500'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            Vista dorsal
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
        {/* SVG anatómico */}
        <div className="relative mx-auto" style={{ maxWidth: 240 }}>
          <svg
            viewBox="0 0 200 480"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
            aria-label="Diagrama corporal de mejoras"
          >
            <defs>
              <linearGradient id="skinFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fcd9b6" />
                <stop offset="100%" stopColor="#f5b78a" />
              </linearGradient>
              <linearGradient id="skinBack" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fcd9b6" />
                <stop offset="100%" stopColor="#f5b78a" />
              </linearGradient>
              <radialGradient id="muscleShade" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
              </radialGradient>
            </defs>

            {view === 'front' ? (
              <FrontView data={data} onActive={setActive} active={active} />
            ) : (
              <BackView data={data} onActive={setActive} active={active} />
            )}
          </svg>

          {/* Leyenda */}
          <div className="flex justify-center gap-2 mt-3 text-[10px] text-ink-500">
            <Legend color="#22c55e" label="mejoró" />
            <Legend color="#fbbf24" label="igual" />
            <Legend color="#3b82f6" label="a menor" />
            <Legend color="#e5e7eb" label="sin datos" />
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="space-y-3">
          {activeData && active ? (
            <MuscleDetail name={MUSCLE_LABEL[active]} datum={activeData} />
          ) : (
            <div className="text-sm text-ink-600 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-100">
              <p className="font-semibold text-primary-900 mb-1.5">👆 Toca una zona del cuerpo</p>
              <p className="leading-relaxed">
                Cada color te dice si esa parte <strong className="text-success">mejoró</strong>,
                se <strong className="text-warning">mantuvo</strong> o aún
                <strong className="text-ink-500"> no tenemos datos</strong>.
                La comparación es contra tu medición del mes pasado.
              </p>
            </div>
          )}

          {/* Mini-listado */}
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(MUSCLE_LABEL) as MuscleKey[]).map((key) => {
              const d = data[key];
              if (!d) return null;
              const c = colors(d.trend, d.hasData);
              const displayLabel = d.hasData
                ? (d.delta != null ? d.label : `${d.currentValue?.toFixed(1)}${d.unit}`)
                : '—';
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
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white"
                    style={{ background: c.fill }}
                  />
                  <span className="font-medium text-ink-700">{MUSCLE_LABEL[key]}</span>
                  <span className="ml-auto tabular-nums text-[10px] text-ink-500">
                    {displayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="w-3 h-3 rounded-full ring-1 ring-ink-200"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

interface ViewProps {
  data: Partial<Record<MuscleKey, MuscleDatum>>;
  onActive: (k: MuscleKey | null) => void;
  active: MuscleKey | null;
}

function muscle(d: Partial<Record<MuscleKey, MuscleDatum>>, k: MuscleKey) {
  const dat = d[k];
  return colors(dat?.trend ?? 'unknown', !!dat?.hasData);
}
function op(d: Partial<Record<MuscleKey, MuscleDatum>>, k: MuscleKey, active: MuscleKey | null) {
  return active === k ? 0.85 : 1;
}
function cursor(d: Partial<Record<MuscleKey, MuscleDatum>>, k: MuscleKey) {
  return d[k]?.hasData ? 'cursor-pointer transition-opacity' : 'cursor-default opacity-70';
}

function FrontView({ data, onActive, active }: ViewProps) {
  const c = (k: MuscleKey) => muscle(data, k);
  const o = (k: MuscleKey) => op(data, k, active);
  const cur = (k: MuscleKey) => cursor(data, k);

  return (
    <g>
      {/* Sombra base del cuerpo (silueta neutral) */}
      <ellipse cx="100" cy="455" rx="55" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Cabeza */}
      <ellipse cx="100" cy="32" rx="22" ry="27" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="1.2" />
      {/* Pelo */}
      <path d="M78 22 Q100 8 122 22 Q120 14 100 12 Q80 14 78 22 Z" fill="#3a2418" />
      {/* Orejas */}
      <ellipse cx="77" cy="36" rx="3" ry="5" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="123" cy="36" rx="3" ry="5" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />
      {/* Cuello */}
      <path d="M85 56 Q100 64 115 56 L116 76 L84 76 Z" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="1" />
      <line x1="92" y1="68" x2="108" y2="68" stroke="#a86b3d" strokeWidth="0.5" opacity="0.5" />

      {/* Trapecio frontal */}
      <path d="M82 76 L118 76 L116 88 Q100 92 84 88 Z" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="1" />

      {/* Hombros (deltoides) */}
      <path
        d="M48 84 Q70 76 86 80 L92 102 Q72 108 50 106 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={o('hombro')}
        className={cur('hombro')}
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M152 84 Q130 76 114 80 L108 102 Q128 108 150 106 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={o('hombro')}
        className={cur('hombro')}
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Pecho (pectorales) */}
      <path
        d="M70 100 Q88 96 100 100 Q100 132 88 144 Q72 142 64 120 Z"
        fill={c('pecho').fill}
        stroke={c('pecho').border}
        strokeWidth="1.2"
        opacity={o('pecho')}
        className={cur('pecho')}
        onMouseEnter={() => onActive('pecho')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M130 100 Q112 96 100 100 Q100 132 112 144 Q128 142 136 120 Z"
        fill={c('pecho').fill}
        stroke={c('pecho').border}
        strokeWidth="1.2"
        opacity={o('pecho')}
        className={cur('pecho')}
        onMouseEnter={() => onActive('pecho')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Línea central (esternón) */}
      <line x1="100" y1="100" x2="100" y2="144" stroke={c('pecho').border} strokeWidth="0.5" opacity="0.4" />

      {/* Core / Abdominales */}
      <path
        d="M68 144 Q100 150 132 144 L130 220 Q100 230 70 220 Z"
        fill={c('core').fill}
        stroke={c('core').border}
        strokeWidth="1.2"
        opacity={o('core')}
        className={cur('core')}
        onMouseEnter={() => onActive('core')}
        onMouseLeave={() => onActive(null)}
      />
      {/* Líneas de six-pack */}
      <g opacity="0.4" stroke="#92400e" strokeWidth="0.7">
        <line x1="80" y1="160" x2="120" y2="160" />
        <line x1="78" y1="178" x2="122" y2="178" />
        <line x1="80" y1="196" x2="120" y2="196" />
        <line x1="100" y1="150" x2="100" y2="215" />
      </g>

      {/* Línea alba */}
      <line x1="100" y1="144" x2="100" y2="220" stroke={c('core').border} strokeWidth="0.5" opacity="0.3" />

      {/* Bíceps (brazos frontales) */}
      <path
        d="M50 106 Q62 102 70 110 Q70 140 64 165 L 50 168 Q44 140 42 110 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M150 106 Q138 102 130 110 Q130 140 136 165 L 150 168 Q156 140 158 110 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      {/* Bíceps detalle (línea de definición) */}
      <path d="M55 125 Q58 140 56 155" fill="none" stroke={c('brazo').border} strokeWidth="0.4" opacity="0.4" />
      <path d="M145 125 Q142 140 144 155" fill="none" stroke={c('brazo').border} strokeWidth="0.4" opacity="0.4" />

      {/* Antebrazos */}
      <path
        d="M50 168 Q56 168 64 165 L 60 200 Q52 204 46 200 L 44 174 Z"
        fill={c('brazo').soft}
        stroke={c('brazo').border}
        strokeWidth="1"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M150 168 Q144 168 136 165 L 140 200 Q148 204 154 200 L 156 174 Z"
        fill={c('brazo').soft}
        stroke={c('brazo').border}
        strokeWidth="1"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Manos */}
      <ellipse cx="50" cy="208" rx="6" ry="9" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="1" />
      <ellipse cx="150" cy="208" rx="6" ry="9" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="1" />

      {/* Piernas (cuádriceps) */}
      <path
        d="M68 220 Q80 224 94 222 L 92 320 Q78 326 70 322 L 66 270 Z"
        fill={c('pierna').fill}
        stroke={c('pierna').border}
        strokeWidth="1.2"
        opacity={o('pierna')}
        className={cur('pierna')}
        onMouseEnter={() => onActive('pierna')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M132 220 Q120 224 106 222 L 108 320 Q122 326 130 322 L 134 270 Z"
        fill={c('pierna').fill}
        stroke={c('pierna').border}
        strokeWidth="1.2"
        opacity={o('pierna')}
        className={cur('pierna')}
        onMouseEnter={() => onActive('pierna')}
        onMouseLeave={() => onActive(null)}
      />
      {/* Cuádriceps detalle */}
      <path d="M76 240 Q78 280 76 310" fill="none" stroke={c('pierna').border} strokeWidth="0.5" opacity="0.4" />
      <path d="M124 240 Q122 280 124 310" fill="none" stroke={c('pierna').border} strokeWidth="0.5" opacity="0.4" />

      {/* Pantorrillas */}
      <ellipse cx="80" cy="370" rx="14" ry="38" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="370" rx="14" ry="38" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Tobillos */}
      <ellipse cx="80" cy="420" rx="6" ry="10" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="120" cy="420" rx="6" ry="10" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />

      {/* Pies */}
      <ellipse cx="80" cy="442" rx="10" ry="6" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="120" cy="442" rx="10" ry="6" fill="url(#skinFront)" stroke="#a86b3d" strokeWidth="0.8" />
    </g>
  );
}

function BackView({ data, onActive, active }: ViewProps) {
  const c = (k: MuscleKey) => muscle(data, k);
  const o = (k: MuscleKey) => op(data, k, active);
  const cur = (k: MuscleKey) => cursor(data, k);

  return (
    <g>
      <ellipse cx="100" cy="455" rx="55" ry="6" fill="rgba(0,0,0,0.15)" />

      {/* Cabeza (detrás) */}
      <ellipse cx="100" cy="32" rx="22" ry="27" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="1.2" />
      <path d="M78 22 Q100 8 122 22 Q120 14 100 12 Q80 14 78 22 Z" fill="#3a2418" />
      <ellipse cx="77" cy="36" rx="3" ry="5" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="123" cy="36" rx="3" ry="5" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />

      {/* Cuello posterior */}
      <path d="M85 56 Q100 64 115 56 L116 76 L84 76 Z" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="1" />

      {/* Trapecio superior */}
      <path d="M82 76 L118 76 L116 100 Q100 106 84 100 Z" fill={c('espalda').soft} stroke={c('espalda').border} strokeWidth="1" opacity={o('espalda')} className={cur('espalda')} onMouseEnter={() => onActive('espalda')} onMouseLeave={() => onActive(null)} />

      {/* Hombros (deltoides posteriores) */}
      <path
        d="M48 84 Q70 76 86 80 L92 102 Q72 108 50 106 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={o('hombro')}
        className={cur('hombro')}
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M152 84 Q130 76 114 80 L108 102 Q128 108 150 106 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={o('hombro')}
        className={cur('hombro')}
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Dorsal ancho (lats) */}
      <path
        d="M58 100 Q60 150 70 200 L 86 198 Q80 150 76 100 Z"
        fill={c('espalda').fill}
        stroke={c('espalda').border}
        strokeWidth="1.2"
        opacity={o('espalda') * 0.9}
        className={cur('espalda')}
        onMouseEnter={() => onActive('espalda')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M142 100 Q140 150 130 200 L 114 198 Q120 150 124 100 Z"
        fill={c('espalda').fill}
        stroke={c('espalda').border}
        strokeWidth="1.2"
        opacity={o('espalda') * 0.9}
        className={cur('espalda')}
        onMouseEnter={() => onActive('espalda')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Dorsal central (espalda media) */}
      <path
        d="M76 100 L124 100 L122 195 Q100 200 78 195 Z"
        fill={c('espalda').soft}
        stroke={c('espalda').border}
        strokeWidth="1"
        opacity={o('espalda') * 0.8}
        className={cur('espalda')}
        onMouseEnter={() => onActive('espalda')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Espalda baja (lumbar) */}
      <path
        d="M72 198 Q100 204 128 198 L 126 222 Q100 230 74 222 Z"
        fill={c('core').fill}
        stroke={c('core').border}
        strokeWidth="1"
        opacity={o('core') * 0.7}
        className={cur('core')}
        onMouseEnter={() => onActive('core')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Glúteos */}
      <ellipse cx="80" cy="240" rx="20" ry="22" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="240" rx="20" ry="22" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Tríceps */}
      <path
        d="M50 106 Q62 102 70 110 Q70 140 64 165 L 50 168 Q44 140 42 110 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M150 106 Q138 102 130 110 Q130 140 136 165 L 150 168 Q156 140 158 110 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Antebrazos */}
      <path
        d="M50 168 Q56 168 64 165 L 60 200 Q52 204 46 200 L 44 174 Z"
        fill={c('brazo').soft}
        stroke={c('brazo').border}
        strokeWidth="1"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M150 168 Q144 168 136 165 L 140 200 Q148 204 154 200 L 156 174 Z"
        fill={c('brazo').soft}
        stroke={c('brazo').border}
        strokeWidth="1"
        opacity={o('brazo')}
        className={cur('brazo')}
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <ellipse cx="50" cy="208" rx="6" ry="9" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="1" />
      <ellipse cx="150" cy="208" rx="6" ry="9" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="1" />

      {/* Piernas (isquiotibiales) */}
      <ellipse cx="80" cy="290" rx="14" ry="55" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="290" rx="14" ry="55" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Gemelos */}
      <ellipse cx="80" cy="375" rx="13" ry="32" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="375" rx="13" ry="32" fill={c('pierna').soft} stroke={c('pierna').border} strokeWidth="1" opacity={o('pierna')} className={cur('pierna')} onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Tobillos */}
      <ellipse cx="80" cy="420" rx="6" ry="10" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="120" cy="420" rx="6" ry="10" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />

      {/* Pies */}
      <ellipse cx="80" cy="442" rx="10" ry="6" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />
      <ellipse cx="120" cy="442" rx="10" ry="6" fill="url(#skinBack)" stroke="#a86b3d" strokeWidth="0.8" />
    </g>
  );
}

function MuscleDetail({ name, datum }: { name: string; datum: MuscleDatum }) {
  const c = colors(datum.trend, datum.hasData);
  const showDelta = datum.hasData && datum.delta != null;
  const showCurrent = datum.hasData && datum.currentValue != null && !showDelta;

  return (
    <div
      className="rounded-lg border p-4 transition-all"
      style={{
        background: `linear-gradient(135deg, ${c.soft} 0%, white 60%)`,
        borderColor: c.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full ring-2 ring-white"
          style={{ background: c.fill }}
        />
        <h3 className="font-bold text-ink-900">{name}</h3>
      </div>
      {showDelta ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-extrabold tabular-nums tracking-tight"
              style={{ color: c.border }}
            >
              {datum.delta != null && datum.delta > 0 ? '+' : ''}
              {datum.delta?.toFixed(1) ?? '0'}
            </span>
            <span className="text-sm text-ink-500 font-medium">{datum.label.replace(/^[+-]/, '').trim()}</span>
            {datum.trend === 'up' ? (
              <TrendingUp className="w-5 h-5 ml-auto" style={{ color: c.border }} />
            ) : datum.trend === 'down' ? (
              <TrendingDown className="w-5 h-5 ml-auto" style={{ color: c.border }} />
            ) : (
              <Minus className="w-5 h-5 ml-auto" style={{ color: c.border }} />
            )}
          </div>
          <p className="text-sm text-ink-700 mt-2 leading-relaxed">{datum.message}</p>
        </>
      ) : showCurrent ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-ink-900">
              {datum.currentValue?.toFixed(1)}
            </span>
            <span className="text-sm text-ink-500 font-medium">{datum.unit}</span>
            <span className="text-xs text-ink-400 ml-auto">medición actual</span>
          </div>
          <p className="text-sm text-ink-700 mt-2 leading-relaxed">{datum.message}</p>
          <p className="text-xs text-ink-500 mt-1.5 italic">
            💡 Vuelve el próximo mes para ver cómo evoluciona.
          </p>
        </>
      ) : (
        <>
          <p className="text-base text-ink-500 mt-1 font-medium">Aún sin datos</p>
          <p className="text-sm text-ink-600 mt-2 leading-relaxed">
            {datum.message}
          </p>
        </>
      )}
    </div>
  );
}

export { MUSCLE_LABEL };