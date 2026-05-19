import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { allowedLabIdsFor } from "@/lib/analytics";
import { buildAnalystSnapshot, generateInsights } from "@/lib/ai-analyst";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const labIds = await allowedLabIdsFor(session.user.id, session.user.role);
  const snapshot = await buildAnalystSnapshot(labIds);
  const result = await generateInsights(snapshot);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, snapshot }, { status: 503 });
  }
  return NextResponse.json({ insights: result.insights, snapshot, usage: result.usage });
}
