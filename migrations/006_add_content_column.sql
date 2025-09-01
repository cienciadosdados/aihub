-- Migration 006: Add content column to knowledge_sources
-- Adds content column to store extracted text content

ALTER TABLE knowledge_sources ADD COLUMN content TEXT;

-- Create index for content searches
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_content ON knowledge_sources(content);
