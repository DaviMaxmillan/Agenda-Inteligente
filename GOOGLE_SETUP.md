# 🔑 Guia — Criar Credenciais Google Calendar OAuth

## Por que preciso disso?
Para a Agenda sincronizar com o Google Calendar, ela precisa de permissão da Google.
Isso é feito via **OAuth 2.0** — você cria um "projeto" no Google Cloud e obtém duas chaves:
`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

---

## Passo 1 — Criar projeto no Google Cloud Console

1. Acesse: **[https://console.cloud.google.com](https://console.cloud.google.com)**
2. Faça login com sua conta Google
3. No topo, clique em **"Selecionar projeto"** → **"Novo projeto"**
4. Nome sugerido: `Agenda Inteligente`
5. Clique em **"Criar"**

---

## Passo 2 — Ativar a Google Calendar API

1. No menu lateral, acesse **"APIs e serviços"** → **"Biblioteca"**
2. Pesquise por `Google Calendar API`
3. Clique nela → **"Ativar"**

---

## Passo 3 — Configurar Tela de Consentimento OAuth

1. Vá em **"APIs e serviços"** → **"Tela de permissão OAuth"**
2. Escolha **"Externo"** → **"Criar"**
3. Preencha:
   - **Nome do app**: `Agenda Inteligente`
   - **E-mail de suporte**: seu e-mail
   - **E-mail do desenvolvedor**: seu e-mail
4. Clique em **"Salvar e continuar"** (nas próximas telas também)
5. Na seção **"Usuários de teste"**, adicione seu e-mail (necessário enquanto o app está em "Teste")
6. Clique em **"Salvar e continuar"** até finalizar

---

## Passo 4 — Criar Credenciais OAuth 2.0

1. Vá em **"APIs e serviços"** → **"Credenciais"**
2. Clique em **"+ Criar credenciais"** → **"ID do cliente OAuth"**
3. Tipo: **"Aplicativo da Web"**
4. Nome: `Agenda Inteligente`
5. Em **"URIs de redirecionamento autorizados"**, clique em **"+ Adicionar URI"** e cole:
   ```
   https://agenda-inteligente-production-3be4.up.railway.app/api/google-calendar/callback
   ```
6. Clique em **"Criar"**

---

## Passo 5 — Copiar as credenciais

Após criar, uma janela aparecerá com:
- **ID do cliente** → Este é o `GOOGLE_CLIENT_ID`
- **Segredo do cliente** → Este é o `GOOGLE_CLIENT_SECRET`

> Copie e guarde esses valores em local seguro. O segredo não pode ser recuperado depois.

---

## Passo 6 — Configurar no Railway

No painel do Railway, no seu serviço de API, acesse a aba **"Variables"** e adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | *(gerado automaticamente pelo Railway Postgres)* |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://agenda-inteligente-agenda.vercel.app` |
| `GOOGLE_CLIENT_ID` | Cole o valor do Passo 5 |
| `GOOGLE_CLIENT_SECRET` | Cole o valor do Passo 5 |
| `GOOGLE_REDIRECT_URI` | `https://agenda-inteligente-production-3be4.up.railway.app/api/google-calendar/callback` |

---

## Passo 7 — Verificar

1. Acesse sua Agenda: **https://agenda-inteligente-agenda.vercel.app**
2. Vá em **Configurações** e no card **Google Calendar**, clique em **"Conectar Google Calendar"**
3. Faça login com sua conta Google e autorize
4. Você será redirecionado de volta com a mensagem **"Google Calendar conectado!"**
5. Crie um evento na Agenda — ele deve aparecer automaticamente no seu Google Calendar ✅

---

## Problema: "redirect_uri_mismatch"

Isso significa que a URI cadastrada no Google Console não bate exatamente.
Verifique se adicionou exatamente:
```
https://agenda-inteligente-production-3be4.up.railway.app/api/google-calendar/callback
```
(sem barra no final, com `/api/` no meio)
