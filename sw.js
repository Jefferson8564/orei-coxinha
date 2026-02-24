const CACHE = 'reicoxinha-v5';

// Apenas assets verdadeiramente estáticos ficam no cache
const ASSETS_ESTATICOS = [
    './icone.png',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.allSettled(ASSETS_ESTATICOS.map(url => cache.add(url).catch(() => {})))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = e.request.url;

    // ── Supabase: sempre rede, nunca cache ──
    if (url.includes('supabase.co')) {
        e.respondWith(
            fetch(e.request).catch(() => new Response(
                JSON.stringify({ data: null, error: { message: 'offline' } }),
                { headers: { 'Content-Type': 'application/json' } }
            ))
        );
        return;
    }

    // ── index.html e raiz: sempre busca na rede primeiro (Network First) ──
    // Garante que o deploy novo seja sempre carregado
    if (url.endsWith('/') || url.endsWith('/index.html') || url.endsWith('.html')) {
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    // Atualiza o cache com a versão mais nova
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(e.request)) // offline: usa cache como fallback
        );
        return;
    }

    // ── Assets estáticos: Cache First (ícone, fonts, libs) ──
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => cached);
        })
    );
});

// ===== RECEBE O PUSH DO SERVIDOR =====
self.addEventListener('push', e => {
    let data = {
        title: '🍗 Rei da Coxinha',
        body: 'Você tem uma atualização!',
        tipo: 'geral',
        url: '/'
    };

    try { data = e.data.json(); } catch(_) {}

    // Ícone e cor diferente por tipo de notificação
    const icones = {
        pedido_recebido: '🍗',
        saiu_entrega:    '🛵',
        pedido_entregue: '✅',
        reembolso:       '💰',
        geral:           '🔔'
    };

    const titulo = data.title || `${icones[data.tipo] || '🔔'} Rei da Coxinha`;
    const corpo  = data.body  || 'Você tem uma atualização!';

    e.waitUntil(
        self.registration.showNotification(titulo, {
            body: corpo,
            icon:  './icone.png',
            badge: './icone.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: data.tipo || 'geral',        // agrupa notificações do mesmo tipo
            renotify: true,
            data: {
                url:  data.url  || '/',
                tipo: data.tipo || 'geral'
            }
        })
    );
});

// ===== CLIQUE NA NOTIFICAÇÃO =====
self.addEventListener('notificationclick', e => {
    e.notification.close();

    const tipo = e.notification.data?.tipo;
    const url  = e.notification.data?.url || '/';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            const janela = list.find(c => c.url.includes(self.location.origin));

            if (janela) {
                // App já está aberto — foca e envia mensagem para abrir a tela certa
                janela.focus();
                // Se for "saiu pra entrega", abre o mapa automaticamente
                if (tipo === 'saiu_entrega') {
                    janela.postMessage({ acao: 'abrir_mapa' });
                }
                return;
            }

            // App estava fechado — abre e passa o parâmetro na URL
            const urlAbrir = tipo === 'saiu_entrega'
                ? '/?abrir=mapa'
                : url;

            return clients.openWindow(urlAbrir);
        })
    );
});
