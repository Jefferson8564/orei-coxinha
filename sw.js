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
