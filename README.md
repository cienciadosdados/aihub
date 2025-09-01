# AI Agent Hub - Build Intelligent AI Agents

Uma plataforma completa para criar, gerenciar e interagir com agentes de inteligência artificial personalizados com suporte a RAG (Retrieval-Augmented Generation).

## 🎯 Para Alunos - Setup Rápido

Este repositório está preparado para você clonar e configurar rapidamente. Siga os passos abaixo para ter o sistema funcionando em poucos minutos.

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

## ⚡ Setup Rápido (5 minutos)

### 1. Clone e Instale Dependências
```bash
git clone https://github.com/cienciadosdados/aihub.git
cd aihub
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas API keys:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
# OpenAI (obrigatória)
OPENAI_API_KEY=sk-your-openai-key-here

# Pinecone (obrigatória para RAG)
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_INDEX_NAME=your-index-name
PINECONE_ENVIRONMENT=your-environment

# MinerU (opcional - para PDFs avançados)
MINERU_API_KEY=your-mineru-key-here
```

### 3. Autenticação Cloudflare
```bash
npx wrangler login
```
Isso abrirá o navegador para autenticação com sua conta Cloudflare.

### 4. Configurar Features do Cloudflare

#### 4.1. Banco D1 (Database)
```bash
# Criar banco D1 (anote o database_id retornado)
npx wrangler d1 create ai-agent-hub-db
```

**IMPORTANTE**: Copie o `database_id` retornado e edite o arquivo `wrangler.jsonc`:
```json
{
  "name": "ai-agent-hub",
  "main": "src/worker/index.ts",
  "compatibility_date": "2024-11-21",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ai-agent-hub-db",
      "database_id": "cole-aqui-o-id-retornado"
    }
  ]
}
```

#### 4.2. Queue (Processamento RAG)
```bash
# Criar queue para processamento RAG
npx wrangler queues create rag-processing
```

#### 4.3. Executar Migrações do Banco
```bash
npm run migrate
```
Isso criará todas as tabelas: workspaces, agents, users, knowledge_sources, chunks, conversations, etc.

### 5. Configurar Secrets (API Keys)
```bash
# Script automático que lê suas keys do arquivo .env
npm run setup-secrets
```

**Ou configure manualmente:**
```bash
echo "sua-openai-key" | npx wrangler secret put OPENAI_API_KEY
echo "sua-pinecone-key" | npx wrangler secret put PINECONE_API_KEY
echo "seu-index-name" | npx wrangler secret put PINECONE_INDEX_NAME
echo "seu-environment" | npx wrangler secret put PINECONE_ENVIRONMENT
```

### 6. Executar Aplicação

**Desenvolvimento Local:**
```bash
npm run dev:all
```
- Frontend: http://localhost:5173/
- Backend: http://127.0.0.1:8787/

**Deploy para Produção:**
```bash
npm run deploy
```
- URL de Produção: `https://seu-worker-name.workers.dev`

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev:all         # Frontend + backend juntos (recomendado)
npm run dev             # Apenas frontend (porta 5173)
npm run dev:worker      # Apenas backend/worker (porta 8787)

# Configuração
npm run migrate         # Executar migrações do banco
npm run setup-secrets   # Configurar API keys no Cloudflare

# Build e Deploy
npm run build           # Build para produção
npm run deploy          # Deploy para Cloudflare

# Utilitários
npm run type-check      # Verificar tipos TypeScript
npm run lint:fix        # Corrigir lint automaticamente
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

## 🆘 Resolução de Problemas

### Erro: "no such table: workspaces"
```bash
npm run migrate
```

### Erro: "connect ECONNREFUSED 127.0.0.1:8787"
```bash
npm run dev:all
```

### Erro de API Keys
```bash
# Verificar se secrets estão configurados
npx wrangler secret list

# Reconfigurar se necessário
npm run setup-secrets
```

### Erro de Autenticação Cloudflare
```bash
npx wrangler logout
npx wrangler login
```

## 📋 Checklist Pós-Setup

- [ ] Node.js v18+ instalado
- [ ] Repositório clonado e dependências instaladas
- [ ] Arquivo `.env` configurado com API keys
- [ ] Cloudflare autenticado (`wrangler login`)
- [ ] Database D1 criado e migrações executadas
- [ ] Secrets configurados no Cloudflare
- [ ] Aplicação rodando sem erros (`npm run dev:all`)

## 🔗 Links Importantes

