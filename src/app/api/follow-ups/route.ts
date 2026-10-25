import { NextResponse, type NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";
import { listDueFollowUps } from "@/lib/services/emails";

export async function GET(request: NextRequest) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const followUps = await listDueFollowUps();
  return NextResponse.json({ followUps });
}
