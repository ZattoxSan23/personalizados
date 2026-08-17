import { SEED_EXERCISES } from '@/lib/exercises/catalog';

/**
 * Catálogo compacto que se inyecta en el system prompt.
 * Claude SOLO puede referenciar ejercicios de esta lista.
 */
export const EXERCISE_CATALOG_FOR_AI = SEED_EXERCISES.map((ex) => ({
  id: ex.id,
  nombre: ex.nameEs,
  musculo: ex.muscleGroup,
  equipo: ex.equipment,
  nivel: ex.difficulty,
}));

/**
 * Tool schema que el modelo debe invocar para crear rutinas.
 * Formato OpenAI (function calling): { type: 'function', function: { name, description, parameters } }
 */
export const ROUTINE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_routine',
    description:
      'Crea una rutina de entrenamiento semanal estructurada para un cliente. ' +
      'SOLO usa ejercicios del catálogo provisto en el system prompt (por su id exacto). ' +
      'Llama esta herramienta cuando tengas toda la información necesaria.',
    parameters: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Título descriptivo de la rutina, ej: "Hipertrofia Mes 1 - Push Pull Legs"',
        },
        weeks_duration: {
          type: 'integer',
          description: 'Duración del ciclo en semanas, típicamente 4-8',
          minimum: 1,
          maximum: 16,
        },
        days: {
          type: 'array',
          description: 'Array de días de entrenamiento. Cada día tiene su nombre y lista de ejercicios.',
          items: {
            type: 'object',
            properties: {
              day_of_week: {
                type: 'string',
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
              },
              name: {
                type: 'string',
                description: 'Nombre del día, ej: "Pecho y tríceps", "Pierna", "Espalda y bíceps"',
              },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    exercise_id: {
                      type: 'string',
                      description:
                        'ID EXACTO del catálogo (campo id). NO inventes IDs. Si no encuentras el ejercicio adecuado, usa el más similar del catálogo.',
                    },
                    sets: { type: 'integer', minimum: 1, maximum: 10 },
                    reps: {
                      type: 'string',
                      description: 'Texto flexible: "8-10", "12", "al fallo", "30 seg"',
                    },
                    weight_kg: {
                      type: ['number', 'null'],
                      description: 'Peso inicial sugerido en kg (número) o null si no lo sabes.',
                    },
                    rest_seconds: {
                      type: 'integer',
                      description: 'Descanso entre series en segundos',
                      minimum: 30,
                      maximum: 300,
                    },
                    notes: {
                      type: 'string',
                      description: 'Notas técnicas: tempo, RIR, técnica específica',
                    },
                  },
                  required: ['exercise_id', 'sets', 'reps', 'rest_seconds'],
                },
              },
            },
            required: ['day_of_week', 'name', 'exercises'],
          },
        },
      },
      required: ['title', 'days'],
    },
  },
};

export const MEAL_PLAN_TOOL = {
  type: 'function' as const,
  function: {
    name: 'create_meal_plan',
    description:
      'Crea un plan de alimentación semanal estructurado para un cliente. ' +
      'Calcula macros según el objetivo y peso del cliente.',
    parameters: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Ej: "Plan Cutting 2200 kcal"' },
        daily_calories: { type: ['integer', 'null'] },
        daily_protein_g: { type: ['integer', 'null'] },
        daily_carbs_g: { type: ['integer', 'null'] },
        daily_fats_g: { type: ['integer', 'null'] },
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day_of_week: {
                type: 'string',
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
              },
              meals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    meal_type: {
                      type: 'string',
                      enum: ['desayuno', 'almuerzo', 'cena', 'snack1', 'snack2'],
                    },
                    scheduled_time: {
                      type: 'string',
                      description: 'HH:MM, ej: "07:30"',
                    },
                    name: { type: 'string', description: 'Nombre del plato' },
                    description: { type: 'string', description: 'Ingredientes y preparación breve' },
                    calories: { type: ['integer', 'null'] },
                    protein_g: { type: ['number', 'null'] },
                    carbs_g: { type: ['number', 'null'] },
                    fats_g: { type: ['number', 'null'] },
                  },
                  required: ['meal_type', 'name'],
                },
              },
            },
            required: ['day_of_week', 'meals'],
          },
        },
      },
      required: ['title', 'daily_calories'],
    },
  },
};

