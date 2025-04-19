-- Cleanup migration: Truncate all tables and restart identity (auto-increment IDs)
-- WARNING: This will irreversibly delete ALL data in the database. Use with caution!

-- Disable referential integrity temporarily
DO $$
BEGIN
  EXECUTE 'ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_id_fkey';
  EXECUTE 'ALTER TABLE provider_health DROP CONSTRAINT IF EXISTS provider_health_provider_id_fkey';
  EXECUTE 'ALTER TABLE provider_requests DROP CONSTRAINT IF EXISTS provider_requests_provider_id_fkey';
  EXECUTE 'ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_parent_hash_fkey';
  EXECUTE 'ALTER TABLE oev_events DROP CONSTRAINT IF EXISTS oev_events_transaction_id_fkey';
  EXECUTE 'ALTER TABLE oev_opportunities DROP CONSTRAINT IF EXISTS oev_opportunities_oev_event_id_fkey';
END $$;

TRUNCATE TABLE 
  positions,
  users,
  provider_health,
  provider_requests,
  providers,
  blocks,
  transactions,
  oev_events,
  oev_opportunities
RESTART IDENTITY CASCADE;

-- Re-enable referential integrity (constraints will be restored automatically by Postgres)

-- Optionally, vacuum to reclaim space
VACUUM FULL;
