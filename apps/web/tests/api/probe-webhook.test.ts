import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/webhooks/probe-results/route";
import { signProbePayload } from "@/lib/auth/probe-signature";

const lpush = vi.fn().mockResolvedValue(1);

vi.mock("@/lib/redis", () => ({
  getRedis: () => ({
    lpush,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn().mockResolvedValue(null),
}));

describe("probe webhook", () => {
  beforeEach(() => {
    lpush.mockClear();
    process.env.PROBE_WEBHOOK_SECRET = "test-secret";
  });

  it("queues valid probe payload", async () => {
    const payload = {
      server_id: 123,
      probe_id: "iad",
      timestamp: Date.now(),
      ping_ms: 40,
      download_mbps: 250.5,
      upload_mbps: 120.25,
      connection_success: true,
      connection_time_ms: 1200,
      streaming_results: [
        { platform: "netflix-us", is_unlocked: true, response_ms: 250 },
      ],
    };

    const raw = JSON.stringify(payload);
    const signature = signProbePayload(raw, process.env.PROBE_WEBHOOK_SECRET!);

    const request = new NextRequest(
      "http://localhost/api/webhooks/probe-results",
      {
        method: "POST",
        body: raw,
        headers: {
          "x-probe-signature": signature,
          "x-forwarded-for": "1.1.1.1",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("queued");
    expect(lpush).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid signature", async () => {
    const payload = {
      server_id: 123,
      probe_id: "iad",
      timestamp: Date.now(),
      ping_ms: 40,
      download_mbps: 250.5,
      upload_mbps: 120.25,
      connection_success: true,
    };

    const request = new NextRequest(
      "http://localhost/api/webhooks/probe-results",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "x-probe-signature": "invalid",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
