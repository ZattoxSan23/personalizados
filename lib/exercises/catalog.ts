/**
 * Catálogo de ejercicios para el MVP (~50 ejercicios populares en Perú).
 * Los IDs son estables; Claude los referencia por nombre exacto.
 */
import { uid } from '../db';

export interface SeedExercise {
  id: string;
  nameEs: string;
  muscleGroup: string;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Generamos IDs deterministas basados en el nombre para que Claude
// siempre pueda referenciarlos correctamente.
const id = (name: string) => `ex_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;

export const SEED_EXERCISES: SeedExercise[] = [
  // ===== PECHO =====
  { id: id('Press banca plano'), nameEs: 'Press banca plano', muscleGroup: 'pecho', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Press banca inclinado'), nameEs: 'Press banca inclinado', muscleGroup: 'pecho', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Press mancuernas plano'), nameEs: 'Press mancuernas plano', muscleGroup: 'pecho', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Press mancuernas inclinado'), nameEs: 'Press mancuernas inclinado', muscleGroup: 'pecho', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Aperturas con mancuernas'), nameEs: 'Aperturas con mancuernas', muscleGroup: 'pecho', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Fondos en paralelas'), nameEs: 'Fondos en paralelas', muscleGroup: 'pecho', equipment: 'peso corporal', difficulty: 'intermediate' },
  { id: id('Flexiones'), nameEs: 'Flexiones', muscleGroup: 'pecho', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Cruce de poleas'), nameEs: 'Cruce de poleas (cable crossover)', muscleGroup: 'pecho', equipment: 'polea', difficulty: 'beginner' },
  { id: id('Press en máquina'), nameEs: 'Press en máquina', muscleGroup: 'pecho', equipment: 'máquina', difficulty: 'beginner' },

  // ===== ESPALDA =====
  { id: id('Dominadas'), nameEs: 'Dominadas', muscleGroup: 'espalda', equipment: 'peso corporal', difficulty: 'intermediate' },
  { id: id('Remo con barra'), nameEs: 'Remo con barra', muscleGroup: 'espalda', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Remo con mancuerna'), nameEs: 'Remo con mancuerna a un brazo', muscleGroup: 'espalda', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Remo en polea baja'), nameEs: 'Remo en polea baja', muscleGroup: 'espalda', equipment: 'polea', difficulty: 'beginner' },
  { id: id('Jalón al pecho'), nameEs: 'Jalón al pecho en polea', muscleGroup: 'espalda', equipment: 'polea', difficulty: 'beginner' },
  { id: id('Remo en máquina'), nameEs: 'Remo en máquina', muscleGroup: 'espalda', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Peso muerto'), nameEs: 'Peso muerto convencional', muscleGroup: 'espalda', equipment: 'barra', difficulty: 'advanced' },
  { id: id('Remo T'), nameEs: 'Remo en T', muscleGroup: 'espalda', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Pullover'), nameEs: 'Pullover con mancuerna', muscleGroup: 'espalda', equipment: 'mancuerna', difficulty: 'beginner' },

  // ===== PIERNAS =====
  { id: id('Sentadilla'), nameEs: 'Sentadilla con barra', muscleGroup: 'pierna', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Sentadilla goblet'), nameEs: 'Sentadilla goblet', muscleGroup: 'pierna', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Prensa'), nameEs: 'Prensa de piernas', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Extensión de cuadriceps'), nameEs: 'Extensión de cuádriceps', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Curl femoral'), nameEs: 'Curl femoral acostado', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Curl femoral sentado'), nameEs: 'Curl femoral sentado', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Hip thrust'), nameEs: 'Hip thrust con barra', muscleGroup: 'pierna', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Peso muerto rumano'), nameEs: 'Peso muerto rumano', muscleGroup: 'pierna', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Zancadas'), nameEs: 'Zancadas caminando', muscleGroup: 'pierna', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Step up'), nameEs: 'Step up en cajón', muscleGroup: 'pierna', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Elevación de gemelos'), nameEs: 'Elevación de gemelos de pie', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Gemelos sentado'), nameEs: 'Elevación de gemelos sentado', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Sentadilla búlgara'), nameEs: 'Sentadilla búlgara', muscleGroup: 'pierna', equipment: 'mancuerna', difficulty: 'intermediate' },
  { id: id('Abducción de cadera'), nameEs: 'Abducción de cadera en máquina', muscleGroup: 'pierna', equipment: 'máquina', difficulty: 'beginner' },

  // ===== HOMBROS =====
  { id: id('Press militar'), nameEs: 'Press militar de pie', muscleGroup: 'hombro', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Press mancuernas hombro'), nameEs: 'Press de mancuernas sentado', muscleGroup: 'hombro', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Elevaciones laterales'), nameEs: 'Elevaciones laterales', muscleGroup: 'hombro', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Elevaciones frontales'), nameEs: 'Elevaciones frontales', muscleGroup: 'hombro', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Pájaros'), nameEs: 'Pájaros con mancuernas', muscleGroup: 'hombro', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Face pull'), nameEs: 'Face pull en polea', muscleGroup: 'hombro', equipment: 'polea', difficulty: 'beginner' },
  { id: id('Encogimientos'), nameEs: 'Encogimientos con barra', muscleGroup: 'hombro', equipment: 'barra', difficulty: 'beginner' },

  // ===== BRAZOS =====
  { id: id('Curl biceps barra'), nameEs: 'Curl de bíceps con barra', muscleGroup: 'brazo', equipment: 'barra', difficulty: 'beginner' },
  { id: id('Curl mancuernas'), nameEs: 'Curl de bíceps con mancuernas', muscleGroup: 'brazo', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Curl martillo'), nameEs: 'Curl martillo', muscleGroup: 'brazo', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Curl concentrado'), nameEs: 'Curl concentrado', muscleGroup: 'brazo', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Press francés'), nameEs: 'Press francés con barra', muscleGroup: 'brazo', equipment: 'barra', difficulty: 'intermediate' },
  { id: id('Extensión triceps polea'), nameEs: 'Extensión de tríceps en polea', muscleGroup: 'brazo', equipment: 'polea', difficulty: 'beginner' },
  { id: id('Fondos triceps'), nameEs: 'Fondos para tríceps', muscleGroup: 'brazo', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Patada triceps'), nameEs: 'Patada de tríceps', muscleGroup: 'brazo', equipment: 'mancuerna', difficulty: 'beginner' },

  // ===== CORE =====
  { id: id('Plancha'), nameEs: 'Plancha frontal', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Plancha lateral'), nameEs: 'Plancha lateral', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Crunch'), nameEs: 'Crunch abdominal', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Elevación piernas'), nameEs: 'Elevación de piernas colgado', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'intermediate' },
  { id: id('Russian twist'), nameEs: 'Russian twist', muscleGroup: 'core', equipment: 'mancuerna', difficulty: 'beginner' },
  { id: id('Abdominal bicicleta'), nameEs: 'Abdominal bicicleta', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Rueda abdominal'), nameEs: 'Rueda abdominal', muscleGroup: 'core', equipment: 'peso corporal', difficulty: 'advanced' },

  // ===== CARDIO =====
  { id: id('Caminata'), nameEs: 'Caminata rápida', muscleGroup: 'cardio', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Trote'), nameEs: 'Trote / trote suave', muscleGroup: 'cardio', equipment: 'peso corporal', difficulty: 'beginner' },
  { id: id('Bicicleta'), nameEs: 'Bicicleta estática', muscleGroup: 'cardio', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Eliptica'), nameEs: 'Elíptica', muscleGroup: 'cardio', equipment: 'máquina', difficulty: 'beginner' },
  { id: id('Saco de boxeo'), nameEs: 'Saco de boxeo', muscleGroup: 'cardio', equipment: 'peso corporal', difficulty: 'intermediate' },
];

export const MUSCLE_GROUPS = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'cardio'] as const;