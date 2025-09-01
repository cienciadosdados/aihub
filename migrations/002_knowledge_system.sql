-- Migration 002: Knowledge System
-- Creates tables for knowledge sources and RAG functionality

-- Knowledge sources table
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text'
  source_url TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  metadata TEXT, -- JSON metadata about the source
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks table (for local storage if needed)
CREATE TABLE IF NOT EXISTS document_chunks (
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

-- Agent knowledge settings table
CREATE TABLE IF NOT EXISTS agent_knowledge_settings (
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

-- Create indexes for knowledge system
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_agent ON knowledge_sources(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_source ON document_chunks(knowledge_source_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_hash ON document_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_settings_agent ON agent_knowledge_settings(agent_id);
