'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

type Point = {
  fecha: string;
  peso: number | null;
  grasa: number | null;
  cintura: number | null;
  pecho: number | null;
};

const SERIES = [
  { key: 'peso', color: '#16a34a', label: 'Peso (kg)' },
  { key: 'grasa', color: '#ef4444', label: '% Grasa' },
  { key: 'cintura', color: '#f59e0b', label: 'Cintura (cm)' },
  { key: 'pecho', color: '#3b82f6', label: 'Pecho (cm)' },
] as const;

export default function ProgresoChart({ data }: { data: Point[] }) {
  // Normalizar las escalas: como grasa es ~25 y las demás son ~80,
  // dejamos solo métricas de cm/kg. Grasa va aparte en tooltip.
  return (
    <div className="h-64 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(value: any, name: any) => {
              if (value == null) return ['—', name];
              return [typeof value === 'number' ? value.toFixed(1) : value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}