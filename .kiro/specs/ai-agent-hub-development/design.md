# Design Document - AI Agent Hub Development Setup

## Overview

O AI Agent Hub é uma plataforma SaaS moderna para criação e gerenciamento de agentes de IA com capacidades RAG. O design segue uma arquitetura serverless usando Cloudflare Workers, com frontend React e backend Hono.js, otimizada para desenvolvimento local e deploy em produção.

### Arquitetura Geral
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Hono Worker    │    │  Cloudflare D1  │
│  (Frontend)     │◄──►│   (Backend)     │◄──►│   (Database)    │
│  Port 5173      │    │  Port 8787      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TailwindCSS   │    │    OpenAI API   │    │   Pinecone      │
│   (Styling)     │    │   (AI Models)   │    │ (Vector Store)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Architecture

### Frontend Architecture (React App)

**Framework**: React 19 + TypeScript + Vite
**Styling**: TailwindCSS
**Routing**: React Router v7
**State Management**: React Context + useState/useEffect
**Build Tool**: Vite com proxy para API

#### Estrutura de Componentes
```
src/react-app/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, Modal)
│   ├── layout/         # Layout components (Header, Sidebar)
│   ├── agent/          # Componentes específicos de agentes
│   └── knowledge/      # Componentes de knowledge management
├── pages/              # Páginas da aplicação
│   ├── Home.tsx        # Landing page
│   ├── Login.tsx       # Página de login
│   ├── SignUp.tsx      # Página de registro
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Workspace.tsx   # Página do workspace
│   └── Agent.tsx       # Página do agente
├── hooks/              # Custom hooks
│   ├── useAuth.ts      # Hook de autenticação
│   ├── useApi.ts       # Hook para chamadas API
│   └── useAgent.ts     # Hook para operações de agente
└── utils/              # Utilitários
    ├── api.ts          # Cliente API
    ├── auth.ts         # Utilitários de auth
    └── types.ts        # Tipos TypeScript
```

### Backend Architecture (Hono Worker)

**Framework**: Hono.js
**Runtime**: Cloudflare Workers
**Validation**: Zod schemas
**Database**: Cloudflare D1 (SQLite)
**Vector Store**: Pinecone

#### Estrutura de Rotas
```
src/worker/
├── index.ts            # Main worker file com todas as rotas
├── pinecone-rag.ts     # Processador RAG principal
├── pinecone-store.ts   # Interface Pinecone
├── semantic-chunker.ts # Chunking inteligente
├── rag-utils.ts        # Utilitários RAG
└── vector-store.ts     # Abstração vector store
```

#### API Endpoints Design
```
Authentication:
POST /api/auth/signup    # Registro de usuário
POST /api/auth/login     # Login
GET  /api/users/me       # Dados do usuário atual
GET  /api/logout         # Logout

Workspaces:
GET  /api/workspaces           # Listar workspaces
POST /api/workspaces           # Criar workspace

Agents:
GET  /api/workspaces/:id/agents    # Listar agentes
POST /api/workspaces/:id/agents    # Criar agente
PUT  /api/agents/:id               # Atualizar agente
DELETE /api/agents/:id             # Deletar agente

Agent Execution:
POST /api/agents/:id/execute       # Executar agente
GET  /api/agents/:id/executions    # Histórico execuções

Knowledge Management:
GET  /api/agents/:id/knowledge-sources     # Listar sources
POST /api/agents/:id/knowledge-sources     # Adicionar source
DELETE /api/knowledge-sources/:id          # Deletar source
GET  /api/agents/:id/knowledge-settings    # Configurações RAG
PUT  /api/agents/:id/knowledge-settings    # Atualizar configurações
GET  /api/agents/:id/knowledge-stats       # Estatísticas

Widget (Public):
GET  /api/widget/agents/:id        # Dados públicos do agente
POST /api/widget/agents/:id/chat   # Chat público
```

### Database Design

