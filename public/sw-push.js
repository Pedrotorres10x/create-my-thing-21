// Push notification handler for service worker
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Tienes una actualización en CONECTOR",
      icon: data.icon || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/dashboard",
      },
      actions: [
        { action: "open", title: "Abrir" },
        { action: "dismiss", title: "Cerrar" },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "CONECTOR", options)
    );
  } catch (e) {
    console.error("Error processing push:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
