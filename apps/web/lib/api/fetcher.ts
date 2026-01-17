/**
 * Unified fetcher for SWR with proper error handling
 */

export interface FetcherError {
  message: string;
  status?: number;
  data?: unknown;
}

export class ApiError extends Error implements FetcherError {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Type-safe fetcher for SWR
 * @param url - The URL to fetch
 * @returns Parsed JSON response
 * @throws ApiError on non-OK responses
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      data,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetcher with options for more control
 */
export async function fetcherWith<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      data,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Default SWR fetcher (backward compatible)
 */
export const swrFetcher = (url: string) => fetch(url).then((res) => res.json());
