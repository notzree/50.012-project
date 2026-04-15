import { getAvailableProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getAvailableProviders();
  return Response.json({ providers });
}
