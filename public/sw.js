// Service worker da Agenda: só recebe notificações (não faz cache de páginas).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { titulo: "IASD Agenda", corpo: evento.data ? evento.data.text() : "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || "IASD Agenda", {
      body: dados.corpo || "",
      icon: "/icones/icone-notificacao-96.png",
      badge: "/icones/selo-96.png",
      tag: dados.tag,
      data: { url: dados.url || "/" },
    }),
  );
});

// Tocar na notificação abre (ou foca) o evento.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin) && "focus" in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
