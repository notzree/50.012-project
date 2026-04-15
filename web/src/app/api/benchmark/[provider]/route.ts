import { getProvider } from "@/lib/providers";
import { BENCHMARK_PROMPT, PROVIDERS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
): Promise<Response> {
  const { provider: providerId } = await params;

  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!providerConfig) {
    return Response.json({ error: "Unknown provider" }, { status: 400 });
  }

  let body: { apiKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — will fall back to env key
  }

  const apiKey = body.apiKey || process.env[providerConfig.envKey];
  if (!apiKey) {
    return Response.json(
      { error: `API key not configured for ${providerConfig.name}. Provide your own key or ask the server admin to set ${providerConfig.envKey}.` },
      { status: 400 }
    );
  }

  const provider = getProvider(providerId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.stream(BENCHMARK_PROMPT, apiKey)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (event.type === "complete" || event.type === "error") {
            controller.close();
            return;
          }
        }
        controller.close();
      } catch (err) {
        const errorData = `data: ${JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
