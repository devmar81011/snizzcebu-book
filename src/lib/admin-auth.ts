import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  getPasswordHash,
  verifyPassword,
} from "@/lib/admin-credentials";

export const ADMIN_COOKIE = "snizzz_admin";

function adminSecret(): string {
  return process.env.ADMIN_SECRET || "snizzz-admin-pepper";
}

export async function createAdminToken(): Promise<string> {
  const passwordHash = await getPasswordHash();
  return createHmac("sha256", adminSecret())
    .update(`admin:${passwordHash}`)
    .digest("hex");
}

export async function verifyAdminToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAdminToken();
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function checkAdminPassword(password: string): Promise<boolean> {
  return verifyPassword(password);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
