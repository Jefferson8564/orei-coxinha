// =====================================================
//  SERVICE WORKER — O Rei da Coxinha 🍗
//  ⚠️ MUDE O NÚMERO DA VERSÃO A CADA DEPLOY NO GITHUB!
// =====================================================

const CACHE_VERSION = 'v1.0.0'; // 👈 Mude para v1.0.1, v1.0.2... a cada atualização
const CACHE_NAME = `rei-da-coxinha-${CACHE_VERSION}`;

// Arquivos que serão salvos no cache para funcionar offline
const ARQUIVOS_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icone.png'
];

// =====================================================
//  INSTALL — Baixa e salva os arquivos no cache
// =====================================================
self.addEventListener('install', event => {
    console.log(`[SW] Instalando versão ${CACHE_VERSION}...`);

    // Força o novo SW a entrar em ação imediatamente (sem esperar fechar a aba)
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ARQUIVOS_CACHE);
        }).catch(err => {
            console.warn('[SW] Erro ao cachear arquivos:', err);
        })
    );
});

// =====================================================
//  ACTIVATE — Apaga caches antigos automaticamente
// =====================================================
self.addEventListener('activate', event => {
    console.log(`[SW] Ativando versão ${CACHE_VERSION}...`);

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME) // Pega todos os caches que não são o atual
                    .map(k => {
                        console.log(`[SW] Apagando cache antigo: ${k}`);
                        return caches.delete(k); // Apaga os caches antigos
                    })
            );
        }).then(() => {
            // Assume controle de TODAS as abas abertas imediatamente
            return self.clients.claim();
        })
    );
});

// =====================================================
//  FETCH — Estratégia: Network First (sempre tenta
//  buscar da internet, só usa cache se estiver offline)
// =====================================================
self.addEventListener('fetch', event => {
    const req = event.request;

    // Ignora requisições que não sejam GET (ex: POST do Supabase)
    if (req.method !== 'GET') return;

    // Ignora requisições externas (Supabase, Google Fonts, CDNs...)
    const url = new URL(req.url);
    const isLocal = url.origin === self.location.origin;
    if (!isLocal) return;

    event.respondWith(
        fetch(req)
            .then(response => {
                // Se conseguiu da internet, salva no cache e retorna
                if (response && response.status === 200) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(req, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Se estiver offline, usa o cache
                return caches.match(req).then(cached => {
                    if (cached) return cached;
                    // Se não tiver nem no cache, retorna o index.html como fallback
                    return caches.match('/index.html');
                });
            })
    );
});

// =====================================================
//  MESSAGE — Recebe mensagens do app (ex: abrir mapa)
// =====================================================
self.addEventListener('message', event => {
    if (event.data?.acao === 'abrir_mapa') {
        self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
                client.postMessage({ acao: 'abrir_mapa' });
            });
        });
    }

    // Força atualização manual se o app pedir
    if (event.data?.acao === 'pular_espera') {
        self.skipWaiting();
    }
});

// =====================================================
//  PUSH NOTIFICATIONS
// =====================================================
self.addEventListener('push', event => {
    let dados = { title: 'O Rei da Coxinha 🍗', body: 'Você tem uma nova notificação!' };

    try {
        if (event.data) dados = event.data.json();
    } catch(e) {
        if (event.data) dados.body = event.data.text();
    }

    event.waitUntil(
        self.registration.showNotification(dados.title || 'O Rei da Coxinha 🍗', {
            body: dados.body || '',
            icon: '/icone.png',
            badge: '/icone.png',
            data: dados.url ? { url: dados.url } : {},
            vibrate: [200, 100, 200],
            requireInteraction: false
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const urlAlvo = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            for (const client of clients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    if (urlAlvo.includes('abrir=mapa')) {
                        client.postMessage({ acao: 'abrir_mapa' });
                    }
                    return;
                }
            }
            return self.clients.openWindow(urlAlvo);
        })
    );
});
