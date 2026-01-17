# API Reference - BestVPNServer.com

Complete API endpoint documentation.

## Base URL

```
Production: https://bestvpnserver.com
Staging: https://staging.bestvpnserver.com
```

## Authentication

Most endpoints are public. Internal endpoints use bearer token authentication:

```bash
Authorization: Bearer <secret-token>
```

## Response Format

All responses follow this structure:

```typescript
// Success Response
{
  "data": any,
  "meta"?: {
    "total": number,
    "page": number,
    "limit": number
  }
}

// Error Response
{
  "error": string,
  "details"?: any
}
```

## Public Endpoints

### Servers

#### List Servers

```http
GET /api/servers
```

Query Parameters:

| Parameter   | Type    | Default | Description                          |
| ----------- | ------- | ------- | ------------------------------------ |
| provider    | string  | -       | Filter by provider slug              |
| country     | string  | -       | Filter by country ISO code           |
| city        | string  | -       | Filter by city name                  |
| protocol    | string  | -       | Filter by protocol (wireguard, etc)  |
| streaming   | string  | -       | Filter by streaming platform         |
| minSpeed    | number  | -       | Minimum download speed (Mbps)        |
| maxLatency  | number  | -       | Maximum latency (ms)                 |
| sort        | string  | speed   | Sort field: speed, latency, uptime   |
| order       | string  | desc    | Order: asc, desc                     |
| limit       | number  | 20      | Results per page (1-100)             |
| page        | number  | 1       | Page number                          |

Example:

```bash
curl "https://bestvpnserver.com/api/servers?provider=nordvpn&country=JP&minSpeed=100&limit=10"
```

Response:

```json
{
  "data": [
    {
      "id": 1234,
      "provider": "nordvpn",
      "hostname": "jp1234.nordvpn.com",
      "city": "Tokyo",
      "country": "JP",
      "countryName": "Japan",
      "protocols": ["wireguard", "openvpn_udp"],
      "latestMetrics": {
        "pingMs": 23,
        "downloadMbps": 245.5,
        "uploadMbps": 89.2,
        "uptimePercent": 99.8,
        "measuredAt": "2026-01-17T10:30:00Z"
      },
      "streaming": {
        "netflix": true,
        "disneyPlus": true,
        "bbcIplayer": false
      }
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 10
  }
}
```

#### Get Server Details

```http
GET /api/servers/{id}
```

Response:

```json
{
  "data": {
    "id": 1234,
    "provider": {
      "id": 1,
      "slug": "nordvpn",
      "name": "NordVPN",
      "websiteUrl": "https://nordvpn.com",
      "logoUrl": "https://cdn.bestvpnserver.com/logos/nordvpn.png"
    },
    "hostname": "jp1234.nordvpn.com",
    "ipAddress": "203.0.113.1",
    "city": "Tokyo",
    "country": "JP",
    "coordinates": {
      "lat": 35.6762,
      "lng": 139.6503
    },
    "protocols": [
      {
        "name": "wireguard",
        "port": 51820
      },
      {
        "name": "openvpn_udp",
        "port": 1194
      }
    ],
    "latestMetrics": {
      "byProbe": [
        {
          "probe": "us-east",
          "pingMs": 145,
          "downloadMbps": 89.2,
          "uploadMbps": 42.1,
          "measuredAt": "2026-01-17T10:30:00Z"
        },
        {
          "probe": "asia-southeast",
          "pingMs": 23,
          "downloadMbps": 245.5,
          "uploadMbps": 89.2,
          "measuredAt": "2026-01-17T10:30:00Z"
        }
      ],
      "averages": {
        "pingMs": 84,
        "downloadMbps": 167.4,
        "uploadMbps": 65.7,
        "uptimePercent": 99.8
      }
    },
    "streaming": {
      "netflix": {
        "unlocked": true,
        "region": "JP",
        "checkedAt": "2026-01-17T09:00:00Z"
      },
      "disneyPlus": {
        "unlocked": true,
        "checkedAt": "2026-01-17T09:00:00Z"
      }
    },
    "history": {
      "period": "7d",
      "dataPoints": 168,
      "avgSpeed": 158.2,
      "avgLatency": 81,
      "uptime": 99.7
    }
  }
}
```

