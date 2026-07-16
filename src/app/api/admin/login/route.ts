import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkAdminPassword,
  createAdminToken,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  if (!body?.password || !(await checkAdminPassword(body.password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE,
    await createAdminToken(),
    adminCookieOptions,
  );
  return response;
}
