import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { providers } from "@bestvpnserver/database";
import { isDatabaseConfigured } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getAffiliateLink } from "@/lib/affiliate-links";
import { withRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSlug(slug: string) {
  return slug.toLowerCase();
}

function isSafeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const rateLimited = await withRateLimit(request, "api");
  if (rateLimited) return rateLimited;

  const slug = normalizeSlug(params.slug);

  // Try affiliate link resolver first
  const fallbackLink = await getAffiliateLink(slug);
  if (fallbackLink && isSafeUrl(fallbackLink)) {
    return NextResponse.redirect(fallbackLink, 302);
  }

  if (!isDatabaseConfigured) {
    return NextResponse.json(
      { error: "Affiliate link not found" },
      { status: 404 },
    );
  }

  const db = getDb();
  const rows = await db
    .select({ affiliateLink: providers.affiliateLink })
    .from(providers)
    .where(eq(providers.slug, slug))
    .limit(1);

  const target = rows[0]?.affiliateLink ?? null;

  if (!target || !isSafeUrl(target)) {
    return NextResponse.json(
      { error: "Affiliate link not found" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(target, 302);
}
