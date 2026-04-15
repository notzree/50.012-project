import { PROVIDERS } from "@/lib/constants";
import { getAvailableProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const serverProviders = getAvailableProviders();
  return Response.json({
    providers: serverProviders,
    allProviders: PROVIDERS,
  });
}