#### Schema Principal
```sql
-- Usuários (auth simples para desenvolvimento)
users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMP,
  last_login TIMESTAMP
)

-- Workspaces
workspaces (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  owner_user_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Agentes
agents (
  id INTEGER PRIMARY KEY,
  workspace_id INTEGER,
  name TEXT,
  description TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT 1,
  enable_rag BOOLEAN DEFAULT 0,
  max_chunks_per_query INTEGER DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.7,
  created_by_user_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Knowledge Sources
knowledge_sources (
  id INTEGER PRIMARY KEY,
  agent_id INTEGER,
  name TEXT,
  type TEXT, -- 'url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text'
  source_url TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  metadata TEXT, -- JSON
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Configurações RAG por agente
agent_knowledge_settings (
  id INTEGER PRIMARY KEY,
  agent_id INTEGER UNIQUE,
  enable_rag BOOLEAN DEFAULT 0,
  max_chunks_per_query INTEGER DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.7,
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  chunking_strategy TEXT DEFAULT 'recursive',
  search_strategy TEXT DEFAULT 'hybrid',
  enable_contextual_search BOOLEAN DEFAULT 1,
  context_window INTEGER DEFAULT 2,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Components and Interfaces

### Frontend Components

#### Core UI Components
```typescript
// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Form Components
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}
```

#### Agent Management Components
```typescript
// Agent Card
interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: number) => void;
  onExecute: (agentId: number) => void;
}

// Agent Chat Interface
interface AgentChatProps {
  agentId: number;
  onMessageSent: (message: string) => void;
  messages: ChatMessage[];
  loading: boolean;
}

// Knowledge Source Manager
interface KnowledgeSourceManagerProps {
  agentId: number;
  sources: KnowledgeSource[];
  onAddSource: (source: CreateKnowledgeSource) => void;
  onDeleteSource: (sourceId: number) => void;
}
```

### Backend Interfaces

#### RAG Processing Interface
```typescript
interface RAGProcessor {
  processKnowledgeSource(
    sourceId: number,
    agentId: number,
    sourceData: SourceData,
    settings: ChunkingSettings
  ): Promise<ProcessingResult>;
  
  findRelevantChunks(
    query: string,
    agentId: number,
    maxChunks: number,
    threshold: number,
    strategy: SearchStrategy
  ): Promise<RelevantChunk[]>;
  
  deleteKnowledgeSource(agentId: number, sourceId: number): Promise<void>;
  getKnowledgeStatistics(agentId: number): Promise<KnowledgeStats>;
}

interface ChunkingSettings {
  chunk_size: number;
  chunk_overlap: number;
  chunking_strategy: 'paragraph' | 'sentence' | 'recursive' | 'semantic';
}

interface ProcessingResult {
  success: boolean;
  chunks_count: number;
  error?: string;
}
```

#### Vector Store Interface
```typescript
interface VectorStore {
  addDocument(
    sourceId: number,
    agentId: number,
    content: string,
    chunkIndex: number,
    sourceName: string,
    sourceType: string,
    metadata: Record<string, any>
  ): Promise<void>;
  
  searchSimilar(
    query: string,
    agentId: number,
    maxResults: number,
    threshold: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]>;
  
  hybridSearch(
    query: string,
    agentId: number,
    maxResults: number
  ): Promise<SearchResult[]>;
  
  deleteDocuments(agentId: number, sourceId: number): Promise<void>;
  getStatistics(agentId: number): Promise<VectorStats>;
}
```

## Data Models

### Core Types
```typescript
// User & Auth
interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login?: string;
}

// Workspace
interface Workspace {
  id: number;
  name: string;
  description?: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

// Agent
interface Agent {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  system_prompt?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  enable_rag: boolean;
  max_chunks_per_query: number;
  similarity_threshold: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Knowledge Source
interface KnowledgeSource {
  id: number;
  agent_id: number;
  name: string;
  type: 'url' | 'pdf' | 'doc' | 'docx' | 'pptx' | 'youtube' | 'text';
  source_url?: string;
  file_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: string;
  created_at: string;
  updated_at: string;
}

// Agent Execution
interface AgentExecution {
  id: number;
  agent_id: number;
  user_id: string;
  input_message: string;
  output_message?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  tokens_used?: number;
  execution_time_ms?: number;
  created_at: string;
  updated_at: string;
}
```

## Error Handling

### Frontend Error Handling
```typescript
// Error Boundary para capturar erros React
class ErrorBoundary extends React.Component {
  // Implementação padrão com fallback UI
}

// Hook para tratamento de erros API
const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handleError = (error: any) => {
    if (error.response?.data?.error) {
      setError(error.response.data.error);
    } else {
      setError('Erro inesperado. Tente novamente.');
    }
  };
  
