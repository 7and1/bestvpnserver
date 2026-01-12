import { createHash } from "crypto";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const serialized = entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",");
    return `{${serialized}}`;
  }

  return JSON.stringify(value);
}

export function hashKey(input: unknown): string {
  const payload = stableStringify(input);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function buildCacheKey(...parts: string[]): string {
  return parts.filter(Boolean).join(":");
}
