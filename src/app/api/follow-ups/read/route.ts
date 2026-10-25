import { NextResponse, type NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";
import {
  markFollowUpsNotified,
  markFollowUpsReadSchema,
} from "@/lib/services/emails";

export async function POST(request: NextRequest) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide" },
      { status: 400 },
    );
  }

  const parsed = markFollowUpsReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  const updated = await markFollowUpsNotified(parsed.data.ids);
  return NextResponse.json({ updated });
}
