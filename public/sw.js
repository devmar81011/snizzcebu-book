/* Snizzz booking PWA service worker */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Snizzz Booking",
    body: "You have a booking update.",
    url: "/admin/dashboard",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Snizzz Booking", {
      body: data.body || "You have a booking update.",
      icon: "/brand/snizzz-logo-v2.png",
      badge: "/brand/snizzz-logo-v2.png",
      data: { url: data.url || "/admin/dashboard" },
      tag: data.tag || "snizzz-booking",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
        return undefined;
      },
    ),
  );
});