### Statistics

#### Platform Overview

```http
GET /api/stats/overview
```

Response:

```json
{
  "data": {
    "totalServers": 1247,
    "activeServers": 1189,
    "totalProviders": 12,
    "countriesCovered": 67,
    "testsToday": 45892,
    "avgPlatformSpeed": 142.3,
    "avgPlatformLatency": 67,
    "topProviders": [
      {
        "slug": "nordvpn",
        "name": "NordVPN",
        "serverCount": 547,
        "avgSpeed": 178.2,
        "avgLatency": 58
      },
      {
        "slug": "expressvpn",
        "name": "ExpressVPN",
        "serverCount": 312,
        "avgSpeed": 165.8,
        "avgLatency": 62
      }
    ],
    "topCountries": [
      {
        "iso": "US",
        "name": "United States",
        "serverCount": 289,
        "avgSpeed": 145.2
      },
      {
        "iso": "JP",
        "name": "Japan",
        "serverCount": 187,
        "avgSpeed": 189.4
      }
    ]
  }
}
```

### Providers

#### Provider Highlights

```http
GET /api/providers/highlights
```

Query Parameters:

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| limit     | number | Number of providers (1-12) |

Response:

```json
{
  "data": [
    {
      "slug": "nordvpn",
      "name": "NordVPN",
      "logoUrl": "https://cdn.bestvpnserver.com/logos/nordvpn.png",
      "tagline": "Fastest speeds for streaming",
      "highlights": [
        "5,000+ servers worldwide",
        "Best-in-class encryption",
        "30-day money-back guarantee"
      ],
      "stats": {
        "serverCount": 547,
        "countryCount": 60,
        "avgSpeed": 178.2,
        "avgLatency": 58,
        "uptime": 99.9
      },
      "pricing": {
        "tier": "premium",
        "startingPrice": 3.29
      }
    }
  ]
}
```

### Diagnostic Tools

#### IP Lookup

```http
GET /api/tools/my-ip
```

Response:

```json
{
  "data": {
    "ip": "203.0.113.1",
    "city": "Tokyo",
    "region": "Tokyo",
    "country": "JP",
    "countryName": "Japan",
    "coordinates": {
      "lat": 35.6762,
      "lng": 139.6503
    },
    "isp": "Example ISP",
    "isVPN": false,
    "isProxy": false,
    "isTor": false
  }
}
```

#### DNS Leak Test

```http
POST /api/tools/dns-test/start
```

Response:

```json
{
  "data": {
    "testId": "dns_abc123",
    "dnsServers": [
      "1.1.1.1",
      "8.8.8.8"
    ],
    "status": "running"
  }
}
```

Check results:

```http
GET /api/tools/dns-test/results?testId=dns_abc123
```

Response:

```json
{
  "data": {
    "testId": "dns_abc123",
    "status": "complete",
    "isLeaking": false,
    "detectedServers": [
      {
        "ip": "1.1.1.1",
        "isp": "Cloudflare",
        "location": "US"
      }
    ],
    "expectedISP": "Your ISP",
    "recommendation": "No DNS leak detected"
  }
}
```

#### Speed Test

##### Ping Test

```http
POST /api/tools/speedtest/ping
```

Request body:

```json
{
  "host": "bestvpnserver.com"
}
```

Response:

```json
{
  "data": {
    "pingMs": 23.5,
    "jitterMs": 1.2
  }
}
```

##### Download Test

```http
POST /api/tools/speedtest/download
```

Request body:

```json
{
  "duration": 10
}
```

Response:

```json
{
  "data": {
    "downloadMbps": 245.8,
    "bytesReceived": 307250000,
    "durationSeconds": 10
  }
}
```

