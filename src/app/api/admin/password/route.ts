import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  checkAdminPassword,
  createAdminToken,
  isAdminAuthenticated,
} from "@/lib/admin-auth";
import { setPassword } from "@/lib/admin-credentials";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  } | null;

  if (!body?.currentPassword || !body?.newPassword || !body?.confirmPassword) {
    return NextResponse.json(
      { error: "All password fields are required" },
      { status: 400 },
    );
  }

  if (!(await checkAdminPassword(body.currentPassword))) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  if (body.newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 },
    );
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json(
      { error: "New passwords do not match" },
      { status: 400 },
    );
  }

  await setPassword(body.newPassword);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE,
    await createAdminToken(),
    adminCookieOptions,
  );
  return response;
}
