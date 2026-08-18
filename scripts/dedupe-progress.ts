import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: 'require' });

async function main() {
  const [client] = await sql.unsafe(`SELECT id FROM clients WHERE full_name ILIKE '%magali%' LIMIT 1`);
  if (!client) {
    console.error('Magali no encontrada');
    process.exit(1);
  }
  const clientId = client.id;
  console.log(`Cliente: ${clientId}`);

  // Agrupar todas las progress_entries por (recorded_at) y consolidar:
  // - Quedarse con la que tenga MÁS campos NO nulos
  // - En caso de empate, la más reciente por created_at
  // - Las demás se borran

  // Ver el estado actual
  const before = await sql.unsafe(`
    SELECT recorded_at, COUNT(*)::int AS n
    FROM progress_entries
    WHERE client_id = '${clientId}'
    GROUP BY recorded_at
    ORDER BY recorded_at DESC
  `);
  console.log('\n--- ANTES ---');
  console.log(before);

  // Para cada (client_id, recorded_at) con > 1 fila, consolidar:
  // 1. Encontrar la fila "ganadora" (más campos NO nulos; empate → más reciente)
  // 2. UPDATE la ganadora con los valores NO nulos de las demás (COALESCE)
  // 3. DELETE las demás

  const dupes = await sql.unsafe(`
    SELECT recorded_at
    FROM progress_entries
    WHERE client_id = '${clientId}'
    GROUP BY recorded_at
    HAVING COUNT(*) > 1
  `);

  for (const d of dupes) {
    console.log(`\n--- Consolidando ${d.recorded_at} ---`);
    const rows = await sql.unsafe(`
      SELECT id, weight_kg, body_fat_pct, waist_cm, chest_cm, bicep_flex_cm,
             bicep_relaxed_cm, forearm_cm, thigh_cm, calf_cm, neck_cm, shoulder_cm,
             hips_cm, arm_cm, notes, created_at
      FROM progress_entries
      WHERE client_id = '${clientId}' AND recorded_at = '${d.recorded_at}'
      ORDER BY created_at DESC
    `);
    console.log(`  ${rows.length} filas:`);
    for (const r of rows) console.log(`    ${r.id.slice(0, 18)} peso=${r.weight_kg} bf=${r.body_fat_pct}`);

    // Ganadora: la primera (más reciente por created_at)
    const winner = rows[0];
    const losers = rows.slice(1);

    // Calcular merged: para cada campo, COALESCE entre winner y losers
    const fields = ['weight_kg', 'body_fat_pct', 'waist_cm', 'chest_cm', 'bicep_flex_cm',
      'bicep_relaxed_cm', 'forearm_cm', 'thigh_cm', 'calf_cm', 'neck_cm', 'shoulder_cm',
      'hips_cm', 'arm_cm'];
    const merged: Record<string, string | null> = {};
    for (const f of fields) {
      let v: string | null = winner[f];
      if (v == null) {
        for (const l of losers) {
          if (l[f] != null) { v = l[f]; break; }
        }
      }
      merged[f] = v;
    }
    // notes: concatenar únicas
    const notes = Array.from(new Set(rows.map(r => r.notes).filter(Boolean))) as string[];
    if (notes.length > 0) merged.notes = notes.join(' · ');

    // UPDATE la ganadora con los valores merged
    await sql.unsafe(`
      UPDATE progress_entries
      SET weight_kg = ${merged.weight_kg == null ? 'NULL' : `'${merged.weight_kg}'`},
          body_fat_pct = ${merged.body_fat_pct == null ? 'NULL' : `'${merged.body_fat_pct}'`},
          waist_cm = ${merged.waist_cm == null ? 'NULL' : `'${merged.waist_cm}'`},
          chest_cm = ${merged.chest_cm == null ? 'NULL' : `'${merged.chest_cm}'`},
          bicep_flex_cm = ${merged.bicep_flex_cm == null ? 'NULL' : `'${merged.bicep_flex_cm}'`},
          bicep_relaxed_cm = ${merged.bicep_relaxed_cm == null ? 'NULL' : `'${merged.bicep_relaxed_cm}'`},
          forearm_cm = ${merged.forearm_cm == null ? 'NULL' : `'${merged.forearm_cm}'`},
          thigh_cm = ${merged.thigh_cm == null ? 'NULL' : `'${merged.thigh_cm}'`},
          calf_cm = ${merged.calf_cm == null ? 'NULL' : `'${merged.calf_cm}'`},
          neck_cm = ${merged.neck_cm == null ? 'NULL' : `'${merged.neck_cm}'`},
          shoulder_cm = ${merged.shoulder_cm == null ? 'NULL' : `'${merged.shoulder_cm}'`},
          hips_cm = ${merged.hips_cm == null ? 'NULL' : `'${merged.hips_cm}'`},
          arm_cm = ${merged.arm_cm == null ? 'NULL' : `'${merged.arm_cm}'`},
          notes = ${merged.notes == null ? 'NULL' : `'${merged.notes.replace(/'/g, "''")}'`}
      WHERE id = '${winner.id}'
    `);
    console.log(`  ✓ Ganadora actualizada: ${winner.id.slice(0, 18)}`);

    // DELETE las perdedoras
    for (const l of losers) {
      await sql.unsafe(`DELETE FROM progress_entries WHERE id = '${l.id}'`);
      console.log(`  ✗ Borrada: ${l.id.slice(0, 18)}`);
    }
  }

  // Verificar
  const after = await sql.unsafe(`
    SELECT recorded_at, COUNT(*)::int AS n
    FROM progress_entries
    WHERE client_id = '${clientId}'
    GROUP BY recorded_at
    ORDER BY recorded_at DESC
  `);
  console.log('\n--- DESPUÉS ---');
  console.log(after);

  await sql.end();
  console.log('\n✅ Listo');
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
