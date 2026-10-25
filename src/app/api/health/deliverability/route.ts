import { NextResponse, type NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";
import { getDeliverabilityReport } from "@/lib/deliverability";

export async function GET(request: NextRequest) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const report = await getDeliverabilityReport();
  return NextResponse.json(report);
}
