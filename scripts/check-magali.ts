import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

async function main() {
  // Cliente Magali
  const [client] = await sql.unsafe(`SELECT id, full_name, email, height_cm, birth_date, gender FROM clients WHERE full_name ILIKE '%magali%' LIMIT 1`);
  console.log('--- CLIENTE ---');
  console.log(client);

  // Sus mediciones, ordenadas
  console.log('\n--- PROGRESS ENTRIES DE MAGALI (todas) ---');
  const meds = await sql.unsafe(`
    SELECT id, recorded_at, weight_kg, body_fat_pct, waist_cm, chest_cm, bicep_flex_cm, thigh_cm, shoulder_cm,
           created_at
    FROM progress_entries
    WHERE client_id = '${client.id}'
    ORDER BY recorded_at DESC, created_at DESC
  `);
  for (const m of meds) {
    console.log(`  ${m.id.slice(0, 20)}... · ${m.recorded_at} · peso=${m.weight_kg} bf=${m.body_fat_pct} cintura=${m.waist_cm} pecho=${m.chest_cm} bícep=${m.bicep_flex_cm} muslo=${m.thigh_cm} hombro=${m.shoulder_cm} · created=${new Date(m.created_at).toISOString()}`);
  }

  // Sus logs de ejercicios
  console.log('\n--- EXERCISE LOGS DE MAGALI (últimos 10) ---');
  const logs = await sql.unsafe(`
    SELECT el.id, el.routine_exercise_id, el.performed_at, el.top_set_weight_kg, el.top_set_reps, el.tracking_type
    FROM exercise_logs el
    WHERE el.client_id = '${client.id}'
    ORDER BY el.performed_at DESC
    LIMIT 10
  `);
  for (const l of logs) {
    console.log(`  ${l.id.slice(0, 18)}... · re=${l.routine_exercise_id.slice(0, 18)} · ${new Date(l.performed_at).toISOString()} · top=${l.top_set_weight_kg}kg×${l.top_set_reps} · type=${l.tracking_type}`);
  }

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
