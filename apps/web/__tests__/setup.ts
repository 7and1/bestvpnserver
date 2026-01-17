import { vi } from "vitest";
import { beforeEach } from "vitest";

// Mock environment variables
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock";
  process.env.REDIS_URL = process.env.REDIS_URL || "redis://mock";
});

// Suppress console output during tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};
