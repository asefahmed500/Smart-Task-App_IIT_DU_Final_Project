import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listTables() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not defined in .env.local')
    process.exit(1)
  }

  const pool = new pg.Pool({ 
    connectionString,
    connectionTimeoutMillis: 5000,
  })

  try {
    const client = await pool.connect()
    console.log('🔍 Listing tables in public schema...')
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)
    
    if (res.rows.length === 0) {
      console.log('⚠️ No tables found in public schema.')
    } else {
      console.log('✅ Tables found:')
      res.rows.forEach(row => console.log(` - ${row.table_name}`))
    }
    
    client.release()
    await pool.end()
  } catch (err) {
    console.error('❌ Failed to list tables!')
    console.error(err)
    await pool.end()
    process.exit(1)
  }
}

listTables()
