import { createHmac, timingSafeEqual } from "crypto";

export function signProbePayload(
  payload: object | string,
  secret: string,
): string {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  return hmac.digest("hex");
}

export function verifyProbeSignature(
  payload: object | string,
  signature: string | null,
  secret: string = process.env.PROBE_WEBHOOK_SECRET!,
): boolean {
  if (!signature) return false;

  const expected = signProbePayload(payload, secret);
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(sigBuffer, expectedBuffer);
}
