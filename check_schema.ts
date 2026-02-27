import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_DmQEZp0fULO5@ep-small-fire-a1me05mo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function check() {
  try {
    const res = await sql`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'verify_user_password';
    `;
    console.log(res[0]?.pg_get_functiondef);

    const res3 = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('profiles', 'users');
    `;
    console.log('Columns:', JSON.stringify(res3, null, 2));
  } catch (err) {
    console.error(err);
  }
}

check();
