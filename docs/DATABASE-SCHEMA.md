# Database Schema - BestVPNServer.com

## Overview

- **Database**: PostgreSQL (VPS or managed)
- **ORM**: Drizzle
- **Time-series**: Native partitioning (not TimescaleDB)
- **Scale**: ~50K rows/day, 3.5M rows/year

---

## 1. Reference Tables

```sql
-- Countries (ISO 3166-1)
CREATE TABLE countries (
  id SMALLSERIAL PRIMARY KEY,
  iso_code CHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

-- Cities with coordinates
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id SMALLINT NOT NULL REFERENCES countries(id),
  name VARCHAR(100) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  UNIQUE (country_id, name)
);

-- Probe node locations
CREATE TABLE probe_locations (
  id SMALLSERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,  -- 'us-east', 'eu-west', 'ap-tokyo'
  city_id INT REFERENCES cities(id),
  provider VARCHAR(50),              -- 'Fly.io', 'AWS'
  is_active BOOLEAN DEFAULT true
);

-- VPN protocols
CREATE TABLE protocols (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,  -- 'WireGuard', 'OpenVPN-UDP', 'IKEv2'
  default_port INT
);

-- Streaming platforms
CREATE TABLE streaming_platforms (
  id SMALLSERIAL PRIMARY KEY,
  slug VARCHAR(30) NOT NULL UNIQUE,  -- 'netflix-us', 'disney-plus', 'hbo-max'
  name VARCHAR(50) NOT NULL,
  region CHAR(2)                     -- Optional: specific region
);
```

---

## 2. Core Entity Tables

```sql
-- VPN Providers
CREATE TABLE providers (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  website_url TEXT,
  affiliate_link TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VPN Servers
CREATE TABLE servers (
  id SERIAL PRIMARY KEY,
  provider_id SMALLINT NOT NULL REFERENCES providers(id),
  city_id INT NOT NULL REFERENCES cities(id),
  hostname VARCHAR(255),
  ip_address INET,                   -- PostgreSQL native IP type
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (provider_id, hostname),
  CONSTRAINT chk_server_identity CHECK (hostname IS NOT NULL OR ip_address IS NOT NULL)
);

-- Server <-> Protocol (M:N)
CREATE TABLE server_protocols (
  server_id INT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  protocol_id SMALLINT NOT NULL REFERENCES protocols(id),
  port INT,
  PRIMARY KEY (server_id, protocol_id)
);
```

---

## 3. Time-Series Tables (Partitioned)

```sql
-- Performance measurements
CREATE TABLE performance_logs (
  server_id INT NOT NULL,
  probe_id SMALLINT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Performance metrics
  ping_ms SMALLINT,                  -- 0-65535ms
  download_mbps NUMERIC(7,2),        -- Up to 99999.99 Mbps
  upload_mbps NUMERIC(7,2),
  jitter_ms SMALLINT,
  packet_loss_pct NUMERIC(5,2),      -- 0.00 - 100.00

  -- Connection quality
  connection_success BOOLEAN NOT NULL DEFAULT true,
  connection_time_ms SMALLINT,

  PRIMARY KEY (measured_at, server_id, probe_id),
  FOREIGN KEY (server_id) REFERENCES servers(id),
  FOREIGN KEY (probe_id) REFERENCES probe_locations(id)
) PARTITION BY RANGE (measured_at);

-- Streaming unlock checks (separate table - different frequency)
CREATE TABLE streaming_checks (
  server_id INT NOT NULL,
  platform_id SMALLINT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_unlocked BOOLEAN NOT NULL,
  response_time_ms SMALLINT,

  PRIMARY KEY (server_id, platform_id, checked_at),
  FOREIGN KEY (server_id) REFERENCES servers(id),
  FOREIGN KEY (platform_id) REFERENCES streaming_platforms(id)
);
```

### Partition Management

```sql
-- Create monthly partitions
CREATE TABLE performance_logs_2026_01 PARTITION OF performance_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE performance_logs_2026_02 PARTITION OF performance_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Auto-create next partition (run via pg_cron)
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := date_trunc('month', NOW()) + INTERVAL '1 month';
  partition_name TEXT := 'performance_logs_' || to_char(next_month, 'YYYY_MM');
  start_date TEXT := to_char(next_month, 'YYYY-MM-DD');
  end_date TEXT := to_char(next_month + INTERVAL '1 month', 'YYYY-MM-DD');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF performance_logs FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule: Run on 25th of each month
SELECT cron.schedule('create-partition', '0 0 25 * *', 'SELECT create_next_partition()');
```

---

## 4. Materialized Views

