import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

async function main() {
  // Simular exactamente lo que hace /portal/progreso/page.tsx
  const clientId = 'cl_81d7ebdc-dd40-41a9-8b75-c7ab1a989bf4';
  
  // Query 1: progress_entries
  const entries = await sql.unsafe(`
    SELECT id, recorded_at, weight_kg, body_fat_pct, waist_cm, chest_cm,
           bicep_flex_cm, bicep_relaxed_cm, forearm_cm, thigh_cm, calf_cm,
           neck_cm, shoulder_cm, hips_cm, arm_cm
    FROM progress_entries
    WHERE client_id = '${clientId}'
    ORDER BY recorded_at DESC
    LIMIT 30
  `);
  console.log(`Entries: ${entries.length}`);
  console.log('Última:', entries[0]);
  
  const last = entries[0];
  const weightCurr = last?.weight_kg ? Number(last.weight_kg) : null;
  console.log(`\nweightCurr = ${weightCurr}`);
  
  // Query 2: clients
  const [client] = await sql.unsafe(`
    SELECT id, full_name, email, height_cm, birth_date, gender
    FROM clients
    WHERE id = '${clientId}'
    LIMIT 1
  `);
  console.log(`\nCliente:`);
  console.log(client);
  console.log(`\nheight_cm raw = '${client?.height_cm}' (tipo: ${typeof client?.height_cm})`);
  console.log(`Number(height_cm) = ${Number(client?.height_cm)}`);
  
  if (weightCurr == null || client?.height_cm == null) {
    console.log('\n⚠️  IMC sería null');
    console.log(`  weightCurr == null: ${weightCurr == null}`);
    console.log(`  client?.height_cm == null: ${client?.height_cm == null}`);
  } else {
    const h = Number(client.height_cm) / 100;
    const bmi = +(weightCurr / (h * h)).toFixed(1);
    console.log(`\n✅ IMC = ${weightCurr} / (${h}^2) = ${bmi}`);
  }
  
  await sql.end();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
