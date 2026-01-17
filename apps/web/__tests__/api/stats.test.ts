import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route
vi.mock("@/lib/env", () => ({
  isDatabaseConfigured: true,
  isRedisConfigured: false,
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([{ avg: "50" }, { avg: "100" }, { avg: "95" }, { last_updated: new Date() }]),
  })),
}));

vi.mock("@/lib/redis", () => ({
  getCache: vi.fn(() => Promise.resolve(null)),
  setCache: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/runtime", () => ({
  getRuntimeConfig: vi.fn(() => "nodejs"),
}));

import { GET } from "@/app/api/stats/overview/route";

describe("/api/stats/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return stats overview", async () => {
      const request = new NextRequest(
        "https://example.com/api/stats/overview",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("streamingUnlockRate");
      expect(data).toHaveProperty("avgLatency");
      expect(data).toHaveProperty("connectionSuccessRate");
      expect(data).toHaveProperty("lastUpdated");
    });

    it("should return numeric values for stats", async () => {
      const request = new NextRequest(
        "https://example.com/api/stats/overview",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.streamingUnlockRate).toBe("number");
      expect(typeof data.avgLatency).toBe("number");
      expect(typeof data.connectionSuccessRate).toBe("number");
    });

    it("should set cache headers", async () => {
      const request = new NextRequest(
        "https://example.com/api/stats/overview",
      );

      const response = await GET(request);

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("s-maxage=30");
    });

    it("should include X-Cache header", async () => {
      const request = new NextRequest(
        "https://example.com/api/stats/overview",
      );

      const response = await GET(request);

      const cacheHeader = response.headers.get("X-Cache");
      expect(cacheHeader).toMatch(/^(HIT|MISS)$/);
    });

    it("should return ISO date string for lastUpdated", async () => {
      const request = new NextRequest(
        "https://example.com/api/stats/overview",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
