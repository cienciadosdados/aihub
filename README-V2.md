# AI Agent Hub v2.0 - Plataforma Completa para Agentes IA 🤖

## 🌟 O que é o AI Agent Hub?

O **AI Agent Hub** é uma plataforma completa para criar, gerenciar e incorporar agentes de inteligência artificial personalizados em qualquer site. Com suporte avançado a RAG (Retrieval-Augmented Generation), você pode treinar seus agentes com documentos específicos e oferecer experiências conversacionais inteligentes.

### 🎯 Principais Funcionalidades

- **🤖 Agentes IA Personalizados** - Crie quantos agentes quiser, cada um especializado em um domínio
- **🧠 Sistema RAG Avançado** - Treine agentes com PDFs, Word, PowerPoint, URLs, YouTube
- **🎨 Widget Embeddável** - Incorpore agentes em qualquer site com 1 linha de código
- **🏢 Workspaces Organizados** - Gerencie múltiplos projetos e equipes
- **⚡ Edge Computing** - Latência baixíssima com Cloudflare Workers
- **🔒 Segurança Enterprise** - API keys criptografadas e controle de acesso
- **📱 100% Responsivo** - Funciona perfeitamente em desktop e mobile

---

## 🏗️ Stack Tecnológica

### Frontend
- **React 19** com TypeScript
- **Vite** para build e desenvolvimento  
- **Tailwind CSS** para styling
- **React Router v7** para navegação
- **Lucide React** para ícones

### Backend  
- **Hono** - Framework web ultra-rápido para edge computing
- **Cloudflare Workers** - Runtime serverless global
- **Cloudflare D1** - Database SQLite distribuído
- **TypeScript** com validação Zod

### Inteligência Artificial
- **OpenAI API** - GPT-4o, GPT-3.5-turbo, modelos O1
- **Pinecone** - Vector database para RAG
- **Semantic Chunking** - Processamento inteligente de documentos
- **Text Embeddings** - OpenAI text-embedding-ada-002

### Processamento de Documentos
- **PDF**: pdf-parse + MinerU API (avançado)
- **Word**: mammoth (DOCX)
- **PowerPoint**: node-pptx  
- **HTML**: node-html-parser
- **YouTube**: youtube-transcript
- **Cloudflare R2**: Storage para uploads

---

## 🚀 Instalação e Deploy Completo

### 📋 Pré-requisitos

