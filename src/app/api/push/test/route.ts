import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isPushConfigured, sendPushToAll } from "@/lib/push";
import { readPushSubscriptions } from "@/lib/push-store";

/** Send a test push to every subscribed admin device. */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error:
          "Push not configured. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel env, then redeploy.",
      },
      { status: 503 },
    );
  }

  const subscriptions = await readPushSubscriptions();
  if (subscriptions.length === 0) {
    return NextResponse.json(
      {
        error:
          "No devices are subscribed yet. On this phone/computer open Admin → Settings, tap Enable notifications, and allow permission.",
        subscriberCount: 0,
      },
      { status: 400 },
    );
  }

  const result = await sendPushToAll({
    title: "Snizzz test notification",
    body: "Push is working on this device. New bookings will alert here too.",
    url: "/admin/settings",
    tag: `test-${Date.now()}`,
  });

  return NextResponse.json({
    ok: true,
    subscriberCount: subscriptions.length,
    ...result,
  });
}
