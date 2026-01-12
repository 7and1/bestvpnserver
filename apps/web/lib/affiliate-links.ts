import fs from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, string>();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function loadAffiliateLinks() {
  if (cache.size > 0) return;

  const csvPath = path.resolve(process.cwd(), "Affiliate LInks - VPN.csv");
  const raw = await fs.readFile(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  for (const line of lines.slice(1)) {
    const [merchantRaw, linkRaw] = line.split(",");
    const merchant = merchantRaw?.trim();
    const link = linkRaw?.trim();

    if (!merchant || !link) continue;
    if (!merchant.startsWith("go/")) continue;

    const rawName = merchant.slice(3).trim();
    const slug = slugify(rawName);
    if (!slug) continue;

    cache.set(slug, link);
  }
}

export async function getAffiliateLink(slug: string) {
  await loadAffiliateLinks();
  return cache.get(slug) ?? null;
}
