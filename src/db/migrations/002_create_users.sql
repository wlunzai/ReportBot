CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX idx_pipelines_user_id ON pipelines(user_id);
