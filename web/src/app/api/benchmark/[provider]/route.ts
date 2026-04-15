import { getProvider, getAvailableProviders } from "@/lib/providers";
import { BENCHMARK_PROMPT, PROVIDERS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
): Promise<Response> {
  const { provider: providerId } = await params;

  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!providerConfig) {
    return Response.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (!process.env[providerConfig.envKey]) {
    return Response.json(
      { error: `API key not configured for ${providerConfig.name}` },
      { status: 400 }
    );
  }

  const provider = getProvider(providerId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.stream(BENCHMARK_PROMPT)) {
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