- [OpenAI Platform](https://platform.openai.com) - Para obter API key
- [Pinecone Console](https://app.pinecone.io) - Para RAG
- [Cloudflare Dashboard](https://dash.cloudflare.com) - Gerenciar recursos

## 🏗️ Arquitetura do Sistema

### Fluxograma Geral do AI Hub

```mermaid
flowchart TD
    A[👤 Usuário] --> B[🌐 Cloudflare Worker<br/>workers.dev]
    
    B --> C{🎯 Tipo de Operação}
    
    C -->|Gerenciamento| D[📊 Database D1]
    C -->|Chat/IA| E[🤖 OpenAI API]
    C -->|RAG/Conhecimento| F[📚 Sistema RAG]
    C -->|Observabilidade| OBS[📈 Analytics]
    
    D --> G[(🗄️ Workspaces<br/>Agents<br/>Users<br/>Conversations)]
    
    E --> H[💬 Resposta IA]
    
    F --> I[📄 Processamento<br/>Documentos]
    F --> J[🧠 Pinecone<br/>Vector DB]
    F --> K[⚡ Queue<br/>Processing]
    
    I --> L{📋 Tipo Documento}
    L -->|PDF| M[📑 unpdf]
    L -->|DOCX| N[📝 mammoth]
    L -->|URL| O[🌍 HTML Parser]
    L -->|YouTube| P[🎥 Transcript]
    
    M --> Q[✂️ Semantic Chunking]
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[🔢 OpenAI Embeddings]
    R --> J
    
    J --> S[🔍 Similarity Search]
    S --> E
    
    OBS --> T[📊 Métricas Performance<br/>Uso/Erros/Tokens]
    T --> G
    E --> U[📈 Coleta Dados<br/>Tempo/Status]
    U --> G
    
    H --> B
    
    %% Estilo para tema claro
    style A fill:#e6f7ff,stroke:#0066cc,stroke-width:3px,color:#003d7a
    style B fill:#e8f5e8,stroke:#2e7d32,stroke-width:4px,color:#1b5e20
    style C fill:#fff9e6,stroke:#cc8800,stroke-width:3px,color:#996600
    style D fill:#e6ffe6,stroke:#00aa00,stroke-width:3px,color:#006600
    style E fill:#ffe6f0,stroke:#cc0044,stroke-width:3px,color:#990033
    style F fill:#fff2e6,stroke:#cc6600,stroke-width:3px,color:#994d00
    style G fill:#e6ffe6,stroke:#00cc66,stroke-width:2px,color:#008844
    style H fill:#ffe6f0,stroke:#cc4466,stroke-width:2px,color:#994455
    style I fill:#fff2e6,stroke:#cc9900,stroke-width:2px,color:#997700
    style J fill:#f0e6ff,stroke:#aa0066,stroke-width:3px,color:#770044
    style K fill:#e6ffff,stroke:#0099aa,stroke-width:2px,color:#007788
    style L fill:#f5ffe6,stroke:#88cc00,stroke-width:2px,color:#669900
    style M fill:#e6f0ff,stroke:#3366cc,stroke-width:2px,color:#224499
    style N fill:#e6f0ff,stroke:#3366cc,stroke-width:2px,color:#224499
    style O fill:#e6f0ff,stroke:#3366cc,stroke-width:2px,color:#224499
    style P fill:#e6f0ff,stroke:#3366cc,stroke-width:2px,color:#224499
    style Q fill:#ffe6f2,stroke:#cc5500,stroke-width:2px,color:#994400
    style R fill:#e6f5ff,stroke:#0088cc,stroke-width:2px,color:#006699
    style S fill:#f2e6ff,stroke:#8800cc,stroke-width:2px,color:#660099
    style OBS fill:#fff0e6,stroke:#cc7700,stroke-width:3px,color:#995500
    style T fill:#f0fff0,stroke:#00bb00,stroke-width:2px,color:#008800
    style U fill:#f5f0ff,stroke:#9955cc,stroke-width:2px,color:#773399
```

### Estrutura de Arquivos

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

### Stack Técnica e Integrações

```mermaid
flowchart LR
    subgraph Development [Desenvolvimento Local]
        A[React App - localhost:5173]
        B[Worker - localhost:8787]
    end
    
    subgraph Production [Produção Cloudflare]
        P[Worker + Frontend - workers.dev]
        C[(D1 Database)]
        D[Queue Processing]
        E[Secrets Manager]
    end
    
    subgraph External_APIs [External APIs]
        F[OpenAI - GPT + Embeddings]
        G[Pinecone - Vector Search]
    end
    
    %% Desenvolvimento
    A -->|Dev API Calls| B
    
    %% Deploy
    B -.->|npm run deploy| P
    
    %% Produção
    P -->|Store Data| C
    P -->|Get API Keys| E
    P -->|Chat Request| F
    P -->|Generate Embeddings| F
    P -->|Store/Search Vectors| G
    P -->|Queue Jobs| D
    
    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style B fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style P fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    style C fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#fafafa,stroke:#424242,stroke-width:2px
    style F fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style G fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

## 🚀 Deploy para Produção

### Processo de Deploy
```bash
# 1. Build da aplicação
npm run build

# 2. Deploy para Cloudflare Workers
npm run deploy
```

### Arquitetura de Produção
- **Frontend + Backend**: Servidos pelo mesmo Cloudflare Worker
- **URL única**: `https://seu-worker-name.workers.dev`
- **Edge Computing**: Distribuído globalmente pela rede Cloudflare
- **Serverless**: Zero configuração de servidor

### Detalhes das Integrações

| Ambiente | Frontend | Backend | Database |
|----------|----------|---------|----------|
| **Desenvolvimento** | localhost:5173 | localhost:8787 | D1 Local |
| **Produção** | workers.dev | workers.dev | D1 Distribuído |

| Serviço | Função | Comunicação |
|---------|--------|-------------|
| **Cloudflare Worker** | Frontend + API Backend | Serve tudo em uma URL |
| **D1 Database** | Dados estruturados | SQL queries diretas do Worker |
| **OpenAI API** | IA e Embeddings | HTTPS requests com API key |
| **Pinecone** | Vector Database | REST API para busca semântica |
| **Queue Processing** | Jobs assíncronos | Processamento RAG em background |

## API REST - Explicação para Leigos

### Fluxo Sequencial Completo

```mermaid
sequenceDiagram
    participant U as 👤 Usuário
    participant F as 🌐 Frontend
    participant W as ☁️ Cloudflare Worker
    participant D as 🗄️ Database D1
    participant O as 🤖 OpenAI API
    participant P as 🧠 Pinecone
    
    Note over U,P: 1. Login/Autenticação
    U->>F: Clica "Entrar"
    F->>W: GET /api/auth/login
    W-->>F: URL de autenticação
    F-->>U: Redireciona para login
    U->>F: Faz login
    F->>W: POST /api/auth/callback
    W-->>F: Token de sessão
    F-->>U: "Logado com sucesso!"
    
    Note over U,P: 2. Criar Workspace
    U->>F: Preenche "Novo Workspace"
    F->>W: POST /api/workspaces
    W->>D: INSERT INTO workspaces
    D-->>W: Workspace salvo (ID: 1)
    W-->>F: {"id": 1, "name": "Meu Projeto"}
    F-->>U: "Workspace criado!"
    
    Note over U,P: 3. Criar Agente no Workspace
    U->>F: Preenche "Novo Agente" no workspace
    F->>W: POST /api/workspaces/1/agents
    W->>D: INSERT INTO agents (workspace_id=1)
    D-->>W: Agente salvo (ID: 123)
    W-->>F: {"id": 123, "name": "Assistente"}
    F-->>U: "Agente criado com sucesso!"
    
    Note over U,P: 4. Upload de Documento (RAG)
    U->>F: Faz upload de PDF no agente
    F->>W: POST /api/agents/123/knowledge/upload
    W->>W: Processa PDF (unpdf)
    W->>O: Gera embeddings
    O-->>W: Vetores do documento
    W->>P: Armazena vetores
    P-->>W: Documento indexado
    W->>D: Salva metadados
    W-->>F: "Documento processado!"
    F-->>U: "PDF adicionado ao conhecimento"
    
    Note over U,P: 5. Chat com IA + RAG
    U->>F: Digita: "Como fazer deploy?"
    F->>W: POST /api/agents/123/execute
    W->>P: Busca contexto relevante
    P-->>W: Trechos sobre deploy
    W->>O: Pergunta + contexto → GPT
    O-->>W: Resposta inteligente
    W-->>F: "Para fazer deploy use: npm run deploy..."
    F-->>U: Mostra resposta na tela
```

### Componentes do Sistema com Cores

```mermaid
graph TB
    subgraph "🟨 ENDPOINTS - API REST"
        E1[POST /api/auth/login<br/>🔐 Fazer Login]
        E2[POST /api/workspaces<br/>📁 Criar Workspace]
        E3[POST /api/workspaces/:id/agents<br/>🤖 Criar Agente]
        E4[POST /api/agents/:id/knowledge/upload<br/>📄 Upload Documento]
        E5[POST /api/agents/:id/execute<br/>💬 Chat com IA]
    end
    
    subgraph "🔵 BANCO DE DADOS"
        DB1[(workspaces<br/>📊 Espaços de trabalho)]
        DB2[(agents<br/>🤖 Agentes IA)]
        DB3[(knowledge_sources<br/>📚 Documentos)]
        DB4[(conversations<br/>💭 Histórico chat)]
    end
    
    subgraph "🟢 PROCESSAMENTO"
        P1[🔄 Queue Processing<br/>Jobs assíncronos]
        P2[✂️ Document Chunking<br/>Divisão em pedaços]
        P3[🧠 Embeddings<br/>Vetorização texto]
    end
    
    subgraph "🟣 SERVIÇOS EXTERNOS"
        S1[🤖 OpenAI API<br/>GPT-4o + Embeddings]
        S2[🔍 Pinecone<br/>Busca vetorial]
        S3[📑 unpdf/mammoth<br/>Parsers documentos]
    end
    
    %% Conexões dos Endpoints
    E1 --> DB1
    E2 --> DB1
    E3 --> DB2
    E4 --> DB3
    E5 --> DB4
    
    %% Fluxo de Processamento
    E4 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> S1
    S1 --> S2
    
    %% Chat Flow
    E5 --> S2
    S2 --> S1
    
    %% Document Processing
    E4 --> S3
    S3 --> P2
    
    %% Styling
    classDef endpoints fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    classDef database fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    classDef processing fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    classDef external fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    
    class E1,E2,E3,E4,E5 endpoints
    class DB1,DB2,DB3,DB4 database
    class P1,P2,P3 processing
    class S1,S2,S3 external
```

### Arquitetura Geral do Sistema

```mermaid
flowchart TD
    A[👤 Usuário] --> B[🌐 Cloudflare Worker<br/>workers.dev]

    B --> C{🎯 Tipo de Operação}

    C -->|Gerenciamento| D[📊 Database D1]
    C -->|Chat/IA| E[🤖 OpenAI API]
    C -->|RAG/Conhecimento| F[📚 Sistema RAG]
    C -->|Observabilidade| OBS[📈 Analytics]

    D --> G[(🗄️ Workspaces<br/>Agents<br/>Users<br/>Conversations)]

    E --> H[💬 Resposta IA]
    E --> METRICS[📊 Coleta Métricas<br/>Tempo/Tokens/Status]

    F --> I[📄 Processamento<br/>Documentos]
    F --> J[🧠 Pinecone<br/>Vector DB]
    F --> K[⚡ Queue<br/>Processing]

    I --> L{📋 Tipo Documento}
    L -->|PDF| M[📑 unpdf]
    L -->|DOCX| N[📝 mammoth]
    L -->|URL| O[🌍 HTML Parser]
    L -->|YouTube| P[🎥 Transcript]

    M --> Q[✂️ Semantic Chunking]
    N --> Q
    O --> Q
    P --> Q

    Q --> R[🔢 OpenAI Embeddings]
    R --> J

    J --> S[🔍 Similarity Search]
    S --> E

    OBS --> ANALYTICS_DB[📈 Queries Analytics<br/>Performance/Uso/Erros]
    ANALYTICS_DB --> G
    METRICS --> G

    H --> B
    
    style A fill:#e6f7ff,stroke:#0066cc,stroke-width:3px
    style B fill:#fff2cc,stroke:#d6b656,stroke-width:3px
    style C fill:#fff9e6,stroke:#cc8800,stroke-width:2px
    style D fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style E fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    style F fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style G fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    style H fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    style I fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style J fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    style K fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style L fill:#fff9e6,stroke:#cc8800,stroke-width:2px
    style M fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style N fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style O fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style P fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style Q fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    style R fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    style S fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
```

### Cloudflare Edge Computing - Computação na Borda

```mermaid
graph TB
    subgraph "🌍 USUÁRIOS GLOBAIS - Pessoas usando o sistema"
        U1[👤 Brasil São Paulo<br/>💭 'Quero usar o AI Hub']
        U2[👤 EUA Nova York<br/>💭 'Preciso de IA rápida']
        U3[👤 Europa Londres<br/>💭 'Vou fazer upload PDF']
        U4[👤 Ásia Tóquio<br/>💭 'Chat com meu agente']
    end
    
    subgraph "⚡ CLOUDFLARE EDGE - Servidores espalhados pelo mundo"
        E1[🌐 Servidor São Paulo<br/>📍 Fica no Brasil<br/>⚡ 5ms de você]
        E2[🌐 Servidor Nova York<br/>📍 Fica nos EUA<br/>⚡ 5ms de você]
        E3[🌐 Servidor Londres<br/>📍 Fica na Europa<br/>⚡ 5ms de você]
        E4[🌐 Servidor Tóquio<br/>📍 Fica na Ásia<br/>⚡ 5ms de você]
    end
    
    subgraph "🚀 NOSSO CÓDIGO AI HUB - Roda em todos os servidores"
        W[☁️ Nosso App Completo<br/>🔄 Cópia idêntica em cada servidor<br/>📝 Feito em JavaScript]
        
        subgraph "📦 O que nosso app faz"
            W1[🌐 Mostra as telas<br/>📱 Interface React<br/>🎨 Botões e formulários]
            W2[🔌 Processa pedidos<br/>⚙️ Recebe dados do usuário<br/>💾 Salva no banco]
            W3[🤖 Chama a IA<br/>🧠 Manda pergunta pro ChatGPT<br/>🔍 Busca documentos]
            W4[📊 Guarda dados<br/>💿 Banco SQLite<br/>📚 Workspaces e agentes]
        end
    end
    
    subgraph "🔗 CONEXÕES RÁPIDAS - Como os dados trafegam"
        C1[⚡ Chat em tempo real<br/>💬 WebSocket<br/>📞 Como ligação telefônica]
        C2[📡 Internet super rápida<br/>🚀 HTTP/3<br/>⚡ Mais rápido que HTTP normal]
        C3[🔒 Segurança máxima<br/>🛡️ TLS 1.3<br/>🔐 Dados criptografados]
    end
    
    %% Conexões dos usuários às bordas mais próximas
    U1 -.->|Internet te leva pro mais perto| E1
    U2 -.->|Internet te leva pro mais perto| E2
    U3 -.->|Internet te leva pro mais perto| E3
    U4 -.->|Internet te leva pro mais perto| E4
    
    %% Todas as bordas executam o mesmo Worker
    E1 -->|Executa nosso código| W
    E2 -->|Executa nosso código| W
    E3 -->|Executa nosso código| W
    E4 -->|Executa nosso código| W
    
    %% Worker capabilities
    W -->|Contém| W1
    W -->|Contém| W2
    W -->|Contém| W3
    W -->|Contém| W4
    
    %% Edge connections
    W -->|Usa| C1
    W -->|Usa| C2
    W -->|Usa| C3
    
    %% Styling
    classDef users fill:#e6f7ff,stroke:#0066cc,stroke-width:2px
    classDef edge fill:#fff2cc,stroke:#d6b656,stroke-width:3px
    classDef worker fill:#d5e8d4,stroke:#82b366,stroke-width:3px
    classDef capabilities fill:#f0f8ff,stroke:#4682b4,stroke-width:2px
    classDef connections fill:#ffeaa7,stroke:#fdcb6e,stroke-width:2px
    
    class U1,U2,U3,U4 users
    class E1,E2,E3,E4 edge
    class W worker
    class W1,W2,W3,W4 capabilities
    class C1,C2,C3 connections
```

#### 🎯 **O que é Edge Computing?**

**Edge Computing** significa executar código **na borda da internet**, ou seja, o mais próximo possível dos usuários finais, em vez de em servidores centralizados distantes.

#### ⚡ **Vantagens no Nosso Sistema:**

| Aspecto | Servidor Tradicional | Cloudflare Edge |
|---------|---------------------|-----------------|
| **Latência** | 100-500ms (distante) | 5-50ms (próximo) |
| **Disponibilidade** | 1 datacenter | 300+ locais globais |
| **Escalabilidade** | Manual, limitada | Automática, ilimitada |
| **Custo** | Alto (infraestrutura) | Baixo (pay-per-use) |
| **Manutenção** | Complexa | Zero (gerenciada) |

#### 🌐 **Como Funciona no AI Hub:**

1. **Deploy Global Automático**: 
   - Código enviado para **300+ datacenters Cloudflare** (não todos ativos)
   - **Ativação sob demanda**: Só "liga" quando alguém acessa daquela região
   - Usuário sempre conecta ao **mais próximo disponível**

2. **Distribuição Inteligente**:
   - **Não são 300 cópias simultâneas** rodando o tempo todo
   - **Ativação automática**: Quando usuário do Brasil acessa, ativa servidor SP
   - **Economia de recursos**: Só usa o que precisa

3. **Processamento Distribuído**:
   - **Frontend React** servido da borda ativa
   - **API Backend** executada na borda ativa  
   - **IA Processing** chamadas diretas para OpenAI/Pinecone

4. **Database D1 Replicado**:
   - **SQLite distribuído** em múltiplas regiões ativas
   - **Consistência eventual** entre bordas
   - **Reads locais**, **writes globais**

5. **Ativação Sob Demanda**:
   - Worker **"dorme"** em bordas sem uso
   - **Desperta instantaneamente** quando necessário (~0ms)
   - **Escala automaticamente** conforme demanda

#### 🚀 **Resultado Prático:**
- **Usuário no Brasil**: Conecta à borda de São Paulo (~5ms)
- **Usuário nos EUA**: Conecta à borda de Nova York (~5ms)  
- **Mesmo código**, **mesma funcionalidade**, **performance máxima** global!

### Frontend React - Estrutura Simplificada

```mermaid
flowchart LR
    subgraph "🛠️ DEV TOOLS"
        V[⚡ Vite<br/>Build rápido]
        TS[📝 TypeScript<br/>Tipagem segura]
        TW[🎨 Tailwind<br/>CSS utilitário]
    end
    
    subgraph "⚛️ REACT APP"
        APP[🏠 App.tsx<br/>Componente raiz]
    end
    
    subgraph "📱 PÁGINAS"
        P1[🔐 Login]
        P2[📊 Dashboard]
        P3[🏢 Workspace]
        P4[🤖 Agent]
    end
    
    subgraph "🧩 COMPONENTES"
        C1[💬 Chat Modal]
        C2[⚙️ Settings]
        C3[📄 Upload]
    end
    
    subgraph "🌐 BACKEND API"
        API[🔌 Cloudflare Worker<br/>REST Endpoints]
    end
    
    %% Fluxo principal simplificado
    V --> APP
    TS --> APP
    TW --> APP
    
    APP --> P1
    APP --> P2
    APP --> P3
    APP --> P4
    
    P2 --> C1
    P3 --> C2
    P4 --> C3
    
    P1 --> API
    P2 --> API
    P3 --> API
    P4 --> API
    
    %% Styling
    classDef tools fill:#fff2cc,stroke:#d6b656,stroke-width:2px
    classDef app fill:#e1f5fe,stroke:#0277bd,stroke-width:3px
    classDef pages fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef components fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef api fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class V,TS,TW tools
    class APP app
    class P1,P2,P3,P4 pages
    class C1,C2,C3 components
    class API api
```

#### 🎯 **Tecnologias Frontend:**

| Ferramenta | Função | Por que usamos |
|------------|--------|----------------|
| **Vite** | Build tool | ⚡ 10x mais rápido que Webpack |
| **React 19** | UI Framework | ⚛️ Componentes reutilizáveis |
| **TypeScript** | Linguagem | 🔒 Tipagem previne bugs |
| **Tailwind CSS** | Estilização | 🎨 Classes utilitárias rápidas |

#### 📱 **Estrutura de Páginas:**

- **Login/SignUp**: Autenticação com Mocha Users Service
- **Dashboard**: Lista workspaces do usuário
- **Workspace**: Gerencia agentes e configurações
- **Agent**: Interface de chat e configuração IA
- **Home**: Landing page e navegação

#### 🔄 **Fluxo de Desenvolvimento:**

1. **`npm run dev`** → Vite inicia servidor local (localhost:5173)
2. **Hot reload** → Mudanças aparecem instantaneamente
3. **TypeScript** → Verifica tipos em tempo real
4. **Tailwind** → Classes CSS aplicadas automaticamente
5. **Build** → `npm run build` gera arquivos otimizados

### Backend Cloudflare Worker - Estrutura Simplificada

```mermaid
flowchart LR
    subgraph "☁️ CLOUDFLARE WORKER"
        W[🚀 Worker Runtime<br/>V8 JavaScript Engine]
    end
    
    subgraph "🌐 FRAMEWORK - Como um garçom de restaurante"
        H["⚡ Hono<br/>📋 Recebe pedidos<br/>🚪 Direciona para cozinha certa<br/>🛡️ Verifica se cliente pode pedir"]
    end
    
    subgraph "🔐 AUTENTICAÇÃO"
        A1[🔑 Auth Middleware<br/>Verificação tokens]
        A2[👤 Custom Auth<br/>Desenvolvimento local]
    end
    
    subgraph "📊 BANCO DE DADOS"
        D1[💾 D1 Database<br/>SQLite distribuído]
        T1[📋 workspaces]
        T2[🤖 agents]
        T3[📚 knowledge_sources]
        T4[💭 conversations]
    end
    
    subgraph "⚡ PROCESSAMENTO"
        Q[📤 Queue RAG<br/>Jobs assíncronos]
        P[🧠 RAG Processor<br/>Pinecone + OpenAI]
        AN[📊 Analytics<br/>Métricas + Observabilidade]
    end
    
    subgraph "🌍 APIs EXTERNAS"
        OAI[🤖 OpenAI API<br/>GPT + Embeddings]
        PC[🔍 Pinecone<br/>Vector Search]
    end
    
    %% Fluxo principal
    W --> H
    H --> A1
    H --> A2
    
    H --> D1
    D1 --> T1
    D1 --> T2
    D1 --> T3
    D1 --> T4
    
    H --> Q
    Q --> P
    P --> OAI
    P --> PC
    
    H --> AN
    AN --> D1
    
    %% Styling
    classDef worker fill:#fff2cc,stroke:#d6b656,stroke-width:3px
    classDef framework fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef auth fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef database fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px
    classDef tables fill:#f0f8ff,stroke:#4682b4,stroke-width:1px
    classDef processing fill:#d5e8d4,stroke:#82b366,stroke-width:2px
    classDef external fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    
    class W worker
    class H framework
    class A1,A2 auth
    class D1 database
    class T1,T2,T3,T4 tables
    class Q,P processing
    class OAI,PC external
```

#### 🎯 **Tecnologias Backend Explicadas:**

| Ferramenta | O que é (para leigos) | Analogia |
|------------|----------------------|----------|
| **Cloudflare Worker** | 🏠 Casa onde o código mora | Como ter uma casa em 300 cidades |
| **Hono Framework** | 👨‍🍳 Garçom do restaurante | Recebe pedidos e leva pra cozinha certa |
| **D1 Database** | 📚 Arquivo gigante | Como uma gaveta de arquivos mágica |
| **Queue** | 📮 Caixa de correio | Tarefas pesadas ficam na fila |

#### 🔍 **Explicação Detalhada:**

**🌐 Web Framework (Hono):**
- **O que é**: Como um **garçom de restaurante**
- **Roteamento**: Quando você pede "pizza", ele sabe levar pra **cozinha italiana**
- **Middleware**: Antes de servir, ele **verifica se você pagou**
- **No nosso caso**: 
  - Pedido `/api/login` → Vai pra "cozinha" de autenticação
  - Pedido `/api/chat` → Vai pra "cozinha" de IA
  - Sempre verifica se você está logado antes

**🚪 Roteamento:**
- **Analogia**: Como **placas de trânsito** na internet
- **`/api/workspaces`** → Placa que diz "vá para seção workspaces"
- **`/api/agents/123/chat`** → Placa que diz "vá para agente 123, seção chat"
- **Nosso sistema**: Tem 20+ "placas" diferentes

**🛡️ Middleware:**
- **Analogia**: Como **segurança do shopping**
- **Antes de entrar**: Verifica se você tem pulseirinha (token)
- **Se não tem**: "Desculpe, precisa fazer login primeiro"
- **Se tem**: "Pode passar, bem-vindo!"
- **Nosso sistema**: Toda rota protegida passa pelo "segurança"

#### 📋 **Estrutura de Endpoints:**

- **Auth**: `/api/auth/*` - Login, signup, callback
- **Workspaces**: `/api/workspaces` - CRUD espaços de trabalho
- **Agents**: `/api/workspaces/:id/agents` - CRUD agentes IA
- **Knowledge**: `/api/agents/:id/knowledge/*` - Upload e RAG
- **Chat**: `/api/agents/:id/execute` - Conversas com IA

#### 🔄 **Fluxo de Processamento:**

1. **Request** → Worker recebe via Hono
2. **Auth** → Middleware verifica permissões
3. **Database** → Consulta/salva no D1
4. **Queue** → Envia jobs RAG assíncronos
5. **AI** → Chama OpenAI/Pinecone conforme necessário
6. **Response** → Retorna JSON para frontend

### Sistema de IA - RAG e Processamento Inteligente

```mermaid
flowchart TD
    subgraph "📄 ENTRADA DE DOCUMENTOS"
        DOC[📁 Usuário faz upload<br/>PDF, DOCX, URL, YouTube]
        PARSE[🔍 Parser específico<br/>unpdf, mammoth, html-parser]
    end
    
    subgraph "✂️ PROCESSAMENTO DE TEXTO - Semantic Chunking Detalhado"
        CHUNK[📝 Semantic Chunking<br/>4 estratégias disponíveis]
        
        subgraph "🧠 Estratégias de Divisão"
            S1[📄 Paragraph<br/>Divide por parágrafos<br/>Mantém contexto natural]
            S2[📝 Sentence<br/>Divide por frases<br/>Precisão máxima]
            S3[🔄 Recursive<br/>Divide recursivamente<br/>Tamanho uniforme]
            S4[🎯 Semantic<br/>IA analisa significado<br/>Agrupa temas similares]
        end
        
        PARAMS[⚙️ Parâmetros<br/>Tamanho: 2000 chars<br/>Overlap: 400 chars<br/>Evita cortar no meio]
        CLEAN[🧹 Limpeza final<br/>Remove caracteres especiais<br/>Normaliza formato]
    end
    
    subgraph "🧠 OPENAI - EMBEDDINGS"
        EMB[🔢 text-embedding-ada-002<br/>Transforma texto em números<br/>Vetor de 1536 dimensões]
        COST[💰 Custo por token<br/>~$0.0001 por 1K tokens]
    end
    
    subgraph "🔍 PINECONE - VECTOR DATABASE"
        STORE[💾 Armazena vetores<br/>Índice otimizado<br/>Busca por similaridade]
        SEARCH[🎯 Similarity Search<br/>Encontra textos parecidos<br/>Score de 0 a 1]
    end
    
    subgraph "💬 CHAT COM IA"
        QUERY[❓ Pergunta do usuário<br/>Como fazer deploy?]
        CONTEXT[📚 Busca contexto<br/>Top 5 trechos relevantes]
        GPT[🤖 GPT-4o<br/>Pergunta + Contexto → Resposta<br/>Resposta inteligente]
    end
    
    subgraph "⚡ QUEUE PROCESSING"
        Q[📤 Fila RAG<br/>Processamento assíncrono<br/>Não trava a interface]
        STATUS[📊 Status tracking<br/>pending → processing → completed]
    end
    
    %% Fluxo de upload e processamento
    DOC --> PARSE
    PARSE --> CHUNK
    CHUNK --> S1
    CHUNK --> S2
    CHUNK --> S3
    CHUNK --> S4
    S1 --> PARAMS
    S2 --> PARAMS
    S3 --> PARAMS
    S4 --> PARAMS
    PARAMS --> CLEAN
    CLEAN --> Q
    
    Q --> EMB
    EMB --> STORE
    STORE --> STATUS
    
    %% Fluxo de chat
    QUERY --> CONTEXT
    CONTEXT --> SEARCH
    SEARCH --> GPT
    GPT --> QUERY
    
    %% Styling
    classDef input fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef processing fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef strategies fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef openai fill:#e1d5e7,stroke:#9673a6,stroke-width:2px
    classDef pinecone fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef chat fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef queue fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    
    class DOC,PARSE input
    class CHUNK,PARAMS,CLEAN processing
    class S1,S2,S3,S4 strategies
    class EMB,COST openai
    class STORE,SEARCH pinecone
    class QUERY,CONTEXT,GPT chat
    class Q,STATUS queue
```

#### 🤖 **Tecnologias de IA Explicadas:**

| Ferramenta | O que faz (para leigos) | Analogia |
|------------|-------------------------|----------|
| **OpenAI Embeddings** | 🔢 Transforma texto em números | Como DNA do texto |
| **Pinecone** | 🔍 Encontra textos parecidos | Como Google para documentos |
| **GPT-4o** | 🧠 Responde perguntas inteligentes | Como professor que leu tudo |
| **RAG** | 📚 Busca + IA = Resposta precisa | Professor + biblioteca |

#### ✂️ **Semantic Chunking Detalhado:**

**🎯 4 Estratégias Disponíveis:**

1. **📄 Paragraph Strategy**:
   - **Como funciona**: Divide texto por parágrafos naturais
   - **Vantagem**: Mantém contexto e fluxo de ideias
   - **Exemplo**: Um parágrafo sobre "instalação" fica junto

2. **📝 Sentence Strategy**:
   - **Como funciona**: Divide por frases completas
   - **Vantagem**: Precisão máxima, sem cortar no meio
   - **Exemplo**: "Para instalar, execute npm install." = 1 chunk

3. **🔄 Recursive Strategy**:
   - **Como funciona**: Divide recursivamente até tamanho ideal
   - **Vantagem**: Chunks de tamanho uniforme
   - **Exemplo**: Se muito grande, divide pela metade novamente

4. **🧠 Semantic Strategy** (Padrão):
   - **Como funciona**: IA analisa significado e agrupa temas
   - **Vantagem**: Chunks semanticamente coerentes
   - **Exemplo**: Tudo sobre "deploy" fica no mesmo chunk

**⚙️ Parâmetros Configuráveis:**
- **Tamanho**: 2000 caracteres (otimizado para embeddings)
- **Overlap**: 400 caracteres (evita perder contexto entre chunks)
- **Fallback**: Se semantic falha, usa recursive automaticamente

#### 🔄 **Fluxo RAG Simplificado:**

1. **📄 Upload**: Usuário envia PDF
2. **✂️ Chunking**: Aplica estratégia semântica inteligente
3. **🔢 Embeddings**: OpenAI transforma em números
4. **💾 Storage**: Pinecone guarda os números
5. **❓ Pergunta**: Usuário faz pergunta
6. **🔍 Busca**: Pinecone encontra trechos relevantes
7. **🤖 Resposta**: GPT responde usando contexto encontrado

### Schema do Banco D1 - Estrutura Completa

```mermaid
erDiagram
    workspaces {
        int id PK
        text name
        text description
        text owner_user_id
        timestamp created_at
        timestamp updated_at
    }
    
    workspace_members {
        int id PK
        int workspace_id FK
        text user_id
        text role
        timestamp created_at
        timestamp updated_at
    }
    
    agents {
        int id PK
        int workspace_id FK
        text name
        text description
        text system_prompt
        text model
        real temperature
        int max_tokens
        boolean is_active
        text created_by_user_id
        boolean enable_rag
        int max_chunks_per_query
        real similarity_threshold
        timestamp created_at
        timestamp updated_at
    }
    
    agent_executions {
        int id PK
        int agent_id FK
        text user_id
        text input_message
        text output_message
        text status
        text error_message
        int tokens_used
        int execution_time_ms
        timestamp created_at
        timestamp updated_at
    }
    
    knowledge_sources {
        int id PK
        int agent_id FK
        text name
        text type
        text source_url
        text file_path
        text content
        text status
        int progress_percentage
        text progress_message
        text processing_stage
        text metadata
        timestamp created_at
        timestamp updated_at
    }
    
    document_chunks {
        int id PK
        int knowledge_source_id FK
        text content
        blob embedding
        int chunk_index
        text metadata
        text content_hash
        text content_preview
        timestamp created_at
        timestamp updated_at
    }
    
    agent_knowledge_settings {
        int id PK
        int agent_id FK
        boolean enable_rag
        int max_chunks_per_query
        real similarity_threshold
        int chunk_size
        int chunk_overlap
        text chunking_strategy
        text search_strategy
        boolean enable_contextual_search
        int context_window
        timestamp created_at
        timestamp updated_at
    }
    
    %% Relacionamentos
    workspaces ||--o{ workspace_members : "tem membros"
    workspaces ||--o{ agents : "contém agentes"
    agents ||--o{ agent_executions : "executa conversas"
    agents ||--o{ knowledge_sources : "possui documentos"
    agents ||--o| agent_knowledge_settings : "configurações RAG"
    knowledge_sources ||--o{ document_chunks : "dividido em chunks"
```

#### 📊 **Estrutura do Banco Explicada:**

**🏢 Hierarquia Principal:**
- **Workspaces** → **Agents** → **Knowledge Sources** → **Document Chunks**
- **Usuários** podem ser **membros** de múltiplos workspaces
- **Agents** pertencem a um workspace específico

**📋 Tabelas Principais:**

| Tabela | Função | Campos Importantes |
|--------|--------|-------------------|
| **workspaces** | 🏢 Espaços de trabalho | `owner_user_id`, `name` |
| **agents** | 🤖 Agentes IA | `workspace_id`, `enable_rag`, `model` |
| **knowledge_sources** | 📚 Documentos | `agent_id`, `type`, `content`, `status` |
| **document_chunks** | ✂️ Pedaços de texto | `knowledge_source_id`, `content`, `embedding` |
| **agent_executions** | 💬 Histórico chat | `agent_id`, `input_message`, `tokens_used` |

**⚙️ Configurações RAG:**
- **agents**: Configurações básicas (enable_rag, similarity_threshold)
- **agent_knowledge_settings**: Configurações avançadas (chunk_size, strategy)

**🔍 Índices para Performance:**
- **Busca por workspace**: `idx_agents_workspace`
- **Busca por status**: `idx_knowledge_sources_status`
- **Busca por hash**: `idx_document_chunks_hash`

### Configurações e Settings do Sistema

```mermaid
flowchart TD
    subgraph "🤖 Agent Settings"
        A[Agent Criado] --> B{Configurar IA}
        B --> C[🌡️ Temperature: 0.0-2.0]
        B --> D[📏 Max Tokens: 100-4000]
        B --> E[🧠 Model: gpt-4o-mini/gpt-4o]
        B --> F[📝 System Prompt]
        
        C --> G[❄️ Conservador: 0.1]
        C --> H[⚖️ Balanceado: 0.7]
        C --> I[🎲 Criativo: 1.5]
    end
    
    subgraph "📚 RAG Settings"
        J[Enable RAG] --> K{RAG Ativo?}
        K -->|✅| L[⚙️ Configurações RAG]
        K -->|❌| M[💬 Chat Simples]
        
        L --> N[📊 Max Chunks: 1-10]
        L --> O[🎯 Similarity: 0.5-0.9]
        L --> P[✂️ Chunk Size: 500-3000]
        L --> Q[🔄 Overlap: 100-500]
        L --> R[📋 Strategy: semantic/recursive]
    end
    
    subgraph "🌍 Environment Configs"
        S[🏠 Development] --> T[📝 .env.local]
        U[🚀 Production] --> V[☁️ Cloudflare Vars]
        
        T --> W[🔑 Local API Keys]
        T --> X[🧪 Test Database]
        T --> Y[🔧 Debug Mode]
        
        V --> Z[🔐 Encrypted Secrets]
        V --> AA[📊 Production DB]
        V --> BB[📈 Analytics On]
    end
    
    subgraph "🎛️ Feature Toggles"
        CC[Feature Flags] --> DD{Ambiente}
        DD -->|Dev| EE[🧪 Experimental Features]
        DD -->|Prod| FF[✅ Stable Features]
        
        EE --> GG[🔬 New Chunking]
        EE --> HH[🎨 UI Experiments]
        
        FF --> II[📚 RAG Stable]
        FF --> JJ[💬 Chat Stable]
    end
    
    %% Conexões entre configurações
    F -.-> L
    N -.-> P
    O -.-> R
    
    %% Estilos
    style A fill:#e3f2fd
    style G fill:#e8f5e8
    style H fill:#fff3e0
    style I fill:#ffebee
    style M fill:#f5f5f5
    style S fill:#e8f5e8
    style U fill:#fff3e0
    style EE fill:#f3e5f5
    style FF fill:#e8f5e8
```

#### ⚙️ **Configurações Detalhadas:**

**🤖 Agent Settings:**

| Parâmetro | Valores | Impacto |
|-----------|---------|---------|
| **Temperature** | 0.1 (conservador) → 1.5 (criativo) | Criatividade das respostas |
| **Max Tokens** | 100-4000 | Tamanho máximo da resposta |
| **Model** | gpt-4o-mini, gpt-4o | Qualidade vs custo |
| **System Prompt** | Texto livre | Personalidade do agente |

**📚 RAG Settings:**

| Configuração | Padrão | Descrição |
|--------------|--------|-----------|
| **Max Chunks** | 3 | Quantos trechos usar no contexto |
| **Similarity** | 0.7 | Quão similar deve ser (0.5-0.9) |
| **Chunk Size** | 2000 | Tamanho dos pedaços de texto |
| **Overlap** | 400 | Sobreposição entre chunks |
| **Strategy** | semantic | Como dividir o texto |

**🌍 Environment Configs:**

**Development (.env.local):**
```bash
OPENAI_API_KEY=sk-local...
PINECONE_API_KEY=local-key
DATABASE_URL=local.db
DEBUG_MODE=true
```

**Production (Cloudflare):**
```bash
# Encrypted secrets via wrangler
OPENAI_API_KEY=encrypted
PINECONE_API_KEY=encrypted  
DATABASE_URL=production.db
ANALYTICS_ENABLED=true
```

### Deploy Pipeline - Cloudflare Workers

```mermaid
flowchart TD
    subgraph "🏠 Development"
        A[💻 Código Local] --> B[🧪 npm run dev]
        B --> C[🌐 localhost:5173]
        C --> D{✅ Testes OK?}
        D -->|❌| E[🔧 Fix & Retry]
        E --> B
        D -->|✅| F[📝 Git Commit]
    end
    
    subgraph "🔨 Build Process"
        F --> G[📦 npm run build]
        G --> H[⚡ Vite Build]
        H --> I[📁 dist/ folder]
        I --> J{🔍 Build Success?}
        J -->|❌| K[🚨 Build Error]
        J -->|✅| L[✅ Ready to Deploy]
    end
    
    subgraph "🚀 Deploy to Cloudflare"
        L --> M[🔧 npx wrangler deploy]
        M --> N[☁️ Upload Assets & Worker]
        N --> O[🔄 Deploy Process]
        O --> P{🌍 Deploy Success?}
        P -->|❌| Q[❌ Deploy Failed]
        P -->|✅| R[✅ Live Production]
        
        %% Troubleshooting
        Q --> S[🔍 Check Build Errors]
        S --> T[🧹 Clean Build: rm -rf dist]
        T --> G
    end
    
    subgraph "⚙️ Environment Setup"
        S[🔑 API Keys] --> T[wrangler secret put]
        T --> U[🔐 Encrypted Storage]
        
        V[🗄️ Database] --> W[wrangler d1 create]
        W --> X[📊 D1 Database]
        
        Y[📬 Queue] --> Z[wrangler queues create]
        Z --> AA[⚡ Queue Processing]
    end
    
    subgraph "🔄 Rollback Strategy"
        BB[🚨 Production Issue] --> CC{🔍 Quick Fix?}
        CC -->|✅| DD[🔧 Hotfix Deploy]
        CC -->|❌| EE[⏪ Rollback]
        EE --> FF[📋 Previous Version]
        FF --> GG[🔄 wrangler rollback]
    end
    
    subgraph "🛠️ Troubleshooting"
        HH[❌ Deploy Error] --> II{🔍 Error Type}
        II -->|Secrets| JJ[🔑 Check API Keys]
        II -->|Database| KK[🗄️ Check D1 Connection]
        II -->|Queue| LL[📬 Check Queue Config]
        II -->|Code| MM[🐛 Check Logs]
        
        JJ --> NN[wrangler secret list]
        KK --> OO[wrangler d1 info]
        LL --> PP[wrangler queues list]
        MM --> QQ[wrangler tail]
    end
    
    %% Conexões principais
    R --> BB
    Q --> HH
    
    %% Estilos
    style A fill:#e3f2fd
    style C fill:#e8f5e8
    style R fill:#e8f5e8
    style Q fill:#ffebee
    style K fill:#ffebee
    style BB fill:#fff3e0
    style FF fill:#f3e5f5
```

#### 🚀 **Comandos Wrangler Essenciais:**

**📦 Deploy Commands:**
```bash
# Deploy principal
wrangler deploy

# Deploy com nome específico
wrangler deploy --name ai-hub-prod

# Deploy para ambiente específico
wrangler deploy --env production
```

**🔑 Secrets Management:**
```bash
# Adicionar secret
wrangler secret put OPENAI_API_KEY

# Listar secrets
wrangler secret list

# Deletar secret
wrangler secret delete OLD_KEY
```

**🗄️ Database Commands:**
```bash
# Criar database
wrangler d1 create ai-hub-db

# Executar migrations
wrangler d1 migrations apply ai-hub-db

# Query database
wrangler d1 execute ai-hub-db --command "SELECT * FROM users LIMIT 5"
```

**📬 Queue Commands:**
```bash
# Criar queue
wrangler queues create rag-processing

# Listar queues
wrangler queues list

# Monitorar queue
wrangler queues consumer add rag-processing
```

**🔍 Monitoring & Debug:**
```bash
# Ver logs em tempo real
wrangler tail

# Ver logs específicos
wrangler tail --format pretty

# Informações do worker
wrangler whoami
```

## 🚨 Troubleshooting Deploy

### Problema: Analytics/Settings não aparecem em produção

**Sintomas:**
- Funciona no desenvolvimento local (`npm run dev`)
- Não aparece após deploy no Cloudflare
- Build executa sem erros

**Soluções:**

1. **Limpar cache de build:**
```bash
# Windows
Remove-Item -Recurse -Force dist
npm run build
npx wrangler deploy

# Linux/Mac
rm -rf dist
npm run build
npx wrangler deploy
```

2. **Verificar erros TypeScript:**
```bash
# Corrigir imports não utilizados
# Remover referências a arquivos inexistentes no tsconfig
```

3. **Forçar visibilidade com style inline:**
```tsx
<button 
  style={{ display: 'flex' }}
  className="..."
>
  Analytics
</button>
```

4. **Verificar sincronização código:**
```bash
git status
git diff HEAD
# Commit mudanças se necessário
```

### Comandos Corretos

❌ **Incorreto:**
```bash
wrangler deploy --force  # Argumento não existe
wrangler auth login      # Comando não reconhecido
```

✅ **Correto:**
```bash
npx wrangler deploy      # Deploy padrão
npx wrangler auth login  # Login (se necessário)
```

## 📁 Estrutura do Projeto

```mermaid
graph TB
    %% Estilos com caixas claras e bordas coloridas
    classDef rootFolder fill:#ffffff,stroke:#00ffff,stroke-width:4px,color:#000000
    classDef srcFolder fill:#f0fff0,stroke:#00ff41,stroke-width:3px,color:#000000
    classDef configFile fill:#fffacd,stroke:#ffff00,stroke-width:3px,color:#000000
    classDef buildFile fill:#fff0f5,stroke:#ff0080,stroke-width:2px,color:#000000
    classDef reactFile fill:#f0f8ff,stroke:#8a2be2,stroke-width:2px,color:#000000
    classDef workerFile fill:#fff5ee,stroke:#ff6600,stroke-width:2px,color:#000000
    
    %% Root Project
    ROOT[📁 AI HUB 2.0<br/>c:\soft\hub2\]:::rootFolder
    
    %% Source Code Structure
    subgraph SRC[📂 src/]
        REACTAPP[📂 react-app/<br/>Frontend SPA]:::srcFolder
        WORKER[📂 worker/<br/>Backend Cloudflare]:::srcFolder
        SHARED[📂 shared/<br/>Tipos compartilhados]:::srcFolder
    end
    
    %% React App Structure  
    subgraph REACTDETAIL[📱 react-app/ Details]
        APPFILE[📄 App.tsx<br/>Rotas principais]:::reactFile
        PAGES[📂 pages/<br/>Dashboard, Agent, Analytics, Settings]:::reactFile
        COMPONENTS[📂 components/<br/>UI reutilizáveis]:::reactFile
        HOOKS[📂 hooks/<br/>Custom React hooks]:::reactFile
    end
    
    %% Worker Structure
    subgraph WORKERDETAIL[⚡ worker/ Details]
        INDEXTS[📄 index.ts<br/>Hono API + endpoints]:::workerFile
        RAGTS[📄 pinecone-rag.ts<br/>Sistema RAG completo]:::workerFile
        ANALYTICS[📄 analytics.ts<br/>Métricas e estatísticas]:::workerFile
    end
    
    %% Configuration Files
    subgraph CONFIG[⚙️ Configuration Files]
        WRANGLER[📄 wrangler.jsonc<br/>Cloudflare Workers config]:::configFile
        VITE[📄 vite.config.ts<br/>Build e desenvolvimento]:::configFile
        PACKAGE[📄 package.json<br/>Dependências NPM]:::configFile
        TSCONFIG[📄 tsconfig.*.json<br/>TypeScript configs]:::configFile
    end
    
    %% Other Important Folders
    subgraph OTHERS[📁 Other Folders]
        PUBLIC[📂 public/<br/>Assets estáticos]:::buildFile
        MIGRATIONS[📂 migrations/<br/>SQL schemas D1]:::buildFile
        SCRIPTS[📂 scripts/<br/>Setup e deploy]:::buildFile
        DIST[📂 dist/<br/>Build output]:::buildFile
    end
    
    %% Connections
    ROOT --> SRC
    ROOT --> CONFIG  
    ROOT --> OTHERS
    
    REACTAPP --> REACTDETAIL
    WORKER --> WORKERDETAIL
    
    SRC --> REACTAPP
    SRC --> WORKER
    SRC --> SHARED
    
    %% Estilos das linhas
    linkStyle 0 stroke:#00ff41,stroke-width:4px
    linkStyle 1 stroke:#ffff00,stroke-width:4px
    linkStyle 2 stroke:#ff0080,stroke-width:4px
    linkStyle 3 stroke:#8a2be2,stroke-width:3px
    linkStyle 4 stroke:#ff6600,stroke-width:3px
    linkStyle 5 stroke:#00ff41,stroke-width:3px
    linkStyle 6 stroke:#ff6600,stroke-width:3px
    linkStyle 7 stroke:#8a2be2,stroke-width:3px
```

### 📋 Descrição dos Arquivos Principais

| Arquivo | Função | Tecnologia |
|---------|--------|------------|
| `src/react-app/App.tsx` | Rotas e autenticação | React Router |
| `src/worker/index.ts` | API backend principal | Hono + Cloudflare Workers |
| `src/worker/pinecone-rag.ts` | Sistema RAG completo | Pinecone + OpenAI |
| `src/react-app/pages/Agent.tsx` | Interface de chat IA | React + WebSocket |
| `src/react-app/pages/Analytics.tsx` | Dashboard de métricas | React + Charts |
| `wrangler.jsonc` | Configuração Cloudflare | Workers, D1, R2, Queues |
| `vite.config.ts` | Build e desenvolvimento | Vite + React |
| `migrations/*.sql` | Schema do banco | D1 Database |

### Segurança e Isolamento de Dados

```mermaid
flowchart TD
    subgraph "🔐 Camada de Autenticação"
        A[👤 Usuário com Token] --> B{🛡️ Token Válido?}
        B -->|❌| C[🚫 401 Unauthorized]
        B -->|✅| D[✅ Usuário Autenticado]
    end
    
    subgraph "🏢 Camada de Workspace"
        D --> E{🔍 Acesso ao Workspace?}
        E -->|Owner| F[👑 Acesso Total]
        E -->|Member| G[👥 Acesso Limitado]
        E -->|❌ Negado| H[🚫 403 Forbidden]
    end
    
    subgraph "🤖 Camada de Agent"
        F --> I[🤖 Todos os Agents]
        G --> J[🤖 Agents Permitidos]
        I --> K{📋 Operação no Agent}
        J --> K
        K -->|Analytics| ANALYTICS[📊 Métricas Protegidas]
    end
    
    subgraph "📚 Camada de Knowledge"
        K -->|Upload| L[📄 Novo Documento]
        K -->|Chat| M[💬 Buscar Contexto]
        L --> N[✂️ Semantic Chunking]
        M --> O[🔍 RAG Search]
    end
    
    subgraph "🔒 Isolamento de Dados"
        N --> P[📊 Embeddings Isolados]
        O --> Q[🎯 Chunks do Agent]
        P --> R[(🗄️ Pinecone Namespace)]
        Q --> R
        R --> S[💾 Dados Seguros]
    end
    
    subgraph "📋 Queries SQL Seguras"
        T["SELECT * FROM agents a
        JOIN workspaces w ON a.workspace_id = w.id
        WHERE w.owner_user_id = ? OR
        w.id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)"]
    end
    
    S --> U[🎯 Resposta Filtrada]
    
    %% Conexões de segurança
    F -.->|Controla| T
    G -.->|Limitado por| T
    
    %% Estilos
    style A fill:#e3f2fd
    style C fill:#ffebee
    style H fill:#ffebee
    style D fill:#e8f5e8
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style S fill:#e8f5e8
    style U fill:#e8f5e8
    style T fill:#f5f5f5
```

#### 🔒 **Medidas de Segurança Implementadas:**

**🛡️ Autenticação Obrigatória:**
- **Middleware** valida token em todas as rotas protegidas
- **Bearer Token** verificado em cada request
- **401 Unauthorized** se token inválido ou ausente

**🏢 Autorização por Workspace:**
- **Owner**: Criador do workspace (acesso total)
- **Member**: Usuário adicionado como membro
- **Isolamento**: Cada usuário só vê seus workspaces

**📊 Controle de Acesso SQL:**
```sql
-- Exemplo: Buscar agentes com segurança
SELECT a.* FROM agents a
JOIN workspaces w ON a.workspace_id = w.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
```

**🎯 Isolamento de Dados:**

| Nível | Proteção | Como Funciona |
|-------|----------|---------------|
| **👤 User** | Token Auth | Middleware valida identidade |
| **🏢 Workspace** | Owner/Member | SQL filtra por user_id |
| **🤖 Agent** | Via Workspace | JOIN com workspace autorizado |
| **📚 Knowledge** | Via Agent | JOIN com agent autorizado |
| **✂️ Chunks** | Via Knowledge | Embeddings isolados por fonte |

**🚨 Pontos Críticos:**
- **Desenvolvimento**: Auth simplificado (customAuthMiddleware)
- **Produção**: Mocha Users Service (mais seguro)
- **Pinecone**: Namespace por agente para isolamento
- **Queue**: Jobs processados com contexto do usuário

**🔍 Índices para Performance:**
- **Busca por workspace**: `idx_agents_workspace`
- **Busca por status**: `idx_knowledge_sources_status`
- **Busca por hash**: `idx_document_chunks_hash`

### Principais Endpoints da API

| Método | Endpoint | O que faz | Exemplo |
|--------|----------|-----------|---------|
| **POST** | `/api/auth/login` | Fazer login | `{"email": "user@email.com", "password": "123"}` |
| **GET** | `/api/workspaces` | Listar workspaces | Retorna lista de espaços de trabalho |
| **POST** | `/api/workspaces` | Criar workspace | `{"name": "Meu Projeto"}` |
| **GET** | `/api/workspaces/:id/agents` | Listar agentes do workspace | Retorna lista de agentes |
| **POST** | `/api/workspaces/:id/agents` | Criar agente no workspace | `{"name": "Assistente", "prompt": "Você é..."}` |
| **GET** | `/api/agents/:id` | Buscar agente específico | Retorna dados do agente ID 123 |
| **POST** | `/api/agents/:id/knowledge/upload` | Upload documento no agente | Envia PDF/DOCX para processamento |
| **POST** | `/api/agents/:id/execute` | Chat com IA + RAG | `{"message": "Olá!", "conversation_id": "conv_456"}` |
| **GET** | `/api/conversations` | Histórico de chats | Lista conversas anteriores |

### Como Funciona uma Requisição REST

```mermaid
flowchart LR
    A[ Usuário clica botão] --> B[ Frontend prepara dados]
    B --> C[ Envia HTTP Request]
    C --> D[ Worker recebe]
    D --> E{ Que tipo?}
    
    E -->|Login| F[ Verifica senha]
    E -->|Chat| G[ Chama OpenAI]
    E -->|Upload| H[ Processa documento]
    
    F --> I[ Consulta Database]
    G --> J[ Busca no Pinecone]
    H --> K[ Gera embeddings]
    
    I --> L[ Resposta JSON]
    J --> L
    K --> L
    
    L --> M[ HTTP Response]
    M --> N[ Frontend atualiza tela]
    N --> O[ Usuário vê resultado]
    
    style A fill:#e6f7ff,stroke:#0066cc,stroke-width:2px
    style E fill:#fff9e6,stroke:#cc8800,stroke-width:2px
    style L fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style O fill:#e6f7ff,stroke:#0066cc,stroke-width:2px
```

### Exemplo Prático: Chat com IA

**1. Usuário digita pergunta:**
```
"Como configurar o banco de dados?"
```

**2. Frontend envia requisição:**
```http
POST /api/agents/123/execute
Content-Type: application/json

{
  "message": "Como configurar o banco de dados?",
  "conversation_id": "conv_456"
}
```

**3. Worker processa:**
- Verifica acesso ao workspace
- Busca contexto no Pinecone
- Envia para OpenAI com contexto
- Retorna resposta inteligente

**4. Resposta JSON:**
```json
{
  "response": "Para configurar o banco D1, execute: npx wrangler d1 create...",
  "tokens_used": 150,
  "response_time": "1.2s"
}
```

**5. Frontend mostra resposta na tela**