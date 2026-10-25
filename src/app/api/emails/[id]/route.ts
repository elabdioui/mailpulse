import { NextResponse, type NextRequest } from "next/server";

import { isRequestAuthenticated } from "@/lib/auth";
import {
  deleteEmail,
  getEmailById,
  updateEmail,
  updateEmailSchema,
} from "@/lib/services/emails";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const email = await getEmailById(id);
  if (!email) {
    return NextResponse.json({ error: "Mail introuvable" }, { status: 404 });
  }
  return NextResponse.json({ email });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide" },
      { status: 400 },
    );
  }

  const parsed = updateEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 },
    );
  }

  const updated = await updateEmail(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Mail introuvable" }, { status: 404 });
  }
  return NextResponse.json({ email: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await isRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteEmail(id);
  if (!deleted) {
    return NextResponse.json({ error: "Mail introuvable" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
