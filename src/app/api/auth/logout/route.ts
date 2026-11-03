import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Clears an invalid/expired session cookie, then sends the user to the login
 * page. Used by the login page when a cookie exists but no session row does.
 */
export async function GET(req: NextRequest) {
  try {
    await destroySession();
  } catch (error) {
    console.error("GET /api/auth/logout", error);
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
