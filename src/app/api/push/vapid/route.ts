import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isPushConfigured } from "@/lib/push";
import { readPushSubscriptions } from "@/lib/push-store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const subscriptions = await readPushSubscriptions();
  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey,
    subscriberCount: subscriptions.length,
  });
}
