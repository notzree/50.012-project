import { insertResult, queryResults, getAggregateStats } from "@/lib/db";
import { CrowdsourcedResult } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body: CrowdsourcedResult = await request.json();

    if (!body.provider || !body.model || body.tps == null) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const serverRegion =
      process.env.VERCEL_REGION ||
      process.env.FLY_REGION ||
      process.env.SERVER_REGION ||
      "unknown";

    const id = await insertResult({ ...body, serverRegion });
    return Response.json({ id });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to save result" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") ?? undefined;
    const country = url.searchParams.get("country") ?? undefined;
    const limit = url.searchParams.has("limit")
      ? parseInt(url.searchParams.get("limit")!)
      : undefined;
    const offset = url.searchParams.has("offset")
      ? parseInt(url.searchParams.get("offset")!)
      : undefined;
    const aggregate = url.searchParams.get("aggregate") === "true";

    if (aggregate) {
      const stats = await getAggregateStats();
      return Response.json({ stats });
    }

    const data = await queryResults({ provider, country, limit, offset });
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to query results" },
      { status: 500 }
    );
  }
}
