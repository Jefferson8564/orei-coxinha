// sw-cliente.js — Service Worker do app do cliente com Web Push
const CACHE_NAME = 'rei-coxinha-cliente-v5';
const CLIENTE_URL = 'https://orei-coxinha.vercel.app/';

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

// ── Web Push do servidor (funciona com aba fechada!) ───
self.addEventListener('push', e => {
    let data = {
        titulo: '🛵 O Rei da Coxinha',
        mensagem: 'Você tem uma nova notificação!'
    };
    if (e.data) {
        try { data = { ...data, ...e.data.json() }; } catch (_) {}
    }
    const options = {
        body: data.mensagem,
        icon: './icon-512x512.png',
        badge: './icon-192x192.png',
        tag: 'push-cliente',
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: false,
        silent: false,
        data: data
    };
    e.waitUntil(
        self.registration.showNotification(data.titulo, options)
    );
});

// ── Clique na notificação ──────────────────────────────
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if (c.url.startsWith(CLIENTE_URL) && c.focus) return c.focus();
            }
            return clients.openWindow(CLIENTE_URL);
        })
    );
});
