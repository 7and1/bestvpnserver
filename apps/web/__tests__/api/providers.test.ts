import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/providers/highlights/route";

// Mock dependencies
vi.mock("@/lib/runtime", () => ({
  getRuntimeConfig: vi.fn(() => "nodejs"),
}));

vi.mock("@/lib/cache/provider-summary", () => ({
  getOrSetProviderHighlights: vi.fn(async (limit, country, fn) => {
    return fn();
  }),
}));

vi.mock("@/lib/data/providers", () => ({
  getTopProviderHighlightsBatch: vi.fn(async () => [
    {
      providerId: 1,
      name: "ExpressVPN",
      slug: "expressvpn",
      serverCount: 100,
      avgPing: 50,
      avgDownload: 500,
    },
  ]),
}));

describe("/api/providers/highlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return provider highlights", async () => {
      const request = new NextRequest(
        "https://example.com/api/providers/highlights",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const request = new NextRequest(
        "https://example.com/api/providers/highlights?limit=5",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should accept country parameter", async () => {
      const request = new NextRequest(
        "https://example.com/api/providers/highlights?country=US",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("should set cache headers", async () => {
      const request = new NextRequest(
        "https://example.com/api/providers/highlights",
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("public");
      expect(cacheControl).toContain("s-maxage=300");
      expect(cacheControl).toContain("stale-while-revalidate=600");
    });
  });
});
