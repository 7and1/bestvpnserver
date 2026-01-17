import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { isWorkersRuntime } from "@/lib/api/proxy";
import { SITE_URL } from "@/lib/site";
import { runtime, isWorkers, getRuntimeConfig } from "@/lib/runtime";
import { apiSuccess, apiError, ApiErrorCodes } from "@/lib/api/response";

describe("lib/api/proxy", () => {
  const originalBackendUrl = process.env.BACKEND_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BACKEND_URL;
  });

  afterEach(() => {
    process.env.BACKEND_URL = originalBackendUrl;
    global.fetch = originalFetch;
  });

  describe("isWorkersRuntime", () => {
    it("should export a boolean", () => {
      expect(typeof isWorkersRuntime).toBe("boolean");
    });
  });
});

describe("lib/site", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  describe("SITE_URL", () => {
    it("should have a string value", () => {
      expect(typeof SITE_URL).toBe("string");
      expect(SITE_URL.length).toBeGreaterThan(0);
    });

    it("should use https protocol", () => {
      expect(SITE_URL.startsWith("https://")).toBe(true);
    });
  });
});

describe("lib/runtime", () => {
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
  });
});

describe("lib/api/response", () => {
  describe("apiSuccess", () => {
    it("should create basic success response", () => {
      const response = apiSuccess({ foo: "bar" });
      expect(response.status).toBe(200);
    });

    it("should include pagination metadata", () => {
      const response = apiSuccess(
        { items: [] },
        {
          pagination: { limit: 10, offset: 0, total: 100 },
        },
      );

      const data = response.json();
      expect(data).resolves.toEqual({
        data: { items: [] },
        meta: {
          pagination: { limit: 10, offset: 0, total: 100 },
        },
      });
    });

    it("should include cached metadata", () => {
      const response = apiSuccess({ data: "test" }, { cached: true });

      const data = response.json();
      expect(data).resolves.toMatchObject({
        data: { data: "test" },
        meta: {
          cached: true,
          cachedAt: expect.any(String),
        },
      });
    });

    it("should allow custom status code", () => {
      const response = apiSuccess({ created: true }, { status: 201 });
      expect(response.status).toBe(201);
    });
  });

  describe("apiError", () => {
    it("should create error response with correct status", () => {
      const response = apiError("NOT_FOUND", "Resource not found");
      expect(response.status).toBe(404);
    });

    it("should use correct status codes for error types", () => {
      const cases: Array<{ code: keyof typeof ApiErrorCodes; expectedStatus: number }> = [
        { code: "VALIDATION_ERROR", expectedStatus: 400 },
        { code: "NOT_FOUND", expectedStatus: 404 },
        { code: "UNAUTHORIZED", expectedStatus: 401 },
        { code: "FORBIDDEN", expectedStatus: 403 },
        { code: "RATE_LIMIT_EXCEEDED", expectedStatus: 429 },
        { code: "INTERNAL_ERROR", expectedStatus: 500 },
        { code: "DATABASE_ERROR", expectedStatus: 500 },
        { code: "SERVICE_UNAVAILABLE", expectedStatus: 503 },
      ];

      for (const { code, expectedStatus } of cases) {
        const response = apiError(code, "Test error");
        expect(response.status).toBe(expectedStatus);
      }
    });

    it("should include details when provided", () => {
      const response = apiError("VALIDATION_ERROR", "Invalid input", {
        details: { field: "email", issue: "Invalid format" },
      });

      const data = response.json();
      expect(data).resolves.toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { field: "email", issue: "Invalid format" },
        },
      });
    });

    it("should include custom headers when provided", () => {
      const response = apiError("RATE_LIMIT_EXCEEDED", "Too many requests", {
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      });

      expect(response.headers.get("Retry-After")).toBe("60");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should allow custom status override", () => {
      const response = apiError("INTERNAL_ERROR", "Custom error", { status: 503 });
      expect(response.status).toBe(503);
    });
  });
});
