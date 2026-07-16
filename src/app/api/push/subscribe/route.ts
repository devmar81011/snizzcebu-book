import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  removePushSubscription,
  upsertPushSubscription,
  type PushSubscriptionJSON,
} from "@/lib/push-store";
import { isPushConfigured } from "@/lib/push";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error:
          "Push not configured. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | PushSubscriptionJSON
    | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await upsertPushSubscription(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await removePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
