# AI Agent Hub - Build Intelligent AI Agents

Uma plataforma completa para criar, gerenciar e interagir with agentes de inteligência artificial personalizados com suporte a RAG (Retrieval-Augmented Generation).


## 🚀 Funcionalidades

### 🤖 Gerenciamento de Agentes IA
- **Criação de Agentes Personalizados**: Crie agentes com nomes, descrições e system prompts específicos
- **Múltiplos Modelos**: Suporte a GPT-4o, GPT-4o-mini, GPT-3.5-turbo, e modelos de reasoning O1
- **Configuração Avançada**: Controle temperatura, max tokens, e outros parâmetros
- **Status de Ativação**: Ative/desative agentes conforme necessário

### 🏢 Sistema de Workspaces
- **Organização por Workspace**: Organize agentes em diferentes espaços de trabalho
- **Gestão de Equipes**: Múltiplos usuários podem colaborar em workspaces
- **Controle de Acesso**: Sistema de proprietários e membros

### 🧠 RAG (Retrieval-Augmented Generation)
- **Base de Conhecimento**: Adicione fontes de conhecimento aos agentes
- **Múltiplos Formatos**: Suporte a URLs, PDFs, DOC/DOCX, PPTX, YouTube, texto
- **Chunking Inteligente**: Estratégias semânticas, por parágrafo, frase ou recursiva
- **Busca Híbrida**: Combinação de busca por similaridade coseno, euclidiana e híbrida
- **Configurações Personalizáveis**: Ajuste chunk size, overlap, threshold de similaridade

### 💬 Interface de Chat Avançada
- **Chat em Tempo Real**: Converse com seus agentes através de interface moderna
- **Histórico Completo**: Todas as conversas são salvas e podem ser visualizadas
- **Métricas de Performance**: Tokens usados, tempo de execução por resposta
- **Copy/Paste**: Copie respostas facilmente

### 🎨 Widget Embeddável
- **Integração Externa**: Incorpore agentes em websites externos
- **API Pública**: Endpoint público para chat sem autenticação
- **Código de Embed**: Geração automática de código HTML/JavaScript

## 📋 Pré-requisitos

- Node.js v18+ 
- npm
- Conta Cloudflare (gratuita)
- OpenAI API Key
- Pinecone API Key (opcional, para RAG)

## ⚡ Instalação Rápida (5 minutos)

### 1. Clone e Instale Dependências
```bash
git clone <repository-url>
cd ai-agent-hub
npm install
```

### 2. Autenticação Cloudflare
```bash
# Login no Cloudflare
npx wrangler login
```
Isso abrirá o navegador para autenticação.

### 3. Criar e Configurar Banco D1
```bash
# Listar bancos existentes (opcional)
npx wrangler d1 list

# Se não existir, criar novo banco
npx wrangler d1 create ai-agent-hub-db
```

Anote o `database_id` retornado e edite `wrangler.jsonc` com esse ID.

### 4. Executar Migrações do Banco
```bash
# Migração 1: Schema inicial (workspaces, agents, etc.)
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/001_initial_schema.sql

# Migração 2: Sistema de conhecimento
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/002_knowledge_system.sql

# Migração 3: Chunks aprimorados (pode dar erro de coluna duplicada - normal)
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/003_enhanced_chunks.sql

# Migração 4: Configurações RAG
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/004_agent_rag_settings.sql

# Adicionar tabela de usuários
npx wrangler d1 execute ai-agent-hub-db --local --file=add_users_table.sql
```

### 5. Verificar Tabelas Criadas
```bash
npx wrangler d1 execute ai-agent-hub-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 6. Configurar API Keys

**⚠️ IMPORTANTE**: O Worker precisa de **Cloudflare Secrets**, não apenas o arquivo `.env`

**Opção 1 - Script Automático:**
```bash
npm run setup-secrets
```

**Opção 2 - Manual (se você já tem as keys no .env):**
```bash
# Configurar secrets do Cloudflare usando suas keys do .env
echo "sua-openai-key" | npx wrangler secret put OPENAI_API_KEY
echo "sua-pinecone-key" | npx wrangler secret put PINECONE_API_KEY
echo "sua-mineru-key" | npx wrangler secret put MINERU_API_KEY

# Verificar se foram configurados
npx wrangler secret list
```

**API Keys necessárias:**
- **OpenAI API Key** (obrigatória) - Para modelos GPT
- **Pinecone API Key** (obrigatória) - Para RAG/vector search  
- **MinerU API Key** (opcional) - Para processar PDFs/DOCs avançados

### 7. Executar Aplicação
```bash
# Rodar frontend + backend juntos
npm run dev:all
```

## 🌐 Acessar Aplicação

- **Frontend**: http://localhost:5173/
- **Backend API**: http://127.0.0.1:8787/

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Apenas frontend (porta 5173)
npm run dev:worker      # Apenas backend/worker (porta 8787)
npm run dev:all         # Frontend + backend juntos
npm run dev:setup       # Migrar + rodar tudo

# Banco de dados
npm run migrate         # Executar migrações
npm run db:reset        # Reset completo do banco
npm run db:backup       # Backup do banco

# Configuração
npm run setup-secrets   # Configurar API keys
npm run cf-typegen      # Gerar tipos Cloudflare

# Build e Deploy
npm run build           # Build para produção
npm run deploy          # Deploy para Cloudflare
npm run deploy:dry      # Test deploy (dry run)
npm run check           # Verificar TypeScript + build

# Utilitários
npm run lint            # Executar linter
npm run lint:fix        # Corrigir lint automaticamente
npm run type-check      # Verificar tipos TypeScript
npm run clean           # Limpar arquivos temporários
npm run fresh-start     # Clean + install + migrate + dev
```

