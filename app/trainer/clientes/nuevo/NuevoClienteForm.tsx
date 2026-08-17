'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BodyMeasurementsInput, { emptyMeasurements, type Measurements } from '@/app/components/BodyMeasurementsInput';

export default function NuevoClienteForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [monthlyFeePen, setMonthlyFeePen] = useState('250');
  const [notes, setNotes] = useState('');

  // Medidas corporales completas
  const [measurements, setMeasurements] = useState<Measurements>(emptyMeasurements);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/trainer/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: email || null,
          birthDate: birthDate || null,
          gender: gender || null,
          goal: goal || null,
          experienceLevel: level || null,
          heightCm,
          monthlyFeePen: Number(monthlyFeePen) || 0,
          paymentDueDay: 1,
          notes: notes || null,
          initialMeasurements: {
            weightKg: measurements.weightKg,
            neckCm: measurements.neckCm,
            waistCm: measurements.waistCm,
            hipsCm: measurements.hipsCm,
            shoulderCm: measurements.shoulderCm,
            chestCm: measurements.chestCm,
            bicepFlexCm: measurements.bicepFlexCm,
            bicepRelaxedCm: measurements.bicepRelaxedCm,
            forearmCm: measurements.forearmCm,
            thighCm: measurements.thighCm,
            calfCm: measurements.calfCm,
            bodyFatPct: measurements.bodyFatPct,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      router.push(`/trainer/clientes/${data.id}`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Datos personales */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Datos personales</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre completo *</label>
          <input
            type="text"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Juan Pérez"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@mail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Fecha de nacimiento</label>
            <input
              type="date"
              className="input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Género *</label>
            <select
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
              required
            >
              <option value="">—</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Altura (cm) *</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={heightCm ?? ''}
              onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : null)}
              placeholder="175"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Objetivo</label>
            <select className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">—</option>
              <option value="hypertrophy">Hipertrofia</option>
              <option value="strength">Fuerza</option>
              <option value="fat_loss">Perder grasa</option>
              <option value="maintenance">Mantener</option>
              <option value="recomp">Recomposición</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nivel</label>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">—</option>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Cuota mensual (S/)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={monthlyFeePen}
            onChange={(e) => setMonthlyFeePen(e.target.value)}
            placeholder="250"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notas</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lesiones, alergias, preferencias..."
          />
        </div>
      </div>

      {/* Medidas corporales completas (US Navy) */}
      <div className="card space-y-3">
        <div>
          <h2 className="text-xs font-semibold text-ink-700 uppercase tracking-wider">
            Medidas corporales iniciales
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Opcional pero recomendado. Si ingresas ⭐ cuello + cintura (± cadera), calculamos %grasa US Navy automáticamente.
          </p>
        </div>
        <BodyMeasurementsInput
          gender={gender || null}
          heightCm={heightCm}
          value={measurements}
          onChange={setMeasurements}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={saving || !fullName.trim()} className="btn-primary w-full">
        {saving ? 'Creando...' : 'Crear cliente'}
      </button>
    </form>
  );
}