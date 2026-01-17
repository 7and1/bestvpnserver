# Development Guide - BestVPNServer.com

Local development setup and workflow.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Docker 20+ (for PostgreSQL and Redis)
- Git

## Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd bestvpnserver

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

## Local Services

### Start PostgreSQL and Redis

```bash
# Using Docker Compose
cd infrastructure/central
docker compose -f docker-compose.vps.yml up -d

# Verify services are running
docker ps
```

### Configure Environment

Edit `.env.local`:

```bash
# Database
DATABASE_URL=postgres://bestvpn:change-me@localhost:5432/bestvpnserver

# Redis
REDIS_URL=redis://:change-me@localhost:6379/0

# Webhook secrets (generate random strings)
PROBE_WEBHOOK_SECRET=local-dev-secret-change-in-production
CRON_SECRET=local-cron-secret-change-in-production
DNS_WEBHOOK_SECRET=local-dns-secret-change-in-production

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Development Workflow

### Start Development Server

```bash
# Start all packages
pnpm dev

# Start only web app
pnpm --filter web dev
```

Visit http://localhost:3000

### Database Operations

```bash
# Push schema changes
pnpm --filter database db:push

# Generate migration
pnpm --filter database db:generate

# Run migrations
pnpm --filter database db:migrate

# Open Drizzle Studio
pnpm --filter database db:studio

# Seed database
pnpm --filter database db:seed
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Project Structure

### Monorepo Layout

```
bestvpnserver/
├── apps/
│   └── web/                    # Next.js 14 application
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       ├── lib/                # Utilities and API clients
│       └── public/             # Static assets
├── packages/
│   ├── database/               # Drizzle schema & migrations
│   └── types/                  # Shared TypeScript types
├── docs/                       # Documentation
└── turbo.json                  # Turborepo configuration
```

### App Router Structure

```
apps/web/app/
├── (marketing)/                # Marketing pages (public)
│   └── page.tsx
├── (tools)/                    # Diagnostic tools
│   ├── dns-leak-test/
│   ├── webrtc-leak-test/
│   └── speed-test/
├── servers/                    # Server listing & details
├── [provider]/                 # Provider pages (pSEO)
├── best-vpn-for-[purpose]/     # Use case pages (pSEO)
└── api/                        # API routes
```

## Component Development

### Using Shadcn/UI

```bash
# Add a new component
pnpm --filter web ui add button

# Available components
pnpm --filter web ui add card table dialog dropdown-menu
```

### Creating a New Page

```typescript
// app/new-page/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "New Page",
  description: "Page description",
};

export default function NewPage() {
  return (
    <div className="container">
      <Card>
        <CardHeader>
          <CardTitle>New Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Content goes here</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

## API Development

### Creating an API Route

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const data = await redis.get("example");

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate input
  if (!body.name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  // Process data
  await redis.set(`example:${body.name}`, JSON.stringify(body));

  return NextResponse.json({ success: true });
}
```

### Adding a Cron Job

```typescript
// app/api/cron/new-task/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Perform task
  // ...

  return NextResponse.json({ success: true, timestamp: new Date() });
}
```

## Testing

### Unit Tests

```typescript
// Example test
import { describe, it, expect } from "vitest";
import { calculateScore } from "@/lib/scoring";

describe("calculateScore", () => {
  it("returns 0 for zero metrics", () => {
    expect(calculateScore({ speed: 0, latency: 1000, uptime: 0 })).toBe(0);
  });

  it("returns higher score for better metrics", () => {
    const result1 = calculateScore({ speed: 100, latency: 10, uptime: 100 });
    const result2 = calculateScore({ speed: 50, latency: 100, uptime: 90 });
    expect(result1).toBeGreaterThan(result2);
  });
});
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests for specific package
pnpm --filter web test
```

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Database Debugging

```bash
# View database logs
docker logs bestvpnserver-postgres -f

# Connect to database
docker exec -it bestvpnserver-postgres psql -U bestvpn bestvpnserver

# Run query
SELECT * FROM servers LIMIT 10;
```

### Redis Debugging

```bash
# View Redis logs
docker logs bestvpnserver-redis -f

# Connect to Redis
docker exec -it bestvpnserver-redis redis-cli -a your-password

# View all keys
KEYS *

# Get specific key
GET server:1:latest
```

## Common Tasks

### Adding a New Environment Variable

1. Add to `.env.example`
2. Add to `apps/web/lib/env.ts` for validation
3. Use in code via `process.env.VAR_NAME`

### Adding a New Database Table

1. Update `packages/database/src/schema.ts`
2. Run `pnpm --filter database db:push`
3. (Optional) Generate migration: `pnpm --filter database db:generate`

### Adding a New API Endpoint

1. Create route in `apps/web/app/api/`
2. Add validation schema in `lib/validation/schemas.ts`
3. Update API documentation

## Cloudflare Workers Development

### Local Preview

```bash
# Build for Workers
pnpm --filter web cf:build

# Preview locally
pnpm --filter web cf:preview
```

### Deploy to Staging

```bash
# Deploy to Workers (staging)
wrangler deploy --env staging
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

```bash
# Restart PostgreSQL
docker restart bestvpnserver-postgres

# Check connection string
echo $DATABASE_URL
```

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules
pnpm install
pnpm build
```

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
