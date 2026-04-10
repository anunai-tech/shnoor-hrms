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
