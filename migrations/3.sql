
-- Add enhanced columns to document_chunks table
ALTER TABLE document_chunks ADD COLUMN content_hash TEXT;
ALTER TABLE document_chunks ADD COLUMN content_preview TEXT;

-- Add chunking strategy settings to agent_knowledge_settings
ALTER TABLE agent_knowledge_settings ADD COLUMN chunking_strategy TEXT DEFAULT 'recursive';
ALTER TABLE agent_knowledge_settings ADD COLUMN search_strategy TEXT DEFAULT 'hybrid';
ALTER TABLE agent_knowledge_settings ADD COLUMN enable_contextual_search BOOLEAN DEFAULT 1;
ALTER TABLE agent_knowledge_settings ADD COLUMN context_window INTEGER DEFAULT 2;
