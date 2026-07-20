import { NextResponse } from "next/server";
import {
  SUPERADMIN_COOKIE,
  checkSuperadminPassword,
  createSuperadminToken,
  superadminCookieOptions,
} from "@/lib/superadmin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  if (!body?.password || !(await checkSuperadminPassword(body.password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SUPERADMIN_COOKIE,
    await createSuperadminToken(),
    superadminCookieOptions,
  );
  return response;
}
