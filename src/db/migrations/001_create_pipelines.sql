CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_config JSONB NOT NULL DEFAULT '{}',
  query_text TEXT NOT NULL,
  delivery_type TEXT NOT NULL,
  delivery_config JSONB NOT NULL DEFAULT '{}',
  alert_condition TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipeline_runs_pipeline_id ON pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
