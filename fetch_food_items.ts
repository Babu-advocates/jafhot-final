import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_DmQEZp0fULO5@ep-small-fire-a1me05mo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function test() {
  const rows = await sql`SELECT * FROM public.food_items LIMIT 5`;
  console.log(rows);
}

test();
