-- SCHEMA COMPLETO E CORRETO - AI Agent Hub
-- Execute este arquivo para criar todas as estruturas necessárias

-- ====================================
-- LIMPAR E RECRIAR TUDO
-- ====================================

-- Remover tabelas na ordem correta (dependências)
DROP TABLE IF EXISTS agent_knowledge_settings;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS knowledge_sources;
DROP TABLE IF EXISTS agent_executions;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;

-- ====================================
-- CRIAR TABELAS PRINCIPAIS
-- ====================================

-- Workspaces
CREATE TABLE workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace members
CREATE TABLE workspace_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents (COM TODAS AS COLUNAS NECESSÁRIAS)
CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT 1,
  created_by_user_id TEXT NOT NULL,
  -- RAG SETTINGS (ESTAS SÃO AS QUE FALTAVAM!)
  enable_rag BOOLEAN DEFAULT 0,
  max_chunks_per_query INTEGER DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.7,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent executions
CREATE TABLE agent_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  input_message TEXT NOT NULL,
  output_message TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge sources
CREATE TABLE knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text'
  source_url TEXT,
  file_path TEXT,
  content TEXT, -- ADICIONADO: Conteúdo extraído do arquivo/fonte
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress_percentage INTEGER DEFAULT 0,
  progress_message TEXT DEFAULT '',
  processing_stage TEXT DEFAULT 'pending',
  metadata TEXT, -- JSON metadata about the source
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks
CREATE TABLE document_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_source_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- Vector embedding as blob (backup for Pinecone)
  chunk_index INTEGER NOT NULL,
  metadata TEXT, -- JSON metadata about the chunk
  content_hash TEXT,
  content_preview TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent knowledge settings (CONFIGURAÇÕES AVANÇADAS DE RAG)
CREATE TABLE agent_knowledge_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL UNIQUE,
  enable_rag BOOLEAN DEFAULT 0,
  max_chunks_per_query INTEGER DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.7,
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  chunking_strategy TEXT DEFAULT 'recursive',
  search_strategy TEXT DEFAULT 'hybrid',
  enable_contextual_search BOOLEAN DEFAULT 1,
  context_window INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ====================================

-- Workspaces indexes
CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id);

-- Workspace members indexes
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Agents indexes
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_creator ON agents(created_by_user_id);
CREATE INDEX idx_agents_rag_enabled ON agents(enable_rag);

-- Agent executions indexes
CREATE INDEX idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_executions_user ON agent_executions(user_id);
CREATE INDEX idx_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created ON agent_executions(created_at);

-- Knowledge sources indexes
CREATE INDEX idx_knowledge_sources_agent ON knowledge_sources(agent_id);
CREATE INDEX idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX idx_knowledge_sources_type ON knowledge_sources(type);
CREATE INDEX idx_knowledge_sources_created ON knowledge_sources(created_at);

-- Document chunks indexes
CREATE INDEX idx_document_chunks_source ON document_chunks(knowledge_source_id);
CREATE INDEX idx_document_chunks_hash ON document_chunks(content_hash);
CREATE INDEX idx_chunks_content_hash ON document_chunks(content_hash);
CREATE INDEX idx_chunks_chunk_index ON document_chunks(chunk_index);

-- Agent knowledge settings indexes
CREATE INDEX idx_agent_knowledge_settings_agent ON agent_knowledge_settings(agent_id);