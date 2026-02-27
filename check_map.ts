import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_DmQEZp0fULO5@ep-small-fire-a1me05mo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function checkMap() {
  const rows = await sql`SELECT * FROM public.food_items ORDER BY name LIMIT 5`;
  const mapped = (rows as any[]).map((r) => ({ ...r, price: Number(r.price) }));
  console.log(JSON.stringify(mapped, null, 2));
}

checkMap();
