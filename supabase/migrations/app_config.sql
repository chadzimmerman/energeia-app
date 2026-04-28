-- ============================================================
-- ENERGEIA: App Config Table
-- Stores remote flags read on app launch.
-- Current keys:
--   min_ios_version  TEXT  e.g. "1.2.0"
--     Set this to the oldest version you still support.
--     Any installed version below this will be shown a
--     non-dismissable "Update Required" modal on launch.
--     Default "0.0.0" means the gate is OFF — no one is blocked.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Gate is off by default — no one blocked until you raise this
INSERT INTO app_config (key, value)
VALUES ('min_ios_version', '0.0.0')
ON CONFLICT (key) DO NOTHING;
