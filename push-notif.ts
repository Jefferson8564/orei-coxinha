// ============================================================
//  EDGE FUNCTION: push-notif
//  Dispara Web Push quando uma notificação é inserida no banco
//  Chamada pelo Database Webhook na tabela "notificacoes"
// ============================================================

import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL   = Deno.env.get("VAPID_EMAIL") || "mailto:admin@oreidacoxinha.com";
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Payload vindo do Database Webhook (INSERT em notificacoes)
    const record = body?.record;
    if (!record) return new Response("sem record", { status: 400 });

    const { customer_phone, tipo, valor, descricao } = record;
    const valorFmt = Number(valor || 0).toFixed(2).replace(".", ",");

    const isReembolso = tipo === "reembolso";
    const titulo = isReembolso ? "♻️ Reembolso recebido" : "✅ Pagamento recebido";
    const corpo  = isReembolso
      ? `Pedido cancelado\nR$ ${valorFmt} devolvido`
      : `R$ ${valorFmt} confirmado`;

    // Busca todas as subscriptions deste telefone
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?customer_phone=eq.${encodeURIComponent(customer_phone)}`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const subs = await resp.json();

    if (!subs || subs.length === 0) {
      return new Response("nenhuma subscription", { status: 200 });
    }

    const payload = JSON.stringify({
      title: "O Rei da Coxinha 🍗",
      body:  `${titulo}\n${corpo}`,
      icon:  "/icone.png",
      badge: "/icone.png",
    });

    const resultados = await Promise.allSettled(
      subs.map(async (row: any) => {
        const subscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err: any) {
          // Subscription expirada ou inválida — remove do banco
          if (err.statusCode === 410 || err.statusCode === 404) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${row.id}`,
              {
                method: "DELETE",
                headers: {
                  "apikey": SUPABASE_KEY,
                  "Authorization": `Bearer ${SUPABASE_KEY}`,
                },
              }
            );
          }
          throw err;
        }
      })
    );

    const ok      = resultados.filter(r => r.status === "fulfilled").length;
    const falhas  = resultados.filter(r => r.status === "rejected").length;
    return new Response(JSON.stringify({ ok, falhas }), { status: 200 });

  } catch (e) {
    console.error("Erro push-notif:", e);
    return new Response("erro interno", { status: 500 });
  }
});
