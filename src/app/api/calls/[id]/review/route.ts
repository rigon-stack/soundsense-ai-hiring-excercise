import { NextResponse } from "next/server";
import { getCall } from "@/lib/calls";
import { ReviewError } from "@/lib/review/openrouter";
import { reviewCall } from "@/lib/review/review";
import { computeStatus, verifyFindings } from "@/lib/review/verify";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const call = getCall(id);
  if (!call) return NextResponse.json({ error: `Unknown call ID: ${id}` }, { status: 404 });

  try {
    const findings = verifyFindings(await reviewCall(call), call.turns, call.summary);
    return NextResponse.json({ callId: call.id, status: computeStatus(findings), findings });
  } catch (e) {
    const err = e instanceof ReviewError ? e : new ReviewError("The review failed unexpectedly.", 502);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
