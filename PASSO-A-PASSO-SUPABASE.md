# Formulário de contato com Supabase + Resend

Como funciona: o visitante preenche o formulário → o site chama uma **Edge Function** do Supabase → a função valida os dados, **salva** a mensagem na tabela `mensagens` e **envia um e-mail** para você pelo Resend.

Os nomes dos menus podem mudar um pouco com o tempo, mas a lógica é a mesma.

---

## Passo 1 — Criar o projeto no Supabase

1. Acesse **supabase.com** e entre (ou crie uma conta).
2. Clique em **New project**, escolha um nome (ex.: `portfolio`), crie uma senha para o banco (guarde-a) e escolha uma região (ex.: *South America (São Paulo)*).
3. Aguarde alguns minutos até o projeto ficar pronto.
4. Anote a **URL do projeto**: ela aparece em **Project Settings → API** (ou Data API) e tem o formato `https://abcdefghijk.supabase.co`. Você vai usar no Passo 8.

## Passo 2 — Criar a tabela (SQL)

1. No menu da esquerda, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/setup.sql`, copie **todo** o conteúdo e cole no editor.
4. Clique em **Run**. Deve aparecer *Success. No rows returned*.
5. Confira em **Table Editor**: a tabela `mensagens` deve existir, com o aviso de que o RLS está ativo.

> O RLS ativo e sem políticas significa que ninguém acessa a tabela pelo navegador. Só a Edge Function, com a chave de serviço (que fica no servidor), consegue gravar e ler.

## Passo 3 — Criar a chave do Resend

1. Acesse **resend.com** e crie uma conta.
2. Vá em **API Keys → Create API Key**, nome `portfolio`, permissão **Sending access**.
3. **Copie a chave** (começa com `re_`). Ela só aparece uma vez.

**Sobre o remetente:**
- **Para testar:** use `onboarding@resend.dev`. Nesse modo o Resend só entrega para o **e-mail da sua própria conta Resend**.
- **Para produção:** em **Domains → Add Domain**, cadastre seu domínio e adicione os registros DNS pedidos. Depois use um remetente como `Portfólio <contato@seudominio.com>`.

## Passo 4 — Criar a Edge Function

1. No Supabase, abra **Edge Functions**.
2. Clique em **Deploy a new function** e escolha **Via Editor**.
3. Dê o nome exato: `enviar-contato` (o site usa esse nome).
4. Apague o código de exemplo, abra `supabase/functions/enviar-contato/index.ts`, copie tudo e cole.
5. Clique em **Deploy function**.

## Passo 5 — Liberar a função para o formulário público

Como o site é estático, o visitante não está logado. Por isso a função precisa aceitar chamadas sem token.

1. Em **Edge Functions**, clique na função `enviar-contato`.
2. Abra a aba de configurações (**Details** ou **Settings**).
3. **Desative** a opção **Verify JWT**. Salve.

> A proteção contra abuso fica na própria função: validação dos campos, campo escondido anti-robô e limite de 3 mensagens por hora por e-mail.

## Passo 6 — Cadastrar os segredos

1. Em **Edge Functions**, abra **Secrets** (ou **Manage secrets**).
2. Adicione:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | a chave `re_...` do Passo 3 |
| `EMAIL_DESTINO` | o e-mail que vai **receber** as mensagens |
| `EMAIL_REMETENTE` | `Portfólio <onboarding@resend.dev>` (teste) ou seu domínio verificado |
| `SITE_ORIGIN` | opcional: o endereço do seu site (ex.: `https://seusite.com`). Se não criar, qualquer site pode chamar a função |

Não crie `SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY`: o Supabase já fornece essas duas para a função.

## Passo 7 — (Alternativa) Fazer tudo pelo terminal

Se preferir usar a CLI em vez do painel:

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_REF
supabase secrets set RESEND_API_KEY=re_xxx EMAIL_DESTINO=voce@email.com
supabase functions deploy enviar-contato --no-verify-jwt
```

## Passo 8 — Conectar o site

1. Abra `script.js`.
2. Troque `https://SEU-PROJETO.supabase.co` pela URL do Passo 1.
3. Salve e abra o site.

## Passo 9 — Testar

1. Preencha e envie o formulário. Deve aparecer *Mensagem enviada com sucesso*.
2. Em **Table Editor → mensagens**, a linha deve estar lá. `email_enviado` fica `true` quando o Resend aceitou o envio.
3. Confira sua caixa de entrada (e o spam).

## Problemas comuns

| Sintoma | O que verificar |
|---|---|
| Erro de CORS / "Failed to fetch" | Nome da função, URL no `script.js` e `SITE_ORIGIN` (precisa ser exatamente o endereço do site, sem `/` no final) |
| Erro 401 | **Verify JWT** ainda está ativado (Passo 5) |
| Mensagem salva, mas `email_enviado = false` | Veja **Edge Functions → enviar-contato → Logs**: chave do Resend errada ou remetente não verificado |
| E-mail não chega no modo teste | Com `onboarding@resend.dev`, `EMAIL_DESTINO` precisa ser o e-mail da sua conta Resend |
| "Muitas mensagens em pouco tempo" | Limite de 3 por hora por e-mail (normal ao testar várias vezes) |

## Segurança

- Nunca coloque a chave do Resend nem a `service_role` no código do site.
- Você lê as mensagens no **Table Editor** do Supabase; a coluna `lida` serve para marcar as que já respondeu.
