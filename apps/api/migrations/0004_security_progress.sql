CREATE TABLE IF NOT EXISTS security_case_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  safety_level TEXT NOT NULL CHECK (safety_level IN ('SAFE', 'RISKY')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_case_attempts_user_case_idx
  ON security_case_attempts (user_id, case_id, completed_at DESC);
