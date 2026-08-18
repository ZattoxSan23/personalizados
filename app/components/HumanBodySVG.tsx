'use client';

import { useState, useRef } from 'react';
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
  up:   { fill: 'rgba(34, 197, 94, 0.55)',  stroke: '#15803d' },
  down: { fill: 'rgba(59, 130, 246, 0.55)',  stroke: '#1d4ed8' },
  flat: { fill: 'rgba(251, 191, 36, 0.55)',  stroke: '#b45309' },
  unknown: { fill: 'rgba(229, 231, 235, 0.35)', stroke: '#9ca3af' },
} as const;

function colors(trend: MuscleTrend, hasData: boolean) {
  if (!hasData) return TREND_COLORS.unknown;
  if (trend === 'up') return TREND_COLORS.up;
  if (trend === 'down') return TREND_COLORS.down;
  if (trend === 'flat') return TREND_COLORS.flat;
  return TREND_COLORS.unknown;
}

// Tonos cálidos piel para el cuerpo base (para que no sea solo negro)
const SKIN_FILL = '#fde68a';
const SKIN_STROKE = '#92400e';
const SILHOUETTE_FILL = '#e5e7eb';
const SILHOUETTE_STROKE = '#475569';

export default function HumanBodySVG({ data }: HumanBodySVGProps) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [active, setActive] = useState<MuscleKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function changeView(next: 'front' | 'back') {
    if (next !== view) {
      setActive(null);
      setView(next);
    }
  }

  function handleContainerLeave() {
    setActive(null);
  }

  const activeData = active ? data[active] : null;

  return (
    <div className="space-y-4">
      {/* Tabs front/back */}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Vista del cuerpo"
          className="inline-flex bg-ink-100 rounded-full text-xs font-medium p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'front'}
            onClick={() => changeView('front')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              view === 'front' ? 'bg-white shadow-xs text-primary-700' : 'text-ink-500'
            }`}
          >
            Vista frontal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'back'}
            onClick={() => changeView('back')}
            className={`px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1 ${
              view === 'back' ? 'bg-white shadow-xs text-primary-700' : 'text-ink-500'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            Vista dorsal
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">
        {/* SVG anatómico propio + hotspots encima */}
        <div
          ref={containerRef}
          className="relative mx-auto"
          style={{ width: 240, height: 400 }}
          onMouseLeave={handleContainerLeave}
          onBlur={handleContainerLeave}
        >
          <svg
            viewBox="0 0 240 400"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full select-none"
            aria-label={`Diagrama corporal - vista ${view === 'front' ? 'frontal' : 'dorsal'}`}
          >
            {view === 'front' ? <FrontBody /> : <BackBody />}
            {view === 'front'
              ? <FrontHotspots data={data} active={active} onActive={setActive} />
              : <BackHotspots data={data} active={active} onActive={setActive} />}
          </svg>

          {/* Leyenda */}
          <div className="flex justify-center gap-2 mt-3 text-[10px] text-ink-500">
            <Legend color="#22c55e" label="mejoró" />
            <Legend color="#fbbf24" label="igual" />
            <Legend color="#3b82f6" label="a menor" />
            <Legend color="#9ca3af" label="sin datos" />
          </div>
        </div>

        {/* Panel de detalle */}
        <div className="space-y-3">
          {activeData && active ? (
            <MuscleDetail name={MUSCLE_LABEL[active]} datum={activeData} />
          ) : (
            <div className="text-sm text-ink-600 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-100">
              <p className="font-semibold text-primary-900 mb-1.5">
                Toca una zona del cuerpo
              </p>
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
                  aria-pressed={active === key}
                  onClick={() => setActive(key)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs border transition-colors text-left ${
                    active === key
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-ink-200 bg-white hover:bg-ink-50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white"
                    style={{ background: c.fill.replace('0.55', '1').replace('0.35', '1') }}
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

/**
 * Vista frontal: silueta anatómica de pie, mirando al frente.
 * Skin tone, paths limpios, sin fondo.
 */
function FrontBody() {
  return (
    <g stroke={SKIN_STROKE} strokeWidth="1.2" strokeLinejoin="round">
      {/* Cabeza */}
      <ellipse cx="120" cy="28" rx="22" ry="26" fill={SKIN_FILL} />
      {/* Cuello */}
      <path d="M105 52 Q120 60 135 52 L137 75 L103 75 Z" fill={SKIN_FILL} />

      {/* Silueta del torso (silueta neutra) */}
      <path
        d="M75 80
           Q90 70 105 76
           L105 100
           L75 105
           L72 95
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M165 80
           Q150 70 135 76
           L135 100
           L165 105
           L168 95
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Pecho */}
      <path
        d="M75 100
           Q120 95 165 100
           L160 155
           Q120 168 80 155
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Core / abdomen */}
      <path
        d="M80 158
           Q120 165 160 158
           L156 220
           Q120 232 84 220
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Caderas */}
      <path
        d="M84 222
           Q120 228 156 222
           L154 248
           Q120 256 86 248
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Bíceps (brazos frontales) */}
      <path
        d="M75 105
           Q60 110 50 130
           L48 195
           Q58 200 70 195
           L75 130
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M165 105
           Q180 110 190 130
           L192 195
           Q182 200 170 195
           L165 130
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Antebrazos */}
      <path
        d="M48 198
           L72 195
           L68 245
           Q58 248 50 244
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M192 198
           L168 195
           L172 245
           Q182 248 190 244
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Manos */}
      <ellipse cx="55" cy="252" rx="6" ry="9" fill={SKIN_FILL} />
      <ellipse cx="185" cy="252" rx="6" ry="9" fill={SKIN_FILL} />

      {/* Piernas (cuádriceps) */}
      <path
        d="M86 250
           Q105 254 120 252
           L118 355
           Q104 360 90 356
           L85 280
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M154 250
           Q135 254 120 252
           L122 355
           Q136 360 150 356
           L155 280
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Pantorrillas */}
      <ellipse cx="103" cy="380" rx="13" ry="14" fill={SILHOUETTE_FILL} />
      <ellipse cx="137" cy="380" rx="13" ry="14" fill={SILHOUETTE_FILL} />

      {/* Tobillos */}
      <ellipse cx="103" cy="394" rx="4" ry="5" fill={SKIN_FILL} />
      <ellipse cx="137" cy="394" rx="4" ry="5" fill={SKIN_FILL} />
    </g>
  );
}

