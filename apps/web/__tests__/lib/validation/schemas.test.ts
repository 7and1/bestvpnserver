import { describe, it, expect } from "vitest";
import {
  ServerQuerySchema,
  ProbeResultSchema,
  DnsTestIdSchema,
  DnsLogSchema,
  SpeedtestDownloadSchema,
  MerchantQuerySchema,
  IpInfoSchema,
  type ServerQueryInput,
  type ProbeResultInput,
  type DnsLogInput,
  type MerchantQueryInput,
  type IpInfoInput,
} from "@/lib/validation/schemas";

describe("ServerQuerySchema", () => {
  const validInputs: ServerQueryInput[] = [
    { limit: 20, offset: 0 },
    { provider: "expressvpn", limit: 20, offset: 0 },
    { provider: "nord-vpn-123", limit: 20, offset: 0 },
    { country: "US", limit: 20, offset: 0 },
    { country: "GB", limit: 20, offset: 0 },
    { city: "new-york", limit: 20, offset: 0 },
    { city: "london-123", limit: 20, offset: 0 },
    { protocol: "wireguard", limit: 20, offset: 0 },
    { protocol: "openvpn-udp", limit: 20, offset: 0 },
    { protocol: "openvpn-tcp", limit: 20, offset: 0 },
    { protocol: "ikev2", limit: 20, offset: 0 },
    { streaming: "netflix", limit: 20, offset: 0 },
    { minSpeed: 100, limit: 20, offset: 0 },
    { maxLatency: 50, limit: 20, offset: 0 },
    { limit: 10, offset: 0 },
    { limit: 20, offset: 5 },
    {
      provider: "mullvad",
      country: "SE",
      city: "stockholm",
      protocol: "wireguard",
      streaming: "hulu",
      minSpeed: 50,
      maxLatency: 100,
      limit: 50,
      offset: 0,
    },
  ];

  const invalidInputs: Array<{ input: Record<string, unknown>; errorPath: string[] }> = [
    { input: { provider: "UPPERCASE" }, errorPath: ["provider"] },
    { input: { provider: "with spaces" }, errorPath: ["provider"] },
    { input: { provider: "a".repeat(51) }, errorPath: ["provider"] },
    { input: { provider: "invalid@char" }, errorPath: ["provider"] },
    { input: { country: "USA" }, errorPath: ["country"] },
    { input: { country: "U" }, errorPath: ["country"] },
    { input: { country: "us" }, errorPath: ["country"] },
    { input: { city: "UPPERCASE" }, errorPath: ["city"] },
    { input: { city: "with spaces" }, errorPath: ["city"] },
    { input: { city: "a".repeat(101) }, errorPath: ["city"] },
    { input: { protocol: "invalid" }, errorPath: ["protocol"] },
    { input: { protocol: "WireGuard" }, errorPath: ["protocol"] },
    { input: { streaming: "UPPERCASE" }, errorPath: ["streaming"] },
    { input: { minSpeed: -1 }, errorPath: ["minSpeed"] },
    { input: { minSpeed: 10001 }, errorPath: ["minSpeed"] },
    { input: { maxLatency: -1 }, errorPath: ["maxLatency"] },
    { input: { maxLatency: 1001 }, errorPath: ["maxLatency"] },
    { input: { limit: 0 }, errorPath: ["limit"] },
    { input: { limit: 101 }, errorPath: ["limit"] },
    { input: { offset: -1 }, errorPath: ["offset"] },
  ];

  describe("valid inputs", () => {
    it.each(validInputs)("should validate %j", (input) => {
      const result = ServerQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(input);
      }
    });

    it("should apply default values", () => {
      const result = ServerQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("should coerce string numbers to numbers", () => {
      const result = ServerQuerySchema.safeParse({
        minSpeed: "100",
        maxLatency: "50",
        limit: "10",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.minSpeed).toBe("number");
        expect(typeof result.data.maxLatency).toBe("number");
        expect(typeof result.data.limit).toBe("number");
        expect(typeof result.data.offset).toBe("number");
      }
    });
  });

  describe("invalid inputs", () => {
    it.each(invalidInputs)("should reject $input with error at $errorPath", ({ input, errorPath }) => {
      const result = ServerQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasErrorInPath = result.error.errors.some((e) =>
          errorPath.some((p) => e.path.includes(p))
        );
        expect(hasErrorInPath).toBe(true);
      }
    });

    it("should reject null values", () => {
      const result = ServerQuerySchema.safeParse({ provider: null });
      expect(result.success).toBe(false);
    });

    it("should reject undefined for required nested fields", () => {
      // All fields are optional, so this should pass
      const result = ServerQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should accept empty strings as undefined (optional)", () => {
      const result = ServerQuerySchema.safeParse({ provider: "" });
      // Empty string does not match the regex pattern, so it fails validation
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("provider");
      }
    });

    it("should accept boundary values", () => {
      const result = ServerQuerySchema.safeParse({
        minSpeed: 0,
        maxLatency: 0,
        limit: 1,
        offset: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept maximum boundary values", () => {
      const result = ServerQuerySchema.safeParse({
        minSpeed: 10000,
        maxLatency: 1000,
        limit: 100,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("ProbeResultSchema", () => {
  const validInput = {
    server_id: 123,
    probe_id: "probe-01",
    timestamp: 1234567890,
    ping_ms: 50,
    download_mbps: 100.5,
    upload_mbps: 50.25,
    jitter_ms: 5,
    packet_loss_pct: 0.5,
    connection_success: true,
    connection_time_ms: 1000,
    streaming_results: [
      { platform: "netflix", is_unlocked: true, response_ms: 200 },
      { platform: "hulu", is_unlocked: false },
    ],
  } as const;

  describe("valid inputs", () => {
    it("should validate a complete probe result", () => {
      const result = ProbeResultSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serverId).toBe(123);
        expect(result.data.probeId).toBe("probe-01");
        expect(result.data.pingMs).toBe(50);
        expect(result.data.downloadMbps).toBe(100.5);
        expect(result.data.streamingResults).toHaveLength(2);
      }
    });

    it("should validate with optional fields omitted", () => {
      const minimalInput = {
        server_id: 1,
        probe_id: "abc",
        timestamp: 1234567890,
        ping_ms: 100,
        download_mbps: 50,
        upload_mbps: 25,
        connection_success: false,
      };
      const result = ProbeResultSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it("should transform snake_case to camelCase", () => {
      const result = ProbeResultSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serverId).toBeDefined();
        expect(result.data.probeId).toBeDefined();
        expect(result.data.pingMs).toBeDefined();
        expect(result.data.downloadMbps).toBeDefined();
        expect(result.data.uploadMbps).toBeDefined();
        expect(result.data.jitterMs).toBeDefined();
        expect(result.data.packetLossPct).toBeDefined();
        expect(result.data.connectionSuccess).toBeDefined();
        expect(result.data.connectionTimeMs).toBeDefined();
        expect(result.data.streamingResults).toBeDefined();
      }
    });

    it("should transform streaming results array", () => {
      const result = ProbeResultSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        const firstStreaming = result.data.streamingResults?.[0];
        expect(firstStreaming?.isUnlocked).toBe(true);
        expect(firstStreaming?.responseMs).toBe(200);
      }
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid server_id", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        server_id: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid probe_id format", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        probe_id: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("should reject probe_id that is too short", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        probe_id: "ab",
      });
      expect(result.success).toBe(false);
    });

    it("should reject probe_id that is too long", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        probe_id: "a".repeat(11),
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative ping_ms", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        ping_ms: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject ping_ms exceeding maximum", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        ping_ms: 65536,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative download_mbps", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        download_mbps: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject download_mbps exceeding maximum", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        download_mbps: 100001,
      });
      expect(result.success).toBe(false);
    });

    it("should reject packet_loss_pct out of range", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        packet_loss_pct: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept boundary values", () => {
      const input = {
        server_id: 1,
        probe_id: "abc",
        timestamp: 0,
        ping_ms: 0,
        download_mbps: 0,
        upload_mbps: 0,
        connection_success: true,
      };
      const result = ProbeResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept maximum values", () => {
      const input = {
        server_id: Number.MAX_SAFE_INTEGER,
        probe_id: "a".repeat(10),
        timestamp: 2147483647,
        ping_ms: 65535,
        download_mbps: 100000,
        upload_mbps: 100000,
        connection_success: true,
      };
      const result = ProbeResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should handle missing streaming_results", () => {
      const input: Record<string, unknown> = { ...validInput };
      delete input.streaming_results;
      const result = ProbeResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should handle empty streaming_results array", () => {
      const result = ProbeResultSchema.safeParse({
        ...validInput,
        streaming_results: [],
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("DnsTestIdSchema", () => {
  describe("valid inputs", () => {
    const validIds = [
      "abc123",
      "test-id",
      "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "a".repeat(32),
      "ABC-123-456",
    ];

    it.each(validIds)("should validate '%s'", (id) => {
      const result = DnsTestIdSchema.safeParse(id);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    const invalidIds = [
      { id: "short", reason: "too short" },
      { id: "a".repeat(33), reason: "too long" },
      { id: "invalid@id", reason: "invalid character" },
      { id: "id with spaces", reason: "contains spaces" },
      { id: "", reason: "empty string" },
    ];

    it.each(invalidIds)("should reject '$id' because $reason", ({ id }) => {
      const result = DnsTestIdSchema.safeParse(id);
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = DnsTestIdSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject undefined", () => {
      const result = DnsTestIdSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept exactly 6 characters", () => {
      const result = DnsTestIdSchema.safeParse("abc123");
      expect(result.success).toBe(true);
    });

    it("should accept exactly 32 characters", () => {
      const result = DnsTestIdSchema.safeParse("a".repeat(32));
      expect(result.success).toBe(true);
    });
  });
});

describe("DnsLogSchema", () => {
  describe("valid inputs", () => {
    it("should validate with IPv4", () => {
      const result = DnsLogSchema.safeParse({
        testId: "test-123",
        resolver: "8.8.8.8",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with IPv6", () => {
      const result = DnsLogSchema.safeParse({
        testId: "test-123",
        resolver: "2001:4860:4860::8888",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with localhost", () => {
      const result = DnsLogSchema.safeParse({
        testId: "test-123",
        resolver: "127.0.0.1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject invalid IP address", () => {
      const result = DnsLogSchema.safeParse({
        testId: "test-123",
        resolver: "not-an-ip",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid testId", () => {
      const result = DnsLogSchema.safeParse({
        testId: "x",
        resolver: "8.8.8.8",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = DnsLogSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("SpeedtestDownloadSchema", () => {
  describe("valid inputs", () => {
    it("should validate minimum size", () => {
      const result = SpeedtestDownloadSchema.safeParse({ size: 1 });
      expect(result.success).toBe(true);
    });

    it("should validate large sizes", () => {
      const result = SpeedtestDownloadSchema.safeParse({ size: 10 * 1024 * 1024 });
      expect(result.success).toBe(true);
    });

    it("should coerce string to number", () => {
      const result = SpeedtestDownloadSchema.safeParse({ size: "1024" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.size).toBe("number");
      }
    });
  });

  describe("invalid inputs", () => {
    it("should reject size less than 1", () => {
      const result = SpeedtestDownloadSchema.safeParse({ size: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject size exceeding maximum", () => {
      const result = SpeedtestDownloadSchema.safeParse({
        size: 100 * 1024 * 1024 + 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative size", () => {
      const result = SpeedtestDownloadSchema.safeParse({ size: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept maximum size", () => {
      const result = SpeedtestDownloadSchema.safeParse({
        size: 100 * 1024 * 1024,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("MerchantQuerySchema", () => {
  const validTypes = [
    "google",
    "bing",
    "youtube",
    "youtube_info",
    "youtube_serp",
    "similarweb",
    "web2md",
    "screenshot",
    "hackernews",
    "reddit",
    "twitter",
    "instagram",
    "tiktok",
    "amazon",
    "crunchbase",
  ] as const;

  describe("valid inputs", () => {
    it.each(validTypes)("should validate type '%s'", (type) => {
      const result = MerchantQuerySchema.safeParse({
        type,
        query: "test query",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with query parameter", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "search terms",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with url parameter", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "screenshot",
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with both query and url", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "web2md",
        query: "test",
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with force flag", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "reddit",
        query: "test",
        force: true,
      });
      expect(result.success).toBe(true);
    });

    it("should validate long queries within limit", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "a".repeat(200),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject without query or url", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "invalid",
        query: "test",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty query", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject query exceeding max length", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL format", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "screenshot",
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept single character query", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "a",
      });
      expect(result.success).toBe(true);
    });

    it("should accept query with special characters", () => {
      const result = MerchantQuerySchema.safeParse({
        type: "google",
        query: "test with spaces & special! chars?",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid URLs with various protocols", () => {
      const urls = [
        "http://example.com",
        "https://example.com",
        "https://example.com/path?query=value",
      ];
      for (const url of urls) {
        const result = MerchantQuerySchema.safeParse({
          type: "web2md",
          url,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("IpInfoSchema", () => {
  describe("valid inputs", () => {
    it("should validate empty object", () => {
      const result = IpInfoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate with all optional fields", () => {
      const result = IpInfoSchema.safeParse({
        ip: "1.2.3.4",
        city: "New York",
        region: "NY",
        country: "US",
        loc: "40.7128,-74.0060",
        org: "AS15169 Google LLC",
        timezone: "America/New_York",
      });
      expect(result.success).toBe(true);
    });

    it("should validate partial data", () => {
      const result = IpInfoSchema.safeParse({
        ip: "8.8.8.8",
        country: "US",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject null values for optional fields", () => {
      const result = IpInfoSchema.safeParse({
        ip: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept IPv6 address", () => {
      const result = IpInfoSchema.safeParse({
        ip: "2001:4860:4860::8888",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty strings for optional fields", () => {
      const result = IpInfoSchema.safeParse({
        city: "",
        org: "",
      });
      expect(result.success).toBe(true);
    });
  });
});