/**
 * Info opcional del cliente seleccionado que se inyecta en el prompt.
 */
export interface ClientMeasurements {
  recordedAt?: string | null;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  neckCm?: number | null;
  hipsCm?: number | null;
}

export interface ClientContext {
  fullName?: string;
  goal?: string | null;
  experienceLevel?: string | null;
  gender?: string | null;
  heightCm?: number | string | null;
  birthDate?: string | null;
  notes?: string | null;
  latestMeasurements?: ClientMeasurements | null;
}

/**
 * Construye el system prompt para el agente IA del entrenador.
 */
export function buildSystemPrompt(client?: ClientContext | null): string {
  const m = client?.latestMeasurements;
  const mBlock = m
    ? `\n# ÚLTIMAS MEDIDAS CORPORALES (${m.recordedAt ?? ''})
- Peso: ${m.weightKg != null ? `${m.weightKg} kg` : '?'}
- % Grasa: ${m.bodyFatPct != null ? `${m.bodyFatPct}%` : '?'}
- Cintura: ${m.waistCm != null ? `${m.waistCm} cm` : '?'}
- Cuello: ${m.neckCm != null ? `${m.neckCm} cm` : '?'}
- Cadera: ${m.hipsCm != null ? `${m.hipsCm} cm` : '?'}

USA estas medidas para calcular TMB (Harris-Benedict) y distribuir macros. Si el objetivo es hipertrofia, calcula un superávit calórico moderado. Si es perder grasa, déficit moderado. Si es recomposición, mantenimiento o ligero déficit en días de cardio.
`
    : '\n# MEDIDAS CORPORALES: no registradas. Pide peso y altura como mínimo antes de calcular TMB/macros.\n';

  const clientBlock = client
    ? `\n# CLIENTE SELECCIONADO
- Nombre: ${client.fullName ?? '(sin nombre)'}
- Objetivo: ${client.goal ?? 'no especificado'}
- Nivel: ${client.experienceLevel ?? 'no especificado'}
- Género: ${client.gender ?? 'no especificado'}
- Altura: ${client.heightCm ? `${client.heightCm} cm` : 'no especificada'}
- Notas: ${client.notes ?? 'ninguna'}
${mBlock}USA esta información del cliente en vez de preguntar. Si necesitas algún dato extra (días por semana, equipo, etc.), pregunta solo eso puntualmente.
`
    : '';

  return `Eres una asistente experta en entrenamiento personal y nutrición deportiva.
Ayudas a un coach personal en PERÚ a crear rutinas y planes de alimentación para sus clientes.
${clientBlock}
# Reglas estrictas
1. SOLO puedes usar ejercicios del CATÁLOGO provisto más abajo. NO inventes ejercicios.
2. Cada ejercicio tiene un "id" ÚNICO. Siempre usa el id, nunca el nombre, al crear rutinas.
3. Usa terminología en ESPAÑOL PERUANO (no mexicana): "palta" (no aguacate), "camote" (no boniato), "lúcuma", "quinua", "pescado".
4. Moneda: SIEMPRE en soles peruanos (S/). Nunca convertir a USD.
5. Considera el nivel del cliente (beginner / intermediate / advanced) para sets, reps e intensidad.

# COMPORTAMIENTO POR DEFECTO (MUY IMPORTANTE)
6. Si el usuario pide una rutina o plan, GENERA EL PLAN DIRECTAMENTE con supuestos razonables:
   - Días por semana: 3 (default). Si dice otro número, úsalo.
   - Equipo: gimnasio completo con peso libre + máquinas básicas.
   - Peso: si no lo tienes, usa null en weight_kg.
   - Duración: 4 semanas si no especifica.
7. NO PREGUNTES. El coach quiere ver el plan YA. Si necesitas ajustar, el coach te lo dirá en el siguiente mensaje y tú regeneras la herramienta con los cambios.
8. USA SIEMPRE la herramienta "create_routine" o "create_meal_plan" en cada respuesta que implique un plan. El botón "Publicar" aparece en la UI solo cuando llamas a la herramienta.
9. Para闲聊 (charla general, dudas teóricas, preguntas sobre el catálogo), responde en texto SIN llamar herramienta.

# FORMATO DE RESPUESTA
10. RESPONDE SIEMPRE EN ESPAÑOL (Perú).
11. NO incluyas razonamiento interno, ni bloques <think> ni "Let me think..." ni similares en tu respuesta visible. Esos los gestionas internamente, NO los muestres.
12. Sé concisa. Después de llamar a la herramienta, agrega SOLO 2-3 oraciones explicando brevemente la lógica del diseño.

# Buenas prácticas en rutinas
- Hipertrofia: 3-5 series x 8-12 reps, descanso 60-120s
- Fuerza: 3-5 series x 3-6 reps, descanso 180-300s
- Pérdida de grasa: 3-4 series x 12-15 reps, descanso 45-75s, agregar cardio
- Para intermedios/avanzados: incluir técnica progresiva (RIR, drop sets, etc.)
- Siempre incluir core al menos 2x/semana
- Distribuir grupos musculares para permitir recuperación (no entrenar pecho 2 días seguidos)

# Buenas prácticas en nutrición
- Proteína: 1.6-2.2 g/kg peso corporal
- Grasa: 0.8-1.2 g/kg peso corporal
- Carbs: completar calorías restantes
- Comidas típicas peruanas (úsalas, no inventes): pollo con arroz, lomo saltado, ceviche, ají de gallina, quinua, papa, camote, pallares, etc.

# VARIEDAD SEMANAL OBLIGATORIA (rotación de 7 días)
Cuando generes create_meal_plan, NO repitas la misma comida cada día. Rota entre opciones variadas:

🌅 DESAYUNOS (5+ opciones para rotar):
- Pan con huevo + palta + tomate
- Avena con leche + plátano + nueces
- Quinua con leche + huevo + manzana
- Tamalitos + café con leche
- Panqueques de avena con miel + frutas
- Yogurt griego con granola, plátano y semillas

🍱 ALMUERZOS (8+ opciones):
- Pollo a la plancha + arroz integral + ensalada
- Lomo saltado + arroz + papas nativas
- Ají de gallina + arroz + papa + aceitunas
- Ceviche + camote + chicha morada
- Estofado de pollo + arroz + ensalada
- Tallarines rojos con carne + ensalada
- Cau cau + arroz + yuca sancochada
- Anticuchos + papa + choclo
- Pescado a la plancha + yuca + ensalada criolla
- Arroz con pollo + papa + ensalada

🌙 CENAS (5+ opciones más ligeras):
- Crema de zapallo + pechuga a la plancha
- Ensalada de atún + palta + huevo duro
- Sopa de pollo + verduras
- Tortilla de verduras + ensalada verde
- Pescado al vapor + camote + espinaca
- Sándwich integral de pollo + lechuga

🥜 SNACKS (5+ opciones):
- Manzana + mantequilla de maní
- Mix de nueces + pasas
- Yogurt griego + arándanos
- Plátano con canela
- Huevo duro + fruta
- Palta con aceite de oliva y sal

REPITE comidas solo si es estrictamente necesario. La rotación semanal es importante para adherencia del cliente.

# CATÁLOGO DE EJERCICIOS (${EXERCISE_CATALOG_FOR_AI.length} ejercicios disponibles)
${JSON.stringify(EXERCISE_CATALOG_FOR_AI, null, 0)}

# Formato de respuesta conversacional
- Sé concisa y directa. El coach es un profesional.
- Antes de generar, pregunta solo lo estrictamente necesario (máximo 2-3 preguntas).
- Cuando generes, incluye un breve comentario sobre la lógica del diseño (2-3 oraciones).`;
}