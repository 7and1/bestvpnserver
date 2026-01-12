import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/servers/route";

const execute = vi.fn().mockResolvedValue([
  {
    id: 1,
    hostname: "us-nyc-001",
    ip_address: "192.0.2.1",
    provider_name: "NordVPN",
    provider_slug: "nordvpn",
    city_name: "New York",
    country_name: "United States",
    country_code: "US",
    ping_ms: 20,
    download_mbps: 250.5,
    upload_mbps: 120.2,
    connection_success: true,
    measured_at: new Date().toISOString(),
  },
]);

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    execute,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("/api/servers", () => {
  it("returns server data", async () => {
    const request = new NextRequest("http://localhost/api/servers?limit=1");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].provider_slug).toBe("nordvpn");
  });

  it("rejects invalid query", async () => {
    const request = new NextRequest("http://localhost/api/servers?limit=9999");
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
