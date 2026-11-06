import { NextResponse } from "next/server";
import { listCallIds } from "@/lib/calls";

export function GET() {
  return NextResponse.json({ calls: listCallIds() });
}
