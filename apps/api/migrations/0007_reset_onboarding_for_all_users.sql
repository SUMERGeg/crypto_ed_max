CREATE TABLE IF NOT EXISTS application_migration_markers (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH reset_marker AS (
  INSERT INTO application_migration_markers (id)
  VALUES ('reset-onboarding-for-all-users-v1')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
), cleared AS (
  DELETE FROM onboarding_state
  WHERE EXISTS (SELECT 1 FROM reset_marker)
)
UPDATE users
SET onboarding_eligible = TRUE
WHERE EXISTS (SELECT 1 FROM reset_marker);