```sql
-- Latest performance per server (real-time dashboard)
CREATE MATERIALIZED VIEW mv_server_latest_performance AS
SELECT DISTINCT ON (server_id, probe_id)
  server_id,
  probe_id,
  measured_at,
  ping_ms,
  download_mbps,
  upload_mbps,
  connection_success
FROM performance_logs
ORDER BY server_id, probe_id, measured_at DESC;

CREATE UNIQUE INDEX idx_mv_latest_perf ON mv_server_latest_performance (server_id, probe_id);

-- Daily aggregates (SEO pages, trends)
CREATE MATERIALIZED VIEW mv_server_daily_stats AS
SELECT
  server_id,
  probe_id,
  date_trunc('day', measured_at) AS day,
  COUNT(*) AS sample_count,
  AVG(ping_ms)::NUMERIC(6,2) AS avg_ping,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ping_ms) AS median_ping,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ping_ms) AS p95_ping,
  AVG(download_mbps)::NUMERIC(7,2) AS avg_download,
  MAX(download_mbps) AS max_download,
  AVG(upload_mbps)::NUMERIC(7,2) AS avg_upload,
  (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) AS uptime_pct
FROM performance_logs
GROUP BY server_id, probe_id, date_trunc('day', measured_at);

CREATE UNIQUE INDEX idx_mv_daily_stats ON mv_server_daily_stats (server_id, probe_id, day);

-- Refresh every 5 minutes (via Cloudflare Cron, VPS timers, or pg_cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_latest_performance;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_server_daily_stats;
```

---

## 5. Indexes

```sql
-- Performance logs
CREATE INDEX idx_perf_recent_speed ON performance_logs (measured_at DESC, download_mbps DESC)
  WHERE connection_success = true;

CREATE INDEX idx_perf_time_range ON performance_logs (measured_at)
  INCLUDE (server_id, ping_ms, download_mbps);

-- Servers
CREATE INDEX idx_servers_by_location ON servers (city_id, provider_id)
  WHERE is_active = true;

CREATE INDEX idx_servers_by_provider ON servers (provider_id)
  WHERE is_active = true;

-- Protocols
CREATE INDEX idx_server_protocols_protocol ON server_protocols (protocol_id, server_id);

-- Streaming
CREATE INDEX idx_streaming_latest ON streaming_checks (platform_id, server_id, checked_at DESC)
  WHERE is_unlocked = true;
```

---

## 6. Common Queries

### Dashboard: Top 10 Fastest Servers

```sql
SELECT
  s.id,
  p.name AS provider,
  c.name AS city,
  co.name AS country,
  lp.download_mbps,
  lp.ping_ms,
  lp.measured_at
FROM servers s
JOIN providers p ON s.provider_id = p.id
JOIN cities c ON s.city_id = c.id
JOIN countries co ON c.country_id = co.id
JOIN mv_server_latest_performance lp ON s.id = lp.server_id
WHERE s.is_active = true
ORDER BY lp.download_mbps DESC
LIMIT 10;
```

### SEO Page: Best VPNs in Germany

```sql
CREATE OR REPLACE FUNCTION get_country_vpn_ranking(
  p_country_code CHAR(2),
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  server_id INT,
  provider_name VARCHAR,
  provider_slug VARCHAR,
  city_name VARCHAR,
  avg_download NUMERIC,
  avg_ping NUMERIC,
  uptime_pct NUMERIC,
  protocols TEXT[],
  streaming_platforms TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH server_stats AS (
    SELECT
      ds.server_id,
      AVG(ds.avg_download) AS avg_download,
      AVG(ds.avg_ping) AS avg_ping,
      AVG(ds.uptime_pct) AS uptime_pct
    FROM mv_server_daily_stats ds
    WHERE ds.day >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY ds.server_id
  ),
  server_protocols AS (
    SELECT sp.server_id, array_agg(pr.name) AS protocols
    FROM server_protocols sp
    JOIN protocols pr ON sp.protocol_id = pr.id
    GROUP BY sp.server_id
  ),
  server_streaming AS (
    SELECT DISTINCT ON (sc.server_id, sc.platform_id)
      sc.server_id, sp.slug
    FROM streaming_checks sc
    JOIN streaming_platforms sp ON sc.platform_id = sp.id
    WHERE sc.is_unlocked = true
      AND sc.checked_at >= NOW() - INTERVAL '24 hours'
    ORDER BY sc.server_id, sc.platform_id, sc.checked_at DESC
  ),
  server_streaming_agg AS (
    SELECT server_id, array_agg(slug) AS platforms
    FROM server_streaming
    GROUP BY server_id
  )
  SELECT
    s.id,
    p.name,
    p.slug,
    c.name,
    ROUND(ss.avg_download, 2),
    ROUND(ss.avg_ping, 1),
    ROUND(ss.uptime_pct, 1),
    COALESCE(spr.protocols, '{}'),
    COALESCE(sst.platforms, '{}')
  FROM servers s
  JOIN providers p ON s.provider_id = p.id
  JOIN cities c ON s.city_id = c.id
  JOIN countries co ON c.country_id = co.id
  JOIN server_stats ss ON s.id = ss.server_id
  LEFT JOIN server_protocols spr ON s.id = spr.server_id
  LEFT JOIN server_streaming_agg sst ON s.id = sst.server_id
  WHERE co.iso_code = p_country_code
    AND s.is_active = true
  ORDER BY ss.uptime_pct DESC, ss.avg_download DESC, ss.avg_ping ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Usage
SELECT * FROM get_country_vpn_ranking('DE', 20);
```

