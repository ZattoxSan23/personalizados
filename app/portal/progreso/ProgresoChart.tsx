'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Point = {
  fecha: string;
  peso: number | null;
  cintura: number | null;
};

export default function ProgresoChart({ data }: { data: Point[] }) {
  return (
    <div className="h-48 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}