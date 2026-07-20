import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SUPERADMIN_COOKIE = "snizzz_superadmin";

function superadminSecret(): string {
  return (
    process.env.SUPERADMIN_SECRET ||
    process.env.ADMIN_SECRET ||
    "snizzz-superadmin-pepper"
  );
}

export function superadminPassword(): string {
  return process.env.SUPERADMIN_PASSWORD || "snizzz-super";
}

export async function createSuperadminToken(): Promise<string> {
  return createHmac("sha256", superadminSecret())
    .update(`superadmin:${superadminPassword()}`)
    .digest("hex");
}

export async function verifySuperadminToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const expected = await createSuperadminToken();
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function checkSuperadminPassword(
  password: string,
): Promise<boolean> {
  const expected = superadminPassword();
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isSuperadminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifySuperadminToken(jar.get(SUPERADMIN_COOKIE)?.value);
}

export const superadminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
