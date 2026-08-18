import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });
async function main() {
  const [m] = await sql.unsafe(`SELECT id, full_name FROM clients WHERE full_name ILIKE '%magali%' LIMIT 1`);
  const meds = await sql.unsafe(`
    SELECT recorded_at, chest_cm, waist_cm, hips_cm, shoulder_cm, neck_cm,
           bicep_flex_cm, bicep_relaxed_cm, forearm_cm, thigh_cm, calf_cm,
           body_fat_pct, weight_kg
    FROM progress_entries
    WHERE client_id = '${m.id}'
    ORDER BY recorded_at DESC
  `);
  for (const r of meds) {
    console.log(`\n=== ${r.recorded_at} ===`);
    for (const [k, v] of Object.entries(r)) {
      if (k !== 'recorded_at') console.log(`  ${k}: ${v}`);
    }
  }
  await sql.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
