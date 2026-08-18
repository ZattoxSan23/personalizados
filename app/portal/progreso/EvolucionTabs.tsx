'use client';

import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';

export interface MetricaTab {
  key: string;
  label: string;
  unit: string;
  values: number[];
  curr: number | null;
  delta: number | null;
  isDown: boolean;
  frase: string;
}

export interface EvolucionTabsProps {
  metricas: MetricaTab[];
}

export default function EvolucionTabs({ metricas }: EvolucionTabsProps) {
  const disponibles = metricas.filter((m) => m.values.length > 0);
  const [active, setActive] = useState(disponibles[0]?.key ?? 'peso');
  const m = disponibles.find((x) => x.key === active) ?? disponibles[0];

  if (!m) return null;

  return (
    <div className="space-y-3">
      {/* Chips selector */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {disponibles.map((met) => (
          <button
            key={met.key}
            type="button"
            onClick={() => setActive(met.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              met.key === active
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
            }`}
          >
            {met.label}
          </button>
        ))}
      </div>

      {/* Tarjeta con valor + delta + gráfica + frase */}
      <div className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">{m.label}</p>
            <p className="text-3xl font-extrabold tabular-nums text-ink-900 leading-none mt-1">
              {m.curr != null ? m.curr.toFixed(1) : '—'}
              <span className="text-base text-ink-500 ml-1">{m.unit}</span>
            </p>
          </div>
          {m.delta != null && Math.abs(m.delta) >= 0.1 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums px-2 py-1 rounded ${
              Math.abs(m.delta) < 0.5 ? 'bg-ink-100 text-ink-600' :
              (m.isDown ? m.delta < 0 : m.delta > 0) ? 'bg-success/15 text-success' :
              'bg-accent-50 text-accent-700'
            }`}>
              {m.delta > 0 ? <TrendingUp className="w-3 h-3" /> : m.delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {m.delta > 0 ? '+' : ''}{m.delta.toFixed(1)}
            </span>
          )}
        </div>

        {/* Gráfica */}
        <div className="h-48 -mx-2">
          <Sparkline values={m.values} width={300} height={180} color="#16a34a" />
        </div>

        {/* Frase interpretativa */}
        <p className="text-sm text-ink-700 leading-snug border-t border-ink-100 pt-2">
          {m.frase}
        </p>
      </div>
    </div>
  );
}