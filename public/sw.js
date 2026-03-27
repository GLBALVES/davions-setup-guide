// Service Worker for Web Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "Davions", body: "You have a new notification" };
  try {
    data = event.data.json();
  } catch (_) {}

  const options = {
    body: data.body || "",
    icon: "/placeholder.svg",
    badge: "/placeholder.svg",
    data: { url: data.url || "/dashboard" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Davions", options));
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
