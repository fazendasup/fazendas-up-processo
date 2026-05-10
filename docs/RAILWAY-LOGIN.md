# Entrar na aplicação na Railway (login)

Este guia é para quem **não é programador** e só precisa de fazer o login funcionar no site hospedado na [Railway](https://railway.app).

## O que você precisa saber em uma frase

- **`BOOTSTRAP_ADMIN_PASSWORD`** não é um “comando”. É só o **nome de uma caixinha de configuração** no site da Railway onde você pode guardar uma senha que o **servidor** usa ao **ligar** para criar ou atualizar o utilizador administrador.

Na maioria dos casos **você não precisa mexer nisso**.

---

## Passo 1 — Confirmar que o deploy está atualizado

No GitHub, o código novo precisa estar na branch que a Railway usa (geralmente `main`). Depois, na Railway, abra o **último deploy** e espere ficar verde (sucesso).

---

## Passo 2 — Tentar o login padrão do projeto

No ecrã de login use:

- **Email:** `comercial@visioneer.com.br`
- **Senha:** `Fup@2026`

Repare que a senha tem **F maiúsculo**, **@** e **2026**. Se o teclado estiver noutro idioma, o `@` pode sair errado — vale copiar e colar a senha.

Enquanto o serviço corre em **produção**, o servidor tenta **alinhar** esta senha ao utilizador de bootstrap em **cada arranque** (exceto se alguém tiver definido `BOOTSTRAP_DISABLE_ADMIN_PASSWORD_SYNC=1`). Ou seja: depois de um deploy bem-sucedido, esta combinação deve voltar a funcionar mesmo que a base tivesse uma senha antiga.

---

## Passo 3 — Se ainda der “Email ou senha inválidos”

### 3.1 Erro nos logs: `Data truncated for column 'role'` ou `[Bootstrap] Falha` ao inserir admin

Significa que a coluna `role` na tabela `users` estava como ENUM antigo e **não aceitava** `platform_admin`. O projeto passou a usar **`VARCHAR(32)`** para `users.role` (migração `0027_users_role_varchar.sql` + ensure no arranque). Faça **deploy da última versão** e confirme nos logs: `[Database] users.role = VARCHAR(32)`.

### 3.2 Ver os logs do servidor

Na Railway:

1. Abra o **projeto** → o **serviço** da aplicação (Node/Docker).
2. Vá a **Deployments** → abra o deploy atual → **View logs** (ou o separador de logs em tempo real).

Procure linhas que começam por **`[Bootstrap]`**:

- **`Admin criado`** ou **`Conta ... pronta para login`** → o servidor atualizou o utilizador; volte a tentar o email e senha acima.
- **`Falha ao garantir admin inicial`** → há problema de **base de dados** (por exemplo `DATABASE_URL` errada ou migrações que falharam). O login não vai funcionar até isso estar corrigido.

### 3.3 Variáveis obrigatórias

No mesmo serviço, separador **Variables**, deve existir pelo menos:

| Nome | O que é |
|------|--------|
| `DATABASE_URL` | Ligação ao MySQL (a Railway costuma criar ao adicionar um plugin MySQL). |
| `JWT_SECRET` | Texto longo e aleatório (para sessões); em produção o servidor exige isto definido de forma sensata. |

Sem base de dados correta, **nenhuma** senha funciona.

---

## Passo 4 — (Opcional) Definir a **sua** senha fixa pelo painel da Railway

Só use isto se quiser que o servidor use **outra** senha em vez da pré-definição `Fup@2026`.

1. Na Railway → **serviço** da app → **Variables**.
2. **New Variable** (nova variável).
3. **Name (nome):** copie exatamente (sem espaços):  
   `BOOTSTRAP_ADMIN_PASSWORD`
4. **Value (valor):** a senha que **você** quer (exemplo: `MinhaSenhaSegura!2026`).
5. Guarde e faça um **novo deploy** (ou reinicie o serviço).

Na próxima vez que o contentor **arrancar**, essa senha é aplicada ao email de administrador (por defeito `comercial@visioneer.com.br`, ou o valor de `BOOTSTRAP_ADMIN_EMAIL` se definir).

**Opcional — mudar só o email do admin:** variável `BOOTSTRAP_ADMIN_EMAIL` com o email desejado (tudo em minúsculas recomendado).

---

## Passo 5 — Depois de entrar na aplicação

Quando já conseguir entrar:

1. Mude a senha dentro da aplicação (painel de utilizadores / perfil, conforme existir).
2. Se não quiser que **cada deploy** volte a repor a senha para a pré-definição, defina na Railway:  
   `BOOTSTRAP_DISABLE_ADMIN_PASSWORD_SYNC` = `1`

---

## Resumo

| Situação | O que fazer |
|----------|-------------|
| “Não sei o que é BOOTSTRAP_ADMIN_PASSWORD” | Pode **ignorar**; tente primeiro email + `Fup@2026` após deploy novo. |
| Quero **minha** senha desde o arranque | Variável `BOOTSTRAP_ADMIN_PASSWORD` na Railway + redeploy. |
| Logs com erro `[Bootstrap]` | Corrigir `DATABASE_URL` / MySQL / migrações antes de insistir no login. |
