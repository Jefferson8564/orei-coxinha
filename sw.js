// ============================================================
//  SERVICE WORKER — O Rei da Coxinha 🍗
//  ✅ Só cuida de notificações push
//  🚫 NÃO faz cache de nada (atualizações sempre funcionam)
//
//  👇 QUANDO PUBLICAR UMA ATUALIZAÇÃO:
//     Só mude o número da versão abaixo (ex: v2, v3, v4...)
//     Todos os celulares vão recarregar automaticamente!
// ============================================================

const VERSAO = 'v3'; // ← MUDE AQUI A CADA ATUALIZAÇÃO

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
        )
        .then(() => self.clients.claim())
        .then(() => {
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((lista) => {
                    lista.forEach((client) => {
                        client.postMessage({ acao: 'nova_versao', versao: VERSAO });
                    });
                });
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Deixa o navegador buscar normalmente, sem cache
});

// ============================================================
//  PUSH — Recebe e exibe as notificações
// ============================================================
self.addEventListener('push', (event) => {
    let dados = {};

    try {
        dados = event.data ? event.data.json() : {};
    } catch (e) {
        dados = { title: '', body: event.data ? event.data.text() : '' };
    }

    const titulo = dados.title || '';
    const opcoes = {
        body:    dados.body  || '',
        icon:    dados.icon  || '/icone.png',
        badge:   dados.badge || '/icone.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: {
            url: 'https://jefferson8564.github.io/hist-rico-de-pedidos/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(titulo, opcoes)
    );
});

// ============================================================
//  NOTIFICATIONCLICK — Abre o histórico de pedidos
// ============================================================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlDestino = 'https://jefferson8564.github.io/hist-rico-de-pedidos/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
            for (const client of lista) {
                if (client.url.startsWith(urlDestino)) {
                    return client.focus();
                }
            }
            return clients.openWindow(urlDestino);
        })
    );
});
