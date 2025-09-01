# Setup Rápido - AI Agent Hub

## 🚀 Instalação em 5 Minutos

### 1. Pré-requisitos
```bash
# Verificar Node.js (v18+)
node --version

# Verificar npm
npm --version
```

### 2. Clone e Instale
```bash
git clone <repository-url>
cd ai-agent-hub
npm install
```

### 3. Configure APIs

#### Cloudflare D1
```bash
# Criar database
npx wrangler d1 create ai-agent-hub-db

# Anotar o database_id retornado
# Editar wrangler.jsonc com o database_id
```

#### Pinecone
1. Criar conta em [pinecone.io](https://pinecone.io)
2. Criar índice:
   - Nome: `mocha-rag`
   - Dimensões: `1536`
   - Métrica: `cosine`

### 4. Executar Setup Automático
```bash
# Configurar todos os secrets
npm run setup-secrets

# Executar migrações do banco
npm run migrate

# Iniciar desenvolvimento
npm run dev
```

### 5. Verificar Instalação
- ✅ Abrir http://localhost:5173
- ✅ Fazer login
- ✅ Criar workspace
- ✅ Criar agente
- ✅ Testar RAG

## 🆘 Problemas Comuns

### Erro de Database
```bash
npm run db:reset
npm run migrate
```

### Erro de Secrets
```bash
npm run setup-secrets
```

### Erro de Build
```bash
npm run build
```

### Ver Logs
```bash
npx wrangler tail
```

## 🔧 Scripts Úteis

```bash
npm run migrate        # Rodar migrações
npm run setup-secrets  # Configurar secrets
npm run build          # Build para produção
npm run deploy         # Deploy para Cloudflare
npm run db:reset       # Reset completo do banco
npm run check          # Verificar TypeScript
```

## 📋 Checklist Pós-Setup

- [ ] Database criado e migrado
- [ ] Secrets configurados
- [ ] Índice Pinecone criado
- [ ] App rodando localmente
- [ ] Login funcionando
- [ ] RAG testado

## 🔗 Links Importantes

- [OpenAI Platform](https://platform.openai.com)
- [Pinecone Console](https://app.pinecone.io)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)

Para setup detalhado, veja o [README.md](README.md) completo.
