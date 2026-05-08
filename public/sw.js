// Service Worker for Web Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "Davions", body: "You have a new notification", url: "/dashboard" };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {
    // Firefox/Windows may deliver payloadless push; keep fallback content.
  }

  // Safari / iOS require a non-empty body or the notification is silently dropped.
  const body = (data.body && String(data.body).trim().length > 0) ? String(data.body) : " ";

  // Safari does not support `vibrate`/`renotify`; using a unique tag prevents
  // notification coalescing on iOS so each push is shown.
  const options = {
    body,
    icon: "/icon-notification.png",
    badge: "/icon-notification.png",
    data: { url: data.url || "/dashboard" },
    tag: `davions-${Date.now()}`,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Davions", options).catch((err) => {
      // Last-resort fallback: try a minimal notification (some Safari versions
      // reject any unsupported option and throw).
      return self.registration.showNotification(data.title || "Davions", { body });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
