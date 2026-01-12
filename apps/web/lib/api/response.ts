import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard API error codes
 */
export const ApiErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

/**
 * Standard API error response shape
 */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Standard API success response shape
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      limit: number;
      offset: number;
      total?: number;
    };
    cached?: boolean;
    cachedAt?: string;
  };
}

/**
 * Create a standardized success response
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    pagination?: { limit: number; offset: number; total?: number };
    cached?: boolean;
    status?: number;
  },
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = { data };

  if (options?.pagination || options?.cached !== undefined) {
    response.meta = {};
    if (options.pagination) {
      response.meta.pagination = options.pagination;
    }
    if (options.cached) {
      response.meta.cached = true;
      response.meta.cachedAt = new Date().toISOString();
    }
  }

  return NextResponse.json(response, { status: options?.status ?? 200 });
}

/**
 * Create a standardized error response
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: {
    status?: number;
    details?: unknown;
    headers?: Record<string, string>;
  },
): NextResponse<ApiErrorResponse> {
  const statusMap: Record<ApiErrorCode, number> = {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    RATE_LIMIT_EXCEEDED: 429,
    INTERNAL_ERROR: 500,
    DATABASE_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  };

  const status = options?.status ?? statusMap[code] ?? 500;
  const errorResponse: ApiErrorResponse["error"] = {
    code,
    message,
  };
  if (options?.details) {
    errorResponse.details = options.details;
  }
  const response: ApiErrorResponse = {
    error: errorResponse,
  };

  return NextResponse.json(response, {
    status,
    headers: options?.headers,
  });
}

/**
 * Handle Zod validation errors with standard format
 */
export function handleValidationError(
  error: ZodError,
): NextResponse<ApiErrorResponse> {
  return apiError("VALIDATION_ERROR", "Invalid request parameters", {
    details: error.flatten(),
  });
}

/**
 * Wrap an async handler with standard error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error: unknown) => {
    console.error("[API Error]", error);

    if (error instanceof Error && error.message.includes("database")) {
      return apiError("DATABASE_ERROR", "Database operation failed");
    }

    return apiError("INTERNAL_ERROR", "An unexpected error occurred");
  });
}