/**
 * Vista dorsal: silueta de espaldas.
 */
function BackBody() {
  return (
    <g stroke={SKIN_STROKE} strokeWidth="1.2" strokeLinejoin="round">
      {/* Cabeza */}
      <ellipse cx="120" cy="28" rx="22" ry="26" fill={SKIN_FILL} />
      {/* Cuello */}
      <path d="M105 52 Q120 60 135 52 L137 75 L103 75 Z" fill={SKIN_FILL} />

      {/* Silueta hombros */}
      <path
        d="M75 80
           Q90 70 105 76
           L105 100
           L75 105
           L72 95
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M165 80
           Q150 70 135 76
           L135 100
           L165 105
           L168 95
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Trapecio (cuello posterior) */}
      <path
        d="M105 75
           L135 75
           L137 100
           Q120 105 103 100
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Espalda (dorsal ancho) */}
      <path
        d="M75 102
           L165 102
           L162 200
           Q120 212 78 200
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Lumbar */}
      <path
        d="M82 205
           Q120 210 158 205
           L154 235
           Q120 240 86 235
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Glúteos */}
      <ellipse cx="105" cy="250" rx="20" ry="18" fill={SILHOUETTE_FILL} />
      <ellipse cx="135" cy="250" rx="20" ry="18" fill={SILHOUETTE_FILL} />

      {/* Tríceps */}
      <path
        d="M75 105
           Q60 110 50 130
           L48 195
           Q58 200 70 195
           L75 130
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M165 105
           Q180 110 190 130
           L192 195
           Q182 200 170 195
           L165 130
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Antebrazos */}
      <path
        d="M48 198
           L72 195
           L68 245
           Q58 248 50 244
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M192 198
           L168 195
           L172 245
           Q182 248 190 244
           Z"
        fill={SILHOUETTE_FILL}
      />
      <ellipse cx="55" cy="252" rx="6" ry="9" fill={SKIN_FILL} />
      <ellipse cx="185" cy="252" rx="6" ry="9" fill={SKIN_FILL} />

      {/* Piernas (isquiotibiales) */}
      <path
        d="M86 270
           Q105 274 120 272
           L118 355
           Q104 360 90 356
           L85 290
           Z"
        fill={SILHOUETTE_FILL}
      />
      <path
        d="M154 270
           Q135 274 120 272
           L122 355
           Q136 360 150 356
           L155 290
           Z"
        fill={SILHOUETTE_FILL}
      />

      {/* Gemelos */}
      <ellipse cx="103" cy="378" rx="14" ry="14" fill={SILHOUETTE_FILL} />
      <ellipse cx="137" cy="378" rx="14" ry="14" fill={SILHOUETTE_FILL} />

      {/* Tobillos */}
      <ellipse cx="103" cy="394" rx="4" ry="5" fill={SKIN_FILL} />
      <ellipse cx="137" cy="394" rx="4" ry="5" fill={SKIN_FILL} />
    </g>
  );
}

interface HotspotProps {
  data: Partial<Record<MuscleKey, MuscleDatum>>;
  active: MuscleKey | null;
  onActive: (k: MuscleKey) => void;
}

