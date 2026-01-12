import { z } from "zod";

export const ServerQuerySchema = z.object({
  provider: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(50)
    .optional(),
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  city: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100)
    .optional(),
  protocol: z
    .enum(["wireguard", "openvpn-udp", "openvpn-tcp", "ikev2"])
    .optional(),
  streaming: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(30)
    .optional(),
  minSpeed: z.coerce.number().min(0).max(10000).optional(),
  maxLatency: z.coerce.number().min(0).max(1000).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const ProbeResultSchema = z
  .object({
    server_id: z.number().int().positive(),
    probe_id: z.string().regex(/^[a-z0-9-]{3,10}$/),
    timestamp: z.number().int(),
    ping_ms: z.number().int().min(0).max(65535),
    download_mbps: z.number().min(0).max(100000),
    upload_mbps: z.number().min(0).max(100000),
    jitter_ms: z.number().int().min(0).optional(),
    packet_loss_pct: z.number().min(0).max(100).optional(),
    connection_success: z.boolean(),
    connection_time_ms: z.number().int().min(0).optional(),
    streaming_results: z
      .array(
        z.object({
          platform: z.string(),
          is_unlocked: z.boolean(),
          response_ms: z.number().int().optional(),
        }),
      )
      .optional(),
  })
  .transform((data) => ({
    serverId: data.server_id,
    probeId: data.probe_id,
    timestamp: data.timestamp,
    pingMs: data.ping_ms,
    downloadMbps: data.download_mbps,
    uploadMbps: data.upload_mbps,
    jitterMs: data.jitter_ms,
    packetLossPct: data.packet_loss_pct,
    connectionSuccess: data.connection_success,
    connectionTimeMs: data.connection_time_ms,
    streamingResults: data.streaming_results?.map((item) => ({
      platform: item.platform,
      isUnlocked: item.is_unlocked,
      responseMs: item.response_ms,
    })),
  }));

export const DnsTestIdSchema = z
  .string()
  .min(6)
  .max(32)
  .regex(/^[a-z0-9-]+$/i);

export const DnsLogSchema = z.object({
  testId: DnsTestIdSchema,
  resolver: z.string().ip(),
});

export const SpeedtestDownloadSchema = z.object({
  size: z.coerce
    .number()
    .min(1)
    .max(100 * 1024 * 1024),
});

export const MerchantQuerySchema = z
  .object({
    type: z.enum([
      "google",
      "bing",
      "youtube",
      "youtube_info",
      "youtube_serp",
      "similarweb",
      "web2md",
      "screenshot",
      "hackernews",
      "reddit",
      "twitter",
      "instagram",
      "tiktok",
      "amazon",
      "crunchbase",
    ]),
    query: z.string().min(1).max(200).optional(),
    url: z.string().url().optional(),
    force: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.query || data.url), {
    message: "query or url is required",
    path: ["query"],
  });

export const IpInfoSchema = z.object({
  ip: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  loc: z.string().optional(),
  org: z.string().optional(),
  timezone: z.string().optional(),
});

export type ServerQueryInput = z.infer<typeof ServerQuerySchema>;
export type ProbeResultInput = z.infer<typeof ProbeResultSchema>;
export type DnsLogInput = z.infer<typeof DnsLogSchema>;
export type MerchantQueryInput = z.infer<typeof MerchantQuerySchema>;
export type IpInfoInput = z.infer<typeof IpInfoSchema>;
