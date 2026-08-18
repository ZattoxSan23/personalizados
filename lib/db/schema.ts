import { pgTable, text, integer, numeric, boolean, timestamp, index, unique, jsonb } from 'drizzle-orm/pg-core';

// =====================================================
// Enums
// =====================================================
export const USER_ROLES = ['trainer', 'client'] as const;
export const GOALS = ['hypertrophy', 'strength', 'fat_loss', 'maintenance', 'recomp'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
export const PAYMENT_METHODS = ['yape', 'plin', 'transfer', 'cash'] as const;
export const PAYMENT_STATUSES = ['pending','validated','rejected'] as const;

// =====================================================
// Users (autenticación)
// =====================================================
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: USER_ROLES }).notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  yapeNumber: text('yape_number'),
  plinNumber: text('plin_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// Clientes (datos fitness)
// =====================================================
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteCode: text('invite_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  goal: text('goal', { enum: GOALS }),
  experienceLevel: text('experience_level', { enum: LEVELS }),
  monthlyFeePen: numeric('monthly_fee_pen', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentDueDay: integer('payment_due_day').default(1),
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  trainerIdx: index('idx_clients_trainer').on(table.trainerId),
}));

// =====================================================
// Catálogo de ejercicios
// =====================================================
export const exercises = pgTable('exercises', {
  id: text('id').primaryKey(),
  nameEs: text('name_es').notNull(),
  muscleGroup: text('muscle_group').notNull(),
  equipment: text('equipment'),
  difficulty: text('difficulty', { enum: LEVELS }).default('beginner'),
  demoVideoUrl: text('demo_video_url'),
}, (table) => ({
  muscleIdx: index('idx_exercises_muscle').on(table.muscleGroup),
}));

