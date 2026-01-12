# Project Lighthouse - Documentation Index

## Quick Links

| Document                                         | Description                                    |
| ------------------------------------------------ | ---------------------------------------------- |
| [PROJECT-LIGHTHOUSE.md](./PROJECT-LIGHTHOUSE.md) | Master architecture document - start here      |
| [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)       | PostgreSQL schema, indexes, materialized views |
| [PROBE-NETWORK.md](./PROBE-NETWORK.md)           | Distributed probe infrastructure (Go + Fly.io) |
| [PSEO-STRATEGY.md](./PSEO-STRATEGY.md)           | Programmatic SEO implementation                |
| [REDIS-CACHE.md](./REDIS-CACHE.md)               | Caching strategy with Redis (VPS or Upstash)   |
| [SECURITY.md](./SECURITY.md)                     | Security guidelines and threat model           |
| [DIAGNOSTIC-TOOLS.md](./DIAGNOSTIC-TOOLS.md)     | Client-side VPN testing tools                  |
| [DEPLOYMENT-CF-VPS.md](./DEPLOYMENT-CF-VPS.md)   | Cloudflare (OpenNext) + VPS data layer         |
| [CLOUDFLARE-EDGE.md](./CLOUDFLARE-EDGE.md)       | DNS, WAF, bot protection configuration         |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     bestvpnserver.com                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Cloudflare  │  │   VPS DB    │  │  VPS Cache  │          │
│  │  Workers    │  │ PostgreSQL  │  │   Redis     │          │
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

Cloudflare + VPS deployment is documented in `docs/DEPLOYMENT-CF-VPS.md`.

---

## Tech Stack Summary

| Layer      | Technology                     | Purpose                        |
| ---------- | ------------------------------ | ------------------------------ |
| Frontend   | Next.js 14 + Tailwind + Shadcn | SSR, ISR, UI components        |
| API        | Next.js API Routes             | BFF layer                      |
| Database   | PostgreSQL (VPS)               | Primary data store             |
| Cache      | Redis (VPS)                    | Caching, queues, rate limiting |
| Probes     | Go + Fly.io                    | Distributed VPN testing        |
| Deployment | Cloudflare Workers (OpenNext)  | Frontend + API hosting         |

---

## Implementation Phases

### Phase 1: Foundation

- [x] Architecture design
- [ ] Initialize Next.js monorepo
- [ ] Configure database schema
- [ ] Basic server table UI

### Phase 2: Probe Network

- [ ] Go probe binary
- [ ] Deploy 3 regions
- [ ] Webhook ingestion
- [ ] Batch processing

### Phase 3: SEO Engine

- [ ] Programmatic pages
- [ ] Sitemap generation
- [ ] Schema.org markup

### Phase 4: Tools

- [ ] WebRTC leak test
- [ ] DNS leak test
- [ ] Speed test

### Phase 5: Launch

- [ ] 8 probe regions
- [ ] 10+ VPN providers
- [ ] Monitoring

---

## Cost Estimate

| Service                | Monthly Cost   |
| ---------------------- | -------------- |
| Cloudflare Workers     | ~$0-5          |
| VPS (Postgres + Redis) | ~$10-20        |
| Fly.io (8 nodes)       | ~$40           |
| Monitoring             | ~$26           |
| **Total**              | **~$76-91/mo** |

---

## Quick Commands

```bash
# Development
pnpm dev

# Database
pnpm db:push
pnpm db:seed
pnpm db:studio

# Build
pnpm build

# Probe (local)
cd probes && go run cmd/probe/main.go
```

---

**Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Architecture Complete - Ready for Implementation
