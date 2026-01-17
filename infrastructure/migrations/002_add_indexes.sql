-- BestVPNServer Database Index Optimization
-- Schema: bestvpnserver
-- Migration: 002_add_indexes

-- Performance-optimized indexes for common query patterns
-- These are partial indexes using CONCURRENTLY to avoid table locks

-- Index for streaming checks with recent unlock status
-- Optimizes queries like: "Get recent unlocked streaming checks for a server"
-- Pattern: WHERE is_unlocked = true AND checked_at > NOW() - INTERVAL '30 days'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_streaming_checks_unlocked_recent
  ON bestvpnserver.streaming_checks(server_id, platform_id, is_unlocked, checked_at DESC)
  WHERE is_unlocked = true AND checked_at > NOW() - INTERVAL '30 days';

-- Index for active servers by provider
-- Optimizes queries like: "Get all active servers for a provider"
-- Pattern: WHERE provider_id = ? AND is_active = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_servers_active_provider
  ON bestvpnserver.servers(provider_id, is_active)
  WHERE is_active = true;

-- Index for performance measurements (server + speed)
-- Optimizes queries ordering by download speed and filtering by server
-- Pattern: ORDER BY download_mbps DESC NULLS LAST on the materialized view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_server_measured
  ON bestvpnserver.mv_server_latest_performance(server_id, download_mbps DESC NULLS LAST);

-- Index for recent performance logs (time-series data)
-- Optimizes queries for recent performance data: "Get last 7 days of logs"
-- Pattern: WHERE measured_at > NOW() - INTERVAL '7 days'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_logs_recent
  ON bestvpnserver.performance_logs(measured_at DESC, server_id)
  WHERE measured_at > NOW() - INTERVAL '7 days';

-- Comments for documentation
COMMENT ON INDEX bestvpnserver.idx_streaming_checks_unlocked_recent IS 'Partial index for recent unlocked streaming checks (30-day retention)';
COMMENT ON INDEX bestvpnserver.idx_servers_active_provider IS 'Partial index for active servers grouped by provider';
COMMENT ON INDEX bestvpnserver.idx_performance_server_measured IS 'Index for ordering servers by download speed';
COMMENT ON INDEX bestvpnserver.idx_performance_logs_recent IS 'Partial index for recent performance logs (7-day retention)';
