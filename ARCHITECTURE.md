# Architecture - BestVPNServer.com

Complete system architecture documentation for the BestVPNServer platform.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Caching Strategy](#caching-strategy)
- [Workers Integration](#workers-integration)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Scaling Strategy](#scaling-strategy)

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Browser    │  │  Mobile Web  │  │   SEO Bot    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────────┐
│                      EDGE LAYER (Cloudflare)                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  Cloudflare Workers (OpenNext)            │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │    │
│  │  │   Next.js  │  │ API Routes │  │  Assets    │         │    │
│  │  │   SSR/ISR  │  │  (BFF)     │  │  (R2)      │         │    │
│  │  └────────────┘  └────────────┘  └────────────┘         │    │
│  │                                                           │    │
│  │  ┌─────────────────────────────────────────────────────┐ │    │
│  │  │              Cache (Workers KV)                      │ │    │
│  └──┴──────────────────────────────────────────────────────┴───┘    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────┴─────────┐ ┌──────┴──────┐ ┌────────┴────────┐
│   DATA LAYER      │ │  CACHE      │ │  PROBE NETWORK  │
│  ┌──────────────┐ │ │ ┌──────────┐│ │ ┌─────────────┐│
│  │ PostgreSQL   │ │ │ │  Redis   ││ │ │  Fly.io     ││
│  │  (VPS)       │ │ │ │  (VPS)   ││ │ │  8 Regions  ││
│  └──────────────┘ │ │ └──────────┘│ │ └─────────────┘│
└──────────────────┘ └─────────────┘ └─────────────────┘
```

## Technology Stack

### Frontend

| Component      | Technology      | Version | Purpose                     |
| -------------- | --------------- | ------- | --------------------------- |
| Framework      | Next.js         | 14.2    | App Router, SSR, ISR        |
| UI Library     | Shadcn/UI       | Latest  | Unstyled component primitives |
| Styling        | Tailwind CSS    | 3.4     | Utility-first CSS           |
| State          | SWR             | 2.2     | Client-side data fetching   |
| Tables         | TanStack Table  | 8.20    | Data grid/sorting           |
| Deployment     | OpenNext Cloudflare | 1.7 | Cloudflare Workers adapter |

### Backend

| Component      | Technology      | Version | Purpose                     |
| -------------- | --------------- | ------- | --------------------------- |
| API Layer      | Next.js Routes  | 14.2    | BFF pattern                 |
| ORM            | Drizzle ORM     | 0.34    | Type-safe database queries  |
| Database       | PostgreSQL      | 16      | Primary data store          |
| Cache          | Redis           | 7       | Queue, caching, rate limit  |
| Runtime        | Node.js         | 20      | Serverless runtime          |

### Infrastructure

| Component      | Technology      | Purpose                     |
| -------------- | --------------- | --------------------------- |
| Edge Platform  | Cloudflare Workers | Global edge deployment    |
| Database Host  | VPS (Any provider) | Self-hosted PostgreSQL   |
| Cache Host     | VPS (Same)      | Self-hosted Redis          |
| Probe Platform | Fly.io          | Distributed testing nodes  |

## Database Schema

### Core Tables

```sql
-- Reference Data
countries         -- ISO 3166-1 country codes
cities            -- Cities with coordinates
probe_locations   -- Probe node locations
protocols         -- VPN protocols (WireGuard, OpenVPN)
streaming_platforms -- Streaming services (Netflix, etc.)

-- Entities
providers         -- VPN providers
servers           -- VPN servers
server_protocols  -- Server <-> Protocol mapping

-- Time-series (partitioned)
performance_logs  -- Speed/latency measurements
streaming_checks  -- Streaming unlock status

-- Aggregates
performance_logs_hourly -- Hourly rollups

-- Materialized Views
mv_server_latest_performance -- Latest per server/probe
mv_server_daily_stats       -- Daily aggregates
```

### ER Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  countries  │────<│    cities    │>────│   servers   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                             │
                   ┌─────────────┐           │
                   │ providers   │<──────────┘
                   └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│probe_loc.   │     │  protocols  │────>│server_proto.│
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       └────────────────┬───────────────────────┘
                        │
                 ┌──────▼──────┐
                 │performance_ │
                 │    logs     │ (partitioned)
                 └─────────────┘
```

### Partitioning Strategy

```sql
-- Monthly partitions for performance_logs
performance_logs_2026_01  -- January 2026
performance_logs_2026_02  -- February 2026
...

-- Automatic partition creation via pg_cron
SELECT cron.schedule(
  'create-partition',
  '0 0 25 * *',
  'SELECT create_next_partition()'
);
```

## API Endpoints

### Public Endpoints

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| GET    | `/api/servers`               | List servers with filtering          |
| GET    | `/api/stats/overview`        | Platform statistics                  |
| GET    | `/api/providers/highlights`  | Provider feature highlights          |
| GET    | `/api/merchants`             | Merchant/affiliate data              |

### Diagnostic Tools

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/api/tools/my-ip`            | IP lookup with geolocation    |
| POST   | `/api/tools/dns-test/start`   | Start DNS leak test           |
| GET    | `/api/tools/dns-test/results` | Get DNS test results          |
| POST   | `/api/tools/speedtest/ping`   | Measure latency               |
| POST   | `/api/tools/speedtest/download` | Measure download speed        |
| POST   | `/api/tools/speedtest/upload` | Measure upload speed          |

### Internal Endpoints

| Method | Endpoint                         | Auth          | Description                     |
| ------ | -------------------------------- | ------------- | ------------------------------- |
| POST   | `/api/webhooks/probe-results`    | JWT Signature | Ingest probe measurement data   |
| GET    | `/api/cron/process-results`      | Bearer Token  | Batch process queued results    |
| GET    | `/api/cron/cache-refresh`        | Bearer Token  | Refresh SEO page caches         |
| GET    | `/api/cron/db-maintenance`       | Bearer Token  | Database maintenance tasks      |
| POST   | `/api/revalidate`                | Secret        | On-demand cache invalidation    |

## Caching Strategy

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    L1: Hot Data                         │
│  TTL: 1-5 minutes                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  dashboard:rankings:global                      │   │
│  │  server:{id}:latest                             │   │
│  │  streaming:{platform}:servers                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                    L2: Warm Data                        │
│  TTL: 1 hour                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  provider:{slug}:summary                        │   │
│  │  country:{iso}:summary                          │   │
│  │  server:rankings:{location}                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                    L3: SEO Pages                        │
│  TTL: 6 hours                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  seo:page:{slug}:data                           │   │
│  │  seo:page:{slug}:html                           │   │
│  │  sitemap:{provider}                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Cache Implementation

```typescript
// L1: Hot data - short TTL, high frequency access
await redis.set(
  `server:${id}:latest`,
  JSON.stringify(data),
  { ex: 60 }  // 1 minute
);

// L2: Warm data - medium TTL
await redis.set(
  `provider:${slug}:summary`,
  JSON.stringify(data),
  { ex: 3600 }  // 1 hour
);

// L3: SEO pages - long TTL
await redis.set(
  `seo:page:${slug}:data`,
  JSON.stringify(data),
  { ex: 21600 }  // 6 hours
);
```

### Invalidation Strategy

| Trigger                | Invalidation Method                      | Keys Affected                   |
| ---------------------- | ---------------------------------------- | ------------------------------- |
| Probe result received  | `DEL server:{id}:latest`                 | Single server                   |
| Batch processing       | `REFRESH MATERIALIZED VIEW`              | Aggregates                     |
| Provider outage        | `DEL provider:{slug}:*`                  | Provider keys                   |
| Manual revalidate      | `revalidatePath()` + `revalidateTag()`   | Next.js cache                   |

## Workers Integration

### OpenNext Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Cloudflare Worker                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Worker Entry Point                    │ │
│  │           (.open-next/worker.js)                   │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                              │
│  ┌───────────────────────┴───────────────────────────┐ │
│  │                  Request Router                    │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │ │
│  │  │ Static  │  │ ISR     │  │ SSR     │           │ │
│  │  │ Assets  │  │ Pages   │  │ Pages   │           │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘           │ │
│  └───────┼─────────────┼─────────────┼────────────────┘ │
│          │             │             │                  │
│  ┌───────┴─────┐ ┌────┴─────┐ ┌────┴──────────────────┐ │
│  │    R2/ASSETS │ │   KV     │ │    Edge Functions     │ │
│  │   Binding    │ │  Cache   │ │   (API Routes)        │ │
│  └──────────────┘ └──────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Environment-Specific Behavior

```typescript
// Runtime detection for Workers vs Node.js
export const runtime = (() => {
  // Cloudflare Workers
  if (typeof caches !== 'undefined' && caches.default) {
    return 'edge';
  }
  // Node.js (VPS/local)
  return 'nodejs';
})();

// Conditional imports
const dbClient = runtime === 'edge'
  ? createEdgeClient()
  : createNodeClient();
```

### Bindings Configuration

```json
{
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "vars": {
    "DATABASE_URL": "...",
    "REDIS_URL": "...",
    "BACKEND_URL": "https://api.bestvpnserver.com"
  }
}
```

## Data Flow

### Probe Measurement Flow

```
┌─────────────┐
│ Probe Node  │ (Fly.io - iad, fra, sin, etc.)
└──────┬──────┘
       │ 1. Connect to VPN server
       ▼
┌─────────────┐
│ VPN Server  │ (NordVPN, ExpressVPN, etc.)
└──────┬──────┘
       │ 2. Run tests (speed, latency, streaming)
       ▼
┌─────────────┐
│   Results   │
└──────┬──────┘
       │ 3. POST /api/webhooks/probe-results (JWT signed)
       ▼
┌─────────────────────────────────────────┐
│      Cloudflare Worker                  │
│  ┌─────────────────────────────────────┐│
│  │  Verify JWT signature               ││
│  │  Validate payload                   ││
│  │  Push to Redis queue                ││
│  └─────────────────────────────────────┘│
└─────────────────┬───────────────────────┘
                  │ LPUSH probe:results:queue
                  ▼
        ┌─────────────────┐
        │  Redis Queue    │ (VPS)
        └─────────┬───────┘
                  │ 4. Cron triggers batch process (every 5 min)
                  ▼
        ┌─────────────────┐
        │ Batch Processor │
        └─────────┬───────┘
                  │ 5. Bulk INSERT to PostgreSQL
                  ▼
        ┌─────────────────┐
        │   PostgreSQL    │ (VPS)
        └─────────┬───────┘
                  │ 6. REFRESH MATERIALIZED VIEWS
                  ▼
        ┌─────────────────┐
        │  Updated Data   │
        └─────────┬───────┘
                  │ 7. Invalidate cache
                  ▼
        ┌─────────────────┐
        │    Redis Cache  │
        └─────────────────┘
```

### SEO Page Generation Flow

```
┌─────────────────────────────────────────┐
│     Next.js build time                  │
│  ┌─────────────────────────────────────┐│
│  │ generateStaticParams()              ││
│  │   - Query top 1000 server combos    ││
│  │   - Generate static params          ││
│  └─────────────────────────────────────┘│
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     Initial page render                 │
│  - Fetch server data from DB            │
│  - Generate HTML                        │
│  - Cache in Redis                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     Cloudflare ISR                      │
│  - Serve cached HTML                    │
│  - Revalidate every 1 hour              │
│  - On-demand via webhook                │
└─────────────────────────────────────────┘
```

## Security Architecture

### Authentication Layers

| Layer          | Mechanism              | Purpose                          |
| -------------- | ---------------------- | -------------------------------- |
| Probe Webhook  | JWT Signature          | Verify probe identity            |
| Cron Jobs      | Bearer Token           | Verify scheduled job origin      |
| Admin API      | API Key + IP allowlist | Admin operations                 |
| Public API     | Rate limiting          | Prevent abuse                    |

### Request Flow with Security

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Cloudflare WAF                  │
│  - Bot Fight Mode                       │
│  - Rate limiting                        │
│  - Geo blocking (optional)              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Cloudflare Worker               │
│  ┌─────────────────────────────────────┐│
│  │  Request validation                 ││
│  │  - Origin check                     ││
│  │  - Header validation                ││
│  └─────────────────────────────────────┘│
└─────────────────┬───────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  Public API │      │ Admin API   │
│  (Rate lim.)│      │ (Auth req.) │
└─────────────┘      └─────────────┘
```

### Secrets Management

```bash
# Cloudflare Workers (via dashboard or wrangler)
wrangler secret put PROBE_WEBHOOK_SECRET
wrangler secret put CRON_SECRET

# Fly.io (per region)
flyctl secrets set WEBHOOK_SECRET=xxx --app bestvpnserver-probe

# VPS (via Docker env or swarm secrets)
docker secret create postgres_password postgres_pass.txt
```

## Scaling Strategy

### Vertical Scaling (per component)

| Component     | Current | Scale To              | Signal                         |
| ------------- | ------- | --------------------- | ------------------------------ |
| Workers       | Free    | Paid ($5/mo)          | CPU limit errors               |
| VPS RAM       | 2GB     | 4GB                   | OOM kills                      |
| VPS CPU       | 1 vCPU  | 2 vCPU                | High load average              |
| Redis maxmem  | 512MB   | 2GB                   | Eviction increasing            |

### Horizontal Scaling

| Component     | Method                          | Notes                      |
| ------------- | ------------------------------- | -------------------------- |
| Workers       | Automatic (Cloudflare)          | Global edge distribution  |
| Probes        | Add Fly.io regions              | Up to 20+ regions         |
| Database      | Read replicas + connection pool | Single writer for ACID    |
| Redis         | Cluster mode                    | For >10GB data            |

### Load-Based Scaling

```typescript
// Auto-tier based on traffic
const tier = getServerTier(serverId);

switch (tier) {
  case 'hot':
    // Test every 15 minutes
    scheduleTest(serverId, '*/15 * * * *');
    break;
  case 'warm':
    // Test every 2 hours
    scheduleTest(serverId, '0 */2 * * *');
    break;
  case 'cold':
    // Test daily
    scheduleTest(serverId, '0 3 * * *');
    break;
}
```

### Cost Scaling

| Traffic/Month | Workers | VPS    | Probes | Total     |
| ------------- | ------- | ------ | ------ | --------- |
| 10K           | $0      | $10    | $20    | $30/mo    |
| 100K          | $0      | $20    | $40    | $60/mo    |
| 1M            | $5      | $40    | $40    | $85/mo    |
| 10M           | $20     | $80    | $80    | $180/mo   |

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
