import { NextResponse, type NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";
import {
  listUnreadNotifications,
  notificationsQuerySchema,
} from "@/lib/services/notifications";

export async function GET(request: NextRequest) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = notificationsQuerySchema.safeParse({
    since: searchParams.get("since") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  const since = parsed.data.since ? new Date(parsed.data.since) : undefined;
  const result = await listUnreadNotifications(since);
  return NextResponse.json(result);
}
