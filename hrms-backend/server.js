const app = require('./src/app')
const pool = require('./src/config/db')
require('dotenv').config()

const PORT = process.env.PORT || 5000

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) NOT NULL,
        conversation_key VARCHAR(100) NOT NULL,
        sender_id INTEGER REFERENCES users(id) NOT NULL,
        receiver_id INTEGER REFERENCES users(id) NOT NULL,
        message TEXT,
        file_url TEXT,
        file_name VARCHAR(255),
        file_type VARCHAR(150),
        seen_status BOOLEAN DEFAULT false,
        is_edited BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        CHECK (sender_id <> receiver_id),
        CHECK (message IS NOT NULL OR file_url IS NOT NULL)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_key
      ON messages (conversation_key, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_messages_receiver_seen
      ON messages (receiver_id, seen_status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_messages_company_users
      ON messages (company_id, sender_id, receiver_id);

      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
    `)
    console.log('DB init complete.')
  } catch (err) {
    console.error('DB init error:', err)
  }
}

// Init the DB first, then start listening — avoids the race condition
// where a request hits before the messages table is confirmed to exist
const startServer = async () => {
  await initDB()
  app.listen(PORT, () => {
    console.log(`SHNOOR HRMS Server running on http://localhost:${PORT}`)
  })
}

startServer()