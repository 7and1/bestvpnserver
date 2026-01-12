import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { providers } from "@bestvpnserver/database";
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

  const db = getDb();
  const rows = await db
    .select({ affiliateLink: providers.affiliateLink })
    .from(providers)
    .where(eq(providers.slug, slug))
    .limit(1);

  let target = rows[0]?.affiliateLink ?? null;

  if (!target) {
    target = await getAffiliateLink(slug);
  }

  if (!target || !isSafeUrl(target)) {
    return NextResponse.json(
      { error: "Affiliate link not found" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(target, 302);
}
