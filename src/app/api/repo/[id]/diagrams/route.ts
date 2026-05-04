import { NextResponse } from "next/server";
import { dataStore } from "@/lib/server/store";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await dataStore.getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(session.diagrams);
}