- **Node.js v18+**
- **npm** 
- **Conta Cloudflare** (gratuita)
- **OpenAI API Key** ([obter aqui](https://platform.openai.com/account/api-keys))
- **Pinecone API Key** ([obter aqui](https://app.pinecone.io)) - opcional para RAG

### ⚡ Deploy Rápido (15 minutos)

#### 1️⃣ **Clone e Instale**
```bash
git clone <url-do-repositorio>
cd ai-agent-hub
npm install
```

#### 2️⃣ **Autenticação Cloudflare**
```bash
# Login no Cloudflare (abrirá o navegador)
npx wrangler login

# Verificar se está logado
npx wrangler whoami
```

#### 3️⃣ **Criar e Configurar Banco D1**
```bash
# Listar bancos existentes
npx wrangler d1 list

# Criar novo banco (se não existir)
npx wrangler d1 create ai-agent-hub-db
```

**⚠️ IMPORTANTE**: Anote o `database_id` retornado e verifique se está correto no `wrangler.jsonc`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-agent-hub-db", 
      "database_id": "SEU-DATABASE-ID-AQUI"
    }
  ]
}
```

#### 4️⃣ **Executar Migrações do Banco**

**⚠️ CRÍTICO**: Execute no banco de **PRODUÇÃO** (flag `--remote`)

```bash
# Schema completo (cria todas as tabelas)
npx wrangler d1 execute ai-agent-hub-db --remote --file=SCHEMA_COMPLETO.sql

# Verificar se criou corretamente (deve mostrar ~9 tabelas)
npx wrangler d1 execute ai-agent-hub-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Tabelas esperadas:**
- ✅ workspaces
- ✅ workspace_members  
- ✅ agents
- ✅ agent_executions
- ✅ knowledge_sources
- ✅ document_chunks
- ✅ agent_knowledge_settings
- ✅ users
- ✅ _cf_KV, sqlite_sequence (sistema)

#### 5️⃣ **Configurar API Keys**

**Método 1 - Dashboard Cloudflare (RECOMENDADO):**

1. **Acesse**: https://dash.cloudflare.com
2. **Navegue**: Workers & Pages (menu lateral esquerdo)
3. **Clique**: No seu worker (ex: `ai-agent-hub`)
4. **Vá na aba**: **Settings** (no topo)
5. **Role até**: **Environment variables** 
6. **Para cada secret** (clique **"Add variable"**):
   
   **🔐 OPENAI_API_KEY (OBRIGATÓRIA)**
   - Variable name: `OPENAI_API_KEY`
   - Value: `sk-proj-sua-chave-aqui...`
   - ⚠️ **IMPORTANTE**: Marque **"Encrypt"** (tipo Secret)
   - Clique **"Save"**
   
   **🔐 PINECONE_API_KEY (OBRIGATÓRIA para RAG)**
   - Variable name: `PINECONE_API_KEY`  
   - Value: `pcsk_sua-chave-aqui...`
   - ⚠️ **IMPORTANTE**: Marque **"Encrypt"** (tipo Secret)
   - Clique **"Save"**
   
   **🔐 PINECONE_INDEX_NAME (OBRIGATÓRIA para RAG)**
   - Variable name: `PINECONE_INDEX_NAME`
   - Value: `nome-do-seu-indice` (ex: `mocha-rag`)
   - ⚠️ **IMPORTANTE**: Marque **"Encrypt"** (tipo Secret)
   - Clique **"Save"**

7. **Deploy**: Clique **"Save and deploy"** no final

**❌ ERRO COMUM**: NÃO deixe como "Plaintext" - sempre marque **"Encrypt"**

**Método 2 - Via CLI:**
```bash
# OpenAI (OBRIGATÓRIA)
npx wrangler secret put OPENAI_API_KEY
# Cole sua key quando solicitado

# Pinecone (OBRIGATÓRIA para RAG)  
npx wrangler secret put PINECONE_API_KEY
npx wrangler secret put PINECONE_INDEX_NAME
```

#### 6️⃣ **Deploy da Aplicação**
```bash
# Build + Deploy
npm run deploy
```

Se for a primeira vez, será pedido para registrar um subdomínio `workers.dev`:
- Digite um nome (ex: `minha-empresa-ai`)
- Confirme
- Anote a URL gerada: `https://xxxxx.minha-empresa-ai.workers.dev`

#### 7️⃣ **Testar a Aplicação**

**Acesse sua URL** e teste:
1. ✅ Criar conta (signup)
2. ✅ Fazer login
3. ✅ Criar workspace  
4. ✅ Criar agente
5. ✅ Testar chat com agente

---

## 🎨 Como Embedar Agentes em Sites

### 📝 Código do Widget

Depois de criar um agente no dashboard, use este código em qualquer site:

```html
<!-- AI Agent Widget -->
<div id="ai-agent-widget-1"></div>
<script>
  (function() {
    var widget = document.createElement('iframe');
    widget.src = 'https://SUA-URL.workers.dev/widget?agentId=1&theme=light&position=bottom-right&primaryColor=8b5cf6&size=medium&showName=true&showAvatar=true&welcome=Olá!+Como+posso+ajudar?&placeholder=Digite+sua+mensagem...&height=500px&width=380px';
    widget.style.border = 'none';
    widget.style.position = 'fixed';
    widget.style.zIndex = '9999';
    widget.style.borderRadius = '12px';
    widget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
    widget.style.bottom = '20px';
    widget.style.right = '20px';
    widget.style.width = '380px';
    widget.style.height = '500px';
    
    // Responsivo
    if (window.innerWidth < 768) {
      widget.style.width = '95vw';
      widget.style.height = '75vh';
      widget.style.bottom = '10px';
      widget.style.right = '2.5vw';
      widget.style.left = '2.5vw';
    }
    
    document.getElementById('ai-agent-widget-1').appendChild(widget);
  })();
</script>
```

### 🎛️ Parâmetros de Customização

| Parâmetro | Descrição | Valores |
|-----------|-----------|---------|
| `agentId` | ID do agente | Número do agente |
| `theme` | Tema visual | `light`, `dark` |
| `position` | Posição na tela | `bottom-right`, `bottom-left` |
| `primaryColor` | Cor principal | Código hex (ex: `8b5cf6`) |
| `size` | Tamanho | `small`, `medium`, `large` |
| `showName` | Mostrar nome | `true`, `false` |
| `showAvatar` | Mostrar avatar | `true`, `false` |
| `welcome` | Mensagem inicial | Texto URL encoded |
| `placeholder` | Placeholder input | Texto URL encoded |
| `width` | Largura custom | Ex: `350px` |
| `height` | Altura custom | Ex: `400px` |

---

## 📚 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Apenas frontend (porta 5173)
npm run dev:worker       # Apenas backend (porta 8787)  
npm run dev:all          # Frontend + backend
npm run dev:setup        # Migrar + rodar tudo

# Banco de dados
npm run migrate          # Executar migrações
npm run db:reset         # Reset completo do banco
npm run db:backup        # Backup do banco

# Configuração  
npm run setup-secrets    # Script automático para secrets
npm run cf-typegen       # Gerar tipos Cloudflare

# Build e Deploy
npm run build           # Build para produção
npm run deploy          # Deploy para Cloudflare
npm run deploy:dry      # Test deploy (dry run)
npm run check           # Verificar TypeScript + build

# Utilitários
npm run lint            # ESLint
npm run lint:fix        # Corrigir lint
npm run type-check      # Verificar tipos
npm run clean           # Limpar temporários  
npm run fresh-start     # Clean + install + migrate + dev
```

---

## 🔧 Configuração de API Keys

### OpenAI API Key (Obrigatória)

1. **Criar conta**: https://platform.openai.com
2. **Gerar API key**: Account → API Keys → Create new key
3. **Formato**: `sk-proj-...` (começa com sk-proj ou sk-)
4. **Configurar**: Via dashboard Cloudflare ou `wrangler secret put`

### Pinecone (Para RAG)

1. **Criar conta**: https://app.pinecone.io  
2. **Criar índice**:
   - Nome: `meu-projeto-rag`
   - Dimensões: `1536` (OpenAI embeddings)
   - Métrica: `cosine`
3. **Pegar API key**: API Keys → Create key
4. **Configurar**: `PINECONE_API_KEY` e `PINECONE_INDEX_NAME`

### MinerU (Opcional - Processamento Avançado)

1. **Criar conta**: https://api.mineru.ai
2. **Pegar token**: Account → API Keys
3. **Configurar**: `MINERU_API_KEY`

---

## 🛠️ Resolução de Problemas

### ❌ "Error 401: You didn't provide an API key"

**Causa**: API keys não configuradas nos secrets do Cloudflare

**Solução**:
```bash
# Verificar secrets
npx wrangler secret list

# Se estiverem vazios, reconfigurar
npx wrangler secret put OPENAI_API_KEY
# Cole sua key quando pedir
```

### ❌ "no such table: workspaces"

**Causa**: Migrações não executadas no banco de produção

**Solução**:
```bash
# Executar no banco REMOTO (não local)
npx wrangler d1 execute ai-agent-hub-db --remote --file=SCHEMA_COMPLETO.sql
```

### ❌ "connect ECONNREFUSED 127.0.0.1:8787"  

**Causa**: Backend não está rodando

**Solução**:
```bash
npm run dev:worker
# ou
npm run dev:all
```

### ❌ Widget não carrega ou mostra erro 404

**Causa**: Agente não existe ou está inativo

**Solução**:
1. Acesse o dashboard
2. Verifique se o agente ID existe
3. Certifique que está marcado como "ativo"
4. Teste o endpoint: `https://sua-url/api/widget/agents/ID`

### ❌ "Binding name already in use" ao configurar secrets

**Causa**: Secret existe mas está vazio

**Solução**:  
```bash
# Deletar e recriar
npx wrangler secret delete NOME_SECRET
npx wrangler secret put NOME_SECRET
```

**OU usar o dashboard Cloudflare (mais fácil)**

---

## 📊 Arquitetura do Projeto

```
ai-agent-hub/
├── src/
│   ├── react-app/              # Frontend React
│   │   ├── components/         # Componentes UI
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── hooks/             # Hooks customizados
│   │   └── utils/             # Utilitários frontend
│   ├── worker/                # Backend Cloudflare Worker
│   │   ├── index.ts           # API routes (Hono)
│   │   ├── pinecone-rag.ts    # Sistema RAG
│   │   ├── semantic-chunker.ts # Processamento docs
│   │   └── types.d.ts         # Tipos TypeScript
│   └── shared/                # Tipos compartilhados
├── migrations/                # Schema do banco
├── scripts/                   # Scripts de setup
├── public/                    # Assets estáticos
├── wrangler.jsonc            # Configuração Cloudflare
├── SCHEMA_COMPLETO.sql       # Migração completa
└── README-V2.md              # Este arquivo
```

---

## 🔗 URLs e Documentação

### Links Importantes
- **OpenAI Platform**: https://platform.openai.com
- **Pinecone Console**: https://app.pinecone.io  
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/

### Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/signup` | POST | Criar conta |
| `/api/auth/login` | POST | Fazer login |
| `/api/workspaces` | GET/POST | Listar/criar workspaces |
| `/api/workspaces/:id/agents` | GET/POST | Listar/criar agentes |
| `/api/agents/:id/execute` | POST | Executar agente (chat) |
| `/api/agents/:id/knowledge-sources` | GET/POST | Gerenciar conhecimento |
| `/api/widget/agents/:id` | GET | Info do agente (público) |
| `/api/widget/agents/:id/chat` | POST | Chat via widget (público) |

---

## 💡 Casos de Uso

### 🏪 E-commerce
```javascript
// Agente de vendas especializado
const salesPrompt = `
Você é um assistente de vendas expert em eletrônicos. 
Ajude os clientes a encontrar o produto ideal, 
explique especificações técnicas e ofereça as melhores ofertas.
`;
```

### 🏥 Saúde
```javascript
// Agente para agendamentos médicos  
const healthPrompt = `
Você é um assistente de agendamentos médicos.
Ajude os pacientes a agendar consultas, esclareça dúvidas sobre 
procedimentos e forneça informações sobre preparo de exames.
`;
```

### 📚 Educação
```javascript
// Tutor de matemática
const tutorPrompt = `
Você é um tutor especializado em matemática do ensino médio.
Explique conceitos de forma didática, resolva exercícios passo a passo
e adapte a linguagem ao nível do estudante.
`;
```

---

## 🚀 Funcionalidades Avançadas

### Sistema RAG Completo
- **📄 Múltiplos formatos**: PDF, Word, PowerPoint, HTML, YouTube
- **🧩 Chunking inteligente**: Semântico, recursivo, por parágrafo  
- **🔍 Busca híbrida**: Combinação de similaridade e keywords
- **⚙️ Configurável**: Chunk size, overlap, threshold por agente
- **📊 Analytics**: Estatísticas de performance do RAG

### Workspaces e Colaboração
- **👥 Múltiplos usuários**: Proprietários e membros
- **🏢 Organização**: Workspaces isolados por projeto/cliente
- **🔒 Controle de acesso**: Permissões granulares
- **📈 Métricas**: Uso por workspace e agente

### Widget Customizável  
- **🎨 Totalmente personalizável**: Cores, temas, mensagens
- **📱 100% responsivo**: Adapta-se a qualquer tela
- **⚡ Performance**: Carregamento assíncrono
- **🔗 Múltiplos sites**: Um agente em vários domínios

---

## 📈 Escalabilidade e Performance

### Edge Computing Global
- **🌍 Latência baixíssima**: < 100ms em qualquer lugar do mundo
- **⚡ Auto-scaling**: Escala automaticamente conforme demanda  
- **💰 Custo-efetivo**: Pay-per-use, gratuito até 100k requests/dia
- **🛡️ Altamente disponível**: 99.9% uptime garantido

### Otimizações Implementadas
- **📦 Code splitting**: Carregamento otimizado do frontend
- **🗜️ Compressão**: Assets minificados e comprimidos
- **🔄 Caching**: Cache inteligente para respostas frequentes
- **📊 Monitoring**: Observabilidade completa via Cloudflare

---

## 🎓 Para Desenvolvedores

### Desenvolvimento Local
```bash
# Setup inicial
npm install
npm run dev:setup

# URLs locais  
# Frontend: http://localhost:5173
# Backend:  http://localhost:8787
```

### Estrutura de Dados

**Workspaces**
```sql
CREATE TABLE workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Agents**
```sql  
CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT 1,
  enable_rag BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Personalização

**Adicionando novos modelos IA:**
```typescript
// Em src/worker/index.ts
const supportedModels = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-3.5-turbo',
  'o1-preview',
  'o1-mini'
  // Adicione novos modelos aqui
];
```

**Novos tipos de documentos:**
```typescript  
// Em src/worker/index.ts
const supportedTypes = [
  'url', 'pdf', 'doc', 'docx', 'pptx', 
  'youtube', 'text'
  // Adicione novos tipos aqui
];
```

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)  
5. Abra um Pull Request

---

## 🆘 Suporte

**Encontrou um problema?**
1. Verifique a seção [🛠️ Resolução de Problemas](#%EF%B8%8F-resolução-de-problemas)
2. Procure em issues existentes
3. Abra um novo issue com detalhes completos

**Precisa de ajuda com deploy?**
- Siga o guia passo a passo acima
- Verifique se todos os pré-requisitos estão atendidos
- Confirme que as API keys estão configuradas corretamente

---

<div align="center">

**🚀 AI Agent Hub v2.0**

*Plataforma completa para criar e gerenciar agentes de IA*

**Desenvolvido com ❤️ usando tecnologias de ponta**

*Edge Computing | Serverless | TypeScript | React | AI*

</div>