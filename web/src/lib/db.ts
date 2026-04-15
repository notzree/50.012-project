import { createClient, type Client } from "@libsql/client";
import { CrowdsourcedResult } from "./metrics";

let client: Client | null = null;

function getClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || "file:local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({ url, authToken });
  return client;
}

export async function initDb(): Promise<void> {
  const db = getClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS benchmark_results (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      tps REAL NOT NULL,
      ttfb REAL NOT NULL,
      total_latency REAL NOT NULL,
      output_tokens INTEGER NOT NULL,
      input_tokens INTEGER NOT NULL,
      cache_status TEXT NOT NULL DEFAULT 'unknown',
      user_city TEXT,
      user_region TEXT,
      user_country TEXT,
      user_lat REAL,
      user_lon REAL,
      server_region TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_provider ON benchmark_results(provider)`
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_country ON benchmark_results(user_country)`
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_created_at ON benchmark_results(created_at)`
  );
}

export async function insertResult(result: CrowdsourcedResult): Promise<string> {
  const db = getClient();
  await initDb();

  const id =
    result.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  await db.execute({
    sql: `INSERT INTO benchmark_results
      (id, provider, model, tps, ttfb, total_latency, output_tokens, input_tokens,
       cache_status, user_city, user_region, user_country, user_lat, user_lon, server_region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      result.provider,
      result.model,
      result.tps,
      result.ttfb,
      result.totalLatency,
      result.outputTokens,
      result.inputTokens,
      result.cacheStatus,
      result.userCity ?? null,
      result.userRegion ?? null,
      result.userCountry ?? null,
      result.userLat ?? null,
      result.userLon ?? null,
      result.serverRegion ?? null,
    ],
  });

  return id;
}

export interface QueryOptions {
  provider?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

export async function queryResults(
  opts: QueryOptions = {}
): Promise<{ results: CrowdsourcedResult[]; total: number }> {
  const db = getClient();
  await initDb();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts.provider) {
    conditions.push("provider = ?");
    args.push(opts.provider);
  }
  if (opts.country) {
    conditions.push("user_country = ?");
    args.push(opts.country);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as cnt FROM benchmark_results ${where}`,
    args,
  });
  const total = Number(countResult.rows[0]?.cnt ?? 0);

  const dataResult = await db.execute({
    sql: `SELECT * FROM benchmark_results ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  const results: CrowdsourcedResult[] = dataResult.rows.map((row) => ({
    id: String(row.id),
    provider: String(row.provider),
    model: String(row.model),
    tps: Number(row.tps),
    ttfb: Number(row.ttfb),
    totalLatency: Number(row.total_latency),
    outputTokens: Number(row.output_tokens),
    inputTokens: Number(row.input_tokens),
    cacheStatus: String(row.cache_status) as "hit" | "miss" | "unknown",
    timestamp: new Date(String(row.created_at)).getTime(),
    userCity: row.user_city ? String(row.user_city) : undefined,
    userRegion: row.user_region ? String(row.user_region) : undefined,
    userCountry: row.user_country ? String(row.user_country) : undefined,
    userLat: row.user_lat != null ? Number(row.user_lat) : undefined,
    userLon: row.user_lon != null ? Number(row.user_lon) : undefined,
    serverRegion: row.server_region ? String(row.server_region) : undefined,
  }));

  return { results, total };
}

export async function getAggregateStats(): Promise<
  Array<{
    provider: string;
    model: string;
    avgTps: number;
    avgTtfb: number;
    cacheHitRate: number;
    totalRuns: number;
  }>
> {
  const db = getClient();
  await initDb();

  const result = await db.execute(`
    SELECT
      provider,
      model,
      AVG(tps) as avg_tps,
      AVG(ttfb) as avg_ttfb,
      SUM(CASE WHEN cache_status = 'hit' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as cache_hit_rate,
      COUNT(*) as total_runs
    FROM benchmark_results
    GROUP BY provider, model
    ORDER BY avg_tps DESC
  `);

  return result.rows.map((row) => ({
    provider: String(row.provider),
    model: String(row.model),
    avgTps: Number(row.avg_tps),
    avgTtfb: Number(row.avg_ttfb),
    cacheHitRate: Number(row.cache_hit_rate),
    totalRuns: Number(row.total_runs),
  }));
}
