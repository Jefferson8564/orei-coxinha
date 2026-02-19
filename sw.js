const CACHE = 'reicoxinha-v1';

// Arquivos essenciais para funcionar offline
const ARQUIVOS = [
    './',
    './index.html',
    './icone.png',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
];

// Instalar: faz cache de tudo
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => {
            return Promise.allSettled(
                ARQUIVOS.map(url => cache.add(url).catch(() => {}))
            );
        })
    );
    self.skipWaiting();
});

// Ativar: limpa caches antigos
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: tenta rede primeiro, cai no cache se offline
self.addEventListener('fetch', e => {
    // Requisições ao Supabase: tenta rede, ignora se falhar
    if (e.request.url.includes('supabase.co')) {
        e.respondWith(
            fetch(e.request).catch(() => new Response(
                JSON.stringify({ data: null, error: { message: 'offline' } }),
                { headers: { 'Content-Type': 'application/json' } }
            ))
        );
        return;
    }

    // Demais recursos: cache primeiro, depois rede
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Atualiza o cache com a versão mais nova
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => cached);
        })
    );
});
