import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
