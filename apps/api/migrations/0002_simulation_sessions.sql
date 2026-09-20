CREATE TABLE IF NOT EXISTS simulation_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  cash_rub NUMERIC(18, 2) NOT NULL CHECK (cash_rub >= 0),
  positions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  elapsed_ms BIGINT NOT NULL DEFAULT 0 CHECK (elapsed_ms >= 0),
  result_json JSONB,
  idempotency_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_transactions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  symbol TEXT NOT NULL,
  quantity NUMERIC(28, 12) NOT NULL CHECK (quantity > 0),
  amount_rub NUMERIC(18, 2) NOT NULL CHECK (amount_rub > 0),
  price_rub NUMERIC(18, 2) NOT NULL CHECK (price_rub > 0),
  scenario_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_sessions_user_updated_idx
  ON simulation_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS simulation_transactions_session_time_idx
  ON simulation_transactions (session_id, scenario_at, created_at);
