const { Pool, types } = require('pg')
require('dotenv').config()

// Override pg's default date parser — by default it converts DATE columns to
// JS Date objects, which toISOString() shifts to UTC and breaks IST date display.
// Returning as plain string keeps the value exactly as stored in PostgreSQL.
types.setTypeParser(1082, val => val)

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: false
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