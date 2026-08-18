'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RotateCw } from 'lucide-react';

export type MuscleKey = 'pecho' | 'espalda' | 'pierna' | 'hombro' | 'brazo' | 'core';

export type MuscleTrend = 'up' | 'down' | 'flat' | 'unknown';

export interface MuscleDatum {
  trend: MuscleTrend;
  delta: number | null;
  label: string;
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
  up: { fill: '#22c55e', soft: '#86efac', border: '#15803d', label: 'mejoró' },
  down: { fill: '#3b82f6', soft: '#93c5fd', border: '#1d4ed8', label: 'mejoró (a menor)' },
  flat: { fill: '#fbbf24', soft: '#fde68a', border: '#b45309', label: 'igual' },
  unknown: { fill: '#e5e7eb', soft: '#f3f4f6', border: '#9ca3af', label: 'sin datos' },
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
              view === 'front' ? 'bg-white shadow-xs text-primary-700' : 'text-ink-500'
            }`}
          >
            Vista frontal
          </button>
          <button
            type="button"
            onClick={() => setView('back')}
            className={`px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1 ${
              view === 'back' ? 'bg-white shadow-xs text-primary-700' : 'text-ink-500'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            Vista dorsal
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-6 items-start">
        {/* SVG anatómico */}
        <div className="relative mx-auto" style={{ maxWidth: 220 }}>
          <svg
            viewBox="0 0 200 460"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-sm"
            aria-label="Diagrama corporal de mejoras"
          >
            {view === 'front' ? <FrontView data={data} onActive={setActive} active={active} /> : <BackView data={data} onActive={setActive} active={active} />}
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
                    {d.hasData ? d.label : '—'}
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

function FrontView({ data, onActive, active }: ViewProps) {
  const c = (k: MuscleKey) => colors(data[k]?.trend ?? 'unknown', !!data[k]?.hasData);
  const op = (k: MuscleKey) => active === k ? 0.85 : 1;

  return (
    <g>
      {/* Cuerpo base (silueta) */}
      <defs>
        <linearGradient id="bodyBaseFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>

      {/* Cabeza */}
      <ellipse cx="100" cy="32" rx="22" ry="26" fill="url(#bodyBaseFront)" stroke="#92400e" strokeWidth="1.2" />
      {/* Cuello */}
      <path d="M85 56 Q100 62 115 56 L115 70 L85 70 Z" fill="#fde68a" stroke="#92400e" strokeWidth="1" />

      {/* Hombros */}
      <path
        id="front-hombro-izq"
        d="M40 78 Q60 70 85 75 L88 92 Q60 95 45 95 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={op('hombro')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        id="front-hombro-der"
        d="M160 78 Q140 70 115 75 L112 92 Q140 95 155 95 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={op('hombro')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Pecho (pectorales) */}
      <path
        id="front-pecho-izq"
        d="M62 95 Q80 92 100 95 Q100 130 80 138 Q60 134 58 110 Z"
        fill={c('pecho').fill}
        stroke={c('pecho').border}
        strokeWidth="1.2"
        opacity={op('pecho')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('pecho')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        id="front-pecho-der"
        d="M138 95 Q120 92 100 95 Q100 130 120 138 Q140 134 142 110 Z"
        fill={c('pecho').fill}
        stroke={c('pecho').border}
        strokeWidth="1.2"
        opacity={op('pecho')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('pecho')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Línea central del torso */}
      <line x1="100" y1="95" x2="100" y2="200" stroke="#92400e" strokeWidth="0.6" opacity="0.3" />

      {/* Core / Abdominales */}
      <path
        id="front-core"
        d="M62 138 Q100 145 138 138 L135 200 Q100 210 65 200 Z"
        fill={c('core').fill}
        stroke={c('core').border}
        strokeWidth="1.2"
        opacity={op('core')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('core')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Líneas de abdominales (six-pack sutil) */}
      <g opacity="0.25" stroke="#92400e" strokeWidth="0.5">
        <line x1="80" y1="150" x2="120" y2="150" />
        <line x1="78" y1="165" x2="122" y2="165" />
        <line x1="80" y1="180" x2="120" y2="180" />
        <line x1="100" y1="145" x2="100" y2="195" />
      </g>

      {/* Brazos (bíceps frontal) */}
      <path
        id="front-brazo-izq"
        d="M40 78 L52 78 Q45 130 48 175 L36 178 Q28 130 30 85 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={op('brazo')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        id="front-brazo-der"
        d="M160 78 L148 78 Q155 130 152 175 L164 178 Q172 130 170 85 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={op('brazo')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Antebrazos */}
      <ellipse cx="34" cy="195" rx="7" ry="22" fill={c('brazo').fill} stroke={c('brazo').border} strokeWidth="1" opacity={op('brazo')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('brazo')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="166" cy="195" rx="7" ry="22" fill={c('brazo').fill} stroke={c('brazo').border} strokeWidth="1" opacity={op('brazo')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('brazo')} onMouseLeave={() => onActive(null)} />

      {/* Piernas (cuádriceps) */}
      <path
        id="front-pierna-izq"
        d="M68 200 Q80 205 95 200 L92 320 Q78 325 70 320 Z"
        fill={c('pierna').fill}
        stroke={c('pierna').border}
        strokeWidth="1.2"
        opacity={op('pierna')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('pierna')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        id="front-pierna-der"
        d="M132 200 Q120 205 105 200 L108 320 Q122 325 130 320 Z"
        fill={c('pierna').fill}
        stroke={c('pierna').border}
        strokeWidth="1.2"
        opacity={op('pierna')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('pierna')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Cuádriceps detalle (línea sutil) */}
      <path d="M75 215 Q80 260 78 305" fill="none" stroke={c('pierna').border} strokeWidth="0.5" opacity="0.4" />
      <path d="M125 215 Q120 260 122 305" fill="none" stroke={c('pierna').border} strokeWidth="0.5" opacity="0.4" />

      {/* Pantorrillas */}
      <ellipse cx="80" cy="370" rx="14" ry="38" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="370" rx="14" ry="38" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Pies */}
      <ellipse cx="80" cy="430" rx="10" ry="6" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      <ellipse cx="120" cy="430" rx="10" ry="6" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
    </g>
  );
}

function BackView({ data, onActive, active }: ViewProps) {
  const c = (k: MuscleKey) => colors(data[k]?.trend ?? 'unknown', !!data[k]?.hasData);
  const op = (k: MuscleKey) => active === k ? 0.85 : 1;

  return (
    <g>
      <defs>
        <linearGradient id="bodyBaseBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>

      {/* Cabeza */}
      <ellipse cx="100" cy="32" rx="22" ry="26" fill="url(#bodyBaseBack)" stroke="#92400e" strokeWidth="1.2" />
      {/* Cuello */}
      <path d="M85 56 Q100 62 115 56 L115 70 L85 70 Z" fill="#fde68a" stroke="#92400e" strokeWidth="1" />

      {/* Hombros (traseros) */}
      <path
        d="M40 78 Q60 70 85 75 L88 92 Q60 95 45 95 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={op('hombro')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M160 78 Q140 70 115 75 L112 92 Q140 95 155 95 Z"
        fill={c('hombro').fill}
        stroke={c('hombro').border}
        strokeWidth="1.2"
        opacity={op('hombro')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('hombro')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Espalda (dorsal / trapecio) */}
      <path
        id="back-espalda-sup"
        d="M62 92 Q100 88 138 92 L138 130 Q100 138 62 130 Z"
        fill={c('espalda').fill}
        stroke={c('espalda').border}
        strokeWidth="1.2"
        opacity={op('espalda')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('espalda')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        id="back-espalda-inf"
        d="M68 132 Q100 138 132 132 L130 195 Q100 205 70 195 Z"
        fill={c('espalda').fill}
        stroke={c('espalda').border}
        strokeWidth="1.2"
        opacity={op('espalda')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('espalda')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Dorsal lateral (alas) */}
      <path
        d="M55 110 Q60 140 65 175 L70 175 Q65 140 60 115 Z"
        fill={c('espalda').soft}
        stroke={c('espalda').border}
        strokeWidth="1"
        opacity={op('espalda') * 0.7}
      />
      <path
        d="M145 110 Q140 140 135 175 L130 175 Q135 140 140 115 Z"
        fill={c('espalda').soft}
        stroke={c('espalda').border}
        strokeWidth="1"
        opacity={op('espalda') * 0.7}
      />

      {/* Core (espalda baja, gris) */}
      <path
        d="M70 200 Q100 205 130 200 L128 215 Q100 220 72 215 Z"
        fill={c('core').fill}
        stroke={c('core').border}
        strokeWidth="1"
        opacity={op('core') * 0.6}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('core')}
        onMouseLeave={() => onActive(null)}
      />

      {/* Brazos (tríceps) */}
      <path
        d="M40 78 L52 78 Q45 130 48 175 L36 178 Q28 130 30 85 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={op('brazo')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <path
        d="M160 78 L148 78 Q155 130 152 175 L164 178 Q172 130 170 85 Z"
        fill={c('brazo').fill}
        stroke={c('brazo').border}
        strokeWidth="1.2"
        opacity={op('brazo')}
        className="cursor-pointer transition-opacity"
        onMouseEnter={() => onActive('brazo')}
        onMouseLeave={() => onActive(null)}
      />
      <ellipse cx="34" cy="195" rx="7" ry="22" fill={c('brazo').fill} stroke={c('brazo').border} strokeWidth="1" opacity={op('brazo')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('brazo')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="166" cy="195" rx="7" ry="22" fill={c('brazo').fill} stroke={c('brazo').border} strokeWidth="1" opacity={op('brazo')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('brazo')} onMouseLeave={() => onActive(null)} />

      {/* Piernas (isquiotibiales y gemelos) */}
      <ellipse cx="80" cy="280" rx="13" ry="80" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1.2" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="280" rx="13" ry="80" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1.2" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="80" cy="380" rx="13" ry="30" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />
      <ellipse cx="120" cy="380" rx="13" ry="30" fill={c('pierna').fill} stroke={c('pierna').border} strokeWidth="1" opacity={op('pierna')} className="cursor-pointer transition-opacity" onMouseEnter={() => onActive('pierna')} onMouseLeave={() => onActive(null)} />

      {/* Pies */}
      <ellipse cx="80" cy="430" rx="10" ry="6" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
      <ellipse cx="120" cy="430" rx="10" ry="6" fill="#fde68a" stroke="#92400e" strokeWidth="1" />
    </g>
  );
}

function MuscleDetail({ name, datum }: { name: string; datum: MuscleDatum }) {
  const c = colors(datum.trend, datum.hasData);
  const Icon =
    !datum.hasData || datum.trend === 'flat' || datum.trend === 'unknown'
      ? Minus
      : datum.trend === 'up'
        ? TrendingUp
        : TrendingDown;

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
      {datum.hasData ? (
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
            <Icon className="w-5 h-5 ml-auto" style={{ color: c.border }} />
          </div>
          <p className="text-sm text-ink-700 mt-2 leading-relaxed">{datum.message}</p>
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