  return { error, handleError, clearError: () => setError(null) };
};
```

### Backend Error Handling
```typescript
// Middleware de tratamento de erros
const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ZodError) {
      return c.json({ error: 'Dados inválidos', details: error.errors }, 400);
    }
    
    if (error.message.includes('Unauthorized')) {
      return c.json({ error: 'Não autorizado' }, 401);
    }
    
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
};

// Tratamento específico para erros RAG
const handleRAGError = (error: any): string => {
  if (error.message.includes('Pinecone')) {
    return 'Erro no sistema de busca. Tente novamente.';
  }
  if (error.message.includes('OpenAI')) {
    return 'Erro na API de IA. Verifique sua configuração.';
  }
  return 'Erro no processamento de conhecimento.';
};
```

## Testing Strategy

### Frontend Testing
```typescript
// Testes de componentes com React Testing Library
describe('AgentCard', () => {
  it('should render agent information correctly', () => {
    // Test implementation
  });
  
  it('should handle edit action', () => {
    // Test implementation
  });
});

// Testes de hooks customizados
describe('useAuth', () => {
  it('should handle login flow', () => {
    // Test implementation
  });
});
```

### Backend Testing
```typescript
// Testes de API endpoints
describe('Agent API', () => {
  it('should create agent with valid data', async () => {
    // Test implementation
  });
  
  it('should return 401 for unauthorized requests', async () => {
    // Test implementation
  });
});

// Testes de processamento RAG
describe('RAG Processor', () => {
  it('should chunk text correctly', async () => {
    // Test implementation
  });
  
  it('should handle URL processing', async () => {
    // Test implementation
  });
});
```

### Integration Testing
```typescript
// Testes end-to-end com Playwright
describe('Agent Creation Flow', () => {
  it('should create and configure agent successfully', async () => {
    // Full user flow test
  });
});
```

## Development Workflow

### Local Development Setup
1. **Environment Setup**: Configurar variáveis de ambiente (OpenAI, Pinecone, D1)
2. **Database Migration**: Executar migrações para criar schema
3. **Concurrent Development**: Frontend e backend rodando simultaneamente
4. **Hot Reload**: Vite para frontend, Wrangler para backend
5. **API Proxy**: Vite proxy para rotear /api/* para worker

### Build Process
1. **TypeScript Compilation**: Verificação de tipos
2. **Frontend Build**: Vite build para produção
3. **Worker Bundle**: Wrangler build para Cloudflare Workers
4. **Asset Optimization**: Minificação e otimização
5. **Deployment**: Deploy automático para Cloudflare

### Development Scripts
```json
{
  "dev": "vite",                    // Frontend dev server
  "dev:worker": "wrangler dev",     // Worker dev server  
  "dev:all": "concurrently npm:dev:worker npm:dev", // Ambos
  "migrate": "node scripts/migrate.js",             // DB migrations
  "setup-secrets": "node scripts/setup-secrets.js", // Env setup
  "db:reset": "node scripts/db-reset.js",           // Reset DB
  "build": "tsc -b && vite build",                  // Production build
  "deploy": "npm run build && wrangler deploy"      // Deploy
}
```

## Performance Considerations

### Frontend Performance
- **Code Splitting**: Lazy loading de páginas
- **Bundle Optimization**: Tree shaking e minificação
- **Caching**: Service worker para assets estáticos
- **Virtual Scrolling**: Para listas grandes de agentes/execuções

### Backend Performance
- **Database Indexing**: Índices otimizados para queries frequentes
- **Vector Search Optimization**: Configuração otimizada do Pinecone
- **Caching**: Cache de configurações de agente
- **Batch Processing**: Processamento em lote de knowledge sources

### RAG Performance
- **Chunking Strategy**: Chunking semântico para melhor relevância
- **Embedding Caching**: Cache de embeddings para queries similares
- **Hybrid Search**: Combinação de busca vetorial e textual
- **Context Window Optimization**: Otimização do tamanho do contexto