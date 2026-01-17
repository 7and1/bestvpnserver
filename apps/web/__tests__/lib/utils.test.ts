import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cn } from "@/lib/utils";
import { hashKey, buildCacheKey } from "@/lib/cache/keys";
import { fetcher, fetcherWith, swrFetcher, ApiError } from "@/lib/api/fetcher";
import { runtime, isWorkers, getRuntimeConfig, assertWorkers, assertNodejs } from "@/lib/runtime";

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("should handle objects with boolean values", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle Tailwind conflict resolution", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });

  it("should handle complex inputs", () => {
    expect(
      cn(
        "base-class",
        ["array-class"],
        { conditional: true, removed: false },
        undefined,
        "another-class",
      ),
    ).toBe("base-class array-class conditional another-class");
  });
});

describe("hashKey", () => {
  it("should hash simple string", () => {
    const result = hashKey("test");
    expect(result).toHaveLength(32);
    expect(typeof result).toBe("string");
  });

  it("should produce consistent hash for same input", () => {
    const input = { foo: "bar", baz: 123 };
    const hash1 = hashKey(input);
    const hash2 = hashKey(input);
    expect(hash1).toBe(hash2);
  });

  it("should hash objects consistently regardless of key order", () => {
    const hash1 = hashKey({ a: 1, b: 2 });
    const hash2 = hashKey({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });

  it("should hash arrays correctly", () => {
    const hash1 = hashKey([1, 2, 3]);
    const hash2 = hashKey([1, 2, 3]);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = hashKey({ foo: "bar" });
    const hash2 = hashKey({ foo: "baz" });
    expect(hash1).not.toBe(hash2);
  });

  it("should hash nested objects", () => {
    const input = { foo: { bar: { baz: "qux" } } };
    const result = hashKey(input);
    expect(result).toHaveLength(32);
  });

  it("should hash arrays of objects", () => {
    const input = [{ a: 1 }, { b: 2 }];
    const result = hashKey(input);
    expect(result).toHaveLength(32);
  });

  it("should handle null and undefined", () => {
    // null becomes "null" string, undefined becomes "undefined" which fails hash
    expect(hashKey(null)).toBeDefined();
    expect(hashKey(null)).toHaveLength(32);
    // undefined causes stableStringify to return "undefined" which hash.update() rejects
    expect(() => hashKey(undefined)).toThrow();
  });

  it("should handle numbers", () => {
    const result = hashKey(42);
    expect(result).toHaveLength(32);
  });

  it("should handle booleans", () => {
    const hash1 = hashKey(true);
    const hash2 = hashKey(false);
    expect(hash1).not.toBe(hash2);
  });
});

describe("buildCacheKey", () => {
  it("should join parts with colon", () => {
    expect(buildCacheKey("foo", "bar", "baz")).toBe("foo:bar:baz");
  });

  it("should filter out empty strings", () => {
    expect(buildCacheKey("foo", "", "bar")).toBe("foo:bar");
  });

  it("should filter out undefined", () => {
    expect(buildCacheKey("foo", undefined as unknown as string, "bar")).toBe("foo:bar");
  });

  it("should handle single part", () => {
    expect(buildCacheKey("single")).toBe("single");
  });

  it("should handle empty input", () => {
    expect(buildCacheKey()).toBe("");
  });

  it("should handle all empty parts", () => {
    expect(buildCacheKey("", "", "")).toBe("");
  });
});

describe("fetcher", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return parsed JSON on successful response", async () => {
    const mockData = { foo: "bar" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetcher("/api/test");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith("/api/test");
  });

  it("should throw ApiError on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(fetcher("/api/test")).rejects.toThrow(ApiError);
    await expect(fetcher("/api/test")).rejects.toThrow("HTTP 404: Not Found");
  });

  it("should include error data in ApiError", async () => {
    const errorData = { code: "NOT_FOUND", message: "Resource not found" };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => errorData,
    } as Response);

    try {
      await fetcher("/api/test");
      expect.fail("Should have thrown ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(404);
        expect(error.data).toEqual(errorData);
      }
    }
  });

  it("should handle non-JSON error response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("Invalid JSON");
      },
      text: async () => "Internal error",
    } as Partial<Response> as Response);

    try {
      await fetcher("/api/test");
      expect.fail("Should have thrown ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.data).toBe("Internal error");
      }
    }
  });
});

describe("fetcherWith", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should pass init options to fetch", async () => {
    const mockData = { result: "success" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    };

    await fetcherWith("/api/test", init);
    expect(mockFetch).toHaveBeenCalledWith("/api/test", init);
  });

  it("should return parsed JSON on successful response", async () => {
    const mockData = { foo: "bar" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await fetcherWith<{ foo: string }>("/api/test");
    expect(result).toEqual(mockData);
  });

  it("should throw ApiError on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    await expect(fetcherWith("/api/test", { method: "POST" })).rejects.toThrow(ApiError);
  });
});

describe("swrFetcher", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockFetch.mockClear();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should fetch and parse JSON", async () => {
    const mockData = { foo: "bar" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await swrFetcher("/api/test");
    expect(result).toEqual(mockData);
  });

  it("should call fetch with the URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await swrFetcher("/api/test");
    expect(mockFetch).toHaveBeenCalledWith("/api/test");
  });
});

describe("runtime detection", () => {
  it("should export runtime as string", () => {
    expect(runtime).toMatch(/^(workers|nodejs)$/);
  });

  it("should export isWorkers as boolean", () => {
    expect(typeof isWorkers).toBe("boolean");
  });

  it("should return valid runtime config", () => {
    const config = getRuntimeConfig();
    expect(config).toMatch(/^(edge|nodejs)$/);
  });

  it("should have consistent isWorkers and runtime values", () => {
    if (isWorkers) {
      expect(runtime).toBe("workers");
      expect(getRuntimeConfig()).toBe("edge");
    } else {
      expect(runtime).toBe("nodejs");
      expect(getRuntimeConfig()).toBe("nodejs");
    }
  });

  describe("assertWorkers", () => {
    it("should not throw when in Workers runtime", () => {
      if (isWorkers) {
        expect(() => assertWorkers()).not.toThrow();
      } else {
        expect(() => assertWorkers()).toThrow("This function can only be called in Workers runtime");
      }
    });
  });

  describe("assertNodejs", () => {
    it("should not throw when in Node.js runtime", () => {
      if (!isWorkers) {
        expect(() => assertNodejs()).not.toThrow();
      } else {
        expect(() => assertNodejs()).toThrow("This function can only be called in Node.js runtime");
      }
    });
  });
});
