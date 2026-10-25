import { after, type NextRequest } from "next/server";

import { buildPixelResponse } from "@/lib/pixel";
import { normalizePixelId, recordOpen } from "@/lib/tracking";

export const dynamic = "force-dynamic";

/**
 * Schedules the tracking write without ever delaying or affecting the
 * pixel response. `after()` requires an active request scope; outside of
 * one (e.g. tests) it throws synchronously, so we fall back to a plain
 * fire-and-forget call.
 */
function scheduleAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    task().catch((error: unknown) => {
      console.error("[pixel] tracking task failed", error);
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const response = buildPixelResponse();

  try {
    const { id: rawId } = await params;
    const id = normalizePixelId(rawId);
    const userAgent = request.headers.get("user-agent");
    const country = request.headers.get("x-vercel-ip-country");

    scheduleAfterResponse(() => recordOpen({ id, userAgent, country }));
  } catch (error) {
    console.error("[pixel] failed to schedule tracking", error);
  }

  return response;
}