function Hotspot({
  x, y, w, h,
  keyName, data, active, onActive, rx = 8,
}: {
  x: number; y: number; w: number; h: number;
  keyName: MuscleKey;
  data: Partial<Record<MuscleKey, MuscleDatum>>;
  active: MuscleKey | null;
  onActive: (k: MuscleKey) => void;
  rx?: number;
}) {
  const dat = data[keyName];
  const c = colors(dat?.trend ?? 'unknown', !!dat?.hasData);
  const isActive = active === keyName;
  const hasData = !!dat?.hasData;

  return (
    <rect
      x={x} y={y} width={w} height={h}
      rx={rx}
      fill={c.fill}
      stroke={isActive ? '#0f172a' : c.stroke}
      strokeWidth={isActive ? 2.5 : 1.5}
      opacity={isActive ? 0.95 : (hasData ? 0.65 : 0.4)}
      role="button"
      tabIndex={0}
      aria-label={`${MUSCLE_LABEL[keyName]}: ${hasData ? dat.label : 'sin datos'}`}
      aria-pressed={isActive}
      className={`${hasData ? 'cursor-pointer' : 'cursor-default'} transition-all duration-150`}
      onClick={() => onActive(keyName)}
      onMouseEnter={() => onActive(keyName)}
      onFocus={() => onActive(keyName)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActive(keyName);
        }
      }}
    />
  );
}

/**
 * Hotspots frontales alineados al cuerpo de FrontBody (viewBox 240x400)
 */
function FrontHotspots({ data, active, onActive }: HotspotProps) {
  return (
    <g pointerEvents="all">
      {/* Hombros (deltoides) */}
      <Hotspot x={70}  y={82}  w={30} h={25} keyName="hombro" data={data} active={active} onActive={onActive} />
      <Hotspot x={140} y={82}  w={30} h={25} keyName="hombro" data={data} active={active} onActive={onActive} />

      {/* Pecho (pectorales) */}
      <Hotspot x={80}  y={108} w={80} h={48} keyName="pecho" data={data} active={active} onActive={onActive} rx={6} />

      {/* Bíceps */}
      <Hotspot x={48}  y={110} w={28} h={90} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={164} y={110} w={28} h={90} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />

      {/* Core / abdomen */}
      <Hotspot x={85}  y={162} w={70} h={60} keyName="core" data={data} active={active} onActive={onActive} rx={6} />

      {/* Piernas (cuádriceps) */}
      <Hotspot x={86}  y={252} w={30} h={105} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
      <Hotspot x={124} y={252} w={30} h={105} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
    </g>
  );
}

/**
 * Hotspots dorsales alineados al cuerpo de BackBody
 */
function BackHotspots({ data, active, onActive }: HotspotProps) {
  return (
    <g pointerEvents="all">
      {/* Hombros */}
      <Hotspot x={70}  y={82}  w={30} h={25} keyName="hombro" data={data} active={active} onActive={onActive} />
      <Hotspot x={140} y={82}  w={30} h={25} keyName="hombro" data={data} active={active} onActive={onActive} />

      {/* Espalda (dorsal ancho) */}
      <Hotspot x={78}  y={108} w={84} h={95} keyName="espalda" data={data} active={active} onActive={onActive} rx={6} />

      {/* Tríceps */}
      <Hotspot x={48}  y={110} w={28} h={90} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={164} y={110} w={28} h={90} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />

      {/* Core (lumbar) */}
      <Hotspot x={85}  y={210} w={70} h={28} keyName="core" data={data} active={active} onActive={onActive} rx={4} />

      {/* Piernas (isquiotibiales) */}
      <Hotspot x={86}  y={272} w={30} h={85} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
      <Hotspot x={124} y={272} w={30} h={85} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
    </g>
  );
}

function MuscleDetail({ name, datum }: { name: string; datum: MuscleDatum }) {
  const showDelta = datum.hasData && datum.delta != null;
  const showCurrent = datum.hasData && datum.currentValue != null && !showDelta;
  const solidFill = (() => {
    if (datum.hasData) {
      if (datum.trend === 'up') return '#22c55e';
      if (datum.trend === 'down') return '#3b82f6';
      if (datum.trend === 'flat') return '#fbbf24';
    }
    return '#9ca3af';
  })();
  const solidBorder = (() => {
    if (datum.hasData) {
      if (datum.trend === 'up') return '#15803d';
      if (datum.trend === 'down') return '#1d4ed8';
      if (datum.trend === 'flat') return '#b45309';
    }
    return '#6b7280';
  })();

  return (
    <div
      className="rounded-lg border p-4 transition-all"
      style={{
        background: `linear-gradient(135deg, ${solidFill}1A 0%, white 60%)`,
        borderColor: solidBorder,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full ring-2 ring-white"
          style={{ background: solidFill }}
        />
        <h3 className="font-bold text-ink-900">{name}</h3>
      </div>
      {showDelta ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-extrabold tabular-nums tracking-tight"
              style={{ color: solidBorder }}
            >
              {datum.delta != null && datum.delta > 0 ? '+' : ''}
              {datum.delta?.toFixed(1) ?? '0'}
            </span>
            <span className="text-sm text-ink-500 font-medium">{datum.label.replace(/^[+-]/, '').trim()}</span>
            {datum.trend === 'up' ? (
              <TrendingUp className="w-5 h-5 ml-auto" style={{ color: solidBorder }} />
            ) : datum.trend === 'down' ? (
              <TrendingDown className="w-5 h-5 ml-auto" style={{ color: solidBorder }} />
            ) : (
              <Minus className="w-5 h-5 ml-auto" style={{ color: solidBorder }} />
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
            Vuelve el próximo mes para ver cómo evoluciona.
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