### Historical Trend (30 Days)

```sql
SELECT
  date_trunc('day', measured_at) AS day,
  AVG(download_mbps)::NUMERIC(7,2) AS avg_download,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY download_mbps) AS median_download,
  AVG(ping_ms)::NUMERIC(6,2) AS avg_ping,
  (COUNT(*) FILTER (WHERE connection_success))::FLOAT / COUNT(*) * 100 AS uptime_pct
FROM performance_logs
WHERE server_id = $1
  AND measured_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', measured_at)
ORDER BY day;
```

---

## 7. Data Retention

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────┤
│  HOT (PostgreSQL)          WARM (Compressed)      COLD (S3)     │
│  ──────────────────        ────────────────       ──────────    │
│  0-30 days                 31-365 days            365+ days     │
│  Full granularity          Hourly aggregates      Daily only    │
│  Fast queries              Slower but queryable   Analytics     │
└─────────────────────────────────────────────────────────────────┘
```

### Hourly Rollup

```sql
CREATE TABLE performance_logs_hourly (
  server_id INT NOT NULL,
  probe_id SMALLINT NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  sample_count SMALLINT,
  avg_ping NUMERIC(6,2),
  min_ping SMALLINT,
  max_ping SMALLINT,
  avg_download NUMERIC(7,2),
  max_download NUMERIC(7,2),
  avg_upload NUMERIC(7,2),
  uptime_pct NUMERIC(5,2),
  PRIMARY KEY (hour, server_id, probe_id)
) PARTITION BY RANGE (hour);

-- Rollup procedure (run hourly)
CREATE OR REPLACE PROCEDURE rollup_performance_logs()
LANGUAGE plpgsql AS $$
DECLARE
  cutoff_time TIMESTAMPTZ := date_trunc('hour', NOW() - INTERVAL '1 hour');
BEGIN
  INSERT INTO performance_logs_hourly
  SELECT
    server_id,
    probe_id,
    date_trunc('hour', measured_at) AS hour,
    COUNT(*)::SMALLINT,
    AVG(ping_ms)::NUMERIC(6,2),
    MIN(ping_ms),
    MAX(ping_ms),
    AVG(download_mbps)::NUMERIC(7,2),
    MAX(download_mbps),
    AVG(upload_mbps)::NUMERIC(7,2),
    (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2)
  FROM performance_logs
  WHERE measured_at >= cutoff_time - INTERVAL '1 hour'
    AND measured_at < cutoff_time
  GROUP BY server_id, probe_id, date_trunc('hour', measured_at)
  ON CONFLICT (hour, server_id, probe_id) DO NOTHING;

  COMMIT;
END;
$$;

-- Schedule: Run at :05 past every hour
SELECT cron.schedule('rollup-hourly', '5 * * * *', 'CALL rollup_performance_logs()');
```

---

## 8. Drizzle Schema

```typescript
// packages/database/schema.ts
import {
  pgTable,
  serial,
  smallserial,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  numeric,
  inet,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";

export const countries = pgTable("countries", {
  id: smallserial("id").primaryKey(),
  isoCode: varchar("iso_code", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    countryId: smallint("country_id")
      .notNull()
      .references(() => countries.id),
    name: varchar("name", { length: 100 }).notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
  },
  (table) => ({
    uniqueCountryCity: unique().on(table.countryId, table.name),
  }),
);

export const providers = pgTable("providers", {
  id: smallserial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  websiteUrl: text("website_url"),
  affiliateLink: text("affiliate_link"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const servers = pgTable(
  "servers",
  {
    id: serial("id").primaryKey(),
    providerId: smallint("provider_id")
      .notNull()
      .references(() => providers.id),
    cityId: serial("city_id")
      .notNull()
      .references(() => cities.id),
    hostname: varchar("hostname", { length: 255 }),
    ipAddress: inet("ip_address"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueProviderHostname: unique().on(table.providerId, table.hostname),
  }),
);

export const protocols = pgTable("protocols", {
  id: smallserial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  defaultPort: smallint("default_port"),
});

export const serverProtocols = pgTable(
  "server_protocols",
  {
    serverId: serial("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    protocolId: smallint("protocol_id")
      .notNull()
      .references(() => protocols.id),
    port: smallint("port"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.serverId, table.protocolId] }),
  }),
);

export const streamingPlatforms = pgTable("streaming_platforms", {
  id: smallserial("id").primaryKey(),
  slug: varchar("slug", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  region: varchar("region", { length: 2 }),
});

export const probeLocations = pgTable("probe_locations", {
  id: smallserial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  cityId: serial("city_id").references(() => cities.id),
  provider: varchar("provider", { length: 50 }),
  isActive: boolean("is_active").default(true),
});
```

---

**Version**: 1.0
**Last Updated**: 2026-01-11
