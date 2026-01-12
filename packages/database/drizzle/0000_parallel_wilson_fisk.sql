CREATE TABLE IF NOT EXISTS "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" smallint NOT NULL,
	"name" varchar(100) NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	CONSTRAINT "cities_country_id_name_unique" UNIQUE("country_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "countries" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"iso_code" char(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "countries_iso_code_unique" UNIQUE("iso_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_logs" (
	"server_id" integer NOT NULL,
	"probe_id" smallint NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ping_ms" smallint,
	"download_mbps" numeric(7, 2),
	"upload_mbps" numeric(7, 2),
	"jitter_ms" smallint,
	"packet_loss_pct" numeric(5, 2),
	"connection_success" boolean DEFAULT true NOT NULL,
	"connection_time_ms" smallint,
	CONSTRAINT "performance_logs_measured_at_server_id_probe_id_pk" PRIMARY KEY("measured_at","server_id","probe_id")
) PARTITION BY RANGE ("measured_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_logs_hourly" (
	"server_id" integer NOT NULL,
	"probe_id" smallint NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"sample_count" smallint,
	"avg_ping" numeric(6, 2),
	"min_ping" smallint,
	"max_ping" smallint,
	"avg_download" numeric(7, 2),
	"max_download" numeric(7, 2),
	"avg_upload" numeric(7, 2),
	"uptime_pct" numeric(5, 2),
	CONSTRAINT "performance_logs_hourly_hour_server_id_probe_id_pk" PRIMARY KEY("hour","server_id","probe_id")
) PARTITION BY RANGE ("hour");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "probe_locations" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"city_id" integer,
	"provider" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "probe_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocols" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" varchar(30) NOT NULL,
	"default_port" smallint,
	CONSTRAINT "protocols_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "providers" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"website_url" text,
	"affiliate_link" text,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "server_protocols" (
	"server_id" integer NOT NULL,
	"protocol_id" smallint NOT NULL,
	"port" smallint,
	CONSTRAINT "server_protocols_server_id_protocol_id_pk" PRIMARY KEY("server_id","protocol_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" smallint NOT NULL,
	"city_id" integer NOT NULL,
	"hostname" varchar(255),
	"ip_address" "inet",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "servers_provider_id_hostname_unique" UNIQUE("provider_id","hostname")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streaming_checks" (
	"server_id" integer NOT NULL,
	"platform_id" smallint NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_unlocked" boolean NOT NULL,
	"response_time_ms" smallint,
	CONSTRAINT "streaming_checks_server_id_platform_id_checked_at_pk" PRIMARY KEY("server_id","platform_id","checked_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streaming_platforms" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"slug" varchar(30) NOT NULL,
	"name" varchar(50) NOT NULL,
	"region" char(2),
	CONSTRAINT "streaming_platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_probe_id_probe_locations_id_fk" FOREIGN KEY ("probe_id") REFERENCES "public"."probe_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_logs_hourly" ADD CONSTRAINT "performance_logs_hourly_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_logs_hourly" ADD CONSTRAINT "performance_logs_hourly_probe_id_probe_locations_id_fk" FOREIGN KEY ("probe_id") REFERENCES "public"."probe_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "probe_locations" ADD CONSTRAINT "probe_locations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "server_protocols" ADD CONSTRAINT "server_protocols_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "server_protocols" ADD CONSTRAINT "server_protocols_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "servers" ADD CONSTRAINT "servers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "servers" ADD CONSTRAINT "servers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streaming_checks" ADD CONSTRAINT "streaming_checks_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streaming_checks" ADD CONSTRAINT "streaming_checks_platform_id_streaming_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."streaming_platforms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "servers" ADD CONSTRAINT "servers_identity_check" CHECK ("hostname" IS NOT NULL OR "ip_address" IS NOT NULL);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  current_month date := date_trunc('month', now());
  next_month date := (date_trunc('month', now()) + interval '1 month')::date;
  next_next_month date := (date_trunc('month', now()) + interval '2 months')::date;
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_%s PARTITION OF performance_logs FOR VALUES FROM (%L) TO (%L)',
    to_char(current_month, 'YYYY_MM'), current_month, next_month
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_%s PARTITION OF performance_logs FOR VALUES FROM (%L) TO (%L)',
    to_char(next_month, 'YYYY_MM'), next_month, next_next_month
  );

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_hourly_%s PARTITION OF performance_logs_hourly FOR VALUES FROM (%L) TO (%L)',
    to_char(current_month, 'YYYY_MM'), current_month, next_month
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_hourly_%s PARTITION OF performance_logs_hourly FOR VALUES FROM (%L) TO (%L)',
    to_char(next_month, 'YYYY_MM'), next_month, next_next_month
  );
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
  next_month date := (date_trunc('month', now()) + interval '1 month')::date;
  following_month date := (date_trunc('month', now()) + interval '2 months')::date;
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_%s PARTITION OF performance_logs FOR VALUES FROM (%L) TO (%L)',
    to_char(next_month, 'YYYY_MM'), next_month, following_month
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS performance_logs_hourly_%s PARTITION OF performance_logs_hourly FOR VALUES FROM (%L) TO (%L)',
    to_char(next_month, 'YYYY_MM'), next_month, following_month
  );
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE PROCEDURE rollup_performance_logs()
LANGUAGE plpgsql AS $$
DECLARE
  cutoff_time timestamptz := date_trunc('hour', now() - interval '1 hour');
BEGIN
  INSERT INTO performance_logs_hourly
  SELECT
    server_id,
    probe_id,
    date_trunc('hour', measured_at) AS hour,
    COUNT(*)::smallint,
    AVG(ping_ms)::numeric(6,2),
    MIN(ping_ms),
    MAX(ping_ms),
    AVG(download_mbps)::numeric(7,2),
    MAX(download_mbps),
    AVG(upload_mbps)::numeric(7,2),
    (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric(5,2)
  FROM performance_logs
  WHERE measured_at >= cutoff_time - interval '1 hour'
    AND measured_at < cutoff_time
  GROUP BY server_id, probe_id, date_trunc('hour', measured_at)
  ON CONFLICT (hour, server_id, probe_id) DO NOTHING;
END;
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_perf_recent_speed
  ON performance_logs (measured_at DESC, download_mbps DESC)
  WHERE connection_success = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_perf_time_range
  ON performance_logs (measured_at)
  INCLUDE (server_id, ping_ms, download_mbps);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_servers_by_location
  ON servers (city_id, provider_id)
  WHERE is_active = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_servers_by_provider
  ON servers (provider_id)
  WHERE is_active = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_server_protocols_protocol
  ON server_protocols (protocol_id, server_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_streaming_latest
  ON streaming_checks (platform_id, server_id, checked_at DESC)
  WHERE is_unlocked = true;
--> statement-breakpoint
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_server_latest_performance AS
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
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_perf
  ON mv_server_latest_performance (server_id, probe_id);
--> statement-breakpoint
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_server_daily_stats AS
SELECT
  server_id,
  probe_id,
  date_trunc('day', measured_at) AS day,
  COUNT(*) AS sample_count,
  AVG(ping_ms)::numeric(6,2) AS avg_ping,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ping_ms) AS median_ping,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ping_ms) AS p95_ping,
  AVG(download_mbps)::numeric(7,2) AS avg_download,
  MAX(download_mbps) AS max_download,
  AVG(upload_mbps)::numeric(7,2) AS avg_upload,
  (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric(5,2) AS uptime_pct
FROM performance_logs
GROUP BY server_id, probe_id, date_trunc('day', measured_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_stats
  ON mv_server_daily_stats (server_id, probe_id, day);
