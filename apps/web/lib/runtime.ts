/**
 * Centralized Workers runtime detection
 * 
 * This module provides a single source of truth for detecting
 * whether the code is running in a Cloudflare Workers environment.
 */

/**
 * Detects if the current runtime is Cloudflare Workers
 * by checking for the presence of the Cache API with default cache.
 */
const isWorkersDetection = typeof caches !== "undefined" && "default" in caches;

/**
 * Export the detected runtime state
 */
export const isWorkers = isWorkersDetection;

/**
 * Runtime type enum for type-safe runtime checks
 */
export type RuntimeType = "workers" | "nodejs";

/**
 * Current runtime identifier
 */
export const runtime: RuntimeType = isWorkers ? "workers" : "nodejs";

/**
 * Returns the appropriate Next.js runtime config value
 */
export function getRuntimeConfig(): "edge" | "nodejs" {
  return isWorkers ? "edge" : "nodejs";
}

/**
 * Type guard for Workers runtime
 */
export function assertWorkers(): asserts this is { isWorkers: true } {
  if (!isWorkers) {
    throw new Error("This function can only be called in Workers runtime");
  }
}

/**
 * Type guard for Node.js runtime
 */
export function assertNodejs(): asserts this is { isWorkers: false } {
  if (isWorkers) {
    throw new Error("This function can only be called in Node.js runtime");
  }
}
