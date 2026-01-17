# BestVPNServer.com

> Data-driven VPN monitoring and recommendation platform with real-time performance testing.

## Overview

BestVPNServer.com is a comprehensive VPN comparison platform that uses distributed probe networks to test VPN server performance in real-time. The platform features programmatic SEO pages, diagnostic tools, and live server rankings.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     bestvpnserver.com                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Cloudflare  │  │   VPS DB    │  │  VPS Cache  │          │
│  │  Workers    │  │ PostgreSQL  │  │   Redis     │          │
│  │  (OpenNext) │  │             │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────┐          │
│  │              Fly.io Probe Network              │          │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │          │
│  │  │ IAD │ │ FRA │ │ SIN │ │ NRT │ │ ... │     │          │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │          │
│  └───────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                     | Purpose                        |
| ---------- | ------------------------------ | ------------------------------ |
| Frontend   | Next.js 14 + Tailwind + Shadcn | SSR, ISR, UI components        |
| API        | Next.js API Routes             | BFF layer                      |
| Database   | PostgreSQL (VPS)               | Primary data store             |
| Cache      | Redis (VPS)                    | Caching, queues, rate limiting |
| Probes     | Go + Fly.io                    | Distributed VPN testing        |
| Deployment | Cloudflare Workers (OpenNext)  | Frontend + API hosting         |

## Project Structure

```
bestvpnserver/
├── apps/
│   └── web/                          # Next.js 14 frontend
│       ├── app/
│       │   ├── (marketing)/          # Landing pages
│       │   ├── (tools)/              # Diagnostic tools
│       │   ├── servers/              # pSEO pages
│       │   └── api/                  # API routes
│       ├── components/               # React components
│       └── lib/                      # Utilities
├── packages/
│   ├── database/                     # Drizzle schema & migrations
│   └── types/                        # Shared TypeScript types
├── docs/                             # Documentation
├── infrastructure/
│   ├── central/                      # VPS Docker configs
│   └── scripts/                      # Deployment scripts
└── turbo.json                        # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for local development)
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bestvpnserver

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
# Required: DATABASE_URL, REDIS_URL, WEBHOOK secrets
```

### Database Setup

```bash
# Push schema to database
pnpm --filter web db:push

# (Optional) Seed with initial data
pnpm --filter database db:seed

# Open Drizzle Studio (database GUI)
pnpm --filter database db:studio
```

### Development

```bash
# Start development server
pnpm dev

# Visit http://localhost:3000
```

### Building

```bash
# Build all packages
pnpm build

# Build only web app
pnpm --filter web build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy (Cloudflare Workers)

```bash
# Build for Cloudflare
pnpm --filter web cf:build

# Deploy to Cloudflare Workers
pnpm --filter web cf:deploy
```

## Documentation

| Document                          | Description                              |
| --------------------------------- | ---------------------------------------- |
| [DEPLOYMENT.md](./DEPLOYMENT.md)  | Complete deployment guide                |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design        |
| [docs/README.md](./docs/README.md) | Documentation index                     |
| [docs/PROJECT-LIGHTHOUSE.md](./docs/PROJECT-LIGHTHOUSE.md) | Master architecture document |
| [docs/DATABASE-SCHEMA.md](./docs/DATABASE-SCHEMA.md) | PostgreSQL schema details |
| [docs/PSEO-STRATEGY.md](./docs/PSEO-STRATEGY.md) | Programmatic SEO implementation |
| [docs/PROBE-NETWORK.md](./docs/PROBE-NETWORK.md) | Probe infrastructure |
| [docs/DEPLOYMENT-CF-VPS.md](./docs/DEPLOYMENT-CF-VPS.md) | Cloudflare + VPS deployment |

## Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages

# Database
pnpm db:push          # Push schema changes
pnpm db:seed          # Seed database
pnpm db:studio        # Open Drizzle Studio

# Cron jobs
pnpm cron:db-maintenance      # Run DB maintenance
pnpm cron:cache-refresh       # Refresh caches

# Cloudflare deployment
pnpm cf:build          # Build for Workers
pnpm cf:deploy         # Deploy to Workers
```

## API Endpoints

### Public APIs
- `GET /api/servers` - List servers with filters
- `GET /api/stats/overview` - Platform statistics
- `GET /api/providers/highlights` - Provider highlights

### Tool APIs
- `GET /api/tools/my-ip` - IP lookup
- `POST /api/tools/dns-test/start` - Start DNS leak test
- `GET /api/tools/dns-test/results` - Get DNS test results
- `POST /api/tools/speedtest/ping` - Ping test
- `POST /api/tools/speedtest/download` - Download speed test
- `POST /api/tools/speedtest/upload` - Upload speed test

### Internal APIs
- `POST /api/webhooks/probe-results` - Ingest probe results
- `GET /api/cron/process-results` - Batch process results (cron)

## Cost Estimate

| Service                | Monthly Cost   |
| ---------------------- | -------------- |
| Cloudflare Workers     | ~$0-5          |
| VPS (Postgres + Redis) | ~$10-20        |
| Fly.io (8 nodes)       | ~$40           |
| Monitoring             | ~$26           |
| **Total**              | **~$76-91/mo** |

## License

Proprietary - All rights reserved.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