## 🔧 Tecnologias Utilizadas

### Frontend
- **React 19** com TypeScript
- **Vite** para build e dev server
- **Tailwind CSS** para styling
- **React Router** para navegação
- **Lucide React** para ícones

### Backend
- **Hono** - Framework web ultra-rápido para edge computing
- **Cloudflare Workers** - Serverless compute
- **Cloudflare D1** - Database SQLite distribuído
- **TypeScript** com validação Zod

### IA e RAG
- **OpenAI API** - Modelos GPT-4, GPT-3.5, O1
- **Pinecone** - Vector database para RAG
- **Semantic Chunking** - Processamento inteligente de documentos
- **Embedding** com OpenAI text-embedding-ada-002

### Processamento de Documentos
- **PDF**: pdf-parse
- **Word**: mammoth (DOCX)
- **PowerPoint**: node-pptx
- **HTML**: node-html-parser
- **YouTube**: youtube-transcript

### 8. Testar Pipeline RAG
```bash
# Script de diagnóstico completo
node debug-rag-test.js
```

## 🆘 Resolução de Problemas

### Erro: "Pipeline RAG não funciona"
```bash
# 1. Verificar se secrets estão configurados
npx wrangler secret list

# 2. Deve mostrar pelo menos:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - PINECONE_INDEX_NAME
# - PINECONE_ENVIRONMENT

# 3. Se estão vazios, configure:
echo "sua-key" | npx wrangler secret put OPENAI_API_KEY
echo "sua-key" | npx wrangler secret put PINECONE_API_KEY

# 4. Testar pipeline
node debug-rag-test.js
```

### Erro: "no such table: workspaces"
```bash
# Execute todas as migrações na ordem:
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/001_initial_schema.sql
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/002_knowledge_system.sql
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/003_enhanced_chunks.sql
npx wrangler d1 execute ai-agent-hub-db --local --file=migrations/004_agent_rag_settings.sql
npx wrangler d1 execute ai-agent-hub-db --local --file=add_users_table.sql
```

### Erro: "connect ECONNREFUSED 127.0.0.1:8787"
```bash
# O backend não está rodando, execute:
npm run dev:worker
# ou
npm run dev:all
```

### Erro de Autenticação Cloudflare
```bash
# Re-fazer login
npx wrangler logout
npx wrangler login
```

### Erro de API Keys
```bash
# Reconfigurar secrets
npm run setup-secrets
```

### Erro de Build
```bash
npm run type-check
npm run lint:fix
npm run clean && npm install
```

### Ver Logs do Worker
```bash
npx wrangler tail
```

## 📋 Checklist Pós-Instalação

- [ ] Node.js v18+ instalado
- [ ] Cloudflare account criado
- [ ] Wrangler CLI autenticado
- [ ] Database D1 criado e configurado
- [ ] Todas as migrações executadas (10 tabelas criadas)
- [ ] API keys configuradas (OpenAI obrigatória)
- [ ] Frontend + Backend rodando sem erros
- [ ] Login/signup funcionando
- [ ] Criação de workspace funcionando
- [ ] Criação de agente funcionando
- [ ] Chat básico funcionando

## 🔗 Links Importantes

- [OpenAI Platform](https://platform.openai.com) - Para obter API key
- [Pinecone Console](https://app.pinecone.io) - Para RAG (opcional)
- [Cloudflare Dashboard](https://dash.cloudflare.com) - Gerenciar recursos
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/) - CLI documentation

## 📚 Documentação Adicional

- [SETUP.md](SETUP.md) - Guia de setup detalhado
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) - Configuração Cloudflare específica

## 🏗️ Arquitetura

```
├── src/
│   ├── react-app/          # Frontend React
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   └── utils/          # Utilitários frontend
│   ├── worker/             # Backend Cloudflare Worker
│   │   ├── index.ts        # API routes com Hono
│   │   ├── pinecone-*.ts   # Sistema RAG
│   │   └── types.d.ts      # Tipos do worker
│   └── shared/             # Tipos compartilhados
├── migrations/             # Schema do banco
├── scripts/                # Scripts de setup/deploy
└── public/                 # Assets estáticos
```

Este projeto utiliza uma arquitetura serverless moderna com edge computing para máxima performance e escalabilidade.
