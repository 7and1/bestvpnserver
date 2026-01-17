import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route
vi.mock("@/lib/env", () => ({
  isDatabaseConfigured: true,
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("@/lib/runtime", () => ({
  getRuntimeConfig: vi.fn(() => "nodejs"),
}));

vi.mock("@/lib/cache/query", () => ({
  getOrSetCache: vi.fn((key, ttl, fn) => fn()),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn(() => Promise.resolve(null)),
}));

import { GET } from "@/app/api/servers/route";

describe("/api/servers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 400 for invalid provider format", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?provider=INVALID@NAME",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid country code", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?country=USA",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid protocol", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?protocol=invalid",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for limit exceeding maximum", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?limit=101",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for negative offset", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?offset=-1",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid city format", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?city=INVALID_CITY",
      );

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("should accept valid protocol values", async () => {
      const protocols = ["wireguard", "openvpn-udp", "openvpn-tcp", "ikev2"];

      for (const protocol of protocols) {
        const request = new NextRequest(
          `https://example.com/api/servers?protocol=${protocol}`,
        );

        const response = await GET(request);
        expect(response.status).not.toBe(400);
      }
    });

    it("should accept valid country codes", async () => {
      const countries = ["US", "GB", "DE", "JP", "AU"];

      for (const country of countries) {
        const request = new NextRequest(
          `https://example.com/api/servers?country=${country}`,
        );

        const response = await GET(request);
        expect(response.status).not.toBe(400);
      }
    });

    it("should apply default limit and offset", async () => {
      const request = new NextRequest("https://example.com/api/servers");

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should accept numeric parameters as strings", async () => {
      const request = new NextRequest(
        "https://example.com/api/servers?limit=10&offset=5&minSpeed=100&maxLatency=50",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
