type ProxyGridSearchType =
  | "google"
  | "bing"
  | "youtube"
  | "youtube_info"
  | "youtube_serp"
  | "similarweb"
  | "web2md"
  | "screenshot"
  | "hackernews"
  | "reddit"
  | "twitter"
  | "instagram"
  | "tiktok"
  | "amazon"
  | "crunchbase";

type ProxyGridPayload = {
  type: ProxyGridSearchType;
  query?: string;
  url?: string;
  force?: boolean;
};

const baseUrl =
  process.env.PROXY_GRID_BASE_URL || "http://google.savedimage.com";
const secret = process.env.PROXY_GRID_SECRET;

export async function proxyGridSearch(payload: ProxyGridPayload) {
  if (!secret) {
    throw new Error("PROXY_GRID_SECRET is not configured");
  }

  const response = await fetch(`${baseUrl}/api/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-grid-secret": secret,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Proxy Grid error: ${response.status}`);
  }

  return response.json();
}

export async function proxyGridFetch(url: string, force = false) {
  if (!secret) {
    throw new Error("PROXY_GRID_SECRET is not configured");
  }

  const response = await fetch(`${baseUrl}/api/grid`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-grid-secret": secret,
    },
    body: JSON.stringify({ target: url, force }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Proxy Grid error: ${response.status}`);
  }

  return response.text();
}
