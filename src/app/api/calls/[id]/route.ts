import { NextResponse } from "next/server";
import { getCall } from "@/lib/calls";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const call = getCall(id);
  if (!call) return NextResponse.json({ error: `Unknown call ID: ${id}` }, { status: 404 });
  return NextResponse.json(call);
}
