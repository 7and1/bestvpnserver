const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3000";

export async function proxyApiRequest(
  path: string,
  request: Request,
): Promise<Response> {
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