##### Upload Test

```http
POST /api/tools/speedtest/upload
```

Request body:

```json
{
  "duration": 10
}
```

Response:

```json
{
  "data": {
    "uploadMbps": 89.2,
    "bytesSent": 111500000,
    "durationSeconds": 10
  }
}
```

## Internal Endpoints

### Webhooks

#### Probe Results

```http
POST /api/webhooks/probe-results
```

Headers:

```
Content-Type: application/json
X-Probe-Signature: <JWT signature>
X-Probe-ID: <probe location code>
```

Request body:

```json
{
  "serverId": 1234,
  "probeId": 1,
  "measuredAt": "2026-01-17T10:30:00Z",
  "pingMs": 23,
  "downloadMbps": 245.5,
  "uploadMbps": 89.2,
  "jitterMs": 2,
  "packetLossPct": 0.1,
  "connectionSuccess": true,
  "connectionTimeMs": 1200,
  "streamingResults": [
    {
      "platformId": 1,
      "isUnlocked": true,
      "responseTimeMs": 450
    }
  ]
}
```

Response:

```
202 Accepted
```

### Cron Jobs

#### Process Results

```http
GET /api/cron/process-results
```

Headers:

```
Authorization: Bearer <CRON_SECRET>
```

Response:

```json
{
  "processed": 500,
  "performance": 500,
  "streaming": 124,
  "durationMs": 2340
}
```

#### Cache Refresh

```http
GET /api/cron/cache-refresh
```

Headers:

```
Authorization: Bearer <CRON_SECRET>
```

Response:

```json
{
  "refreshed": {
    "dashboards": 1,
    "providers": 12,
    "countries": 67,
    "seoPages": 1250
  }
}
```

#### Database Maintenance

```http
GET /api/cron/db-maintenance
```

Headers:

```
Authorization: Bearer <CRON_SECRET>
```

Response:

```json
{
  "tasks": {
    "vacuum": "completed",
    "analyze": "completed",
    "partitionsCreated": 1,
    "materializedViewsRefreshed": 2
  }
}
```

### Cache Invalidation

#### Revalidate Pages

```http
POST /api/revalidate
```

Headers:

```
Authorization: Bearer <REVALIDATION_SECRET>
```

Request body:

```json
{
  "type": "server-status-change",
  "data": {
    "provider": "nordvpn",
    "country": "JP",
    "city": "Tokyo"
  }
}
```

Supported types:

- `server-status-change` - Revalidate server detail page
- `streaming-status-change` - Revalidate streaming-related pages
- `provider-wide-update` - Revalidate all provider pages

## Error Codes

| Code | Description                       |
| ---- | --------------------------------- |
| 400  | Bad Request - Invalid parameters  |
| 401  | Unauthorized - Missing/invalid auth|
| 404  | Not Found                         |
| 429  | Rate Limit Exceeded               |
| 500  | Internal Server Error             |
| 503  | Service Unavailable               |

## Rate Limits

| Endpoint Type  | Limit           | Window |
| -------------- | --------------- | ------ |
| Public API     | 100 requests    | 1 min  |
| Diagnostic     | 10 requests     | 1 min  |
| Webhooks       | 1000 requests   | 1 min  |
| Cron           | 1 request       | N/A    |

## SDK Examples

### JavaScript/TypeScript

```typescript
import { fetchServers } from "@bestvpnserver/sdk";

const servers = await fetchServers({
  provider: "nordvpn",
  country: "JP",
  minSpeed: 100
});
```

### Python

```python
from bestvpnserver import Client

client = Client(api_key="optional")
servers = client.servers.list(
    provider="nordvpn",
    country="JP",
    min_speed=100
)
```

### cURL

```bash
curl -G "https://bestvpnserver.com/api/servers" \
  -d "provider=nordvpn" \
  -d "country=JP" \
  -d "minSpeed=100" \
  -d "limit=10"
```

---

**Version**: 1.0.0
**Last Updated**: 2026-01-17
