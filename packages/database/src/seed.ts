import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { createDb } from "./client";
import {
  probeLocations,
  protocols,
  providers,
  streamingPlatforms,
} from "./schema";

type ProviderSeed = {
  name: string;
  slug: string;
  affiliateLink: string;
};

const protocolSeed = [
  { name: "WireGuard", defaultPort: 51820 },
  { name: "OpenVPN-UDP", defaultPort: 1194 },
  { name: "OpenVPN-TCP", defaultPort: 443 },
  { name: "IKEv2", defaultPort: 500 },
];

const streamingSeed = [
  { slug: "netflix-us", name: "Netflix", region: "US" },
  { slug: "disney-plus", name: "Disney+", region: null },
  { slug: "hbo-max", name: "Max", region: "US" },
  { slug: "bbc-iplayer", name: "BBC iPlayer", region: "GB" },
];

const probeSeed = [
  { code: "iad", provider: "Fly.io" },
  { code: "lax", provider: "Fly.io" },
  { code: "fra", provider: "Fly.io" },
  { code: "lhr", provider: "Fly.io" },
  { code: "sin", provider: "Fly.io" },
  { code: "nrt", provider: "Fly.io" },
  { code: "syd", provider: "Fly.io" },
  { code: "gru", provider: "Fly.io" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function loadAffiliateProviders(): Promise<ProviderSeed[]> {
  const csvPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "Affiliate LInks - VPN.csv",
  );

  const raw = await fs.readFile(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const rows = lines.slice(1);
  const providersSeed: ProviderSeed[] = [];

  for (const line of rows) {
    const [merchantRaw, linkRaw] = line.split(",");
    const merchant = merchantRaw?.trim();
    const affiliateLink = linkRaw?.trim();

    if (!merchant || !affiliateLink) continue;
    if (!merchant.startsWith("go/")) continue;

    const rawName = merchant.slice(3).trim();
    const slug = slugify(rawName);
    if (!slug) continue;

    providersSeed.push({
      name: rawName,
      slug,
      affiliateLink,
    });
  }

  return providersSeed;
}

async function run() {
  const { db, pool } = createDb();

  try {
    const providerSeed = await loadAffiliateProviders();

    await db.transaction(async (tx) => {
      await tx.insert(protocols).values(protocolSeed).onConflictDoNothing();
      await tx
        .insert(streamingPlatforms)
        .values(streamingSeed)
        .onConflictDoNothing();
      await tx.insert(probeLocations).values(probeSeed).onConflictDoNothing();

      if (providerSeed.length > 0) {
        await tx.insert(providers).values(providerSeed).onConflictDoNothing();
      }
    });

    console.log(
      `Seed completed. Providers: ${providerSeed.length}, Protocols: ${protocolSeed.length}, Streaming: ${streamingSeed.length}, Probes: ${probeSeed.length}`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
