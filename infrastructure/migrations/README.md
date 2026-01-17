# Database Migrations

This directory contains SQL migration files for the BestVPNServer database.

## Running Migrations

From the project root:

```bash
pnpm --filter @bestvpnserver/database db:migrate:sql
```

Or from the `packages/database` directory:

```bash
pnpm db:migrate:sql
```

## Migration Files

### 001_init_schema.sql
Initial database schema creation including:
- Tables: countries, cities, protocols, streaming_platforms, providers, probe_locations, servers, server_protocols, performance_logs, streaming_checks, performance_logs_hourly
- Basic indexes for foreign key relationships
- Materialized view for latest server performance
- Function to refresh the materialized view

### 002_add_indexes.sql
Performance optimization indexes:
- `idx_streaming_checks_unlocked_recent` - Partial index for recent unlocked streaming checks (30-day retention)
- `idx_servers_active_provider` - Partial index for active servers grouped by provider
- `idx_performance_server_measured` - Index for ordering servers by download speed on materialized view
- `idx_performance_logs_recent` - Partial index for recent performance logs (7-day retention)

## Index Details

### Streaming Checks Index
```sql
idx_streaming_checks_unlocked_recent
```
- **Type**: Partial index
- **Columns**: (server_id, platform_id, is_unlocked, checked_at DESC)
- **Filter**: is_unlocked = true AND checked_at > NOW() - INTERVAL '30 days'
- **Purpose**: Optimizes queries fetching recent unlocked streaming capabilities for servers
- **Use case**: Displaying which servers can unlock Netflix, Disney+, etc.

### Active Servers Index
```sql
idx_servers_active_provider
```
- **Type**: Partial index
- **Columns**: (provider_id, is_active)
- **Filter**: is_active = true
- **Purpose**: Fast filtering of active servers by provider
- **Use case**: Listing available servers for a VPN provider

### Performance Measurement Index
```sql
idx_performance_server_measured
```
- **Type**: Index on materialized view
- **Columns**: (server_id, download_mbps DESC NULLS LAST)
- **Purpose**: Efficient sorting of servers by download speed
- **Use case**: Displaying fastest servers first

### Recent Performance Logs Index
```sql
idx_performance_logs_recent
```
- **Type**: Partial index
- **Columns**: (measured_at DESC, server_id)
- **Filter**: measured_at > NOW() - INTERVAL '7 days'
- **Purpose**: Time-series queries for recent performance data
- **Use case**: Performance history charts and metrics

## Partial Index Benefits

The partial indexes in migration 002 provide:
1. **Smaller index size** - Only index relevant rows
2. **Faster queries** - Less data to scan
3. **Automatic cleanup** - Old data naturally falls out of index scope
