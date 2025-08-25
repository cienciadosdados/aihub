# 🚀 Cloudflare Setup Completo - AI Agent Hub

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Git instalado
- Contas gratuitas: OpenAI, Pinecone, Cloudflare

---

## 1. 🔐 Criar Conta Cloudflare

1. **Acesse:** https://dash.cloudflare.com
2. **Crie conta gratuita**
3. **Confirme email**
4. **Faça login no dashboard**

---

## 2. 🛠️ Autenticação Wrangler

### Opção A: Login Automático (Recomendado)

```bash
npx wrangler login
```

- Abre o navegador automaticamente
- Faz login na sua conta Cloudflare
- Autoriza o Wrangler CLI
- ✅ **Pronto! Autenticado**

### Opção B: API Token Manual

1. **Dashboard Cloudflare** → **My Profile** → **API Tokens**
2. **Create Token** → **Custom token**
3. **Configurar permissões:**
   - Account: `Cloudflare Workers:Edit`
   - Zone: `Zone:Read` 
   - Account: `Account:Read`
4. **Copy token**
5. **Configure:**
   ```bash
   export CLOUDFLARE_API_TOKEN=your_token_here
   ```

---

## 3. 🗄️ Criar Database D1

```bash
# Criar banco D1
npx wrangler d1 create ai-agent-hub-db
```

**Resultado esperado:**
```
✅ Successfully created DB 'ai-agent-hub-db' in region APAC

[[d1_databases]]
binding = "DB"
database_name = "ai-agent-hub-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 🔧 Atualizar wrangler.jsonc

1. **Copie o `database_id`** do resultado acima
2. **Edite o arquivo `wrangler.jsonc`:**

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-agent-hub-db",
      "database_id": "SEU_DATABASE_ID_AQUI"
    }
  ]
}
```

---

## 4. 🌲 Configurar Pinecone

### Criar Conta Pinecone

1. **Acesse:** https://pinecone.io
2. **Crie conta gratuita**
3. **Confirme email**

### Criar Índice

1. **Dashboard** → **Create Index**
2. **Configurações:**
   - **Name:** `mocha-rag`
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
   - **Region:** qualquer (ex: us-east-1-aws)
3. **Create Index**

### Obter Chaves

1. **API Keys** → **Copy API Key**
2. **Indexes** → **mocha-rag** → **Copy Host URL**

---

## 5. 🔑 Configurar OpenAI

1. **Acesse:** https://platform.openai.com
2. **Crie conta** (se não tiver)
3. **API Keys** → **Create new secret key**
4. **Copy API key** (sk-...)

---

## 6. ⚙️ Setup do Projeto

### Instalar Dependencies

```bash
npm install
```

### Configurar Secrets

```bash
npm run setup-secrets
```

**Digite quando solicitado:**
- **OPENAI_API_KEY:** `sk-your-openai-key-here`
- **PINECONE_API_KEY:** `your-pinecone-key-here`
- **PINECONE_ENVIRONMENT:** `us-east-1-aws` (ou sua região)
- **PINECONE_INDEX_NAME:** `mocha-rag`

### Executar Migrações

```bash
npm run migrate
```

**Resultado esperado:**
```
🚀 AI Agent Hub - Database Migration Tool
✅ All migrations completed successfully!
📋 Next steps:
  1. Configure your environment secrets with: npm run setup-secrets
  2. Start development server with: npm run dev
  3. Deploy to production with: npm run deploy
```

---

## 7. 🚀 Testar Aplicação

### Desenvolvimento Local

```bash
# Opção 1: Tudo junto
npm run dev:all

# Opção 2: Separado
npm run dev:worker  # Terminal 1
npm run dev         # Terminal 2
```

### Verificar Funcionamento

1. **Frontend:** http://localhost:5173
2. **Worker/API:** http://localhost:8787
3. **Criar workspace e agente**
4. **Testar chat**

---

## 8. 🔍 Comandos Úteis

### Verificar Database

```bash
# Listar tabelas
npx wrangler d1 execute ai-agent-hub-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Ver dados
npx wrangler d1 execute ai-agent-hub-db --command="SELECT * FROM workspaces;"
```

### Verificar Secrets

```bash
npx wrangler secret list
```

### Reset Database (CUIDADO!)

```bash
npm run db:reset
npm run migrate
```

### Deploy Produção

```bash
npm run deploy
```

---

## 9. 🆘 Problemas Comuns

### Erro: "Database not found"

```bash
# Verificar se database existe
npx wrangler d1 list

# Recriar se necessário
npx wrangler d1 create ai-agent-hub-db
```

### Erro: "Unauthorized"

```bash
# Refazer login
npx wrangler logout
npx wrangler login
```

### Erro: "Pinecone connection failed"

1. Verificar API key
2. Verificar se índice existe
3. Verificar dimensões (deve ser 1536)

### Erro de Build/TypeScript

```bash
npm run build
npx tsc --noEmit
```

---

## 10. 📊 Custos (Tier Gratuito)

### Cloudflare Workers
- **100k requests/dia** - Gratuito
- **D1 Database:** 25GB storage - Gratuito

### Pinecone
- **1 índice** - Gratuito
- **1M vectors** - Gratuito

### OpenAI
- **Pay-per-use**
- **$5 de crédito inicial** (novos usuários)

---

## 11. ✅ Checklist Final

- [ ] Conta Cloudflare criada
- [ ] Wrangler autenticado (`npx wrangler whoami`)
- [ ] D1 database criado e configurado
- [ ] Pinecone índice criado (mocha-rag, 1536 dims)
- [ ] OpenAI API key configurado
- [ ] Secrets configurados (`npm run setup-secrets`)
- [ ] Migrações executadas (`npm run migrate`)
- [ ] App rodando (`npm run dev:all`)
- [ ] Workspace criado
- [ ] Agente testado

---

## 🎯 Resumo Rápido

```bash
# 1. Login
npx wrangler login

# 2. Criar DB
npx wrangler d1 create ai-agent-hub-db
# Copiar database_id para wrangler.jsonc

# 3. Setup
npm install
npm run setup-secrets
npm run migrate

# 4. Testar
npm run dev:all
```

**🎉 Pronto! Seu AI Agent Hub está funcionando!**

**Acesse:** http://localhost:5173

---

## 📞 Suporte

- **Cloudflare Docs:** https://developers.cloudflare.com/workers/
- **Pinecone Docs:** https://docs.pinecone.io/
- **OpenAI Docs:** https://platform.openai.com/docs