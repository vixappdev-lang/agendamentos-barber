// Service worker para notificações push/locais e click handling
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Recebe mensagens do app principal (showNotification em background)
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, link } = data.payload || {};
    self.registration.showNotification(title || "Notificação", {
      body: body || "",
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: tag || "default",
      data: { link: link || "/membro" },
    });
  }
});

// Ao clicar na notificação: abre/foca a aba relevante
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/membro";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
