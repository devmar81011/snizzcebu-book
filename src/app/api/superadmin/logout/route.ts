import { NextResponse } from "next/server";
import { SUPERADMIN_COOKIE } from "@/lib/superadmin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SUPERADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
