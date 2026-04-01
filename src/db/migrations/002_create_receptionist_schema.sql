-- Dental practices (clients)
CREATE TABLE IF NOT EXISTS practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  business_hours JSONB NOT NULL DEFAULT '{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"]}',
  services JSONB NOT NULL DEFAULT '[]',
  escalation_phone TEXT,
  escalation_email TEXT,
  twilio_phone TEXT,
  greeting_message TEXT DEFAULT 'Hi! This is the virtual assistant for {{practice_name}}. How can I help you today?',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge base entries per practice
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_practice ON knowledge_base(practice_id);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'web')),
  customer_phone TEXT,
  customer_name TEXT,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'completed')),
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_practice ON conversations(practice_id);
CREATE INDEX idx_conversations_customer_phone ON conversations(customer_phone);
CREATE INDEX idx_conversations_session ON conversations(session_id);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_practice ON appointments(practice_id);
CREATE INDEX idx_appointments_date ON appointments(practice_id, date);
CREATE INDEX idx_appointments_customer ON appointments(customer_phone);
