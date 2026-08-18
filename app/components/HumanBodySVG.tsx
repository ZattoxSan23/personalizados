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

      <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Contenedor con imagen de fondo + hotspots encima */}
        <div
          ref={containerRef}
          className="relative mx-auto"
          style={{ width: 240, height: 360 }}
          onMouseLeave={handleContainerLeave}
          onBlur={handleContainerLeave}
        >
          <img
            src={view === 'front' ? '/body/personal_trainer.svg' : '/body/workout.svg'}
            alt={`Cuerpo humano - vista ${view === 'front' ? 'frontal' : 'dorsal'}`}
            width={240}
            height={360}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
          {/* Hotspots superpuestos como SVG transparente */}
          <svg
            viewBox="0 0 240 360"
            className="absolute inset-0 w-full h-full"
            aria-label="Zonas corporales interactivas"
          >
            {view === 'front' ? (
              <FrontHotspots data={data} active={active} onActive={setActive} />
            ) : (
              <BackHotspots data={data} active={active} onActive={setActive} />
            )}
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

interface HotspotProps {
  data: Partial<Record<MuscleKey, MuscleDatum>>;
  active: MuscleKey | null;
  onActive: (k: MuscleKey) => void;
}

/**
 * Crea un hotspot rectangular clicable sobre la imagen.
 * - Coordenadas en el viewBox 0 0 240 360
 * - Color de fondo según tendencia (semitransparente)
 * - Borde más grueso cuando está activo
 */
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
      opacity={isActive ? 0.95 : (hasData ? 0.75 : 0.5)}
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
 * Vista frontal: hotspots sobre la imagen.
 * Coordenadas ajustadas al viewBox 240x360 de la imagen personal_trainer.svg
 * que muestra una figura fitness de frente.
 */
function FrontHotspots({ data, active, onActive }: HotspotProps) {
  return (
    <g>
      {/* Hombros (deltoides) */}
      <Hotspot x={70}  y={100} w={30} h={28} keyName="hombro" data={data} active={active} onActive={onActive} />
      <Hotspot x={140} y={100} w={30} h={28} keyName="hombro" data={data} active={active} onActive={onActive} />

      {/* Pecho */}
      <Hotspot x={85}  y={130} w={70} h={35} keyName="pecho" data={data} active={active} onActive={onActive} rx={6} />

      {/* Bíceps */}
      <Hotspot x={50}  y={125} w={20} h={45} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={170} y={125} w={20} h={45} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />

      {/* Core / abdominales */}
      <Hotspot x={90}  y={170} w={60} h={50} keyName="core" data={data} active={active} onActive={onActive} rx={6} />

      {/* Piernas (cuádriceps) */}
      <Hotspot x={90}  y={225} w={25} h={70} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
      <Hotspot x={125} y={225} w={25} h={70} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />

      {/* Pantorrillas */}
      <Hotspot x={92}  y={298} w={22} h={45} keyName="pierna" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={126} y={298} w={22} h={45} keyName="pierna" data={data} active={active} onActive={onActive} rx={10} />
    </g>
  );
}

/**
 * Vista dorsal: hotspots sobre la imagen workout.svg.
 */
function BackHotspots({ data, active, onActive }: HotspotProps) {
  return (
    <g>
      {/* Hombros */}
      <Hotspot x={70}  y={100} w={30} h={28} keyName="hombro" data={data} active={active} onActive={onActive} />
      <Hotspot x={140} y={100} w={30} h={28} keyName="hombro" data={data} active={active} onActive={onActive} />

      {/* Espalda (dorsal ancho) */}
      <Hotspot x={80}  y={130} w={80} h={55} keyName="espalda" data={data} active={active} onActive={onActive} rx={6} />

      {/* Tríceps */}
      <Hotspot x={50}  y={125} w={20} h={45} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={170} y={125} w={20} h={45} keyName="brazo" data={data} active={active} onActive={onActive} rx={10} />

      {/* Lumbar */}
      <Hotspot x={90}  y={190} w={60} h={25} keyName="core" data={data} active={active} onActive={onActive} rx={6} />

      {/* Glúteos */}
      <Hotspot x={90}  y={220} w={25} h={35} keyName="pierna" data={data} active={active} onActive={onActive} rx={8} />
      <Hotspot x={125} y={220} w={25} h={35} keyName="pierna" data={data} active={active} onActive={onActive} rx={8} />

      {/* Isquiotibiales */}
      <Hotspot x={90}  y={260} w={25} h={45} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />
      <Hotspot x={125} y={260} w={25} h={45} keyName="pierna" data={data} active={active} onActive={onActive} rx={6} />

      {/* Gemelos */}
      <Hotspot x={92}  y={308} w={22} h={35} keyName="pierna" data={data} active={active} onActive={onActive} rx={10} />
      <Hotspot x={126} y={308} w={22} h={35} keyName="pierna" data={data} active={active} onActive={onActive} rx={10} />
    </g>
  );
}

function MuscleDetail({ name, datum }: { name: string; datum: MuscleDatum }) {
  const c = colors(datum.trend, datum.hasData);
  const showDelta = datum.hasData && datum.delta != null;
  const showCurrent = datum.hasData && datum.currentValue != null && !showDelta;
  // Color sólido para el detalle (sin transparencia)
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