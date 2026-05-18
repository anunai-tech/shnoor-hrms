const { Pool } = require('pg')
require('dotenv').config()

// Locally we use individual vars from .env.
// SSL is required for Render Postgres — rejectUnauthorized: false
// accepts Render's self-signed cert safely within their own infrastructure.
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
)

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err)
  process.exit(-1)
})

module.exports = pool