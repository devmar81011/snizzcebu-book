import webpush from "web-push";
import {
  readPushSubscriptions,
  removePushSubscription,
  type PushSubscriptionJSON,
} from "@/lib/push-store";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@snizzzcebu.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured() {
  return Boolean(getVapidConfig());
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return null;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

export async function sendPushToAll(payload: PushPayload): Promise<{
  sent: number;
  failed: number;
}> {
  const config = configureWebPush();
  if (!config) return { sent: 0, failed: 0 };

  const subscriptions = await readPushSubscriptions();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub: PushSubscriptionJSON) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys?.p256dh || "",
              auth: sub.keys?.auth || "",
            },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" &&
          error &&
          "statusCode" in error &&
          typeof (error as { statusCode?: number }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await removePushSubscription(sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
}
