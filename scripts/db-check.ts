import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkConnection() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not defined in .env.local')
    process.exit(1)
  }

  const pool = new pg.Pool({ 
    connectionString,
    connectionTimeoutMillis: 5000,
  })

  console.log('🔍 Checking database connection...')

  try {
    const client = await pool.connect()
    const res = await client.query('SELECT NOW()')
    console.log('✅ Database connected successfully at:', res.rows[0].now)
    client.release()
    await pool.end()
    process.exit(0)
  } catch (err) {
    console.error('❌ Database connection failed!')
    console.error(err)
    await pool.end()
    process.exit(1)
  }
}

checkConnection()
