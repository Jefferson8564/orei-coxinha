// sw-cliente.js — Service Worker do app do cliente com Web Push
const CACHE_NAME = 'rei-coxinha-cliente-v1';
const CLIENTE_URL = 'https://orei-coxinha.vercel.app/';

// ── Gera um ícone PNG com emoji usando OffscreenCanvas ──
// Retorna uma URL de blob (válida enquanto o SW estiver ativo)
async function gerarIconeEmoji(emoji, tamanho = 192, corFundo = '#1a1a1a') {
    try {
        const canvas = new OffscreenCanvas(tamanho, tamanho);
        const ctx = canvas.getContext('2d');

        // Fundo arredondado
        const raio = tamanho * 0.22;
        ctx.beginPath();
        ctx.moveTo(raio, 0);
        ctx.lineTo(tamanho - raio, 0);
        ctx.quadraticCurveTo(tamanho, 0, tamanho, raio);
        ctx.lineTo(tamanho, tamanho - raio);
        ctx.quadraticCurveTo(tamanho, tamanho, tamanho - raio, tamanho);
        ctx.lineTo(raio, tamanho);
        ctx.quadraticCurveTo(0, tamanho, 0, tamanho - raio);
        ctx.lineTo(0, raio);
        ctx.quadraticCurveTo(0, 0, raio, 0);
        ctx.closePath();
        ctx.fillStyle = corFundo;
        ctx.fill();

        // Emoji centralizado
        ctx.font = `${tamanho * 0.58}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, tamanho / 2, tamanho / 2 + tamanho * 0.04);

        const blob = await canvas.convertToBlob({ type: 'image/png' });
        return URL.createObjectURL(blob);
    } catch (e) {
        // OffscreenCanvas não suportado — retorna null (usa fallback)
        return null;
    }
}

// ── Mapa de emojis por tipo de notificação ──────────────
const ICONES_NOTIFICACAO = {
    pagamento: { emoji: '✅', cor: '#1a3d1a' },
    reembolso: { emoji: '♻️', cor: '#3d2a00' },
    default:   { emoji: '✅', cor: '#1a3d1a' },
};

function detectarTipoNotificacao(data) {
    const msg = (data.mensagem || data.titulo || '').toLowerCase();
    if (msg.includes('reembolso'))                  return 'reembolso';
    if (data.tipo && ICONES_NOTIFICACAO[data.tipo]) return data.tipo;
    return 'default'; // pagamento é o padrão
}

// ─────────────────────────────────────────────────────────
self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

// ── Web Push ──────────────────────────────────────────────
self.addEventListener('push', e => {
    let data = {
        titulo: '🛵 O Rei da Coxinha',
        mensagem: 'Você tem uma nova notificação!'
    };
    if (e.data) {
        try { data = { ...data, ...e.data.json() }; } catch (_) {}
    }

    e.waitUntil((async () => {
        const tipo   = detectarTipoNotificacao(data);
        const config = ICONES_NOTIFICACAO[tipo] || ICONES_NOTIFICACAO.default;

        // Tenta gerar ícone com emoji (OffscreenCanvas)
        const iconUrl = await gerarIconeEmoji(config.emoji, 192, config.cor);

        const options = {
            body:              data.mensagem,
            icon:              iconUrl || './icone.png',   // fallback para arquivo estático
            badge:             iconUrl || './icone.png',
            tag:               'push-cliente',
            renotify:          true,
            vibrate:           [200, 100, 200, 100, 200],
            requireInteraction: false,
            silent:            false,
            data:              { ...data, _iconUrl: iconUrl }
        };

        await self.registration.showNotification(data.titulo, options);

        // Libera o blob depois de 60s para não vazar memória
        if (iconUrl) {
            setTimeout(() => URL.revokeObjectURL(iconUrl), 60_000);
        }
    })());
});

// ── Clique na notificação ─────────────────────────────────
self.addEventListener('notificationclick', e => {
    e.notification.close();
    // Libera blob do ícone imediatamente ao clicar
    const iconUrl = e.notification.data?._iconUrl;
    if (iconUrl) URL.revokeObjectURL(iconUrl);

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if (c.url.startsWith(CLIENTE_URL) && c.focus) return c.focus();
            }
            return clients.openWindow(CLIENTE_URL);
        })
    );
});
