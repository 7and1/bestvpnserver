# Project Lighthouse - BestVPNServer.com

## Executive Summary

**Project Codename**: Lighthouse
**Goal**: Data-driven VPN monitoring & recommendation platform
**Core Differentiators**: Real-time data, Programmatic SEO, SaaS-grade tooling

---

## 1. Tech Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn   │
│  Deployed: Cloudflare Workers (OpenNext)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (BFF)                          │
│  Next.js API Routes (Serverless)                            │
│  - /api/servers/* (CRUD, filters)                           │
│  - /api/diagnostics/* (client tools coordination)           │
│  - /api/webhooks/probe-results (ingest from probes)         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   VPS Postgres   │ │    VPS Redis     │ │  Fly.io Probes   │
│   (Primary DB)   │ │  (Cache/Queues)  │ │  (8 regions)     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

Deployment details: `docs/DEPLOYMENT-CF-VPS.md`.

### Managed Deployment (Vercel + Neon + Upstash)

If you prefer managed services, swap `DATABASE_URL`/`REDIS_URL` and deploy on Vercel.
The application code is provider-agnostic.

### Stack Decision Matrix

| Component  | Choice                | Rationale                           |
| ---------- | --------------------- | ----------------------------------- |
| Frontend   | Next.js 14 App Router | ISR + Server Components for SEO     |
| UI         | Shadcn/UI + Tailwind  | Unstyled primitives, fast iteration |
| Database   | PostgreSQL (VPS)      | Primary data store (self-hosted)    |
| Cache      | Redis (VPS)           | Caching, queues, rate limiting      |
| Probes     | Fly.io (8 regions)    | Global distribution, simple deploys |
| Deployment | Cloudflare Workers    | Edge + OpenNext                     |

### Why NOT FastAPI?

Original proposal suggested Python FastAPI. **Removed** because:

- Extra deployment target = extra failure mode
- Python cold starts slower than Node.js serverless
- Probe nodes can be lightweight Go binaries
- Data processing via Cloudflare Cron or VPS systemd timers (or Inngest)

---

## 2. Database Schema

### Core Tables

```sql
-- Reference Data
CREATE TABLE countries (
  id SMALLSERIAL PRIMARY KEY,
  iso_code CHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id SMALLINT NOT NULL REFERENCES countries(id),
  name VARCHAR(100) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  UNIQUE (country_id, name)
);

CREATE TABLE probe_locations (
  id SMALLSERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,  -- 'us-east', 'eu-west'
  city_id INT REFERENCES cities(id),
  provider VARCHAR(50),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE protocols (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,  -- 'WireGuard', 'OpenVPN-UDP'
  default_port INT
);

CREATE TABLE streaming_platforms (
  id SMALLSERIAL PRIMARY KEY,
  slug VARCHAR(30) NOT NULL UNIQUE,  -- 'netflix-us', 'disney-plus'
  name VARCHAR(50) NOT NULL,
  region CHAR(2)
);

-- Core Entities
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

CREATE TABLE servers (
  id SERIAL PRIMARY KEY,
  provider_id SMALLINT NOT NULL REFERENCES providers(id),
  city_id INT NOT NULL REFERENCES cities(id),
  hostname VARCHAR(255),
  ip_address INET,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, hostname)
);

CREATE TABLE server_protocols (
  server_id INT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  protocol_id SMALLINT NOT NULL REFERENCES protocols(id),
  port INT,
  PRIMARY KEY (server_id, protocol_id)
);

-- Time-Series (Partitioned)
CREATE TABLE performance_logs (
  server_id INT NOT NULL,
  probe_id SMALLINT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ping_ms SMALLINT,
  download_mbps NUMERIC(7,2),
  upload_mbps NUMERIC(7,2),
  jitter_ms SMALLINT,
  packet_loss_pct NUMERIC(5,2),
  connection_success BOOLEAN NOT NULL DEFAULT true,
  connection_time_ms SMALLINT,
  PRIMARY KEY (measured_at, server_id, probe_id)
) PARTITION BY RANGE (measured_at);

CREATE TABLE streaming_checks (
  server_id INT NOT NULL,
  platform_id SMALLINT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_unlocked BOOLEAN NOT NULL,
  response_time_ms SMALLINT,
  PRIMARY KEY (server_id, platform_id, checked_at)
);
```

### Materialized Views

```sql
-- Latest performance (real-time dashboard)
CREATE MATERIALIZED VIEW mv_server_latest_performance AS
SELECT DISTINCT ON (server_id, probe_id)
  server_id, probe_id, measured_at,
  ping_ms, download_mbps, upload_mbps, connection_success
FROM performance_logs
ORDER BY server_id, probe_id, measured_at DESC;

CREATE UNIQUE INDEX idx_mv_latest_perf ON mv_server_latest_performance (server_id, probe_id);

-- Daily aggregates (SEO pages, trends)
CREATE MATERIALIZED VIEW mv_server_daily_stats AS
SELECT
  server_id, probe_id,
  date_trunc('day', measured_at) AS day,
  COUNT(*) AS sample_count,
  AVG(ping_ms)::NUMERIC(6,2) AS avg_ping,
  AVG(download_mbps)::NUMERIC(7,2) AS avg_download,
  (SUM(CASE WHEN connection_success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) AS uptime_pct
FROM performance_logs
GROUP BY server_id, probe_id, date_trunc('day', measured_at);

CREATE UNIQUE INDEX idx_mv_daily_stats ON mv_server_daily_stats (server_id, probe_id, day);
```

### Indexes

```sql
-- Performance queries
CREATE INDEX idx_perf_recent_speed ON performance_logs (measured_at DESC, download_mbps DESC)
  WHERE connection_success = true;

-- Server lookups
CREATE INDEX idx_servers_by_location ON servers (city_id, provider_id) WHERE is_active = true;
CREATE INDEX idx_servers_by_provider ON servers (provider_id) WHERE is_active = true;

-- Streaming status
CREATE INDEX idx_streaming_latest ON streaming_checks (platform_id, server_id, checked_at DESC)
  WHERE is_unlocked = true;
```

---

## 3. Probe Network Architecture

### Probe Locations (8 Regions)

| Region                    | Fly.io Code | Purpose                |
| ------------------------- | ----------- | ---------------------- |
| US East (Virginia)        | iad         | North America baseline |
| US West (LA)              | lax         | West coast latency     |
| Europe (Frankfurt)        | fra         | EU baseline            |
| UK (London)               | lhr         | Streaming tests (BBC)  |
| Asia (Singapore)          | sin         | SEA coverage           |
| Asia (Tokyo)              | nrt         | East Asia              |
| Australia (Sydney)        | syd         | Oceania                |
| South America (São Paulo) | gru         | LATAM coverage         |

### Data Flow

```
Probe Node (Fly.io)
       │
       │ POST /api/webhooks/probe-results
       │ (JWT signed, includes node_id)
       ▼
┌──────────────────┐
│   VPS Redis      │  ← LPUSH to queue
│  (Buffer Queue)  │
└──────────────────┘
       │
       │ Every 5 minutes (Cloudflare Cron or VPS timer)
       ▼
┌──────────────────┐
│  Aggregator Job  │  ← Batch process
└──────────────────┘
       │
       │ Single batch INSERT
       ▼
┌──────────────────┐
│  VPS Postgres    │
└──────────────────┘
```

### Tiered Testing Strategy

| Tier                     | Servers | Frequency     | Tests              |
| ------------------------ | ------- | ------------- | ------------------ |
| Hot (top 100 by traffic) | ~500    | Every 15 min  | Full suite         |
| Warm (popular providers) | ~2000   | Every 2 hours | Connection + speed |
| Cold (all others)        | ~10000  | Daily         | Connection only    |

---

## 4. URL Structure (pSEO)

### Primary Routes

```
/[provider]/                          → /nordvpn/
/[provider]/[country]/                → /nordvpn/japan/
/[provider]/[country]/[city]/         → /nordvpn/japan/tokyo/

/best-vpn-for-[purpose]/              → /best-vpn-for-netflix/
/best-vpn-for-[purpose]-in-[country]/ → /best-vpn-for-netflix-in-japan/

/[provider]-vs-[provider]/            → /nordvpn-vs-expressvpn/

/status/[provider]/                   → /status/nordvpn/
```

### SEO Page Structure

```tsx
// app/[provider]/[country]/[city]/page.tsx
export async function generateStaticParams() {
  const topCombinations = await db.query(`
    SELECT DISTINCT p.slug, s.country_code, s.city
    FROM servers s
    JOIN providers p ON s.provider_id = p.id
    JOIN server_stats ss ON s.id = ss.server_id
    ORDER BY ss.total_tests_24h DESC
    LIMIT 1000
  `);
  return topCombinations;
}

export const revalidate = 3600; // 1 hour ISR
```

### Title Formula

```typescript
// Dynamic: "NordVPN Servers in Tokyo - Speed Test Jan 2026"
function generateTitle(params: PageParams): string {
  return `${params.provider} VPN Servers in ${params.city} - Speed Test ${currentMonth}`;
}
```

---

## 5. Core Modules

### Module A: Server Finder (Dashboard)

- **TanStack Table** for sorting/filtering
- **SWR/React Query** for real-time updates (30s polling)
- **Recharts** for sparklines (24h latency chart)

Features:

- Filter by: Protocol, Streaming, Latency, Location
- Sort by: Speed, Latency, Uptime
- Real-time status indicators

### Module B: Diagnostic Tools

| Tool             | Implementation                          |
| ---------------- | --------------------------------------- |
| WebRTC Leak Test | RTCPeerConnection API                   |
| DNS Leak Test    | Custom DNS server + unique subdomain    |
| IP Lookup        | GeoIP database                          |
| Speed Test       | LibreSpeed or Cloudflare Speed Test API |

### Module C: Programmatic SEO Engine

- 50+ providers × 100+ locations × 10 purposes = **50,000+ pages**
- ISR with 1-hour revalidation
- On-demand revalidation for high-traffic pages
- Schema.org markup (Service, FAQPage, BreadcrumbList)

---

## 6. Redis Cache Strategy

```
Cache Layers:
├── L1: Hot Data (1-5 min TTL)
│   ├── dashboard:rankings:global
│   ├── server:{id}:latest
│   └── streaming:{platform}:servers
├── L2: Warm Data (1 hour TTL)
│   ├── provider:{slug}:summary
│   └── country:{iso}:summary
└── L3: SEO Pages (6 hours TTL)
    ├── seo:page:{slug}:data
    └── seo:page:{slug}:html
```

---

## 7. Project Structure

```
/bestvpnserver
├── apps/
│   └── web/                          # Next.js 14
│       ├── app/
│       │   ├── (marketing)/          # Landing pages
│       │   ├── (tools)/              # Diagnostic tools
│       │   │   ├── dns-leak-test/
│       │   │   ├── webrtc-leak-test/
│       │   │   └── speed-test/
│       │   ├── servers/              # pSEO pages
│       │   │   └── [provider]/[location]/[purpose]/
│       │   └── api/
│       │       ├── servers/
│       │       └── webhooks/probe-results/
│       ├── components/
│       │   ├── ui/                   # Shadcn
│       │   ├── server-table/
│       │   └── diagnostic-tools/
│       └── lib/
│           ├── db/                   # Drizzle ORM
│           └── redis/
├── packages/
│   ├── database/                     # Shared schema
│   └── types/                        # TypeScript types
├── probes/                           # Go probe binary
│   ├── cmd/probe/main.go
│   ├── internal/
│   │   ├── connector/                # VPN connection
│   │   ├── tester/                   # Speed/leak tests
│   │   └── reporter/                 # API client
│   ├── Dockerfile
│   └── fly.toml
└── turbo.json
```

---

## 8. Risk Matrix

| Risk                             | Severity | Mitigation                             |
| -------------------------------- | -------- | -------------------------------------- |
| Probe IP banned by VPN providers | High     | Rotate IPs, residential proxies        |
| Database overwhelmed             | Medium   | Redis queue, batch inserts             |
| SEO thin content penalty         | Medium   | Unique data per page, min thresholds   |
| VPN config changes               | High     | Abstract configs, version control      |
| Cost explosion                   | Medium   | Tiered testing, sample popular servers |

---

## 9. Implementation Phases

### Phase 1: Foundation

- [ ] Initialize Next.js monorepo (Turborepo)
- [ ] Deploy to Cloudflare Workers (OpenNext)
- [ ] Provision VPS Postgres + Redis
- [ ] Build basic server table UI
- [ ] Seed 3 providers (Nord, Express, Surfshark)

### Phase 2: Probe Network

- [ ] Build Go probe binary
- [ ] Deploy to 3 Fly.io regions (iad, fra, sin)
- [ ] Implement webhook ingestion
- [ ] Set up Redis queue + cron processing
- [ ] Automate materialized view refresh

### Phase 3: SEO Engine

- [ ] Build programmatic page templates
- [ ] Generate sitemap (50k pages)
- [ ] Implement ISR + on-demand revalidation
- [ ] Add Schema.org markup
- [ ] Internal linking component

### Phase 4: Diagnostic Tools

- [ ] DNS leak test
- [ ] WebRTC leak test
- [ ] IP lookup tool
- [ ] Speed test integration

### Phase 5: Scale & Launch

- [ ] Expand to 8 probe regions
- [ ] Add 10+ providers
- [ ] Performance optimization
- [ ] Monitoring (Sentry, Axiom)
- [ ] Launch

---

## 10. Cost Estimation (Monthly)

| Service             | Tier       | Cost           |
| ------------------- | ---------- | -------------- |
| Cloudflare Workers  | Paid/Free  | ~$0-5          |
| VPS (DB + Redis)    | 1-2 GB RAM | ~$10-20        |
| Fly.io (8 machines) | Shared 1x  | ~$40           |
| Domain + DNS        | Cloudflare | $0             |
| Monitoring (Sentry) | Team       | $26            |
| **Total**           |            | **~$76-91/mo** |

Scales to ~100k monthly visitors before tier upgrades needed.

---

## Quick Start

```bash
# Clone and setup
git clone <repo>
cd bestvpnserver
pnpm install

# Environment
cp .env.example .env.local
# Configure: DATABASE_URL, REDIS_URL, etc.

# Database
pnpm db:push
pnpm db:seed

# Development
pnpm dev

# Probe (local test)
cd probes && go run cmd/probe/main.go
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Architecture Approved
