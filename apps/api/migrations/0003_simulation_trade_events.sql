ALTER TABLE simulation_transactions
  ADD COLUMN IF NOT EXISTS trigger_event_id TEXT;
