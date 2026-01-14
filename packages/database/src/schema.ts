import {
  boolean,
  char,
  inet,
  integer,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  serial,
  smallint,
  smallserial,
  text,
  timestamp,
  unique,
  varchar,
  type PgSchema,
} from "drizzle-orm/pg-core";

const schemaName = process.env.DB_SCHEMA || "public";
// Don't use pgSchema for 'public' schema - Drizzle doesn't allow it
// Using a type assertion to handle the union type
const schema = (
  schemaName === "public" ? { table: pgTable } : pgSchema(schemaName)
) as PgSchema;

export const countries = schema.table("countries", {
  id: smallserial("id").primaryKey(),
  isoCode: char("iso_code", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const cities = schema.table(
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

export const probeLocations = schema.table("probe_locations", {
  id: smallserial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  cityId: integer("city_id").references(() => cities.id),
  provider: varchar("provider", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const protocols = schema.table("protocols", {
  id: smallserial("id").primaryKey(),
  name: varchar("name", { length: 30 }).notNull().unique(),
  defaultPort: smallint("default_port"),
});

export const streamingPlatforms = schema.table("streaming_platforms", {
  id: smallserial("id").primaryKey(),
  slug: varchar("slug", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  region: char("region", { length: 2 }),
});

export const providers = schema.table("providers", {
  id: smallserial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  websiteUrl: text("website_url"),
  affiliateLink: text("affiliate_link"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const servers = schema.table(
  "servers",
  {
    id: serial("id").primaryKey(),
    providerId: smallint("provider_id")
      .notNull()
      .references(() => providers.id),
    cityId: integer("city_id")
      .notNull()
      .references(() => cities.id),
    hostname: varchar("hostname", { length: 255 }),
    ipAddress: inet("ip_address"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueProviderHostname: unique().on(table.providerId, table.hostname),
  }),
);

export const serverProtocols = schema.table(
  "server_protocols",
  {
    serverId: integer("server_id")
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

export const performanceLogs = schema.table(
  "performance_logs",
  {
    serverId: integer("server_id")
      .notNull()
      .references(() => servers.id),
    probeId: smallint("probe_id")
      .notNull()
      .references(() => probeLocations.id),
    measuredAt: timestamp("measured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    pingMs: smallint("ping_ms"),
    downloadMbps: numeric("download_mbps", { precision: 7, scale: 2 }),
    uploadMbps: numeric("upload_mbps", { precision: 7, scale: 2 }),
    jitterMs: smallint("jitter_ms"),
    packetLossPct: numeric("packet_loss_pct", { precision: 5, scale: 2 }),
    connectionSuccess: boolean("connection_success").notNull().default(true),
    connectionTimeMs: smallint("connection_time_ms"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.measuredAt, table.serverId, table.probeId],
    }),
  }),
);

export const streamingChecks = schema.table(
  "streaming_checks",
  {
    serverId: integer("server_id")
      .notNull()
      .references(() => servers.id),
    platformId: smallint("platform_id")
      .notNull()
      .references(() => streamingPlatforms.id),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isUnlocked: boolean("is_unlocked").notNull(),
    responseTimeMs: smallint("response_time_ms"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.serverId, table.platformId, table.checkedAt],
    }),
  }),
);

export const performanceLogsHourly = schema.table(
  "performance_logs_hourly",
  {
    serverId: integer("server_id")
      .notNull()
      .references(() => servers.id),
    probeId: smallint("probe_id")
      .notNull()
      .references(() => probeLocations.id),
    hour: timestamp("hour", { withTimezone: true }).notNull(),
    sampleCount: smallint("sample_count"),
    avgPing: numeric("avg_ping", { precision: 6, scale: 2 }),
    minPing: smallint("min_ping"),
    maxPing: smallint("max_ping"),
    avgDownload: numeric("avg_download", { precision: 7, scale: 2 }),
    maxDownload: numeric("max_download", { precision: 7, scale: 2 }),
    avgUpload: numeric("avg_upload", { precision: 7, scale: 2 }),
    uptimePct: numeric("uptime_pct", { precision: 5, scale: 2 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.hour, table.serverId, table.probeId] }),
  }),
);
