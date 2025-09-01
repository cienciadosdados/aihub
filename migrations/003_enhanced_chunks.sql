-- Migration 003: Enhanced Chunks
-- Adds additional columns for better chunk management and search

-- Add columns to document_chunks if they don't exist
ALTER TABLE document_chunks ADD COLUMN content_hash TEXT;
ALTER TABLE document_chunks ADD COLUMN content_preview TEXT;

-- Add enhanced knowledge settings if they don't exist  
ALTER TABLE agent_knowledge_settings ADD COLUMN chunking_strategy TEXT DEFAULT 'recursive';
ALTER TABLE agent_knowledge_settings ADD COLUMN search_strategy TEXT DEFAULT 'hybrid';
ALTER TABLE agent_knowledge_settings ADD COLUMN enable_contextual_search BOOLEAN DEFAULT 1;
ALTER TABLE agent_knowledge_settings ADD COLUMN context_window INTEGER DEFAULT 2;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON document_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_created ON knowledge_sources(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created ON agent_executions(created_at);
