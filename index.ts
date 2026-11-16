import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapar = (texto: string) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405);
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return responder({ erro: "Requisição inválida." }, 400);
  }

  if (corpo.website) {
    return responder({ ok: true });
  }

  const nome = String(corpo.nome ?? "").trim();
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const mensagem = String(corpo.mensagem ?? "").trim();

  if (nome.length < 2 || nome.length > 100) {
    return responder({ erro: "Informe um nome válido." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    return responder({ erro: "Informe um e-mail válido." }, 400);
  }
  if (mensagem.length < 5 || mensagem.length > 2000) {
    return responder({ erro: "A mensagem deve ter entre 5 e 2000 caracteres." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("criado_em", umaHoraAtras);

  if ((count ?? 0) >= 3) {
    return responder({ erro: "Muitas mensagens em pouco tempo. Tente novamente mais tarde." }, 429);
  }

  const { data: salva, error: erroBanco } = await supabase
    .from("mensagens")
    .insert({ nome, email, mensagem })
    .select("id")
    .single();

  if (erroBanco || !salva) {
    console.error("Erro ao salvar:", erroBanco);
    return responder({ erro: "Não foi possível salvar sua mensagem." }, 500);
  }

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_REMETENTE") ?? "Portfólio <onboarding@resend.dev>",
      to: [Deno.env.get("EMAIL_DESTINO")],
      reply_to: email,
      subject: `Novo contato do portfólio: ${nome}`,
      html: `
        <h2>Nova mensagem pelo portfólio</h2>
        <p><strong>Nome:</strong> ${escapar(nome)}</p>
        <p><strong>E-mail:</strong> ${escapar(email)}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${escapar(mensagem).replace(/\n/g, "<br>")}</p>
      `,
    }),
  });

  if (resposta.ok) {
    await supabase.from("mensagens").update({ email_enviado: true }).eq("id", salva.id);
  } else {
    console.error("Erro no Resend:", resposta.status, await resposta.text());
  }

  return responder({ ok: true });
});
