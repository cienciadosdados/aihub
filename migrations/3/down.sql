
-- Remove enhanced columns from document_chunks table
ALTER TABLE document_chunks DROP COLUMN content_hash;
ALTER TABLE document_chunks DROP COLUMN content_preview;

-- Remove chunking strategy settings from agent_knowledge_settings
ALTER TABLE agent_knowledge_settings DROP COLUMN chunking_strategy;
ALTER TABLE agent_knowledge_settings DROP COLUMN search_strategy;
ALTER TABLE agent_knowledge_settings DROP COLUMN enable_contextual_search;
ALTER TABLE agent_knowledge_settings DROP COLUMN context_window;
