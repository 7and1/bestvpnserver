-- BestVPNServer Database Schema
-- Schema: bestvpnserver

-- Create schema
CREATE SCHEMA IF NOT EXISTS bestvpnserver;

-- Grant permissions
GRANT USAGE ON SCHEMA bestvpnserver TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA bestvpnserver TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA bestvpnserver TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bestvpnserver TO postgres, anon, authenticated, service_role;

-- Countries table
CREATE TABLE IF NOT EXISTS bestvpnserver.countries (
    id SMALLSERIAL PRIMARY KEY,
    iso_code CHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- Cities table
CREATE TABLE IF NOT EXISTS bestvpnserver.cities (
    id SERIAL PRIMARY KEY,
    country_id SMALLINT NOT NULL REFERENCES bestvpnserver.countries(id),
    name VARCHAR(100) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    UNIQUE (country_id, name)
);

-- Protocols table
CREATE TABLE IF NOT EXISTS bestvpnserver.protocols (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    default_port SMALLINT
);

-- Streaming platforms table
CREATE TABLE IF NOT EXISTS bestvpnserver.streaming_platforms (
    id SMALLSERIAL PRIMARY KEY,
    slug VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    region CHAR(2)
);

-- Providers table
CREATE TABLE IF NOT EXISTS bestvpnserver.providers (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    website_url TEXT,
    affiliate_link TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Probe locations table
CREATE TABLE IF NOT EXISTS bestvpnserver.probe_locations (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    city_id INTEGER REFERENCES bestvpnserver.cities(id),
    provider VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Servers table
CREATE TABLE IF NOT EXISTS bestvpnserver.servers (
    id SERIAL PRIMARY KEY,
    provider_id SMALLINT NOT NULL REFERENCES bestvpnserver.providers(id),
    city_id INTEGER NOT NULL REFERENCES bestvpnserver.cities(id),
    hostname VARCHAR(255),
    ip_address INET,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider_id, hostname)
);

-- Server protocols junction table
CREATE TABLE IF NOT EXISTS bestvpnserver.server_protocols (
    server_id INTEGER NOT NULL REFERENCES bestvpnserver.servers(id) ON DELETE CASCADE,
    protocol_id SMALLINT NOT NULL REFERENCES bestvpnserver.protocols(id),
    port SMALLINT,
    PRIMARY KEY (server_id, protocol_id)
);

-- Performance logs table
CREATE TABLE IF NOT EXISTS bestvpnserver.performance_logs (
    server_id INTEGER NOT NULL REFERENCES bestvpnserver.servers(id),
    probe_id SMALLINT NOT NULL REFERENCES bestvpnserver.probe_locations(id),
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ping_ms SMALLINT,
    download_mbps NUMERIC(7, 2),
    upload_mbps NUMERIC(7, 2),
    jitter_ms SMALLINT,
    packet_loss_pct NUMERIC(5, 2),
    connection_success BOOLEAN NOT NULL DEFAULT true,
    connection_time_ms SMALLINT,
    PRIMARY KEY (measured_at, server_id, probe_id)
);

-- Streaming checks table
CREATE TABLE IF NOT EXISTS bestvpnserver.streaming_checks (
    server_id INTEGER NOT NULL REFERENCES bestvpnserver.servers(id),
    platform_id SMALLINT NOT NULL REFERENCES bestvpnserver.streaming_platforms(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_unlocked BOOLEAN NOT NULL,
    response_time_ms SMALLINT,
    PRIMARY KEY (server_id, platform_id, checked_at)
);

-- Hourly aggregated performance logs
CREATE TABLE IF NOT EXISTS bestvpnserver.performance_logs_hourly (
    server_id INTEGER NOT NULL REFERENCES bestvpnserver.servers(id),
    probe_id SMALLINT NOT NULL REFERENCES bestvpnserver.probe_locations(id),
    hour TIMESTAMPTZ NOT NULL,
    sample_count SMALLINT,
    avg_ping NUMERIC(6, 2),
    min_ping SMALLINT,
    max_ping SMALLINT,
    avg_download NUMERIC(7, 2),
    max_download NUMERIC(7, 2),
    avg_upload NUMERIC(7, 2),
    uptime_pct NUMERIC(5, 2),
    PRIMARY KEY (hour, server_id, probe_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_servers_provider ON bestvpnserver.servers(provider_id);
CREATE INDEX IF NOT EXISTS idx_servers_city ON bestvpnserver.servers(city_id);
CREATE INDEX IF NOT EXISTS idx_servers_active ON bestvpnserver.servers(is_active);
CREATE INDEX IF NOT EXISTS idx_performance_logs_server ON bestvpnserver.performance_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_measured ON bestvpnserver.performance_logs(measured_at);
CREATE INDEX IF NOT EXISTS idx_streaming_checks_server ON bestvpnserver.streaming_checks(server_id);
CREATE INDEX IF NOT EXISTS idx_streaming_checks_checked ON bestvpnserver.streaming_checks(checked_at);

-- Materialized view for latest server performance
CREATE MATERIALIZED VIEW IF NOT EXISTS bestvpnserver.mv_server_latest_performance AS
SELECT DISTINCT ON (s.id)
    s.id AS server_id,
    s.provider_id,
    s.city_id,
    pl.ping_ms,
    pl.download_mbps,
    pl.upload_mbps,
    pl.connection_success,
    pl.measured_at
FROM bestvpnserver.servers s
LEFT JOIN bestvpnserver.performance_logs pl ON s.id = pl.server_id
WHERE s.is_active = true
ORDER BY s.id, pl.measured_at DESC NULLS LAST;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_server_latest_performance_server_id 
    ON bestvpnserver.mv_server_latest_performance(server_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION bestvpnserver.refresh_latest_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bestvpnserver.mv_server_latest_performance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON SCHEMA bestvpnserver IS 'BestVPNServer.com database schema';
