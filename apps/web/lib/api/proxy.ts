const BACKEND_URL = process.env.BACKEND_URL;

export const isWorkersRuntime =
  Boolean(process.env.BACKEND_URL) ||
  (typeof caches !== "undefined" && "default" in caches);

export async function proxyApiRequest(
  path: string,
  request: Request,
): Promise<Response> {
  // If no backend URL is configured, return a 503 indicating the service is unavailable
  if (!BACKEND_URL) {
    return new Response(
      JSON.stringify({
        error: "Service Unavailable",
        message: "API backend is not configured",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const url = new URL(request.url);
  const targetUrl = new URL(path, BACKEND_URL);

  // Forward query parameters and headers
  targetUrl.search = url.search;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (
      !key.startsWith("cf-") &&
      key !== "host" &&
      key !== "connection" &&
      key !== "accept-encoding"
    ) {
      headers.set(key, value);
    }
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.blob()
      : undefined;

  return fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body,
  });
}