// =====================================================
// Rutinas
// =====================================================
export const routines = pgTable('routines', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  trainerId: text('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  goal: text('goal', { enum: GOALS }),
  weeksDuration: integer('weeks_duration').default(4),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isActive: boolean('is_active').notNull().default(false),
  createdViaAi: boolean('created_via_ai').default(false),
  aiPromptLog: text('ai_prompt_log'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const routineDays = pgTable('routine_days', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
  dayOfWeek: text('day_of_week', { enum: DAYS }).notNull(),
  name: text('name'),
  orderIndex: integer('order_index').notNull(),
}, (table) => ({
  uniqueDay: unique('unique_routine_day').on(table.routineId, table.dayOfWeek),
}));

export const routineExercises = pgTable('routine_exercises', {
  id: text('id').primaryKey(),
  routineDayId: text('routine_day_id').notNull().references(() => routineDays.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  orderIndex: integer('order_index').notNull(),
  sets: integer('sets').notNull(),
  // Tipo de tracking por ejercicio en la rutina (NO en el catálogo):
  //   'reps' → el campo reps tiene '8-12' o '8' (default, retrocompatible)
  //   'time' → el campo reps es NULL, duration_seconds tiene la duración sugerida
  trackingType: text('tracking_type', { enum: ['reps', 'time'] }).notNull().default('reps'),
  reps: text('reps'),
  durationSeconds: integer('duration_seconds'),
  weightKg: numeric('weight_kg', { precision: 6, scale: 2 }),
  restSeconds: integer('rest_seconds').default(90),
  notes: text('notes'),
});

// =====================================================
// Planes de alimentación
// =====================================================
export const mealPlans = pgTable('meal_plans', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  trainerId: text('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dailyCalories: integer('daily_calories'),
  dailyProteinG: integer('daily_protein_g'),
  dailyCarbsG: integer('daily_carbs_g'),
  dailyFatsG: integer('daily_fats_g'),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const meals = pgTable('meals', {
  id: text('id').primaryKey(),
  mealPlanId: text('meal_plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
  dayOfWeek: text('day_of_week', { enum: DAYS }).notNull(),
  mealType: text('meal_type').notNull(),
  scheduledTime: text('scheduled_time'),
  orderIndex: integer('order_index').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  calories: integer('calories'),
  proteinG: numeric('protein_g', { precision: 6, scale: 2 }),
  carbsG: numeric('carbs_g', { precision: 6, scale: 2 }),
  fatsG: numeric('fats_g', { precision: 6, scale: 2 }),
});

// =====================================================
// Progreso
// =====================================================
export const progressEntries = pgTable('progress_entries', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  recordedAt: text('recorded_at').notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  bodyFatPct: numeric('body_fat_pct', { precision: 4, scale: 2 }),
  // Medidas corporales completas (cm)
  neckCm: numeric('neck_cm', { precision: 5, scale: 2 }),
  shoulderCm: numeric('shoulder_cm', { precision: 5, scale: 2 }),
  chestCm: numeric('chest_cm', { precision: 5, scale: 2 }),
  waistCm: numeric('waist_cm', { precision: 5, scale: 2 }),
  hipsCm: numeric('hips_cm', { precision: 5, scale: 2 }),
  bicepFlexCm: numeric('bicep_flex_cm', { precision: 5, scale: 2 }),
  bicepRelaxedCm: numeric('bicep_relaxed_cm', { precision: 5, scale: 2 }),
  forearmCm: numeric('forearm_cm', { precision: 5, scale: 2 }),
  thighCm: numeric('thigh_cm', { precision: 5, scale: 2 }),
  calfCm: numeric('calf_cm', { precision: 5, scale: 2 }),
  armCm: numeric('arm_cm', { precision: 5, scale: 2 }), // legacy: alias de bicep_flex
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  clientDateIdx: index('idx_progress_client_date').on(table.clientId, table.recordedAt),
}));

// =====================================================
// Check-in diario
// =====================================================
export const dailyCheckins = pgTable('daily_checkins', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  checkinDate: text('checkin_date').notNull(),
  waterLiters: numeric('water_liters', { precision: 3, scale: 1 }),
  sleepHours: numeric('sleep_hours', { precision: 3, scale: 1 }),
  mood: integer('mood'),
  energy: integer('energy'),
  adherencePct: integer('adherence_pct'),
  notes: text('notes'),
}, (table) => ({
  uniqueCheckin: unique('unique_client_date').on(table.clientId, table.checkinDate),
}));

// =====================================================
// Logs de ejercicio (training log del cliente)
// Cada log es una sesión de un ejercicio específico donde el cliente registra
// el peso y reps que logró en CADA serie. La estructura `sets` (jsonb) es la
// fuente de verdad; los campos `topSet*` y `setsCompleted` son resumen derivado
// para queries rápidas.
// =====================================================
export const exerciseLogs = pgTable('exercise_logs', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  routineExerciseId: text('routine_exercise_id').notNull().references(() => routineExercises.id, { onDelete: 'cascade' }),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
  // tracking_type en el log se copia del routine_exercise al guardar la sesión
  // (puede ser NULL en logs viejos creados antes de esta migración).
  trackingType: text('tracking_type', { enum: ['reps', 'time'] }),
  // Top set del día: el peso máximo con el que el cliente realmente trabajó
  topSetWeightKg: numeric('top_set_weight_kg', { precision: 6, scale: 2 }),
  // top_set_reps es NULL cuando el log es de un ejercicio por tiempo (plancha,
  // caminata, etc.) — la duración real vive en cada entry del jsonb sets[].
  topSetReps: integer('top_set_reps'),
  topSetDurationSeconds: integer('top_set_duration_seconds'),
  // Cuántas series logró completar de las asignadas
  setsCompleted: integer('sets_completed').notNull().default(1),
  // Esfuerzo percibido 1-10 (escala RPE simplificada)
  rpe: integer('rpe'),
  notes: text('notes'),
  // Series detalladas. Cada entry:
  //   - si tracking_type='reps':  reps es requerido, durationSeconds ausente
  //   - si tracking_type='time':   durationSeconds es requerido, reps = 0
  sets: jsonb('sets').$type<ExerciseSetEntry[]>().notNull().default([]),
}, (table) => ({
  clientExerciseIdx: index('idx_logs_client_exercise').on(table.clientId, table.routineExerciseId, table.performedAt),
}));

// Estructura de cada serie dentro del jsonb
export interface ExerciseSetEntry {
  weight: number;
  reps: number;
  /** Duración en segundos. Solo presente si el ejercicio se trackea por tiempo. */
  durationSeconds?: number;
  completed: boolean;
}

// =====================================================
// Pagos
// =====================================================
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  trainerId: text('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountPen: numeric('amount_pen', { precision: 10, scale: 2 }).notNull(),
  method: text('method', { enum: PAYMENT_METHODS }).notNull().default('yape'),
  referenceCode: text('reference_code').notNull(),
  periodMonth: text('period_month').notNull(),
  dueDate: text('due_date'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  status: text('status', { enum: PAYMENT_STATUSES }).notNull().default('pending'),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  validatedBy: text('validated_by').references(() => users.id),
  trainerNotes: text('trainer_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueRef: unique('unique_trainer_ref').on(table.trainerId, table.referenceCode),
}));

// =====================================================
// Chat IA
// =====================================================
export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetClientId: text('target_client_id').references(() => clients.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  structuredPayload: text('structured_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// Tipos inferidos
// =====================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineDay = typeof routineDays.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;