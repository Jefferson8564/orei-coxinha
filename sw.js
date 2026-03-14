// ============================================================
//  SERVICE WORKER — O Rei da Coxinha 🍗
//  ✅ Só cuida de notificações push
//  🚫 NÃO faz cache de nada (atualizações sempre funcionam)
//
//  👇 QUANDO PUBLICAR UMA ATUALIZAÇÃO:
//     Só mude o número da versão abaixo (ex: v2, v3, v4...)
//     Todos os celulares vão recarregar automaticamente!
// ============================================================

const VERSAO = 'v2'; // ← MUDE AQUI A CADA ATUALIZAÇÃO

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Ativa o novo SW na hora, sem esperar
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        // Limpa qualquer cache antigo que possa existir
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
        )
        .then(() => self.clients.claim())
        .then(() => {
            // Avisa todos os celulares abertos para recarregar e pegar a versão nova
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((lista) => {
                    lista.forEach((client) => {
                        client.postMessage({ acao: 'nova_versao', versao: VERSAO });
                    });
                });
        })
    );
});

// ============================================================
//  FETCH — Não intercepta nada, tudo vai direto pra internet
//  Isso garante que o app sempre carrega a versão mais nova
// ============================================================
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
        body:    dados.body    || '',
        icon:    dados.icon    || '/icone.png',
        badge:   dados.badge   || '/icone.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: {
            acao: dados.acao || null,
            url:  dados.url  || '/'
        },
        actions: dados.acao === 'abrir_mapa' ? [
            { action: 'abrir_mapa', title: '🗺️ Ver no mapa' }
        ] : []
    };

    event.waitUntil(
        self.registration.showNotification(titulo, opcoes)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const acao = event.notification.data?.acao || event.action;
    const urlBase = self.location.origin;
    const urlDestino = acao === 'abrir_mapa'
        ? urlBase + '/?abrir=mapa'
        : urlBase + '/?abrir=notificacoes';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
            for (const client of lista) {
                if (client.url.startsWith(urlBase)) {
                    client.focus();
                    if (acao === 'abrir_mapa') {
                        client.postMessage({ acao: 'abrir_mapa' });
                    } else {
                        client.postMessage({ acao: 'abrir_notificacoes' });
                    }
                    return;
                }
            }
            return clients.openWindow(urlDestino);
        })
    );
});
