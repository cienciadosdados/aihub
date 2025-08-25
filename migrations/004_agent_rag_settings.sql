-- Migration 004: Agent RAG Settings
-- Adds RAG configuration columns to the agents table

-- Add RAG configuration columns to agents table
ALTER TABLE agents ADD COLUMN enable_rag BOOLEAN DEFAULT 0;
ALTER TABLE agents ADD COLUMN max_chunks_per_query INTEGER DEFAULT 3;
ALTER TABLE agents ADD COLUMN similarity_threshold REAL DEFAULT 0.7;

-- Create index for RAG-enabled agents
CREATE INDEX IF NOT EXISTS idx_agents_rag_enabled ON agents(enable_rag);