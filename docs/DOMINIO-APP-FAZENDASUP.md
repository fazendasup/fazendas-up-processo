# Domínio `app.fazendasup.com.br` (site institucional → painel)

Objetivo: o visitante clica no **site da fazenda** (ex.: `fazendasup.com.br` ou `www.fazendasup.com.br`) e abre o **painel supervisório** em **`https://app.fazendasup.com.br`**.

O painel é esta aplicação (API + SPA no mesmo host). Não é obrigatório mudar código: basta **DNS**, **domínio no hosting** (ex.: Railway) e um **link** no site institucional.

---

## 1. DNS (painel do domínio)

Crie um registo para o subdomínio **`app`**:

| Tipo | Nome / Host | Valor |
|------|-------------|--------|
| **CNAME** | `app` | o hostname que o Railway (ou outro host) indicar para custom domain (ex.: `xxxx.up.railway.app`) |

Alternativas comuns: **ALIAS/ANAME** no DNS do fornecedor, se não permitirem CNAME na raiz (aqui é subdomínio `app`, CNAME costuma ser aceite).

Propagação: de minutos a algumas horas. Confirme com `nslookup app.fazendasup.com.br` ou ferramenta online de DNS.

---

## 2. Railway (ou outro host)

1. No serviço do **Fazendas Up processo** → **Settings** → **Networking** / **Public Networking**.
2. **Add Custom Domain** → `app.fazendasup.com.br`.
3. Siga as instruções do painel (validação por CNAME ou TXT, conforme o produto).
4. O certificado **HTTPS** costuma ser emitido automaticamente após o DNS estar correto.

Variáveis úteis (já referidas noutros docs):

- `TRUST_PROXY_HOPS=1` — recomendado atrás do proxy da Railway (cookies `Secure` e `X-Forwarded-Proto`).
- `JWT_SECRET` — obrigatório em produção.
- `DATABASE_URL` — base MySQL.

**Não** precisa de `SESSION_COOKIE_DOMAIN` para o fluxo normal “clicar no site → abrir o app”: o cookie de sessão fica no host **`app.fazendasup.com.br`** e o login em `/login` nesse mesmo host. Só defina `SESSION_COOKIE_DOMAIN` se um arquiteto de SSO exigir cookie partilhado entre vários subdomínios (caso raro).

---

## 3. Link no site institucional

No HTML do site da fazenda (WordPress, Webflow, página estática, etc.), use um link direto para o painel:

```html
<a href="https://app.fazendasup.com.br/login">Entrar no painel</a>
```

Ou para a raiz (utilizador já autenticado pode ir direto ao início):

```html
<a href="https://app.fazendasup.com.br/">Abrir painel</a>
```

**Abrir numa nova aba** (opcional):

```html
<a href="https://app.fazendasup.com.br/login" target="_blank" rel="noopener noreferrer">Painel supervisório</a>
```

Redirecionamento em vez de link: no servidor do site institucional, regra HTTP 302 de `/painel` → `https://app.fazendasup.com.br/login` (depende da plataforma do site).

---

## 4. OAuth (só se usar login pelo portal Manus/WebDev)

Se tiver `OAUTH_SERVER_URL` e `VITE_OAUTH_PORTAL_URL` ligados:

- O `redirect_uri` é construído com **`window.location.origin`** no cliente → em produção tem de ser **`https://app.fazendasup.com.br/api/oauth/callback`** quando o utilizador acede pelo domínio novo.
- No portal OAuth, registe esse **redirect URI** autorizado.
- Faça **deploy** com as variáveis `VITE_*` correctas no build (o Vite embute no bundle).

---

## 5. Variável opcional `PUBLIC_APP_URL`

Pode definir no Railway (só referência / futuras integrações):

```env
PUBLIC_APP_URL=https://app.fazendasup.com.br
```

Hoje o código não depende dela para o fluxo principal; serve para documentação interna ou scripts.

---

## 6. Resumo rápido

| Passo | Ação |
|-------|------|
| DNS | CNAME `app` → host indicado pelo Railway |
| Hosting | Custom domain `app.fazendasup.com.br` + HTTPS |
| Site institucional | `href="https://app.fazendasup.com.br/login"` (ou `/`) |
| Cookies | Por defeito **não** definir `SESSION_COOKIE_DOMAIN` |

Com isto, “a partir do site da fazenda” o utilizador **cai** no domínio do app ao clicar no link ou ao seguir o redirecionamento.
